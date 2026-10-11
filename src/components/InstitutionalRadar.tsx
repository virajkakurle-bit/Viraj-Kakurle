import React, { useState, useMemo } from 'react';
import { SymbolData } from '../types/terminal';
import { sounds } from '../utils/audio';
import { formatPrice } from '../utils/format';
import { Flame, Activity, Maximize2 } from 'lucide-react';

interface InstitutionalRadarProps {
  symbols: Record<string, SymbolData>;
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  buyTapePercentage?: number;
  onOpenHeatmapModal?: () => void;
}

export const InstitutionalRadar: React.FC<InstitutionalRadarProps> = ({
  symbols,
  selectedSymbol,
  onSelectSymbol,
  buyTapePercentage = 58,
  onOpenHeatmapModal,
}) => {
  const [viewMode, setViewMode] = useState<'RADAR' | 'VOLATILITY'>('RADAR');
  const symbolList = Object.values(symbols);
  const sellTapePercentage = 100 - buyTapePercentage;

  // ADR & Volatility quick data
  const volatilityList = useMemo(() => {
    return symbolList.map((item) => {
      let adrPct = 1.5;
      if (item.symbol === 'SOLUSD') adrPct = 6.4;
      else if (item.symbol === 'BTCUSD') adrPct = 3.8;
      else if (item.symbol === 'ETHUSD') adrPct = 2.9;
      else if (item.symbol === 'XAUUSD') adrPct = 1.6;
      else if (item.symbol === 'US500') adrPct = 0.95;
      else if (item.symbol === 'EURUSD') adrPct = 0.44;

      const candles = item.candles;
      const prices = candles.map((c) => c.close);
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const variance = prices.reduce((a, p) => a + Math.pow(p - mean, 2), 0) / (prices.length - 1 || 1);
      const stdDevPct = (Math.sqrt(variance) / item.price) * 100;

      return {
        ...item,
        adrPct,
        stdDevPct,
        isHot: adrPct >= 3.0,
      };
    });
  }, [symbolList]);

  return (
    <div className="w-[240px] xl:w-[260px] bg-[#0c0e14] border-r border-[#1e222d] flex flex-col justify-between shrink-0 select-none">
      {/* Top Header */}
      <div>
        <div className="h-[32px] px-3 border-b border-[#1e222d] flex items-center justify-between text-[11px] font-mono tracking-wider">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setViewMode('RADAR');
                sounds.playClick();
              }}
              className={`font-semibold cursor-pointer transition-colors ${
                viewMode === 'RADAR' ? 'text-[#dfe2f2]' : 'text-[#787b86] hover:text-[#dfe2f2]'
              }`}
            >
              RADAR
            </button>
            <span className="text-[#434651]">/</span>
            <button
              onClick={() => {
                setViewMode('VOLATILITY');
                sounds.playClick();
              }}
              className={`flex items-center gap-1 font-semibold cursor-pointer transition-colors ${
                viewMode === 'VOLATILITY' ? 'text-[#f8bd42]' : 'text-[#787b86] hover:text-[#f8bd42]'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>VOL (ADR)</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#787b86] text-[10px]">{symbolList.length} ITEMS</span>
            {onOpenHeatmapModal && (
              <button
                onClick={() => {
                  onOpenHeatmapModal();
                  sounds.playClick();
                }}
                title="Open Full Volatility Heatmap Matrix"
                className="p-1 hover:bg-[#1e222d] rounded text-[#787b86] hover:text-[#f8bd42] cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Table Header */}
        {viewMode === 'RADAR' ? (
          <div className="grid grid-cols-12 px-3 py-1.5 text-[10px] font-mono text-[#787b86] border-b border-[#1e222d]/70">
            <div className="col-span-5 text-left">SYMBOL</div>
            <div className="col-span-4 text-right">LAST</div>
            <div className="col-span-3 text-right">CHG%</div>
          </div>
        ) : (
          <div className="grid grid-cols-12 px-3 py-1.5 text-[10px] font-mono text-[#787b86] border-b border-[#1e222d]/70">
            <div className="col-span-5 text-left">SYMBOL</div>
            <div className="col-span-4 text-right">ADR %</div>
            <div className="col-span-3 text-right">σ VOL</div>
          </div>
        )}

        {/* Rows */}
        <div className="divide-y divide-[#1e222d]/40">
          {viewMode === 'RADAR'
            ? symbolList.map((item) => {
                const isSelected = item.symbol === selectedSymbol;
                const isPositive = item.change24h >= 0;

                return (
                  <button
                    key={item.symbol}
                    onClick={() => {
                      onSelectSymbol(item.symbol);
                      sounds.playClick();
                    }}
                    className={`w-full grid grid-cols-12 px-3 py-2 text-left items-center cursor-pointer transition-colors relative ${
                      isSelected ? 'bg-[#1b1f2b] text-[#dfe2f2]' : 'hover:bg-[#131722] text-[#dfe2f2]'
                    }`}
                  >
                    {/* Active indicator bar on left */}
                    {isSelected && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#f8bd42]" />}

                    {/* Symbol + Subtitle */}
                    <div className="col-span-5 flex flex-col justify-center">
                      <span className={`font-mono text-[11px] font-bold ${isSelected ? 'text-[#f8bd42]' : 'text-[#dfe2f2]'}`}>
                        {item.symbol}
                      </span>
                      <span className="text-[9px] text-[#787b86] uppercase tracking-tight">
                        {item.name}
                      </span>
                    </div>

                    {/* Last Price */}
                    <div className="col-span-4 text-right font-mono text-[11px] font-medium text-[#dfe2f2]">
                      {formatPrice(item.price, item.digits)}
                    </div>

                    {/* 24h Change */}
                    <div
                      className={`col-span-3 text-right font-mono text-[11px] font-semibold ${
                        isPositive ? 'text-[#26a69a]' : 'text-[#f23645]'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {item.change24h.toFixed(2)}%
                    </div>
                  </button>
                );
              })
            : volatilityList.map((item) => {
                const isSelected = item.symbol === selectedSymbol;
                return (
                  <button
                    key={item.symbol}
                    onClick={() => {
                      onSelectSymbol(item.symbol);
                      sounds.playClick();
                    }}
                    className={`w-full grid grid-cols-12 px-3 py-2 text-left items-center cursor-pointer transition-colors relative ${
                      isSelected ? 'bg-[#1b1f2b] text-[#dfe2f2]' : 'hover:bg-[#131722] text-[#dfe2f2]'
                    }`}
                  >
                    {isSelected && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#f8bd42]" />}

                    <div className="col-span-5 flex flex-col justify-center">
                      <div className="flex items-center gap-1">
                        <span className={`font-mono text-[11px] font-bold ${isSelected ? 'text-[#f8bd42]' : 'text-[#dfe2f2]'}`}>
                          {item.symbol}
                        </span>
                        {item.isHot && <Flame className="w-2.5 h-2.5 text-[#f8bd42]" />}
                      </div>
                      <span className="text-[9px] text-[#787b86] uppercase tracking-tight">
                        {item.category}
                      </span>
                    </div>

                    {/* ADR % */}
                    <div className="col-span-4 text-right font-mono text-[11px] font-bold text-[#dfe2f2]">
                      {item.adrPct.toFixed(2)}%
                    </div>

                    {/* Std Dev */}
                    <div className="col-span-3 text-right font-mono text-[11px] font-semibold text-[#26a69a]">
                      ±{item.stdDevPct.toFixed(2)}%
                    </div>
                  </button>
                );
              })}
        </div>
      </div>

      {/* Bottom Sentiment Tape Bar & Heatmap Trigger */}
      <div className="p-3 border-t border-[#1e222d] bg-[#0c0e14] space-y-2">
        <div>
          <div className="flex items-center justify-between text-[10px] font-mono mb-1.5 font-semibold">
            <span className="text-[#26a69a]">BUY TAPE {buyTapePercentage}%</span>
            <span className="text-[#f23645]">SELL TAPE {sellTapePercentage}%</span>
          </div>
          <div className="h-1.5 w-full bg-[#1e222d] rounded-full overflow-hidden flex">
            <div
              className="h-full bg-[#26a69a] transition-all duration-500 ease-out"
              style={{ width: `${buyTapePercentage}%` }}
            />
            <div
              className="h-full bg-[#f23645] transition-all duration-500 ease-out"
              style={{ width: `${sellTapePercentage}%` }}
            />
          </div>
        </div>

        {onOpenHeatmapModal && (
          <button
            onClick={() => {
              onOpenHeatmapModal();
              sounds.playClick();
            }}
            className="w-full py-1.5 px-2 bg-[#131722] hover:bg-[#1b1f2b] border border-[#2a2e39] hover:border-[#f8bd42] rounded text-[10px] font-mono text-[#f8bd42] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Flame className="w-3 h-3" />
            <span>MOMENTUM HEATMAP MATRIX</span>
          </button>
        )}
      </div>
    </div>
  );
};

