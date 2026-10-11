import React, { useState, useMemo } from 'react';
import { SymbolData } from '../types/terminal';
import { SYMBOLS_DATABASE } from '../data/mockData';
import { sounds } from '../utils/audio';
import { formatPrice } from '../utils/format';
import {
  Grid3X3,
  SlidersHorizontal,
  Layers,
  ArrowRightLeft,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Info,
  Maximize2,
  Minimize2,
  TrendingUp,
  TrendingDown,
  Activity,
  Check,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';

interface CorrelationMatrixProps {
  symbols?: Record<string, SymbolData>;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onSelectSymbol?: (symbolKey: string) => void;
}

export type CorrelationMethod = 'returns' | 'prices';

interface PairCorrelation {
  sym1: string;
  sym2: string;
  name1: string;
  name2: string;
  cat1: string;
  cat2: string;
  correlation: number;
  diversificationRating: 'OPTIMAL' | 'MODERATE' | 'POOR_OVERLAP' | 'HEDGE';
  description: string;
}

export const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({
  symbols = SYMBOLS_DATABASE,
  isExpanded = false,
  onToggleExpand,
  onSelectSymbol,
}) => {
  const [method, setMethod] = useState<CorrelationMethod>('returns');
  const [selectedPair, setSelectedPair] = useState<{ sym1: string; sym2: string } | null>({
    sym1: 'XAUUSD',
    sym2: 'US500',
  });
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [activeSubView, setActiveSubView] = useState<'matrix' | 'opportunities'>('matrix');

  // List of active symbols from database
  const symbolKeys = useMemo(() => {
    const keys = Object.keys(symbols);
    if (filterCategory === 'ALL') return keys;
    return keys.filter((k) => symbols[k]?.category === filterCategory);
  }, [symbols, filterCategory]);

  // Extract Close price series and Returns series
  const seriesData = useMemo(() => {
    const map: Record<string, { prices: number[]; returns: number[]; candles: any[] }> = {};
    Object.keys(symbols).forEach((k) => {
      const sym = symbols[k];
      const candles = sym.candles || [];
      const prices = candles.map((c) => c.close);
      const returns: number[] = [];
      for (let i = 1; i < prices.length; i++) {
        const prev = prices[i - 1];
        const curr = prices[i];
        returns.push(prev !== 0 ? (curr - prev) / prev : 0);
      }
      map[k] = { prices, returns, candles };
    });
    return map;
  }, [symbols]);

  // Compute Pearson Correlation between two arrays
  const calculateCorrelation = (arr1: number[], arr2: number[]): number => {
    const minLen = Math.min(arr1.length, arr2.length);
    if (minLen < 2) return 0;

    const x = arr1.slice(arr1.length - minLen);
    const y = arr2.slice(arr2.length - minLen);

    const meanX = x.reduce((a, b) => a + b, 0) / minLen;
    const meanY = y.reduce((a, b) => a + b, 0) / minLen;

    let cov = 0;
    let varX = 0;
    let varY = 0;

    for (let i = 0; i < minLen; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      cov += dx * dy;
      varX += dx * dx;
      varY += dy * dy;
    }

    if (varX === 0 || varY === 0) return 0;
    const r = cov / (Math.sqrt(varX) * Math.sqrt(varY));
    // Clamp to [-1, 1]
    return Math.max(-1, Math.min(1, r));
  };

  // Full correlation matrix mapping: [sym1][sym2] => correlation value
  const matrix = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};

    symbolKeys.forEach((s1) => {
      result[s1] = {};
      symbolKeys.forEach((s2) => {
        if (s1 === s2) {
          result[s1][s2] = 1.0;
        } else {
          const series1 = method === 'returns' ? seriesData[s1]?.returns : seriesData[s1]?.prices;
          const series2 = method === 'returns' ? seriesData[s2]?.returns : seriesData[s2]?.prices;
          const r = calculateCorrelation(series1 || [], series2 || []);
          result[s1][s2] = +r.toFixed(2);
        }
      });
    });

    return result;
  }, [symbolKeys, method, seriesData]);

  // All distinct pairs (s1 < s2) ranked for diversification opportunities
  const rankedPairs = useMemo(() => {
    const pairs: PairCorrelation[] = [];
    const keys = Object.keys(symbols);

    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const s1 = keys[i];
        const s2 = keys[j];
        const series1 = method === 'returns' ? seriesData[s1]?.returns : seriesData[s1]?.prices;
        const series2 = method === 'returns' ? seriesData[s2]?.returns : seriesData[s2]?.prices;
        const r = calculateCorrelation(series1 || [], series2 || []);
        const roundedR = +r.toFixed(2);

        let diversificationRating: 'OPTIMAL' | 'MODERATE' | 'POOR_OVERLAP' | 'HEDGE';
        let description = '';

        if (roundedR < -0.3) {
          diversificationRating = 'HEDGE';
          description = 'Strong inverse correlation. Ideal for portfolio hedging and risk insulation.';
        } else if (roundedR >= -0.3 && roundedR <= 0.3) {
          diversificationRating = 'OPTIMAL';
          description = 'Near zero correlation. Maximum diversification benefit without redundant beta.';
        } else if (roundedR > 0.3 && roundedR <= 0.7) {
          diversificationRating = 'MODERATE';
          description = 'Moderate co-movement. Partial diversification with shared macroeconomic factors.';
        } else {
          diversificationRating = 'POOR_OVERLAP';
          description = 'High correlation. Co-directional movement increases portfolio drawdown risk.';
        }

        pairs.push({
          sym1: s1,
          sym2: s2,
          name1: symbols[s1]?.name || s1,
          name2: symbols[s2]?.name || s2,
          cat1: symbols[s1]?.category || '',
          cat2: symbols[s2]?.category || '',
          correlation: roundedR,
          diversificationRating,
          description,
        });
      }
    }

    // Sort by lowest correlation (greatest diversification / hedging power)
    return pairs.sort((a, b) => a.correlation - b.correlation);
  }, [symbols, method, seriesData]);

  // Portfolio level metrics
  const portfolioMetrics = useMemo(() => {
    if (rankedPairs.length === 0) return { avgCorr: 0, bestDiversifier: null, highestRisk: null };
    const avg = rankedPairs.reduce((acc, p) => acc + p.correlation, 0) / rankedPairs.length;
    const best = rankedPairs[0]; // lowest correlation
    const worst = [...rankedPairs].sort((a, b) => b.correlation - a.correlation)[0]; // highest correlation

    return {
      avgCorr: +avg.toFixed(2),
      bestDiversifier: best,
      highestRisk: worst,
    };
  }, [rankedPairs]);

  // Get color and styles for correlation cell
  const getCellColor = (val: number, isSelf: boolean) => {
    if (isSelf) {
      return {
        bg: 'bg-[#1e222d]/70',
        text: 'text-[#dfe2f2]/60 font-bold',
        border: 'border-[#2a2e39]',
        label: 'Self (1.00)',
      };
    }

    if (val >= 0.7) {
      // Strong Positive (Teal / Emerald)
      return {
        bg: 'bg-[#26a69a]/35 hover:bg-[#26a69a]/50',
        text: 'text-[#26a69a] font-bold',
        border: 'border-[#26a69a]/40',
        label: 'Strong Co-movement',
      };
    }
    if (val >= 0.3) {
      // Moderate Positive (Muted Teal)
      return {
        bg: 'bg-[#26a69a]/15 hover:bg-[#26a69a]/30',
        text: 'text-[#26a69a]/90 font-medium',
        border: 'border-[#26a69a]/25',
        label: 'Moderate Positive',
      };
    }
    if (val > -0.3 && val < 0.3) {
      // Uncorrelated / Optimal diversification (Slate / Indigo tint)
      return {
        bg: 'bg-[#38bdf8]/10 hover:bg-[#38bdf8]/25',
        text: 'text-[#38bdf8] font-bold',
        border: 'border-[#38bdf8]/30',
        label: 'Uncorrelated (High Diversification)',
      };
    }
    if (val <= -0.7) {
      // Strong Negative (Crimson / Red - Strong Hedge)
      return {
        bg: 'bg-[#f23645]/35 hover:bg-[#f23645]/50',
        text: 'text-[#f23645] font-bold',
        border: 'border-[#f23645]/40',
        label: 'Strong Hedge (Inverse)',
      };
    }
    // Moderate Negative (Amber / Orange)
    return {
      bg: 'bg-[#f97316]/20 hover:bg-[#f97316]/35',
      text: 'text-[#f97316] font-semibold',
      border: 'border-[#f97316]/30',
      label: 'Moderate Hedge',
    };
  };

  // Currently inspected pair details
  const inspectedPairInfo = useMemo(() => {
    if (!selectedPair) return null;
    const { sym1, sym2 } = selectedPair;
    if (sym1 === sym2) {
      return {
        sym1,
        sym2,
        correlation: 1.0,
        rating: 'SELF',
        title: `${sym1} Self-Correlation`,
        badgeColor: 'bg-[#1e222d] text-[#dfe2f2] border-[#2a2e39]',
        advice: 'Identity match. Always perfect co-variance (1.00).',
        spark1: seriesData[sym1]?.prices || [],
        spark2: seriesData[sym2]?.prices || [],
      };
    }

    const pair = rankedPairs.find(
      (p) => (p.sym1 === sym1 && p.sym2 === sym2) || (p.sym1 === sym2 && p.sym2 === sym1)
    );

    const corr = pair ? pair.correlation : (matrix[sym1]?.[sym2] ?? 0);
    let badgeColor = 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/40';
    let advice = '';

    if (corr >= 0.7) {
      badgeColor = 'bg-[#26a69a]/20 text-[#26a69a] border-[#26a69a]/40';
      advice =
        'High correlation (> +0.70). Holding simultaneous long positions across both assets multiplies downside exposure. Avoid stacking position risk in this cluster.';
    } else if (corr >= 0.3) {
      badgeColor = 'bg-teal-500/15 text-teal-300 border-teal-500/30';
      advice =
        'Moderate positive correlation (+0.30 to +0.70). Assets exhibit loose alignment during macro market regime shifts.';
    } else if (corr <= -0.3) {
      badgeColor = 'bg-[#f23645]/20 text-[#f23645] border-[#f23645]/40';
      advice =
        'Inverse correlation (Hedging Asset). Opening opposite or balancing positions can mitigate portfolio volatility during drawdowns.';
    } else {
      badgeColor = 'bg-[#38bdf8]/20 text-[#38bdf8] border-[#38bdf8]/40';
      advice =
        'Uncorrelated (-0.30 to +0.30). Prime diversification asset pair! Price variance is statistically independent, improving portfolio Sharpe ratio.';
    }

    return {
      sym1,
      sym2,
      correlation: corr,
      rating: pair?.diversificationRating || (corr < 0.3 && corr > -0.3 ? 'OPTIMAL' : 'MODERATE'),
      title: `${sym1} vs ${sym2}`,
      badgeColor,
      advice,
      spark1: seriesData[sym1]?.prices || [],
      spark2: seriesData[sym2]?.prices || [],
    };
  }, [selectedPair, rankedPairs, matrix, seriesData]);

  return (
    <div className="flex flex-col h-full bg-[#0c0e14] text-[#dfe2f2] font-mono text-[11px] overflow-hidden select-none">
      {/* Top Controls & Portfolio Summary Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#131722]/80 border-b border-[#1e222d] shrink-0">
        {/* Left: View Modes & Calculation Method */}
        <div className="flex items-center gap-2">
          {/* Sub-view toggle */}
          <div className="flex bg-[#0f131e] p-0.5 rounded border border-[#2a2e39]">
            <button
              onClick={() => {
                setActiveSubView('matrix');
                sounds.playClick();
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                activeSubView === 'matrix'
                  ? 'bg-[#f8bd42] text-[#0f131e]'
                  : 'text-[#787b86] hover:text-[#dfe2f2]'
              }`}
            >
              <Grid3X3 className="w-3 h-3" />
              <span>HEATMAP MATRIX</span>
            </button>
            <button
              onClick={() => {
                setActiveSubView('opportunities');
                sounds.playClick();
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                activeSubView === 'opportunities'
                  ? 'bg-[#f8bd42] text-[#0f131e]'
                  : 'text-[#787b86] hover:text-[#dfe2f2]'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>DIVERSIFICATION RANKING</span>
            </button>
          </div>

          {/* Math Method Toggle */}
          <div className="flex items-center gap-1 ml-2 text-[10px]">
            <span className="text-[#787b86]">METHOD:</span>
            <button
              onClick={() => {
                setMethod('returns');
                sounds.playClick();
              }}
              title="Standard quantitative return correlation (ΔP / P)"
              className={`px-1.5 py-0.5 rounded cursor-pointer border ${
                method === 'returns'
                  ? 'border-[#38bdf8] bg-[#38bdf8]/15 text-[#38bdf8] font-bold'
                  : 'border-[#1e222d] bg-[#0c0e14] text-[#787b86] hover:text-[#dfe2f2]'
              }`}
            >
              RETURNS (ΔP%)
            </button>
            <button
              onClick={() => {
                setMethod('prices');
                sounds.playClick();
              }}
              title="Direct historical price series level correlation"
              className={`px-1.5 py-0.5 rounded cursor-pointer border ${
                method === 'prices'
                  ? 'border-[#38bdf8] bg-[#38bdf8]/15 text-[#38bdf8] font-bold'
                  : 'border-[#1e222d] bg-[#0c0e14] text-[#787b86] hover:text-[#dfe2f2]'
              }`}
            >
              PRICE LEVELS
            </button>
          </div>

          {/* Category Filter */}
          <div className="hidden lg:flex items-center gap-1 ml-2 text-[10px]">
            <span className="text-[#787b86]">SECTOR:</span>
            {['ALL', 'CRYPTO', 'FOREX', 'COMMODITIES', 'INDICES'].map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setFilterCategory(cat);
                  sounds.playClick();
                }}
                className={`px-1.5 py-0.5 rounded text-[9px] cursor-pointer ${
                  filterCategory === cat
                    ? 'bg-[#1e222d] text-[#f8bd42] font-bold'
                    : 'text-[#787b86] hover:text-[#dfe2f2]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Portfolio Summary Pills */}
        <div className="flex items-center gap-3 text-[10px]">
          {/* Average Correlation */}
          <div className="flex items-center gap-1.5 bg-[#0c0e14] px-2 py-0.5 rounded border border-[#1e222d]">
            <span className="text-[#787b86]">AVG MATRIX CORR:</span>
            <span
              className={`font-bold ${
                portfolioMetrics.avgCorr < 0.2
                  ? 'text-[#38bdf8]'
                  : portfolioMetrics.avgCorr > 0.5
                  ? 'text-[#f97316]'
                  : 'text-[#26a69a]'
              }`}
            >
              {portfolioMetrics.avgCorr > 0 ? `+${portfolioMetrics.avgCorr}` : portfolioMetrics.avgCorr}
            </span>
          </div>

          {/* Top Diversifier */}
          {portfolioMetrics.bestDiversifier && (
            <div className="hidden sm:flex items-center gap-1.5 bg-[#0c0e14] px-2 py-0.5 rounded border border-[#1e222d]">
              <ShieldCheck className="w-3 h-3 text-[#38bdf8]" />
              <span className="text-[#787b86]">TOP DIVERSIFIER:</span>
              <span className="text-[#dfe2f2] font-bold">
                {portfolioMetrics.bestDiversifier.sym1} ⟷ {portfolioMetrics.bestDiversifier.sym2} (
                <span className="text-[#38bdf8]">{portfolioMetrics.bestDiversifier.correlation}</span>)
              </span>
            </div>
          )}

          {/* Expand toggle button if provided */}
          {onToggleExpand && (
            <button
              onClick={() => {
                onToggleExpand();
                sounds.playClick();
              }}
              title={isExpanded ? 'Minimize Panel' : 'Expand Panel'}
              className="p-1 hover:bg-[#1e222d] rounded text-[#787b86] hover:text-[#dfe2f2] cursor-pointer ml-1"
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace: Matrix View or Opportunities Ranking View */}
      <div className="flex-1 flex overflow-hidden">
        {activeSubView === 'matrix' ? (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Heatmap Matrix Grid Table */}
            <div className="flex-1 overflow-auto p-3 custom-scrollbar">
              <div className="inline-block min-w-full">
                {/* Table Header Row */}
                <div className="flex items-center gap-1 mb-1">
                  {/* Top-left empty origin cell */}
                  <div className="w-20 sm:w-24 shrink-0 px-2 py-1 text-[9px] text-[#787b86] font-bold">
                    ASSET / PAIR
                  </div>
                  {symbolKeys.map((colSym) => (
                    <div
                      key={colSym}
                      onClick={() => onSelectSymbol && onSelectSymbol(colSym)}
                      className="w-16 sm:w-20 shrink-0 text-center py-1 text-[10px] font-bold text-[#dfe2f2] hover:text-[#f8bd42] cursor-pointer transition-colors"
                      title={symbols[colSym]?.name}
                    >
                      {colSym}
                    </div>
                  ))}
                </div>

                {/* Table Rows */}
                {symbolKeys.map((rowSym) => (
                  <div key={rowSym} className="flex items-center gap-1 mb-1">
                    {/* Row Header Cell */}
                    <div
                      onClick={() => onSelectSymbol && onSelectSymbol(rowSym)}
                      className="w-20 sm:w-24 shrink-0 flex items-center justify-between px-2 py-1.5 bg-[#131722] hover:bg-[#1e222d] rounded cursor-pointer border border-[#1e222d] transition-colors"
                      title={`Inspect ${symbols[rowSym]?.name}`}
                    >
                      <span className="font-bold text-[#dfe2f2] hover:text-[#f8bd42]">{rowSym}</span>
                      <span className="text-[8px] text-[#787b86]">{symbols[rowSym]?.category?.[0]}</span>
                    </div>

                    {/* Data Cells */}
                    {symbolKeys.map((colSym) => {
                      const val = matrix[rowSym]?.[colSym] ?? 0;
                      const isSelf = rowSym === colSym;
                      const isSelected =
                        selectedPair &&
                        ((selectedPair.sym1 === rowSym && selectedPair.sym2 === colSym) ||
                          (selectedPair.sym1 === colSym && selectedPair.sym2 === rowSym));

                      const cellColor = getCellColor(val, isSelf);

                      return (
                        <button
                          key={colSym}
                          onClick={() => {
                            setSelectedPair({ sym1: rowSym, sym2: colSym });
                            sounds.playClick();
                          }}
                          title={`${rowSym} ✕ ${colSym}: r = ${val >= 0 ? '+' : ''}${val.toFixed(2)} (${cellColor.label})`}
                          className={`w-16 sm:w-20 h-9 shrink-0 flex flex-col items-center justify-center rounded border transition-all cursor-pointer relative ${
                            cellColor.bg
                          } ${cellColor.border} ${
                            isSelected ? 'ring-2 ring-[#f8bd42] z-10 scale-[1.03]' : ''
                          }`}
                        >
                          <span className={`text-[11px] ${cellColor.text}`}>
                            {isSelf ? '1.00' : `${val > 0 ? '+' : ''}${val.toFixed(2)}`}
                          </span>
                          {!isSelf && (
                            <span className="text-[7.5px] uppercase tracking-wider text-[#787b86] leading-none mt-0.5">
                              {val > 0.6 ? 'HIGH' : val < -0.3 ? 'HEDGE' : 'DIVERSE'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Legend Ribbon below Matrix */}
              <div className="flex flex-wrap items-center gap-3 mt-3 pt-2 border-t border-[#1e222d] text-[9px] text-[#787b86]">
                <span className="font-bold text-[#dfe2f2]">CORRELATION SCALE:</span>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-[#f23645]/40 border border-[#f23645]" />
                  <span>-1.0 to -0.3 (Strong Hedge)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-[#f97316]/30 border border-[#f97316]" />
                  <span>-0.3 to 0.0 (Mild Inverse)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-[#38bdf8]/30 border border-[#38bdf8]" />
                  <span>0.0 to +0.3 (Optimal Diversification)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-[#26a69a]/25 border border-[#26a69a]" />
                  <span>+0.3 to +0.7 (Moderate)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-[#26a69a]/60 border border-[#26a69a]" />
                  <span>+0.7 to +1.0 (High Risk Overlap)</span>
                </div>
              </div>
            </div>

            {/* Right Side: Selected Pair Inspection Card */}
            {inspectedPairInfo && (
              <div className="w-full md:w-[310px] lg:w-[350px] border-t md:border-t-0 md:border-l border-[#1e222d] bg-[#0e111a] p-3 flex flex-col justify-between shrink-0 overflow-y-auto custom-scrollbar">
                <div className="space-y-3">
                  {/* Pair Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[9px] text-[#787b86] font-bold uppercase tracking-wider">
                        PAIR INSPECTION
                      </div>
                      <div className="text-sm font-bold text-[#dfe2f2] flex items-center gap-1.5 mt-0.5">
                        <span>{inspectedPairInfo.sym1}</span>
                        <ArrowRightLeft className="w-3.5 h-3.5 text-[#787b86]" />
                        <span>{inspectedPairInfo.sym2}</span>
                      </div>
                    </div>

                    <div
                      className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${inspectedPairInfo.badgeColor}`}
                    >
                      {inspectedPairInfo.rating}
                    </div>
                  </div>

                  {/* Quantitative Gauge Bar */}
                  <div className="bg-[#131722] p-2.5 rounded border border-[#1e222d] space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#787b86]">PEARSON CORRELATION (r):</span>
                      <span className="font-bold text-sm text-[#dfe2f2]">
                        {inspectedPairInfo.correlation > 0 ? `+` : ''}
                        {inspectedPairInfo.correlation.toFixed(2)}
                      </span>
                    </div>

                    {/* Progress Slider Bar from -1 to +1 */}
                    <div className="h-2 w-full bg-[#1e222d] rounded-full overflow-hidden relative">
                      {/* Zero indicator line in middle */}
                      <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-[#787b86]/50 z-10" />

                      {/* Bar indicator: left from center for negative, right from center for positive */}
                      {inspectedPairInfo.correlation >= 0 ? (
                        <div
                          className="h-full bg-gradient-to-r from-[#38bdf8] to-[#26a69a] absolute top-0 left-1/2 rounded-r-full"
                          style={{
                            width: `${Math.min(50, (inspectedPairInfo.correlation / 1) * 50)}%`,
                          }}
                        />
                      ) : (
                        <div
                          className="h-full bg-gradient-to-l from-[#f97316] to-[#f23645] absolute top-0 right-1/2 rounded-l-full"
                          style={{
                            width: `${Math.min(50, (Math.abs(inspectedPairInfo.correlation) / 1) * 50)}%`,
                          }}
                        />
                      )}
                    </div>

                    <div className="flex justify-between text-[8px] text-[#787b86]">
                      <span>-1.00 (Inversion)</span>
                      <span>0.00 (Uncorrelated)</span>
                      <span>+1.00 (Lockstep)</span>
                    </div>
                  </div>

                  {/* Portfolio Guidance / Quant Note */}
                  <div className="bg-[#131722]/80 p-2.5 rounded border border-[#1e222d] text-[10px] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[#f8bd42]">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>DIVERSIFICATION IMPACT</span>
                    </div>
                    <p className="text-[#a0a5b5] leading-relaxed text-[10px]">
                      {inspectedPairInfo.advice}
                    </p>
                  </div>

                  {/* Mini Sparkline comparison */}
                  <div className="bg-[#131722] p-2 rounded border border-[#1e222d] space-y-1">
                    <div className="flex items-center justify-between text-[9px] text-[#787b86]">
                      <span>NORMALIZED PRICE ACTION</span>
                      <span>15m Candles</span>
                    </div>
                    <div className="h-14 w-full relative flex items-end">
                      {/* Render simple dual SVG paths */}
                      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
                        {/* Line 1 (sym1) */}
                        {inspectedPairInfo.spark1.length > 1 && (
                          <path
                            d={(() => {
                              const min = Math.min(...inspectedPairInfo.spark1);
                              const max = Math.max(...inspectedPairInfo.spark1);
                              const range = max - min || 1;
                              const pts = inspectedPairInfo.spark1.map((p, i) => {
                                const x = (i / (inspectedPairInfo.spark1.length - 1)) * 100;
                                const y = 38 - ((p - min) / range) * 34;
                                return `${x},${y}`;
                              });
                              return `M ${pts.join(' L ')}`;
                            })()}
                            fill="none"
                            stroke="#f8bd42"
                            strokeWidth="1.5"
                          />
                        )}
                        {/* Line 2 (sym2) */}
                        {inspectedPairInfo.spark2.length > 1 && (
                          <path
                            d={(() => {
                              const min = Math.min(...inspectedPairInfo.spark2);
                              const max = Math.max(...inspectedPairInfo.spark2);
                              const range = max - min || 1;
                              const pts = inspectedPairInfo.spark2.map((p, i) => {
                                const x = (i / (inspectedPairInfo.spark2.length - 1)) * 100;
                                const y = 38 - ((p - min) / range) * 34;
                                return `${x},${y}`;
                              });
                              return `M ${pts.join(' L ')}`;
                            })()}
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="1.5"
                            strokeDasharray="2 2"
                          />
                        )}
                      </svg>
                    </div>
                    <div className="flex items-center justify-between text-[8px] pt-1 border-t border-[#1e222d]">
                      <span className="text-[#f8bd42] font-semibold flex items-center gap-1">
                        <span className="w-2 h-0.5 bg-[#f8bd42] inline-block" /> {inspectedPairInfo.sym1}
                      </span>
                      <span className="text-[#38bdf8] font-semibold flex items-center gap-1">
                        <span className="w-2 h-0.5 bg-[#38bdf8] inline-block" /> {inspectedPairInfo.sym2}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Switch to Chart Buttons */}
                {onSelectSymbol && (
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => {
                        onSelectSymbol(inspectedPairInfo.sym1);
                        sounds.playClick();
                      }}
                      className="flex-1 py-1.5 bg-[#1e222d] hover:bg-[#2a2e39] text-[#dfe2f2] font-bold rounded text-center cursor-pointer transition-colors"
                    >
                      CHART {inspectedPairInfo.sym1}
                    </button>
                    {inspectedPairInfo.sym1 !== inspectedPairInfo.sym2 && (
                      <button
                        onClick={() => {
                          onSelectSymbol(inspectedPairInfo.sym2);
                          sounds.playClick();
                        }}
                        className="flex-1 py-1.5 bg-[#1e222d] hover:bg-[#2a2e39] text-[#dfe2f2] font-bold rounded text-center cursor-pointer transition-colors"
                      >
                        CHART {inspectedPairInfo.sym2}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Sub-View: Ranked Diversification Opportunities List */
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#f8bd42] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>DIVERSIFICATION OPPORTUNITY RANKINGS</span>
                </h3>
                <p className="text-[10px] text-[#787b86] mt-0.5">
                  Pairs sorted by lowest correlation coefficient. Low or negative correlation lowers total portfolio volatility.
                </p>
              </div>
              <div className="text-[10px] text-[#787b86]">
                Total Analyzed Pairs: <span className="font-bold text-[#dfe2f2]">{rankedPairs.length}</span>
              </div>
            </div>

            {/* Grid of Opportunity Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {rankedPairs.map((p) => {
                const isOptimal = p.diversificationRating === 'OPTIMAL';
                const isHedge = p.diversificationRating === 'HEDGE';
                const isPoor = p.diversificationRating === 'POOR_OVERLAP';

                return (
                  <div
                    key={`${p.sym1}-${p.sym2}`}
                    onClick={() => {
                      setSelectedPair({ sym1: p.sym1, sym2: p.sym2 });
                      setActiveSubView('matrix');
                      sounds.playClick();
                    }}
                    className={`p-3 rounded-lg border transition-all cursor-pointer bg-[#131722] hover:bg-[#181c28] ${
                      isHedge
                        ? 'border-[#f23645]/40 hover:border-[#f23645]'
                        : isOptimal
                        ? 'border-[#38bdf8]/40 hover:border-[#38bdf8]'
                        : isPoor
                        ? 'border-[#26a69a]/30 hover:border-[#26a69a]'
                        : 'border-[#1e222d] hover:border-[#2a2e39]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#dfe2f2] text-xs">{p.sym1}</span>
                          <span className="text-[#787b86] text-[10px]">✕</span>
                          <span className="font-bold text-[#dfe2f2] text-xs">{p.sym2}</span>
                        </div>
                        <div className="text-[9px] text-[#787b86] mt-0.5">
                          {p.cat1} / {p.cat2}
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`text-sm font-bold ${
                            p.correlation <= -0.3
                              ? 'text-[#f23645]'
                              : p.correlation < 0.3
                              ? 'text-[#38bdf8]'
                              : 'text-[#26a69a]'
                          }`}
                        >
                          {p.correlation > 0 ? `+` : ''}
                          {p.correlation.toFixed(2)}
                        </div>
                        <div
                          className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase mt-0.5 inline-block ${
                            isHedge
                              ? 'bg-[#f23645]/20 text-[#f23645]'
                              : isOptimal
                              ? 'bg-[#38bdf8]/20 text-[#38bdf8]'
                              : isPoor
                              ? 'bg-[#26a69a]/20 text-[#26a69a]'
                              : 'bg-[#f97316]/20 text-[#f97316]'
                          }`}
                        >
                          {p.diversificationRating.replace('_', ' ')}
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-[#a0a5b5] mt-2 leading-relaxed border-t border-[#1e222d] pt-1.5">
                      {p.description}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[9px] text-[#787b86]">
                      <span>Click to inspect matrix</span>
                      <span className="text-[#f8bd42] font-semibold hover:underline">View Heatmap →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
