import React, { useState, useEffect } from 'react';
import { SymbolData, Position, RiskRewardSetup } from '../types/terminal';
import { Lightbulb, ArrowRightSquare, ArrowUpRight, ArrowDownRight, CheckCircle2, Target } from 'lucide-react';
import { sounds } from '../utils/audio';
import { formatPrice } from '../utils/format';

interface RightPanelProps {
  symbolData: SymbolData;
  activeTab: 'structure' | 'ticket';
  onChangeTab: (tab: 'structure' | 'ticket') => void;
  onExecuteOrder: (order: Omit<Position, 'id' | 'netPnL' | 'netPnLPercent' | 'openTime'>) => void;
  accountBalance: number;
  riskReward: RiskRewardSetup;
  onSyncRiskReward: (setup: RiskRewardSetup) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  symbolData,
  activeTab,
  onChangeTab,
  onExecuteOrder,
  accountBalance,
  riskReward,
  onSyncRiskReward,
}) => {
  const { aiStructure, price, digits } = symbolData;

  // Execution Ticket State
  const [side, setSide] = useState<'BUY' | 'SELL'>(riskReward.side === 'LONG' ? 'BUY' : 'SELL');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT' | 'STOP'>('LIMIT');
  const [lots, setLots] = useState<number>(riskReward.lots || 0.04);
  const [entryPrice, setEntryPrice] = useState<number>(riskReward.entryPrice || aiStructure.levels.triggerEntry);
  const [stopLoss, setStopLoss] = useState<number>(riskReward.stopLoss || aiStructure.levels.invalidationSL);
  const [takeProfit, setTakeProfit] = useState<number>(riskReward.takeProfit || aiStructure.levels.target1);
  const [orderPlacedNotification, setOrderPlacedNotification] = useState<string | null>(null);

  // Sync state when riskReward changes externally (e.g. dragged on chart)
  useEffect(() => {
    if (riskReward) {
      setSide(riskReward.side === 'LONG' ? 'BUY' : 'SELL');
      setLots(riskReward.lots);
      setEntryPrice(riskReward.entryPrice);
      setStopLoss(riskReward.stopLoss);
      setTakeProfit(riskReward.takeProfit);
    }
  }, [riskReward.entryPrice, riskReward.stopLoss, riskReward.takeProfit, riskReward.side, riskReward.lots]);

  // Load from AI Structure
  const handleLoadFromStructure = () => {
    const isBull = aiStructure.bias !== 'BEARISH';
    setSide(isBull ? 'BUY' : 'SELL');
    setOrderType('LIMIT');
    setEntryPrice(aiStructure.levels.triggerEntry);
    setStopLoss(aiStructure.levels.invalidationSL);
    setTakeProfit(aiStructure.levels.target1);

    // Sync to chart visual tool
    onSyncRiskReward({
      visible: true,
      side: isBull ? 'LONG' : 'SHORT',
      entryPrice: aiStructure.levels.triggerEntry,
      stopLoss: aiStructure.levels.invalidationSL,
      takeProfit: aiStructure.levels.target1,
      lots,
    });

    onChangeTab('ticket');
    sounds.playClick();
  };

  // Calculations for Order Ticket
  const riskPerUnit = side === 'BUY' ? Math.max(0, entryPrice - stopLoss) : Math.max(0, stopLoss - entryPrice);
  const rewardPerUnit = side === 'BUY' ? Math.max(0, takeProfit - entryPrice) : Math.max(0, entryPrice - takeProfit);
  const rrRatio = riskPerUnit > 0 ? (rewardPerUnit / riskPerUnit).toFixed(2) : '0.00';
  const riskAmount = (riskPerUnit * lots * 100).toFixed(2);
  const rewardAmount = (rewardPerUnit * lots * 100).toFixed(2);
  const requiredMargin = (lots * 100 * (entryPrice / 50)).toFixed(2); // ~1:50 leverage

  const handlePlaceOrder = () => {
    onExecuteOrder({
      symbol: symbolData.symbol,
      side,
      lots,
      entryPrice: orderType === 'MARKET' ? price : entryPrice,
      markPrice: price,
      stopLoss: stopLoss.toFixed(digits),
      takeProfit,
    });
    sounds.playOrderFill();
    setOrderPlacedNotification(`Filled ${side} ${lots} ${symbolData.symbol} @ ${orderType === 'MARKET' ? price : entryPrice}`);
    setTimeout(() => {
      setOrderPlacedNotification(null);
    }, 3500);
  };

  return (
    <aside className="w-[320px] xl:w-[350px] bg-[#0c0e14] border-l border-[#1e222d] flex flex-col justify-between shrink-0 select-none overflow-y-auto custom-scrollbar">
      {activeTab === 'structure' ? (
        /* TAB 1: VK AI STRUCTURE (Matches screenshot exactly) */
        <div className="p-3.5 space-y-4">
          {/* Main Strategy Card Box */}
          <div className="bg-[#131722] border border-[#2a2e39] rounded p-3 space-y-2.5">
            {/* Top row: Bias Pill + Confidence */}
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 border border-[#f8bd42] text-[#f8bd42] font-mono font-bold text-[10px] rounded tracking-wider uppercase">
                {aiStructure.biasLabel}
              </span>
              <span className="text-[#26a69a] font-mono font-bold text-[11px] tracking-wider">
                CONFIDENCE {aiStructure.confidence}%
              </span>
            </div>

            {/* Title */}
            <h2 className="text-[#dfe2f2] font-bold text-[14px] leading-tight">
              {aiStructure.strategyName}
            </h2>

            {/* Description */}
            <p className="text-[#787b86] text-[11px] leading-relaxed">
              {aiStructure.description}
            </p>
          </div>

          {/* Section: MULTI-TIMEFRAME BIAS */}
          <div>
            <div className="text-[10px] font-mono text-[#787b86] font-semibold tracking-wider uppercase mb-1.5">
              MULTI-TIMEFRAME BIAS
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
              <div
                className={`py-1 text-center rounded border ${
                  aiStructure.mtfBias['15m'] === 'BULL'
                    ? 'border-[#26a69a] text-[#26a69a] bg-[#26a69a]/10 font-bold'
                    : 'border-[#2a2e39] text-[#787b86] bg-[#131722]'
                }`}
              >
                15m: {aiStructure.mtfBias['15m']}
              </div>
              <div
                className={`py-1 text-center rounded border ${
                  aiStructure.mtfBias['4H'] === 'BULL'
                    ? 'border-[#26a69a] text-[#26a69a] bg-[#26a69a]/10 font-bold'
                    : 'border-[#2a2e39] text-[#787b86] bg-[#131722]'
                }`}
              >
                4H: {aiStructure.mtfBias['4H']}
              </div>
              <div
                className={`py-1 text-center rounded border ${
                  aiStructure.mtfBias['1D'] === 'BULL'
                    ? 'border-[#26a69a] text-[#26a69a] bg-[#26a69a]/10 font-bold'
                    : 'border-[#2a2e39] text-[#787b86] bg-[#131722]'
                }`}
              >
                1D: {aiStructure.mtfBias['1D']}
              </div>
            </div>
          </div>

          {/* Institutional Price Levels Box */}
          <div className="bg-[#131722] border border-[#2a2e39] rounded p-2.5 space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-[#787b86]">TRIGGER ENTRY</span>
              <span className="text-[#f8bd42] font-bold">
                ${formatPrice(aiStructure.levels.triggerEntry, digits)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#787b86]">INVALIDATION (SL)</span>
              <span className="text-[#f23645] font-bold">
                ${formatPrice(aiStructure.levels.invalidationSL, digits)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#787b86]">TARGET 1 (2.0R)</span>
              <span className="text-[#26a69a] font-bold">
                ${formatPrice(aiStructure.levels.target1, digits)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#787b86]">TARGET 2 (3.0R)</span>
              <span className="text-[#26a69a] font-bold">
                ${formatPrice(aiStructure.levels.target2, digits)}
              </span>
            </div>
          </div>

          {/* Section: QUANT REASONING LOG */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[#f8bd42] text-[11px] font-mono font-bold tracking-tight">
              <Lightbulb className="w-3.5 h-3.5" />
              <span>QUANT REASONING LOG</span>
            </div>

            <ul className="space-y-1.5 text-[11px] text-[#787b86] leading-relaxed font-mono">
              {aiStructure.reasoningLog.map((log, index) => (
                <li key={index} className="flex items-start gap-1.5">
                  <span className="text-[#f8bd42] shrink-0">•</span>
                  <span>{log}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-1.5">
            <button
              onClick={handleLoadFromStructure}
              className="w-full py-2.5 px-3 bg-[#131722] hover:bg-[#1e222d] border border-[#f8bd42] rounded text-[#f8bd42] font-mono font-bold text-[11px] flex items-center justify-center gap-2 cursor-pointer transition-all hover:shadow-[0_0_12px_rgba(248,189,66,0.15)]"
            >
              <ArrowRightSquare className="w-4 h-4" />
              <span>LOAD INTO DEMO ORDER TICKET</span>
            </button>
            <button
              onClick={() => {
                const isBull = aiStructure.bias !== 'BEARISH';
                onSyncRiskReward({
                  visible: true,
                  side: isBull ? 'LONG' : 'SHORT',
                  entryPrice: aiStructure.levels.triggerEntry,
                  stopLoss: aiStructure.levels.invalidationSL,
                  takeProfit: aiStructure.levels.target1,
                  lots,
                });
                sounds.playClick();
              }}
              className="w-full py-2 px-3 bg-[#131722] hover:bg-[#1e222d] border border-[#2a2e39] hover:border-[#26a69a] rounded text-[#26a69a] font-mono font-bold text-[10px] flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Target className="w-3.5 h-3.5" />
              <span>PLOT RISK/REWARD ON CHART</span>
            </button>
          </div>
        </div>
      ) : (
        /* TAB 2: EXECUTION TICKET (Professional Order Desk) */
        <div className="p-3.5 space-y-3.5">
          {orderPlacedNotification && (
            <div className="p-2 bg-[#26a69a]/15 border border-[#26a69a] rounded text-[#26a69a] text-[11px] font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{orderPlacedNotification}</span>
            </div>
          )}

          {/* Side Selector: Long / Short */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setSide('BUY');
                sounds.playClick();
              }}
              className={`py-2 px-3 rounded font-mono font-bold text-[12px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                side === 'BUY'
                  ? 'bg-[#26a69a] text-[#0f131e]'
                  : 'bg-[#131722] text-[#787b86] border border-[#2a2e39] hover:text-[#dfe2f2]'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>BUY / LONG</span>
            </button>
            <button
              onClick={() => {
                setSide('SELL');
                sounds.playClick();
              }}
              className={`py-2 px-3 rounded font-mono font-bold text-[12px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                side === 'SELL'
                  ? 'bg-[#f23645] text-white'
                  : 'bg-[#131722] text-[#787b86] border border-[#2a2e39] hover:text-[#dfe2f2]'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>SELL / SHORT</span>
            </button>
          </div>

          {/* Order Type: Market / Limit / Stop */}
          <div>
            <div className="text-[10px] font-mono text-[#787b86] uppercase mb-1">TYPE</div>
            <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
              {(['MARKET', 'LIMIT', 'STOP'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setOrderType(type);
                    sounds.playClick();
                  }}
                  className={`py-1 rounded text-center cursor-pointer transition-colors ${
                    orderType === type
                      ? 'bg-[#1b1f2b] text-[#f8bd42] border border-[#f8bd42]/50 font-bold'
                      : 'bg-[#131722] text-[#787b86] border border-[#2a2e39] hover:text-[#dfe2f2]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Lot Size Selector */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-mono text-[#787b86] uppercase mb-1">
              <span>VOLUME (LOTS)</span>
              <span className="text-[#dfe2f2]">{lots} Lots</span>
            </div>
            <div className="flex items-center gap-1 bg-[#131722] border border-[#2a2e39] rounded p-1">
              <button
                onClick={() => setLots((prev) => Math.max(0.01, +(prev - 0.01).toFixed(2)))}
                className="w-7 h-7 bg-[#1b1f2b] hover:bg-[#2a2e39] text-[#dfe2f2] rounded font-mono text-[14px] flex items-center justify-center cursor-pointer"
              >
                -
              </button>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={lots}
                onChange={(e) => setLots(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                className="flex-1 bg-transparent text-center font-mono text-[#dfe2f2] text-[12px] font-semibold outline-none"
              />
              <button
                onClick={() => setLots((prev) => +(prev + 0.01).toFixed(2))}
                className="w-7 h-7 bg-[#1b1f2b] hover:bg-[#2a2e39] text-[#dfe2f2] rounded font-mono text-[14px] flex items-center justify-center cursor-pointer"
              >
                +
              </button>
            </div>
            {/* Quick lots presets */}
            <div className="grid grid-cols-4 gap-1 mt-1 font-mono text-[10px]">
              {[0.01, 0.04, 0.10, 0.50].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setLots(preset)}
                  className={`py-0.5 rounded cursor-pointer ${
                    lots === preset ? 'bg-[#f8bd42]/20 text-[#f8bd42] border border-[#f8bd42]/40' : 'bg-[#131722] text-[#787b86] hover:text-[#dfe2f2]'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Trigger Entry Price */}
          {orderType !== 'MARKET' && (
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-[#787b86] uppercase mb-1">
                <span>ENTRY PRICE</span>
                <button
                  onClick={() => setEntryPrice(price)}
                  className="text-[#f8bd42] hover:underline cursor-pointer"
                >
                  Use Mark (${price})
                </button>
              </div>
              <input
                type="number"
                step="0.1"
                value={entryPrice}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#131722] border border-[#2a2e39] rounded px-2.5 py-1.5 font-mono text-[#dfe2f2] text-[12px] font-semibold outline-none focus:border-[#f8bd42]"
              />
            </div>
          )}

          {/* Stop Loss & Take Profit */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-[#f23645] uppercase mb-1">
                <span>STOP LOSS</span>
              </div>
              <input
                type="number"
                step="0.1"
                value={stopLoss}
                onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#131722] border border-[#2a2e39] rounded px-2 py-1.5 font-mono text-[#dfe2f2] text-[11px] outline-none focus:border-[#f23645]"
              />
              <span className="text-[9px] font-mono text-[#787b86] mt-0.5 block">
                Risk: -${riskAmount}
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-[#26a69a] uppercase mb-1">
                <span>TAKE PROFIT</span>
              </div>
              <input
                type="number"
                step="0.1"
                value={takeProfit}
                onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#131722] border border-[#2a2e39] rounded px-2 py-1.5 font-mono text-[#dfe2f2] text-[11px] outline-none focus:border-[#26a69a]"
              />
              <span className="text-[9px] font-mono text-[#787b86] mt-0.5 block">
                Target: +${rewardAmount}
              </span>
            </div>
          </div>

          {/* Risk Metrics Summary */}
          <div className="bg-[#131722] border border-[#2a2e39] rounded p-2.5 font-mono text-[10px] space-y-1">
            <div className="flex justify-between">
              <span className="text-[#787b86]">EST. RISK / REWARD</span>
              <span className="text-[#f8bd42] font-bold">1 : {rrRatio} R</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#787b86]">EST. MARGIN REQUIRED</span>
              <span className="text-[#dfe2f2]">${requiredMargin}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#787b86]">ACCOUNT BALANCE</span>
              <span className="text-[#dfe2f2]">${accountBalance.toFixed(2)}</span>
            </div>
          </div>

          {/* Place Order CTA Button */}
          <button
            onClick={handlePlaceOrder}
            className={`w-full py-3 rounded font-mono font-bold text-[12px] tracking-wider uppercase cursor-pointer transition-colors shadow-lg ${
              side === 'BUY'
                ? 'bg-[#26a69a] hover:bg-[#20a28a] text-[#0f131e]'
                : 'bg-[#f23645] hover:bg-[#d32f2f] text-white'
            }`}
          >
            EXECUTE {side} {lots} LOTS
          </button>
        </div>
      )}
    </aside>
  );
};
