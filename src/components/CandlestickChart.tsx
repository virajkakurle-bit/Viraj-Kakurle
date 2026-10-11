import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SymbolData, Timeframe, RiskRewardSetup, PriceAlert } from '../types/terminal';
import { sounds } from '../utils/audio';
import { formatPrice } from '../utils/format';
import { 
  Eye, 
  EyeOff, 
  Target, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronUp, 
  ChevronDown, 
  Maximize2,
  Sparkles,
  Bell,
  Trash2,
  Plus
} from 'lucide-react';

interface CandlestickChartProps {
  symbolData: SymbolData;
  timeframe: Timeframe;
  onLivePriceUpdate?: (newPrice: number) => void;
  riskReward: RiskRewardSetup;
  onChangeRiskReward: (setup: RiskRewardSetup) => void;
  onSyncToOrderTicket?: (setup: RiskRewardSetup) => void;
  alerts?: PriceAlert[];
  onAddAlert?: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => void;
  onDeleteAlert?: (id: string) => void;
  onOpenAlertsModal?: () => void;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  symbolData,
  timeframe,
  riskReward,
  onChangeRiskReward,
  onSyncToOrderTicket,
  alerts = [],
  onAddAlert,
  onDeleteAlert,
  onOpenAlertsModal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [countdown, setCountdown] = useState<number>(161); // 02:41 in seconds
  const [isLogScale, setIsLogScale] = useState(false);
  const [showOverlays, setShowOverlays] = useState(true);

  // Risk/Reward Dragging State
  const [draggedHandle, setDraggedHandle] = useState<'entry' | 'stopLoss' | 'takeProfit' | null>(null);
  const [draggedAlertId, setDraggedAlertId] = useState<string | null>(null);
  const [hoveredAlertId, setHoveredAlertId] = useState<string | null>(null);
  const [isHudMinimized, setIsHudMinimized] = useState<boolean>(false);

  // Measure container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Global mouseup to cancel dragging anywhere
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (draggedHandle || draggedAlertId) {
        setDraggedHandle(null);
        setDraggedAlertId(null);
        sounds.playClick();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [draggedHandle, draggedAlertId]);

