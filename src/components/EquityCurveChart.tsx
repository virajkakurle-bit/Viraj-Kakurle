import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { OrderHistoryItem, AccountState } from '../types/terminal';
import { formatCurrency } from '../utils/format';
import { TrendingUp, ShieldAlert, Award, Maximize2, Minimize2 } from 'lucide-react';

interface EquityCurveChartProps {
  orderHistory: OrderHistoryItem[];
  account: AccountState;
  height?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

interface EquityDataPoint {
  tradeIndex: number;
  label: string;
  timestamp: string;
  symbol: string;
  side: string;
  tradePnL: number;
  balance: number;
  equity: number;
  peak: number;
  drawdownPercent: number;
}

export const EquityCurveChart: React.FC<EquityCurveChartProps> = ({
  orderHistory,
  account,
  height = 140,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<EquityDataPoint | null>(null);

  // Compute equity trajectory after each chronological trade
  const { chartData, maxPeak, currentEquity, totalReturnPercent, maxDrawdownPercent, winCount, lossCount } =
    useMemo(() => {
      // Sort oldest to newest
      const chronological = [...orderHistory].reverse();

      // Calculate backwards from current balance so final point matches account.balance
      const totalClosedPnL = chronological.reduce((sum, item) => sum + item.pnl, 0);
      const startingCapital = Math.max(10, account.balance - totalClosedPnL);

      let runningBalance = startingCapital;
      let runningPeak = startingCapital;
      let worstDrawdown = 0;
      let wins = 0;
      let losses = 0;

      const data: EquityDataPoint[] = [];

      // Initial point (Inception)
      data.push({
        tradeIndex: 0,
        label: 'Inception',
        timestamp: '08:00:00',
        symbol: 'START',
        side: 'INIT',
        tradePnL: 0,
        balance: +runningBalance.toFixed(2),
        equity: +runningBalance.toFixed(2),
        peak: +runningPeak.toFixed(2),
        drawdownPercent: 0,
      });

      chronological.forEach((trade, index) => {
        runningBalance += trade.pnl;
        if (trade.pnl >= 0) wins++;
        else losses++;

        if (runningBalance > runningPeak) {
          runningPeak = runningBalance;
        }

        const drawdown = runningPeak > 0 ? ((runningPeak - runningBalance) / runningPeak) * 100 : 0;
        if (drawdown > worstDrawdown) {
          worstDrawdown = drawdown;
        }

        data.push({
          tradeIndex: index + 1,
          label: `#${index + 1} ${trade.symbol}`,
          timestamp: trade.closedAt,
          symbol: trade.symbol,
          side: trade.side,
          tradePnL: trade.pnl,
          balance: +runningBalance.toFixed(2),
          equity: +runningBalance.toFixed(2),
          peak: +runningPeak.toFixed(2),
          drawdownPercent: +drawdown.toFixed(2),
        });
      });

      // Latest live equity mark (including open floating P&L)
      if (account.equity !== account.balance) {
        if (account.equity > runningPeak) runningPeak = account.equity;
        const liveDd = runningPeak > 0 ? ((runningPeak - account.equity) / runningPeak) * 100 : 0;
        data.push({
          tradeIndex: data.length,
          label: 'Live Floating',
          timestamp: 'NOW',
          symbol: 'PORTFOLIO',
          side: 'LIVE',
          tradePnL: account.equity - account.balance,
          balance: +account.balance.toFixed(2),
          equity: +account.equity.toFixed(2),
          peak: +runningPeak.toFixed(2),
          drawdownPercent: +liveDd.toFixed(2),
        });
      }

      const totalGain = account.equity - startingCapital;
      const totalPct = (totalGain / startingCapital) * 100;

      return {
        chartData: data,
        maxPeak: runningPeak,
        currentEquity: account.equity,
        totalReturnPercent: totalPct,
        maxDrawdownPercent: worstDrawdown,
        winCount: wins,
        lossCount: losses,
      };
    }, [orderHistory, account.balance, account.equity]);

  const minVal = useMemo(() => {
    const min = Math.min(...chartData.map((d) => d.equity));
    return Math.floor(min * 0.95);
  }, [chartData]);

  const maxVal = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.peak));
    return Math.ceil(max * 1.05);
  }, [chartData]);

  return (
    <div className="w-full flex flex-col bg-[#0c0e14] border border-[#1e222d] rounded overflow-hidden select-none">
      {/* Top Header Metrics Row */}
      <div className="px-3 py-2 border-b border-[#1e222d] bg-[#131722]/70 flex items-center justify-between font-mono text-[11px]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-bold text-[#f8bd42]">
            <TrendingUp className="w-3.5 h-3.5 text-[#26a69a]" />
            <span>ACCOUNT EQUITY TRAJECTORY</span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[10px] text-[#787b86]">
            <div>
              EQUITY: <strong className="text-[#26a69a]">${currentEquity.toFixed(2)}</strong>
            </div>
            <div>
              GAIN: <strong className={totalReturnPercent >= 0 ? 'text-[#26a69a]' : 'text-[#f23645]'}>
                {totalReturnPercent >= 0 ? '+' : ''}{totalReturnPercent.toFixed(1)}%
              </strong>
            </div>
            <div>
              PEAK: <strong className="text-[#dfe2f2]">${maxPeak.toFixed(2)}</strong>
            </div>
            <div>
              MAX DD: <strong className="text-[#f8bd42]">{maxDrawdownPercent.toFixed(1)}%</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[10px] text-[#787b86] font-medium hidden md:block">
            {winCount}W / {lossCount}L Trades
          </div>
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              title={isExpanded ? 'Collapse Equity View' : 'Expand Equity View'}
              className="p-1 hover:bg-[#1e222d] rounded text-[#787b86] hover:text-[#dfe2f2] cursor-pointer"
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Recharts Area Chart */}
      <div className="w-full p-2 relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 20, left: -15, bottom: 0 }}
            onMouseMove={(e: any) => {
              if (e && e.activePayload && e.activePayload[0]) {
                setHoveredPoint(e.activePayload[0].payload as EquityDataPoint);
              }
            }}
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#26a69a" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#26a69a" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="#1e222d"
              strokeDasharray="3 3"
              vertical={false}
              strokeOpacity={0.8}
            />

            <XAxis
              dataKey="label"
              stroke="#434651"
              tick={{ fill: '#787b86', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
              tickLine={false}
              axisLine={{ stroke: '#1e222d' }}
              interval="preserveStartEnd"
            />

            <YAxis
              domain={[minVal, maxVal]}
              stroke="#434651"
              tick={{ fill: '#787b86', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
              tickLine={false}
              axisLine={{ stroke: '#1e222d' }}
              tickFormatter={(val: number) => `$${val.toFixed(0)}`}
            />

            {/* High-Water Mark Peak Reference Line */}
            <ReferenceLine
              y={maxPeak}
              stroke="#f8bd42"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              label={{
                value: `PEAK $${maxPeak.toFixed(0)}`,
                position: 'right',
                fill: '#f8bd42',
                fontSize: 8,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />

            {/* Custom Tooltip */}
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const point = payload[0].payload as EquityDataPoint;
                return (
                  <div className="bg-[#131722]/95 border border-[#2a2e39] rounded px-3 py-2 shadow-2xl font-mono text-[10px] space-y-1 z-30">
                    <div className="flex justify-between items-center gap-3 border-b border-[#1e222d] pb-1">
                      <span className="font-bold text-[#f8bd42]">{point.label}</span>
                      <span className="text-[#787b86]">{point.timestamp}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-[#787b86]">EQUITY BALANCE:</span>
                      <span className="font-bold text-[#26a69a]">${point.equity.toFixed(2)}</span>
                    </div>
                    {point.tradeIndex > 0 && (
                      <div className="flex justify-between gap-3">
                        <span className="text-[#787b86]">TRADE P&L:</span>
                        <span className={`font-bold ${point.tradePnL >= 0 ? 'text-[#26a69a]' : 'text-[#f23645]'}`}>
                          {point.tradePnL >= 0 ? '+' : ''}${point.tradePnL.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between gap-3">
                      <span className="text-[#787b86]">DRAWDOWN:</span>
                      <span className="text-[#dfe2f2]">{point.drawdownPercent.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              }}
            />

            <Area
              type="monotone"
              dataKey="equity"
              stroke="#26a69a"
              strokeWidth={2}
              fill="url(#equityGradient)"
              activeDot={{ r: 4, fill: '#f8bd42', stroke: '#0c0e14', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
