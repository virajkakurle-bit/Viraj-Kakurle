import React, { useState, useMemo } from 'react';
import { SymbolData } from '../types/terminal';
import { formatPrice } from '../utils/format';
import { sounds } from '../utils/audio';
import { 
  Flame, 
  TrendingUp, 
  Activity, 
  ArrowUpDown, 
  Check, 
  Zap, 
  X,
  ExternalLink
} from 'lucide-react';

interface VolatilityHeatmapProps {
  symbols: Record<string, SymbolData>;
  selectedSymbol: string;
  onSelectSymbol: (symbolKey: string) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export interface VolatilityMetric {
  symbol: string;
  name: string;
  category: string;
  price: number;
  digits: number;
  change24h: number;
  adrPoints: number;
  adrPercent: number;
  currentRange: number;
  currentRangePercent: number;
  adrUtilization: number; // Current Range / ADR (e.g. 1.15x)
  stdDevPoints: number;
  stdDevPercent: number;
  momentumScore: number; // 0 - 100
  momentumTier: 'EXPLOSIVE' | 'HIGH' | 'MODERATE' | 'COMPRESSED';
  sessionPeak: 'LONDON' | 'NEW YORK' | 'ASIAN';
}

type SortField = 'momentumScore' | 'adrPercent' | 'stdDevPercent' | 'change24h' | 'adrUtilization';

export const VolatilityHeatmap: React.FC<VolatilityHeatmapProps> = ({
  symbols,
  selectedSymbol,
  onSelectSymbol,
  onClose,
  isModal = false,
}) => {
  const [sortField, setSortField] = useState<SortField>('momentumScore');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'CRYPTO' | 'FOREX' | 'COMMODITIES'>('ALL');

  // Compute ADR and Standard Deviation metrics for each symbol
  const metricsList = useMemo(() => {
    return Object.values(symbols).map((item): VolatilityMetric => {
      const candles = item.candles;
      const prices = candles.map((c) => c.close);
      const highs = candles.map((c) => c.high);
      const lows = candles.map((c) => c.low);

      const currentHigh = Math.max(...highs);
      const currentLow = Math.min(...lows);
      const currentRange = currentHigh - currentLow;
      const currentRangePercent = (currentRange / item.price) * 100;

      // Calculate sample standard deviation of closes
      const mean = prices.reduce((acc, p) => acc + p, 0) / prices.length;
      const variance = prices.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / (prices.length - 1 || 1);
      const stdDevPoints = Math.sqrt(variance);
      const stdDevPercent = (stdDevPoints / item.price) * 100;

      // Base estimated Average Daily Range (ADR)
      let baseAdrPct = 1.5;
      if (item.symbol === 'SOLUSD') baseAdrPct = 6.4;
      else if (item.symbol === 'BTCUSD') baseAdrPct = 3.8;
      else if (item.symbol === 'ETHUSD') baseAdrPct = 2.9;
      else if (item.symbol === 'XAUUSD') baseAdrPct = 1.6;
      else if (item.symbol === 'US500') baseAdrPct = 0.95;
      else if (item.symbol === 'EURUSD') baseAdrPct = 0.44;

      const adrPoints = (item.price * baseAdrPct) / 100;
      const adrUtilization = currentRange / (adrPoints || 1);

      // Quant momentum score (0 to 100) combining ADR %, StdDev %, and 24h change
      const rawMomentum = Math.min(
        100,
        Math.max(
          10,
          Math.round(
            baseAdrPct * 7.5 +
            stdDevPercent * 12 +
            Math.abs(item.change24h) * 4 +
            (adrUtilization > 1 ? 15 : 5)
          )
        )
      );

      let tier: 'EXPLOSIVE' | 'HIGH' | 'MODERATE' | 'COMPRESSED' = 'MODERATE';
      if (rawMomentum >= 85) tier = 'EXPLOSIVE';
      else if (rawMomentum >= 70) tier = 'HIGH';
      else if (rawMomentum >= 50) tier = 'MODERATE';
      else tier = 'COMPRESSED';

      const sessionPeak = item.category === 'CRYPTO' 
        ? 'NEW YORK' 
        : item.symbol === 'EURUSD' 
        ? 'LONDON' 
        : 'NEW YORK';

      return {
        symbol: item.symbol,
        name: item.name,
        category: item.category,
        price: item.price,
        digits: item.digits,
        change24h: item.change24h,
        adrPoints,
        adrPercent: baseAdrPct,
        currentRange,
        currentRangePercent,
        adrUtilization,
        stdDevPoints,
        stdDevPercent,
        momentumScore: rawMomentum,
        momentumTier: tier,
        sessionPeak,
      };
    });
  }, [symbols]);

  // Filter and Sort
  const filteredMetrics = useMemo(() => {
    let list = metricsList;
    if (selectedFilter !== 'ALL') {
      list = list.filter((m) => m.category === selectedFilter);
    }

    return [...list].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [metricsList, selectedFilter, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
    sounds.playClick();
  };

  // Heat color interpolator for Momentum and ADR
  const getHeatmapColor = (score: number) => {
    if (score >= 85) return 'from-[#ffc348]/25 to-[#f8bd42]/10 border-[#f8bd42] text-[#f8bd42]';
    if (score >= 70) return 'from-[#26a69a]/25 to-[#089981]/10 border-[#26a69a] text-[#26a69a]';
    if (score >= 50) return 'from-[#20a28a]/15 to-transparent border-[#20a28a]/40 text-[#66dabf]';
    return 'from-[#171b26] to-transparent border-[#2a2e39] text-[#787b86]';
  };

  const getBadgeColor = (tier: string) => {
    switch (tier) {
      case 'EXPLOSIVE':
        return 'bg-[#f8bd42]/20 text-[#f8bd42] border-[#f8bd42]/50';
      case 'HIGH':
        return 'bg-[#26a69a]/20 text-[#26a69a] border-[#26a69a]/50';
      case 'MODERATE':
        return 'bg-[#20a28a]/10 text-[#66dabf] border-[#20a28a]/30';
      default:
        return 'bg-[#1b1f2b] text-[#787b86] border-[#2a2e39]';
    }
  };

  return (
    <div className={`bg-[#0c0e14] border border-[#1e222d] rounded-lg flex flex-col overflow-hidden select-none font-mono text-[11px] ${isModal ? 'w-full max-w-4xl max-h-[85vh] shadow-2xl' : 'w-full h-full'}`}>
      {/* Top Header */}
      <div className="px-4 py-3 bg-[#131722] border-b border-[#1e222d] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#f8bd42]/20 border border-[#f8bd42] flex items-center justify-center text-[#f8bd42]">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-bold text-[#dfe2f2] text-[12px] flex items-center gap-2">
              <span>VOLATILITY HEATMAP & ADR ENGINE</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-[#f8bd42] text-[#0f131e] font-bold rounded">
                MOMENTUM RADAR
              </span>
            </div>
            <div className="text-[10px] text-[#787b86]">
              Standard deviation of volatility (σ) & Average Daily Range (ADR) ranking
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter Pills */}
          <div className="hidden sm:flex items-center gap-1 bg-[#0c0e14] p-0.5 rounded border border-[#2a2e39]">
            {(['ALL', 'CRYPTO', 'COMMODITIES', 'FOREX'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  setSelectedFilter(filter);
                  sounds.playClick();
                }}
                className={`px-2 py-0.5 rounded text-[10px] cursor-pointer transition-colors ${
                  selectedFilter === filter
                    ? 'bg-[#1b1f2b] text-[#f8bd42] font-bold border border-[#f8bd42]/40'
                    : 'text-[#787b86] hover:text-[#dfe2f2]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#1e222d] text-[#787b86] hover:text-[#dfe2f2] rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Heatmap Grid Overview Tiles */}
      <div className="p-3 border-b border-[#1e222d] bg-[#0c0e14]">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {filteredMetrics.map((item) => {
            const isSelected = item.symbol === selectedSymbol;
            return (
              <div
                key={item.symbol}
                onClick={() => {
                  onSelectSymbol(item.symbol);
                  sounds.playClick();
                }}
                className={`p-2.5 rounded border transition-all cursor-pointer relative bg-gradient-to-b ${getHeatmapColor(item.momentumScore)} ${
                  isSelected ? 'ring-1 ring-[#f8bd42] shadow-[0_0_12px_rgba(248,189,66,0.2)]' : 'hover:scale-[1.02]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[12px] text-[#dfe2f2]">{item.symbol}</span>
                  <span className={`text-[8.5px] px-1 py-0.2 border rounded font-semibold ${getBadgeColor(item.momentumTier)}`}>
                    {item.momentumTier}
                  </span>
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-[9px] text-[#787b86]">ADR %</span>
                  <span className="font-bold text-[12px] text-[#dfe2f2]">
                    {item.adrPercent.toFixed(2)}%
                  </span>
                </div>

                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-[9px] text-[#787b86]">VOL STD DEV (σ)</span>
                  <span className="font-semibold text-[11px] text-[#26a69a]">
                    ±{item.stdDevPercent.toFixed(2)}%
                  </span>
                </div>

                {/* Progress Mini Bar for ADR Utilization */}
                <div className="mt-2 pt-1 border-t border-[#1e222d]/60">
                  <div className="flex justify-between text-[8.5px] text-[#787b86] mb-0.5">
                    <span>RANGE / ADR</span>
                    <span className="text-[#dfe2f2] font-semibold">{(item.adrUtilization * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1 w-full bg-[#1e222d] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        item.adrUtilization >= 1 ? 'bg-[#f8bd42]' : 'bg-[#26a69a]'
                      }`}
                      style={{ width: `${Math.min(100, item.adrUtilization * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sortable Deep-Dive Institutional Table */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="min-w-[650px]">
          {/* Table Header */}
          <div className="grid grid-cols-12 px-4 py-2 text-[10px] text-[#787b86] uppercase bg-[#131722]/80 border-b border-[#1e222d]">
            <div className="col-span-3 flex items-center gap-1 cursor-pointer" onClick={() => handleSort('momentumScore')}>
              <span>ASSET / TIER</span>
              <ArrowUpDown className="w-3 h-3" />
            </div>
            <div className="col-span-2 text-right flex items-center justify-end gap-1 cursor-pointer" onClick={() => handleSort('change24h')}>
              <span>LAST PRICE</span>
              <ArrowUpDown className="w-3 h-3" />
            </div>
            <div className="col-span-2 text-right flex items-center justify-end gap-1 cursor-pointer" onClick={() => handleSort('adrPercent')}>
              <span>AVG DAILY RANGE (ADR)</span>
              <ArrowUpDown className="w-3 h-3" />
            </div>
            <div className="col-span-2 text-right flex items-center justify-end gap-1 cursor-pointer" onClick={() => handleSort('stdDevPercent')}>
              <span>STD DEV (σ VOL)</span>
              <ArrowUpDown className="w-3 h-3" />
            </div>
            <div className="col-span-2 text-right flex items-center justify-end gap-1 cursor-pointer" onClick={() => handleSort('adrUtilization')}>
              <span>ADR UTILIZATION</span>
              <ArrowUpDown className="w-3 h-3" />
            </div>
            <div className="col-span-1 text-center">
              <span>ACTION</span>
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-[#1e222d]/40">
            {filteredMetrics.map((item) => {
              const isSelected = item.symbol === selectedSymbol;
              return (
                <div
                  key={item.symbol}
                  onClick={() => {
                    onSelectSymbol(item.symbol);
                    sounds.playClick();
                  }}
                  className={`grid grid-cols-12 px-4 py-2.5 items-center transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#1b1f2b]' : 'hover:bg-[#131722]'
                  }`}
                >
                  {/* Symbol & Momentum Tier */}
                  <div className="col-span-3 flex items-center gap-2">
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#f8bd42]" />}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-[12px] ${isSelected ? 'text-[#f8bd42]' : 'text-[#dfe2f2]'}`}>
                          {item.symbol}
                        </span>
                        <span className="text-[9px] text-[#787b86] uppercase">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`text-[8.5px] px-1 py-0.2 border rounded font-semibold ${getBadgeColor(item.momentumTier)}`}>
                          {item.momentumTier} ({item.momentumScore} SCORE)
                        </span>
                        <span className="text-[8.5px] text-[#787b86]">
                          Peak: {item.sessionPeak}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Last Price + Change */}
                  <div className="col-span-2 text-right">
                    <div className="font-bold text-[#dfe2f2]">
                      ${formatPrice(item.price, item.digits)}
                    </div>
                    <div className={`text-[10px] font-semibold ${item.change24h >= 0 ? 'text-[#26a69a]' : 'text-[#f23645]'}`}>
                      {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(2)}%
                    </div>
                  </div>

                  {/* ADR (Average Daily Range) */}
                  <div className="col-span-2 text-right">
                    <div className="font-bold text-[#dfe2f2]">
                      {item.adrPercent.toFixed(2)}%
                    </div>
                    <div className="text-[9px] text-[#787b86]">
                      ±{item.adrPoints.toFixed(item.digits)} pts
                    </div>
                  </div>

                  {/* Std Dev (Sigma) */}
                  <div className="col-span-2 text-right">
                    <div className="font-bold text-[#26a69a]">
                      ±{item.stdDevPercent.toFixed(2)}%
                    </div>
                    <div className="text-[9px] text-[#787b86]">
                      σ = {item.stdDevPoints.toFixed(item.digits)}
                    </div>
                  </div>

                  {/* ADR Utilization */}
                  <div className="col-span-2 text-right">
                    <div className={`font-bold ${item.adrUtilization >= 1 ? 'text-[#f8bd42]' : 'text-[#dfe2f2]'}`}>
                      {(item.adrUtilization * 100).toFixed(0)}%
                    </div>
                    <div className="text-[9px] text-[#787b86]">
                      {item.currentRange.toFixed(item.digits)} pts today
                    </div>
                  </div>

                  {/* Action */}
                  <div className="col-span-1 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSymbol(item.symbol);
                        sounds.playClick();
                      }}
                      className="px-2 py-1 bg-[#1e222d] hover:bg-[#2a2e39] text-[#f8bd42] hover:text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      TRADE
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Summary Strip */}
      <div className="px-4 py-2 bg-[#131722] border-t border-[#1e222d] flex items-center justify-between text-[10px] text-[#787b86] shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#f8bd42]" />
            <span>High Momentum (ADR &gt; 3.0%)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#26a69a]" />
            <span>Moderate Trend (ADR 1.0% - 3.0%)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#787b86]" />
            <span>Mean Reverting / Compressed (ADR &lt; 1.0%)</span>
          </span>
        </div>
        <div>
          Click any asset to load candlestick chart & institutional SMC structure
        </div>
      </div>
    </div>
  );
};