  // Countdown timer simulation for candle close (02:41)
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 900));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const candles = symbolData.candles;
  const currentCandle = hoverIndex !== null && candles[hoverIndex] 
    ? candles[hoverIndex] 
    : candles[candles.length - 1];

  // Chart Layout bounds
  const padding = { top: 20, right: 65, bottom: 45, left: 15 };
  const chartWidth = Math.max(dimensions.width - padding.left - padding.right, 200);
  const chartHeight = Math.max(dimensions.height - padding.top - padding.bottom, 200);

  // Alerts for current symbol
  const symbolAlerts = useMemo(() => {
    return alerts.filter((a) => a.symbol === symbolData.symbol);
  }, [alerts, symbolData.symbol]);

  // Price Range calculations
  const { minPrice, maxPrice, priceGridLines } = useMemo(() => {
    let min = Math.min(...candles.map((c) => c.low));
    let max = Math.max(...candles.map((c) => c.high));

    // Include SMC levels into price range
    if (symbolData.smc.supplyOB) {
      max = Math.max(max, symbolData.smc.supplyOB.top);
    }
    if (symbolData.smc.fvg) {
      min = Math.min(min, symbolData.smc.fvg.bottom);
    }

    // Include Risk/Reward levels if visible
    if (riskReward.visible) {
      min = Math.min(min, riskReward.stopLoss, riskReward.takeProfit, riskReward.entryPrice);
      max = Math.max(max, riskReward.stopLoss, riskReward.takeProfit, riskReward.entryPrice);
    }

    // Include active alerts into visible price range
    symbolAlerts.forEach((a) => {
      if (!a.triggered) {
        min = Math.min(min, a.targetPrice);
        max = Math.max(max, a.targetPrice);
      }
    });

    const margin = (max - min) * 0.12;
    min -= margin;
    max += margin;

    // Grid lines calculation
    const range = max - min;
    const step = range > 1000 ? 500 : range > 50 ? 5 : range > 5 ? 0.5 : 0.0005;
    const start = Math.floor(min / step) * step;
    const lines: number[] = [];
    for (let p = start; p <= max; p += step) {
      if (p >= min && p <= max) lines.push(p);
    }

    return { minPrice: min, maxPrice: max, priceGridLines: lines };
  }, [candles, symbolData.smc, riskReward, symbolAlerts]);

  // Volume Range calculations
  const maxVolume = useMemo(() => {
    return Math.max(...candles.map((c) => c.volume), 1);
  }, [candles]);

  // Coordinate transforms
  const getY = (price: number) => {
    if (isLogScale) {
      const logMin = Math.log(minPrice);
      const logMax = Math.log(maxPrice);
      const logP = Math.log(price);
      return padding.top + chartHeight * (1 - (logP - logMin) / (logMax - logMin));
    }
    return padding.top + chartHeight * (1 - (price - minPrice) / (maxPrice - minPrice));
  };

  const getPriceFromY = (y: number) => {
    const normalizedY = 1 - (y - padding.top) / chartHeight;
    return minPrice + normalizedY * (maxPrice - minPrice);
  };

  const candleSpacing = chartWidth / candles.length;
  const candleBodyWidth = Math.max(Math.min(candleSpacing * 0.7, 36), 8);

  const getX = (index: number) => {
    return padding.left + index * candleSpacing + candleSpacing / 2;
  };

  // Hover and Dragging detection
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setMousePos({ x: mouseX, y: mouseY });

    // Handle Active Dragging of Price Alert line
    if (draggedAlertId && onAddAlert) {
      const rawPrice = getPriceFromY(mouseY);
      const roundedPrice = +rawPrice.toFixed(symbolData.digits);
      // Update the alert price dynamically
      const targetAlert = symbolAlerts.find((a) => a.id === draggedAlertId);
      if (targetAlert && onDeleteAlert) {
        onDeleteAlert(targetAlert.id);
        onAddAlert({
          symbol: targetAlert.symbol,
          targetPrice: roundedPrice,
          condition: roundedPrice > currentLivePrice ? 'CROSSES_ABOVE' : 'CROSSES_BELOW',
          note: targetAlert.note,
        });
      }
      return;
    }

    // Handle Active Dragging of Risk/Reward levels
    if (draggedHandle) {
      const rawPrice = getPriceFromY(mouseY);
      const roundedPrice = +rawPrice.toFixed(symbolData.digits);

      if (draggedHandle === 'takeProfit') {
        onChangeRiskReward({
          ...riskReward,
          takeProfit: roundedPrice,
        });
      } else if (draggedHandle === 'stopLoss') {
        onChangeRiskReward({
          ...riskReward,
          stopLoss: roundedPrice,
        });
      } else if (draggedHandle === 'entry') {
        const delta = roundedPrice - riskReward.entryPrice;
        onChangeRiskReward({
          ...riskReward,
          entryPrice: roundedPrice,
          stopLoss: +(riskReward.stopLoss + delta).toFixed(symbolData.digits),
          takeProfit: +(riskReward.takeProfit + delta).toFixed(symbolData.digits),
        });
      }
      return;
    }

    // Normal crosshair tracking
    const relX = mouseX - padding.left;
    const idx = Math.floor(relX / candleSpacing);
    if (idx >= 0 && idx < candles.length) {
      setHoverIndex(idx);
    } else {
      setHoverIndex(null);
    }
  };

  const handleMouseLeave = () => {
    if (!draggedHandle && !draggedAlertId) {
      setHoverIndex(null);
      setMousePos(null);
      setHoveredAlertId(null);
    }
  };

  const smc = symbolData.smc;
  const currentLivePrice = symbolData.price;
  const livePriceY = getY(currentLivePrice);

  const priceDiff = currentCandle.close - currentCandle.open;
  const priceDiffPercent = (priceDiff / currentCandle.open) * 100;

  // Potential Outcome Calculations for Risk/Reward Tool
  const isLong = riskReward.side === 'LONG';
  const priceRisk = isLong 
    ? Math.max(0.00001, riskReward.entryPrice - riskReward.stopLoss) 
    : Math.max(0.00001, riskReward.stopLoss - riskReward.entryPrice);
  const priceReward = isLong 
    ? Math.max(0.00001, riskReward.takeProfit - riskReward.entryPrice) 
    : Math.max(0.00001, riskReward.entryPrice - riskReward.takeProfit);

  const rrRatioNum = priceReward / priceRisk;
  const rrRatioStr = isFinite(rrRatioNum) ? rrRatioNum.toFixed(2) : '0.00';

  // Multiplier for contract dollar values
  const contractMultiplier = symbolData.symbol === 'EURUSD'
    ? 100000
    : symbolData.symbol === 'BTCUSD'
    ? 1
    : symbolData.symbol === 'ETHUSD'
    ? 1
    : symbolData.symbol === 'SOLUSD'
    ? 1
    : 100;

  const potentialLossUSD = priceRisk * riskReward.lots * contractMultiplier;
  const potentialGainUSD = priceReward * riskReward.lots * contractMultiplier;
  const riskPercent = ((priceRisk / riskReward.entryPrice) * 100).toFixed(2);
  const rewardPercent = ((priceReward / riskReward.entryPrice) * 100).toFixed(2);
  const breakevenWinRate = ((1 / (1 + rrRatioNum)) * 100).toFixed(1);

  // SVG Geometry for R:R Overlay Box
  const rrStartX = Math.max(padding.left + 50, getX(Math.max(0, candles.length - 6)) - candleSpacing * 0.5);
  const rrEndX = dimensions.width - padding.right;
  const rrBoxWidth = Math.max(rrEndX - rrStartX, 120);
  const rrHandleX = rrStartX + rrBoxWidth * 0.45;

  const entryY = getY(riskReward.entryPrice);
  const tpY = getY(riskReward.takeProfit);
  const slY = getY(riskReward.stopLoss);

  const rewardTopY = Math.min(entryY, tpY);
  const rewardHeight = Math.max(Math.abs(entryY - tpY), 2);

  const riskTopY = Math.min(entryY, slY);
  const riskHeight = Math.max(Math.abs(entryY - slY), 2);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex-1 h-full bg-[#0d1017] overflow-hidden select-none flex flex-col"
    >
      {/* Top Header Inside Chart Canvas */}
      <div className="h-[34px] px-3 border-b border-[#1e222d] bg-[#0c0e14]/90 flex items-center justify-between text-[11px] font-mono z-10 shrink-0">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 font-bold text-[#dfe2f2]">
            <span>{symbolData.symbol},</span>
            <span className="text-[#f8bd42]">{timeframe},</span>
            <span className="text-[#787b86]">OANDA</span>
          </div>

          <div className="flex items-center gap-2 text-[#787b86]">
            <span>O <strong className="text-[#dfe2f2]">{formatPrice(currentCandle.open, symbolData.digits)}</strong></span>
            <span>H <strong className="text-[#dfe2f2]">{formatPrice(currentCandle.high, symbolData.digits)}</strong></span>
            <span>L <strong className="text-[#dfe2f2]">{formatPrice(currentCandle.low, symbolData.digits)}</strong></span>
            <span>C <strong className={priceDiff >= 0 ? 'text-[#26a69a]' : 'text-[#f23645]'}>{formatPrice(currentCandle.close, symbolData.digits)}</strong></span>
            <span className={priceDiff >= 0 ? 'text-[#26a69a]' : 'text-[#f23645]'}>
              {priceDiff >= 0 ? '+' : ''}{priceDiff.toFixed(symbolData.digits)} ({priceDiffPercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Close in timer */}
          <div className="flex items-center gap-1 text-[11px] text-[#787b86]">
            <span>CLOSE IN:</span>
            <span className="text-[#dfe2f2] font-bold">{formatCountdown(countdown)}</span>
          </div>

          <div className="w-[1px] h-3.5 bg-[#2a2e39]" />

          {/* PRICE ALERTS MANAGER BUTTON */}
          <button
            onClick={() => {
              if (onOpenAlertsModal) onOpenAlertsModal();
              sounds.playClick();
            }}
            title="Set Custom Price Alerts on Chart"
            className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1.5 cursor-pointer border transition-colors ${
              symbolAlerts.filter((a) => !a.triggered).length > 0
                ? 'border-[#f8bd42] text-[#f8bd42] bg-[#f8bd42]/10 font-bold'
                : 'border-[#2a2e39] text-[#787b86] hover:text-[#dfe2f2] hover:bg-[#1e222d]'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>ALERTS ({symbolAlerts.filter((a) => !a.triggered).length})</span>
            {symbolAlerts.filter((a) => !a.triggered).length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#f8bd42] animate-pulse" />
            )}
          </button>

          {/* VISUAL RISK / REWARD TOOL TOGGLE BUTTON */}
          <button
            onClick={() => {
              onChangeRiskReward({
                ...riskReward,
                visible: !riskReward.visible,
              });
              sounds.playClick();
            }}
            title="Toggle Visual Risk/Reward Ratio Tool on Chart"
            className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1.5 cursor-pointer border transition-colors ${
              riskReward.visible
                ? 'border-[#f8bd42] text-[#f8bd42] bg-[#f8bd42]/10 font-bold'
                : 'border-[#2a2e39] text-[#787b86] hover:text-[#dfe2f2] hover:bg-[#1e222d]'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>R:R TOOL</span>
            {riskReward.visible && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#26a69a] animate-pulse" />
            )}
          </button>

          {/* Overlays toggle */}
          <button
            onClick={() => {
              setShowOverlays(!showOverlays);
              sounds.playClick();
            }}
            title="Toggle SMC Structure Overlays"
            className="px-1.5 py-0.5 rounded text-[10px] text-[#787b86] hover:text-[#f8bd42] flex items-center gap-1 cursor-pointer"
          >
            {showOverlays ? <Eye className="w-3 h-3 text-[#f8bd42]" /> : <EyeOff className="w-3 h-3" />}
            <span className="hidden sm:inline">SMC</span>
          </button>

          {/* Quick buttons */}
          <button
            onClick={() => {
              setHoverIndex(null);
              sounds.playClick();
            }}
            className="px-1.5 py-0.5 text-[10px] text-[#787b86] hover:text-[#dfe2f2] cursor-pointer"
          >
            RESET
          </button>
          <button
            onClick={() => {
              setIsLogScale(!isLogScale);
              sounds.playClick();
            }}
            className={`px-1.5 py-0.5 text-[10px] cursor-pointer font-bold ${
              isLogScale ? 'text-[#f8bd42]' : 'text-[#787b86] hover:text-[#dfe2f2]'
            }`}
          >
            LOG
          </button>
          <button
            onClick={() => {
              sounds.playClick();
            }}
            className="px-1.5 py-0.5 text-[10px] text-[#f8bd42] font-bold cursor-pointer"
          >
            AUTO
          </button>
        </div>
      </div>

      {/* SVG Canvas for Chart */}
      <div className="relative flex-1 w-full h-full">
        {/* Background Watermark matching screenshot */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-[0.035]">
          <span className="text-[120px] font-black tracking-widest text-[#dfe2f2] font-mono leading-none">
            {symbolData.symbol}
          </span>
          <span className="text-[28px] font-bold tracking-widest text-[#dfe2f2] font-mono mt-1">
            VK QUANT TERMINAL v4.2
          </span>
        </div>

        <svg
          width={dimensions.width}
          height={dimensions.height - 34}
          className="absolute inset-0 w-full h-full overflow-hidden"
        >
          {/* Defs for gradients & patterns */}
          <defs>
            <linearGradient id="bullishGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#26a69a" />
              <stop offset="100%" stopColor="#089981" />
            </linearGradient>
            <linearGradient id="bearishRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef5350" />
              <stop offset="100%" stopColor="#f23645" />
            </linearGradient>
          </defs>

          {/* Grid lines horizontal */}
          {priceGridLines.map((price) => {
            const y = getY(price);
            return (
              <g key={`grid-y-${price}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={dimensions.width - padding.right}
                  y2={y}
                  stroke="#1c202b"
                  strokeWidth="1"
                  strokeDasharray="2 4"
                />
                {/* Price label on right axis */}
                <text
                  x={dimensions.width - padding.right + 8}
                  y={y + 3}
                  fill="#787b86"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                  textAnchor="start"
                >
                  {formatPrice(price, symbolData.digits)}
                </text>
              </g>
            );
          })}

          {/* Grid lines vertical (time) */}
          {candles.map((candle, idx) => {
            const x = getX(idx);
            const showLabel = idx % 2 === 0 || idx === candles.length - 1;
            return (
              <g key={`grid-x-${candle.time}-${idx}`}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={dimensions.height - padding.bottom}
                  stroke="#1c202b"
                  strokeWidth="1"
                  strokeDasharray="2 4"
                />
                {showLabel && (
                  <text
                    x={x}
                    y={dimensions.height - padding.bottom + 16}
                    fill="#787b86"
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                    textAnchor="middle"
                  >
                    {candle.time}
                  </text>
                )}
              </g>
            );
          })}

          {/* SMC STRUCTURE OVERLAYS */}
          {showOverlays && smc && (
            <g id="smc-overlays">
              {/* 1. Bearish Supply Order Block (-OB) */}
              {smc.supplyOB && (
                <g>
                  {(() => {
                    const topY = getY(smc.supplyOB.top);
                    const botY = getY(smc.supplyOB.bottom);
                    const height = Math.max(botY - topY, 8);
                    return (
                      <g>
                        <rect
                          x={padding.left}
                          y={topY}
                          width={dimensions.width - padding.right - padding.left}
                          height={height}
                          fill="#f23645"
                          fillOpacity="0.07"
                          stroke="#f23645"
                          strokeWidth="1"
                          strokeOpacity="0.6"
                        />
                        <text
                          x={padding.left + 8}
                          y={topY + 12}
                          fill="#ef5350"
                          fontSize="9"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="bold"
                        >
                          {smc.supplyOB.label}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}

              {/* 2. BSL Swept Line */}
              {smc.bslSwept && (
                <g>
                  {(() => {
                    const y = getY(smc.bslSwept.price);
                    const startX = getX(candles.length - 5);
                    const endX = getX(candles.length - 3);
                    return (
                      <g>
                        <line
                          x1={startX}
                          y1={y}
                          x2={dimensions.width - padding.right}
                          y2={y}
                          stroke="#ff79c6"
                          strokeWidth="1.2"
                          strokeDasharray="3 3"
                        />
                        <circle cx={startX} cy={y} r="2.5" fill="#ff79c6" />
                        <circle cx={endX} cy={y} r="2.5" fill="#ff79c6" />
                        <text
                          x={startX + 30}
                          y={y - 5}
                          fill="#ff79c6"
                          fontSize="9"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="bold"
                        >
                          {smc.bslSwept.label}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}

              {/* 3. VAH */}
              {smc.vah && (
                <g>
                  {(() => {
                    const y = getY(smc.vah.price);
                    return (
                      <g>
                        <line
                          x1={padding.left + chartWidth * 0.4}
                          y1={y}
                          x2={dimensions.width - padding.right}
                          y2={y}
                          stroke="#f8bd42"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                          strokeOpacity="0.7"
                        />
                        <text
                          x={dimensions.width - padding.right - 80}
                          y={y - 4}
                          fill="#f8bd42"
                          fontSize="9"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {smc.vah.label}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}

              {/* 4. POC */}
              {smc.poc && (
                <g>
                  {(() => {
                    const y = getY(smc.poc.price);
                    return (
                      <g>
                        <line
                          x1={padding.left + chartWidth * 0.3}
                          y1={y}
                          x2={dimensions.width - padding.right}
                          y2={y}
                          stroke="#e0a82e"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                          strokeOpacity="0.6"
                        />
                        <text
                          x={dimensions.width - padding.right - 70}
                          y={y - 4}
                          fill="#e0a82e"
                          fontSize="9"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {smc.poc.label}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}

              {/* 5. BOS */}
              {smc.bos && (
                <g>
                  {(() => {
                    const y = getY(smc.bos.price);
                    const startX = getX(candles.length - 6);
                    return (
                      <g>
                        <line
                          x1={startX}
                          y1={y}
                          x2={dimensions.width - padding.right}
                          y2={y}
                          stroke="#f8bd42"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={startX + 40}
                          y={y + 11}
                          fill="#f8bd42"
                          fontSize="9"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="bold"
                        >
                          {smc.bos.label}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}

              {/* 6. +FVG */}
              {smc.fvg && (
                <g>
                  {(() => {
                    const topY = getY(smc.fvg.top);
                    const botY = getY(smc.fvg.bottom);
                    const height = Math.max(botY - topY, 8);
                    return (
                      <g>
                        <rect
                          x={padding.left}
                          y={topY}
                          width={dimensions.width - padding.right - padding.left}
                          height={height}
                          fill="#089981"
                          fillOpacity="0.08"
                          stroke="#20a28a"
                          strokeWidth="1"
                          strokeOpacity="0.6"
                          strokeDasharray="4 3"
                        />
                        <text
                          x={padding.left + 8}
                          y={topY + height - 4}
                          fill="#26a69a"
                          fontSize="9"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="bold"
                        >
                          {smc.fvg.label}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}

              {/* 7. VAL */}
              {smc.val && (
                <g>
                  {(() => {
                    const y = getY(smc.val.price);
                    return (
                      <g>
                        <line
                          x1={padding.left + chartWidth * 0.45}
                          y1={y}
                          x2={dimensions.width - padding.right}
                          y2={y}
                          stroke="#26a69a"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                          strokeOpacity="0.7"
                        />
                        <text
                          x={dimensions.width - padding.right - 80}
                          y={y + 11}
                          fill="#26a69a"
                          fontSize="9"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {smc.val.label}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}
            </g>
          )}

          {/* VISUAL RISK / REWARD TOOL OVERLAY ON SVG */}
          {riskReward.visible && (
            <g id="risk-reward-overlay">
              {/* REWARD (TARGET) SHADED ZONE */}
              <rect
                x={rrStartX}
                y={rewardTopY}
                width={rrBoxWidth}
                height={rewardHeight}
                fill="#089981"
                fillOpacity="0.22"
                stroke="#26a69a"
                strokeWidth="1.2"
              />

              {/* RISK (STOP LOSS) SHADED ZONE */}
              <rect
                x={rrStartX}
                y={riskTopY}
                width={rrBoxWidth}
                height={riskHeight}
                fill="#f23645"
                fillOpacity="0.22"
                stroke="#ef5350"
                strokeWidth="1.2"
              />

              {/* ENTRY LEVEL DIVIDER LINE */}
              <line
                x1={rrStartX}
                y1={entryY}
                x2={rrEndX}
                y2={entryY}
                stroke="#f8bd42"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />

              {/* TARGET LINE */}
              <line
                x1={rrStartX}
                y1={tpY}
                x2={rrEndX}
                y2={tpY}
                stroke="#26a69a"
                strokeWidth="1.5"
              />

              {/* STOP LOSS LINE */}
              <line
                x1={rrStartX}
                y1={slY}
                x2={rrEndX}
                y2={slY}
                stroke="#ef5350"
                strokeWidth="1.5"
              />

              {/* LABELS DIRECTLY ON THE CHART */}
              {/* Target Label */}
              <g>
                <rect
                  x={rrStartX + 8}
                  y={tpY - 18}
                  width="220"
                  height="16"
                  fill="#0c0e14"
                  fillOpacity="0.85"
                  stroke="#26a69a"
                  strokeWidth="0.8"
                  rx="2"
                />
                <text
                  x={rrStartX + 14}
                  y={tpY - 6}
                  fill="#26a69a"
                  fontSize="9.5"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="bold"
                >
                  TARGET: ${formatPrice(riskReward.takeProfit, symbolData.digits)} (+${priceReward.toFixed(symbolData.digits)} / +${rewardPercent}%)
                </text>
              </g>

              {/* Entry Label */}
              <g>
                <rect
                  x={rrStartX + 8}
                  y={entryY - 8}
                  width="130"
                  height="16"
                  fill="#0c0e14"
                  fillOpacity="0.85"
                  stroke="#f8bd42"
                  strokeWidth="0.8"
                  rx="2"
                />
                <text
                  x={rrStartX + 14}
                  y={entryY + 4}
                  fill="#f8bd42"
                  fontSize="9.5"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="bold"
                >
                  ENTRY: ${formatPrice(riskReward.entryPrice, symbolData.digits)}
                </text>
              </g>

              {/* Stop Loss Label */}
              <g>
                <rect
                  x={rrStartX + 8}
                  y={slY + 3}
                  width="220"
                  height="16"
                  fill="#0c0e14"
                  fillOpacity="0.85"
                  stroke="#ef5350"
                  strokeWidth="0.8"
                  rx="2"
                />
                <text
                  x={rrStartX + 14}
                  y={slY + 15}
                  fill="#ef5350"
                  fontSize="9.5"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="bold"
                >
                  STOP: ${formatPrice(riskReward.stopLoss, symbolData.digits)} (-${priceRisk.toFixed(symbolData.digits)} / -${riskPercent}%)
                </text>
              </g>

              {/* DRAGGABLE HANDLES (With NS-RESIZE CURSOR) */}
              {/* Take Profit Handle */}
              <circle
                cx={rrHandleX}
                cy={tpY}
                r="6"
                fill="#26a69a"
                stroke="#0c0e14"
                strokeWidth="2"
                className="cursor-ns-resize hover:r-7 transition-all"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDraggedHandle('takeProfit');
                  sounds.playClick();
                }}
              />

              {/* Entry Handle */}
              <circle
                cx={rrHandleX}
                cy={entryY}
                r="6"
                fill="#f8bd42"
                stroke="#0c0e14"
                strokeWidth="2"
                className="cursor-ns-resize hover:r-7 transition-all"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDraggedHandle('entry');
                  sounds.playClick();
                }}
              />

              {/* Stop Loss Handle */}
              <circle
                cx={rrHandleX}
                cy={slY}
                r="6"
                fill="#ef5350"
                stroke="#0c0e14"
                strokeWidth="2"
                className="cursor-ns-resize hover:r-7 transition-all"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDraggedHandle('stopLoss');
                  sounds.playClick();
                }}
              />
            </g>
          )}

          {/* Volume Histogram Bars */}
          <g id="volume-bars">
            {candles.map((candle, idx) => {
              const x = getX(idx);
              const isBull = candle.close >= candle.open;
              const volHeight = (candle.volume / maxVolume) * 45;
              const volY = dimensions.height - padding.bottom - volHeight;

              return (
                <rect
                  key={`vol-${idx}`}
                  x={x - candleBodyWidth / 2}
                  y={volY}
                  width={candleBodyWidth}
                  height={volHeight}
                  fill={isBull ? '#089981' : '#f23645'}
                  fillOpacity="0.35"
                  rx="1"
                />
              );
            })}
          </g>

          {/* Candlesticks (Wicks and Bodies) */}
          <g id="candlesticks">
            {candles.map((candle, idx) => {
              const x = getX(idx);
              const isBull = candle.close >= candle.open;
              const openY = getY(candle.open);
              const closeY = getY(candle.close);
              const highY = getY(candle.high);
              const lowY = getY(candle.low);

              const bodyTop = Math.min(openY, closeY);
              const bodyHeight = Math.max(Math.abs(closeY - openY), 2);

              return (
                <g key={`candle-${idx}`} className="transition-all duration-150">
                  {/* High-Low Wick */}
                  <line
                    x1={x}
                    y1={highY}
                    x2={x}
                    y2={lowY}
                    stroke={isBull ? '#26a69a' : '#ef5350'}
                    strokeWidth="1.5"
                  />

                  {/* Body */}
                  <rect
                    x={x - candleBodyWidth / 2}
                    y={bodyTop}
                    width={candleBodyWidth}
                    height={bodyHeight}
                    fill={isBull ? 'url(#bullishGreen)' : 'url(#bearishRed)'}
                    stroke={isBull ? '#26a69a' : '#ef5350'}
                    strokeWidth="0.8"
                    rx="1"
                  />
                </g>
              );
            })}
          </g>

          {/* Current Live Price Line & Right Badge */}
          <g id="live-price-line">
            <line
              x1={padding.left}
              y1={livePriceY}
              x2={dimensions.width - padding.right}
              y2={livePriceY}
              stroke="#f8bd42"
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />
            <rect
              x={dimensions.width - padding.right}
              y={livePriceY - 10}
              width={padding.right}
              height="20"
              fill="#f8bd42"
              rx="2"
            />
            <text
              x={dimensions.width - padding.right + 5}
              y={livePriceY + 4}
              fill="#0f131e"
              fontSize="11"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="bold"
            >
              {formatPrice(currentLivePrice, symbolData.digits)}
            </text>
          </g>

          {/* ACTIVE CUSTOM PRICE ALERTS ON CHART */}
          <g id="price-alerts-layer">
            {symbolAlerts
              .filter((alert) => !alert.triggered)
              .map((alert) => {
                const alertY = getY(alert.targetPrice);
                // Check if alert line is within chart view vertically
                if (alertY < padding.top - 10 || alertY > dimensions.height - padding.bottom + 10) {
                  return null;
                }
                const isHovered = hoveredAlertId === alert.id;
                const isDragged = draggedAlertId === alert.id;
                const isAboveMark = alert.targetPrice >= currentLivePrice;
                const strokeColor = alert.condition === 'CROSSES_ABOVE' 
                  ? '#26a69a' 
                  : alert.condition === 'CROSSES_BELOW' 
                  ? '#ef5350' 
                  : '#f8bd42';

                return (
                  <g
                    key={alert.id}
                    className="cursor-ns-resize group"
                    onMouseEnter={() => setHoveredAlertId(alert.id)}
                    onMouseLeave={() => {
                      if (!draggedAlertId) setHoveredAlertId(null);
                    }}
                  >
                    {/* Wider hit zone for drag/hover */}
                    <line
                      x1={padding.left}
                      y1={alertY}
                      x2={dimensions.width - padding.right}
                      y2={alertY}
                      stroke="transparent"
                      strokeWidth="14"
                      className="cursor-ns-resize"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggedAlertId(alert.id);
                        sounds.playClick();
                      }}
                    />

                    {/* Visual dashed alert line */}
                    <line
                      x1={padding.left}
                      y1={alertY}
                      x2={dimensions.width - padding.right}
                      y2={alertY}
                      stroke={strokeColor}
                      strokeWidth={isHovered || isDragged ? '2' : '1.3'}
                      strokeDasharray={isDragged ? 'none' : '5 4'}
                      strokeOpacity={isHovered || isDragged ? '1' : '0.85'}
                      className="transition-all"
                    />

                    {/* Left Alert Bell Flag / Label */}
                    <g
                      transform={`translate(${padding.left + 10}, ${alertY - 9})`}
                      className="pointer-events-auto cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenAlertsModal) onOpenAlertsModal();
                        sounds.playClick();
                      }}
                    >
                      <rect
                        x="0"
                        y="0"
                        width={alert.note ? Math.min(180, alert.note.length * 6.5 + 45) : 88}
                        height="18"
                        fill="#0c0e14"
                        fillOpacity="0.9"
                        stroke={strokeColor}
                        strokeWidth="1"
                        rx="3"
                      />
                      {/* Bell dot indicator */}
                      <circle cx="8" cy="9" r="3.5" fill={strokeColor} />
                      <text
                        x="16"
                        y="12.5"
                        fill="#dfe2f2"
                        fontSize="9"
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="bold"
                      >
                        ALERT: ${formatPrice(alert.targetPrice, symbolData.digits)}
                      </text>
                      {alert.note && (
                        <text
                          x="98"
                          y="12.5"
                          fill="#787b86"
                          fontSize="8.5"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {alert.note.slice(0, 14)}
                        </text>
                      )}
                    </g>

                    {/* Delete button icon pill on chart when hovered */}
                    {(isHovered || isDragged) && onDeleteAlert && (
                      <g
                        transform={`translate(${dimensions.width - padding.right - 26}, ${alertY - 8})`}
                        className="pointer-events-auto cursor-pointer hover:opacity-100 opacity-80"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAlert(alert.id);
                          sounds.playClick();
                        }}
                      >
                        <rect
                          x="0"
                          y="0"
                          width="16"
                          height="16"
                          fill="#ef5350"
                          rx="3"
                        />
                        <text
                          x="4.5"
                          y="11.5"
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          ×
                        </text>
                      </g>
                    )}

                    {/* Right Axis Price Tag */}
                    <g
                      transform={`translate(${dimensions.width - padding.right}, ${alertY - 9})`}
                      className="cursor-ns-resize"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggedAlertId(alert.id);
                        sounds.playClick();
                      }}
                    >
                      <rect
                        x="0"
                        y="0"
                        width={padding.right}
                        height="18"
                        fill={isHovered || isDragged ? strokeColor : '#1e222d'}
                        stroke={strokeColor}
                        strokeWidth="1"
                        rx="2"
                      />
                      <text
                        x="5"
                        y="12.5"
                        fill={isHovered || isDragged ? '#0f131e' : '#dfe2f2'}
                        fontSize="10"
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="bold"
                      >
                        {formatPrice(alert.targetPrice, symbolData.digits)}
                      </text>
                    </g>
                  </g>
                );
              })}
          </g>

          {/* Interactive Crosshair & Floating Tooltip */}
          {mousePos && mousePos.x >= padding.left && mousePos.x <= dimensions.width - padding.right && (
            <g id="crosshair">
              {/* Vertical line */}
              <line
                x1={mousePos.x}
                y1={padding.top}
                x2={mousePos.x}
                y2={dimensions.height - padding.bottom}
                stroke="#dfe2f2"
                strokeWidth="0.7"
                strokeDasharray="3 3"
                strokeOpacity="0.6"
              />
              {/* Horizontal line */}
              <line
                x1={padding.left}
                y1={mousePos.y}
                x2={dimensions.width - padding.right}
                y2={mousePos.y}
                stroke="#dfe2f2"
                strokeWidth="0.7"
                strokeDasharray="3 3"
                strokeOpacity="0.6"
              />

              {/* Crosshair Price Tag on Right Axis */}
              <rect
                x={dimensions.width - padding.right}
                y={mousePos.y - 9}
                width={padding.right}
                height="18"
                fill="#2a2e39"
                stroke="#787b86"
                strokeWidth="0.5"
                rx="2"
              />
              <text
                x={dimensions.width - padding.right + 5}
                y={mousePos.y + 4}
                fill="#dfe2f2"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
              >
                {formatPrice(getPriceFromY(mousePos.y), symbolData.digits)}
              </text>
            </g>
          )}
        </svg>

        {/* Hover Crosshair Info Floating Card */}
        {hoverIndex !== null && candles[hoverIndex] && !draggedHandle && (
          <div
            className="absolute top-2 left-3 bg-[#131722]/95 border border-[#2a2e39] rounded px-2.5 py-1.5 shadow-xl text-[10px] font-mono pointer-events-none z-20 flex items-center gap-3"
          >
            <div>
              <span className="text-[#787b86]">TIME: </span>
              <span className="text-[#dfe2f2] font-bold">{candles[hoverIndex].time}</span>
            </div>
            <div>
              <span className="text-[#787b86]">VOL: </span>
              <span className="text-[#dfe2f2] font-semibold">{candles[hoverIndex].volume.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* FLOATING RISK / REWARD INTERACTIVE HUD WIDGET */}
        {riskReward.visible && (
          <div className="absolute bottom-4 left-4 z-20 w-[290px] bg-[#0c0e14]/95 backdrop-blur-md border border-[#2a2e39] rounded shadow-2xl font-mono text-[11px] overflow-hidden select-none">
            {/* HUD Header Bar */}
            <div className="h-8 px-2.5 bg-[#131722] border-b border-[#1e222d] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#f8bd42]" />
                <span className="font-bold text-[#dfe2f2] text-[10px] tracking-wide">
                  RISK / REWARD PLANNER
                </span>
              </div>
              <div className="flex items-center gap-1">
                {/* Side Toggle */}
                <button
                  onClick={() => {
                    const nextSide = isLong ? 'SHORT' : 'LONG';
                    // Invert TP and SL around entry
                    const diff = Math.abs(riskReward.takeProfit - riskReward.entryPrice);
                    const slDiff = Math.abs(riskReward.entryPrice - riskReward.stopLoss);
                    onChangeRiskReward({
                      ...riskReward,
                      side: nextSide,
                      takeProfit: +(nextSide === 'LONG' ? riskReward.entryPrice + diff : riskReward.entryPrice - diff).toFixed(symbolData.digits),
                      stopLoss: +(nextSide === 'LONG' ? riskReward.entryPrice - slDiff : riskReward.entryPrice + slDiff).toFixed(symbolData.digits),
                    });
                    sounds.playClick();
                  }}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
                    isLong
                      ? 'bg-[#26a69a]/20 text-[#26a69a] border border-[#26a69a]/40'
                      : 'bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/40'
                  }`}
                >
                  {riskReward.side}
                </button>

                {/* Minimize Button */}
                <button
                  onClick={() => setIsHudMinimized(!isHudMinimized)}
                  className="p-1 text-[#787b86] hover:text-[#dfe2f2] cursor-pointer"
                >
                  {isHudMinimized ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* HUD Body */}
            {!isHudMinimized && (
              <div className="p-2.5 space-y-2">
                {/* R:R Ratio & Breakeven Display */}
                <div className="flex items-center justify-between p-2 bg-[#131722] rounded border border-[#1e222d]">
                  <div>
                    <div className="text-[9px] text-[#787b86] uppercase">R:R RATIO</div>
                    <div className="text-[16px] font-bold text-[#f8bd42]">
                      1 : {rrRatioStr} R
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-[#787b86] uppercase">BREAKEVEN WIN RATE</div>
                    <div className="text-[12px] font-semibold text-[#dfe2f2]">
                      {breakevenWinRate}%
                    </div>
                  </div>
                </div>

                {/* Potential Gain vs Potential Loss */}
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="p-1.5 bg-[#131722] rounded border border-[#26a69a]/30">
                    <div className="text-[#787b86]">TARGET GAIN</div>
                    <div className="text-[#26a69a] font-bold text-[11px]">
                      +${potentialGainUSD.toFixed(2)}
                    </div>
                    <div className="text-[9px] text-[#787b86]">
                      +{priceReward.toFixed(symbolData.digits)} (+{rewardPercent}%)
                    </div>
                  </div>
                  <div className="p-1.5 bg-[#131722] rounded border border-[#f23645]/30">
                    <div className="text-[#787b86]">CAPITAL RISK</div>
                    <div className="text-[#f23645] font-bold text-[11px]">
                      -${potentialLossUSD.toFixed(2)}
                    </div>
                    <div className="text-[9px] text-[#787b86]">
                      -{priceRisk.toFixed(symbolData.digits)} (-{riskPercent}%)
                    </div>
                  </div>
                </div>

                {/* Level Adjusters */}
                <div className="space-y-1 text-[10px]">
                  {/* Lots */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#787b86]">VOLUME:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onChangeRiskReward({
                            ...riskReward,
                            lots: Math.max(0.01, +(riskReward.lots - 0.01).toFixed(2)),
                          });
                        }}
                        className="w-4 h-4 bg-[#1e222d] hover:bg-[#2a2e39] text-[#dfe2f2] rounded flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-[#dfe2f2] font-bold px-1">{riskReward.lots.toFixed(2)} Lots</span>
                      <button
                        onClick={() => {
                          onChangeRiskReward({
                            ...riskReward,
                            lots: +(riskReward.lots + 0.01).toFixed(2),
                          });
                        }}
                        className="w-4 h-4 bg-[#1e222d] hover:bg-[#2a2e39] text-[#dfe2f2] rounded flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Snap to Market */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#1e222d]">
                    <span className="text-[#787b86]">MARKET:</span>
                    <button
                      onClick={() => {
                        const delta = currentLivePrice - riskReward.entryPrice;
                        onChangeRiskReward({
                          ...riskReward,
                          entryPrice: currentLivePrice,
                          stopLoss: +(riskReward.stopLoss + delta).toFixed(symbolData.digits),
                          takeProfit: +(riskReward.takeProfit + delta).toFixed(symbolData.digits),
                        });
                        sounds.playClick();
                      }}
                      className="text-[9px] text-[#f8bd42] hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Snap Entry to Live Mark (${formatPrice(currentLivePrice, symbolData.digits)})</span>
                    </button>
                  </div>
                </div>

                {/* Action Button: Sync to Order Ticket */}
                {onSyncToOrderTicket && (
                  <button
                    onClick={() => {
                      onSyncToOrderTicket(riskReward);
                      sounds.playClick();
                    }}
                    className="w-full py-1.5 bg-[#1b1f2b] hover:bg-[#2a2e39] border border-[#f8bd42] rounded text-[#f8bd42] font-bold text-[10px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>SYNC TO EXECUTION TICKET</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
