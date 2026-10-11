import React, { useState, useMemo } from 'react';
import { Position, OrderHistoryItem, AccountState, SymbolData } from '../types/terminal';
import { sounds } from '../utils/audio';
import { formatPrice } from '../utils/format';
import { 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  Activity, 
  ChevronUp, 
  ChevronDown, 
  BookOpen, 
  Tag, 
  Grid3X3,
  Download,
  FileSpreadsheet,
  Check,
  Search,
} from 'lucide-react';
import { EquityCurveChart } from './EquityCurveChart';
import { PerformanceMetricsDashboard } from './PerformanceMetricsDashboard';
import { TradeJournal } from './TradeJournal';
import { CorrelationMatrix } from './CorrelationMatrix';
import { exportOrderHistoryToCSV } from '../utils/csvExport';

interface BottomPanelProps {
  positions: Position[];
  onClosePosition: (id: string) => void;
  orderHistory: OrderHistoryItem[];
  account: AccountState;
  onUpdateOrderHistory?: (id: string, updates: Partial<OrderHistoryItem>) => void;
  symbols?: Record<string, SymbolData>;
  onSelectSymbol?: (symbolKey: string) => void;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  positions,
  onClosePosition,
  orderHistory,
  account,
  onUpdateOrderHistory,
  symbols,
  onSelectSymbol,
}) => {
  const [activeTab, setActiveTab] = useState<'positions' | 'pending' | 'history' | 'audit' | 'equity' | 'journal' | 'correlation' | 'stale'>('positions');
  const [isPanelExpanded, setIsPanelExpanded] = useState<boolean>(false);
  const [isExportedCsv, setIsExportedCsv] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyOutcomeFilter, setHistoryOutcomeFilter] = useState<'ALL' | 'WINS' | 'LOSSES'>('ALL');

  const pendingOrders: any[] = []; // Current demo has 0 pending orders as shown in screenshot

  // Filtered orders for Order History tab
  const filteredOrderHistory = useMemo(() => {
    return orderHistory.filter((item) => {
      if (historySearch.trim()) {
        const query = historySearch.toLowerCase();
        const matchSymbol = item.symbol.toLowerCase().includes(query);
        const matchNotes = item.notes?.toLowerCase().includes(query);
        const matchTags = item.tags?.some((t) => t.toLowerCase().includes(query));
        if (!matchSymbol && !matchNotes && !matchTags) return false;
      }
      if (historyOutcomeFilter === 'WINS' && item.pnl < 0) return false;
      if (historyOutcomeFilter === 'LOSSES' && item.pnl >= 0) return false;
      return true;
    });
  }, [orderHistory, historySearch, historyOutcomeFilter]);

  const historyStats = useMemo(() => {
    const total = orderHistory.length;
    if (total === 0) return { total: 0, netPnL: 0, wins: 0, winRate: 0 };
    const wins = orderHistory.filter((i) => i.pnl > 0).length;
    const netPnL = orderHistory.reduce((acc, i) => acc + i.pnl, 0);
    const winRate = Math.round((wins / total) * 100);
    return { total, netPnL, wins, winRate };
  }, [orderHistory]);

  const handleExportCSV = (ordersToExport?: OrderHistoryItem[]) => {
    const list = ordersToExport && ordersToExport.length > 0 ? ordersToExport : orderHistory;
    if (list.length === 0) return;
    const success = exportOrderHistoryToCSV(list);
    if (success) {
      sounds.playClick();
      setIsExportedCsv(true);
      setTimeout(() => {
        setIsExportedCsv(false);
      }, 2500);
    }
  };

  return (
    <footer
      className={`${
        isPanelExpanded ? 'h-[330px]' : 'h-[195px]'
      } bg-[#0c0e14] border-t border-[#1e222d] flex flex-col justify-between shrink-0 select-none text-[11px] font-mono z-20 transition-all duration-200`}
    >
      {/* Top Tab Bar & Account Header */}
      <div className="h-[34px] px-3 border-b border-[#1e222d] flex items-center justify-between">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 md:gap-4 overflow-x-auto no-scrollbar">
          {/* POSITIONS TAB */}
          <button
            onClick={() => {
              setActiveTab('positions');
              sounds.playClick();
            }}
            className={`flex items-center gap-1.5 py-1 transition-colors cursor-pointer border-b-2 font-semibold ${
              activeTab === 'positions'
                ? 'border-[#f8bd42] text-[#f8bd42]'
                : 'border-transparent text-[#787b86] hover:text-[#dfe2f2]'
            }`}
          >
            <span>POSITIONS</span>
            <span className="px-1.5 py-0.2 bg-[#f8bd42] text-[#0f131e] font-bold text-[9px] rounded">
              {positions.length}
            </span>
          </button>

          {/* PENDING ORDERS TAB */}
          <button
            onClick={() => {
              setActiveTab('pending');
              sounds.playClick();
            }}
            className={`py-1 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'pending'
                ? 'border-[#f8bd42] text-[#f8bd42]'
                : 'border-transparent text-[#787b86] hover:text-[#dfe2f2]'
            }`}
          >
            PENDING ORDERS ({pendingOrders.length})
          </button>

          {/* ORDER HISTORY TAB */}
          <button
            onClick={() => {
              setActiveTab('history');
              sounds.playClick();
            }}
            className={`py-1 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'history'
                ? 'border-[#f8bd42] text-[#f8bd42]'
                : 'border-transparent text-[#787b86] hover:text-[#dfe2f2]'
            }`}
          >
            ORDER HISTORY ({orderHistory.length})
          </button>

          {/* EQUITY CURVE TAB */}
          <button
            onClick={() => {
              setActiveTab('equity');
              sounds.playClick();
            }}
            className={`py-1 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'equity'
                ? 'border-[#f8bd42] text-[#f8bd42] font-semibold'
                : 'border-transparent text-[#787b86] hover:text-[#dfe2f2]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#26a69a]" />
            <span>EQUITY CURVE</span>
          </button>

          {/* PERFORMANCE METRICS TAB */}
          <button
            onClick={() => {
              setActiveTab('audit');
              sounds.playClick();
            }}
            className={`py-1 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'audit'
                ? 'border-[#f8bd42] text-[#f8bd42]'
                : 'border-transparent text-[#787b86] hover:text-[#dfe2f2]'
            }`}
          >
            PERFORMANCE METRICS
          </button>

          {/* TRADE JOURNAL TAB */}
          <button
            onClick={() => {
              setActiveTab('journal');
              sounds.playClick();
            }}
            className={`py-1 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'journal'
                ? 'border-[#f8bd42] text-[#f8bd42] font-semibold'
                : 'border-transparent text-[#787b86] hover:text-[#dfe2f2]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#f8bd42]" />
            <span>TRADE JOURNAL</span>
            <span className="px-1.5 py-0.2 bg-[#1e222d] text-[#f8bd42] text-[9px] rounded font-bold">
              {orderHistory.length}
            </span>
          </button>

          {/* CORRELATION MATRIX TAB */}
          <button
            onClick={() => {
              setActiveTab('correlation');
              sounds.playClick();
            }}
            className={`py-1 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'correlation'
                ? 'border-[#f8bd42] text-[#f8bd42] font-semibold'
                : 'border-transparent text-[#787b86] hover:text-[#dfe2f2]'
            }`}
            title="Asset Correlation Heatmap & Diversification Opportunities"
          >
            <Grid3X3 className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>CORRELATION MATRIX</span>
            <span className="px-1.5 py-0.2 bg-[#38bdf8]/15 text-[#38bdf8] text-[9px] rounded font-bold border border-[#38bdf8]/30">
              HEATMAP
            </span>
          </button>

          {/* STALE MONITOR TAB */}
          <button
            onClick={() => {
              setActiveTab('stale');
              sounds.playClick();
            }}
            className={`py-1 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'stale'
                ? 'border-[#f8bd42] text-[#f8bd42]'
                : 'border-transparent text-[#787b86] hover:text-[#dfe2f2]'
            }`}
          >
            STALE MONITOR
          </button>
        </div>

        {/* Account Balances on the right */}
        <div className="flex items-center gap-3 md:gap-4 text-[11px] font-semibold shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[#787b86]">BAL:</span>
            <span className="text-[#dfe2f2]">${account.balance.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#787b86]">EQUITY:</span>
            <span className="text-[#26a69a]">${account.equity.toFixed(2)}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-[#787b86]">MARGIN:</span>
            <span className="text-[#dfe2f2]">${account.margin.toFixed(2)}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-[#787b86]">FREE:</span>
            <span className="text-[#dfe2f2]">${account.freeMargin.toFixed(2)}</span>
          </div>

          {/* Quick Export CSV button */}
          {(activeTab === 'history' || activeTab === 'journal') && (
            <button
              onClick={() => handleExportCSV()}
              title="Export complete Order History as CSV"
              className="flex items-center gap-1 px-2 py-0.5 bg-[#18221f] hover:bg-[#1f2d29] border border-[#26a69a]/40 text-[#26a69a] text-[10px] font-bold rounded cursor-pointer transition-colors"
            >
              {isExportedCsv ? (
                <>
                  <Check className="w-3 h-3 text-[#26a69a]" />
                  <span className="hidden sm:inline">Downloaded</span>
                </>
              ) : (
                <>
                  <Download className="w-3 h-3" />
                  <span className="hidden sm:inline">CSV</span>
                </>
              )}
            </button>
          )}

          {/* Toggle Expand Button */}
          <button
            onClick={() => setIsPanelExpanded(!isPanelExpanded)}
            title={isPanelExpanded ? 'Collapse Bottom Panel' : 'Expand Bottom Panel'}
            className="p-1 hover:bg-[#1e222d] rounded text-[#787b86] hover:text-[#dfe2f2] cursor-pointer"
          >
            {isPanelExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'positions' && (
          <div className="w-full">
            {/* Table Header */}
            <div className="grid grid-cols-12 px-4 py-1.5 text-[10px] text-[#787b86] uppercase border-b border-[#1e222d]/60">
              <div className="col-span-2">SYMBOL</div>
              <div className="col-span-1">SIDE</div>
              <div className="col-span-1">LOTS</div>
              <div className="col-span-2">ENTRY PRICE</div>
              <div className="col-span-1">MARK PRICE</div>
              <div className="col-span-2">STOP LOSS</div>
              <div className="col-span-1">TAKE PROFIT</div>
              <div className="col-span-1 text-right">NET P&L (USD)</div>
              <div className="col-span-1 text-right">ACTION</div>
            </div>

            {/* Table Rows */}
            {positions.length === 0 ? (
              <div className="py-8 text-center text-[#787b86] text-[11px]">
                No active open positions. Use the Execution Ticket or load AI Structure to open a trade.
              </div>
            ) : (
              positions.map((pos) => {
                const isProfitable = pos.netPnL >= 0;
                return (
                  <div
                    key={pos.id}
                    className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-[#131722] transition-colors border-b border-[#1e222d]/30"
                  >
                    {/* SYMBOL */}
                    <div className="col-span-2 font-bold text-[#f8bd42]">
                      {pos.symbol}
                    </div>

                    {/* SIDE */}
                    <div className="col-span-1">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          pos.side === 'BUY'
                            ? 'bg-[#26a69a]/20 text-[#26a69a] border border-[#26a69a]/40'
                            : 'bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/40'
                        }`}
                      >
                        {pos.side}
                      </span>
                    </div>

                    {/* LOTS */}
                    <div className="col-span-1 text-[#dfe2f2]">
                      {pos.lots.toFixed(2)}
                    </div>

                    {/* ENTRY PRICE */}
                    <div className="col-span-2 text-[#dfe2f2]">
                      {formatPrice(pos.entryPrice, 2)}
                    </div>

                    {/* MARK PRICE */}
                    <div className="col-span-1 text-[#26a69a] font-medium">
                      {formatPrice(pos.markPrice, 2)}
                    </div>

                    {/* STOP LOSS */}
                    <div className="col-span-2 text-[#dfe2f2]">
                      {typeof pos.stopLoss === 'number'
                        ? formatPrice(pos.stopLoss, 2)
                        : pos.stopLoss}
                    </div>

                    {/* TAKE PROFIT */}
                    <div className="col-span-1 text-[#dfe2f2]">
                      {formatPrice(pos.takeProfit, 2)}
                    </div>

                    {/* NET P&L */}
                    <div
                      className={`col-span-1 text-right font-bold ${
                        isProfitable ? 'text-[#26a69a]' : 'text-[#f23645]'
                      }`}
                    >
                      {isProfitable ? '+' : ''}${pos.netPnL.toFixed(2)} ({isProfitable ? '+' : ''}
                      {pos.netPnLPercent.toFixed(1)}%)
                    </div>

                    {/* ACTION */}
                    <div className="col-span-1 text-right">
                      <button
                        onClick={() => {
                          onClosePosition(pos.id);
                          sounds.playClosePosition();
                        }}
                        className="px-2.5 py-1 bg-[#f23645] hover:bg-[#d32f2f] text-white text-[10px] font-bold rounded cursor-pointer transition-colors shadow-sm"
                      >
                        CLOSE
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="py-8 text-center text-[#787b86]">
            No pending limit or stop orders currently active.
          </div>
        )}

        {activeTab === 'history' && (
          <div className="w-full flex flex-col">
            {/* Order History Toolbar with Stats, Search, Filters & Export CSV */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 bg-[#10141f] border-b border-[#1e222d] text-[10px] shrink-0">
              {/* Left: Summary Metrics */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#787b86]">CLOSED TRADES:</span>
                  <span className="font-bold text-[#dfe2f2]">{historyStats.total}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#787b86]">NET REALIZED P&L:</span>
                  <span
                    className={`font-bold ${
                      historyStats.netPnL >= 0 ? 'text-[#26a69a]' : 'text-[#f23645]'
                    }`}
                  >
                    {historyStats.netPnL >= 0 ? '+' : ''}${historyStats.netPnL.toFixed(2)}
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="text-[#787b86]">WIN RATE:</span>
                  <span className="font-bold text-[#26a69a]">{historyStats.winRate}%</span>
                </div>
              </div>

              {/* Right: Search, Filter, and Export CSV Button */}
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2 top-1.5 text-[#787b86]" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Filter symbol/notes..."
                    className="pl-6 pr-2 py-0.5 w-28 sm:w-36 bg-[#131722] border border-[#2a2e39] rounded text-[10px] text-[#dfe2f2] placeholder-[#787b86] focus:outline-hidden focus:border-[#f8bd42]"
                  />
                  {historySearch && (
                    <button
                      onClick={() => setHistorySearch('')}
                      className="absolute right-1 top-0.5 text-[#787b86] hover:text-[#dfe2f2] cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Outcome Filter */}
                <div className="flex items-center bg-[#131722] border border-[#2a2e39] rounded p-0.5 text-[9px]">
                  {(['ALL', 'WINS', 'LOSSES'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setHistoryOutcomeFilter(mode);
                        sounds.playClick();
                      }}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${
                        historyOutcomeFilter === mode
                          ? mode === 'WINS'
                            ? 'bg-[#26a69a]/25 text-[#26a69a] font-bold'
                            : mode === 'LOSSES'
                            ? 'bg-[#f23645]/25 text-[#f23645] font-bold'
                            : 'bg-[#2a2e39] text-[#dfe2f2] font-bold'
                          : 'text-[#787b86] hover:text-[#dfe2f2]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {/* Prominent Export to CSV Button */}
                <button
                  onClick={() => handleExportCSV(filteredOrderHistory)}
                  disabled={orderHistory.length === 0}
                  title="Export Order History data as CSV file for Excel, Google Sheets, or Trading Software"
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-bold cursor-pointer transition-all ${
                    isExportedCsv
                      ? 'bg-[#26a69a]/20 border-[#26a69a] text-[#26a69a]'
                      : 'bg-[#18221f] hover:bg-[#1f2d29] border-[#26a69a]/50 hover:border-[#26a69a] text-[#26a69a]'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {isExportedCsv ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#26a69a] animate-in zoom-in duration-150" />
                      <span>EXPORTED TO CSV</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-[#26a69a]" />
                      <span>EXPORT CSV</span>
                      <span className="px-1 py-0.2 bg-[#26a69a]/20 text-[#26a69a] text-[9px] rounded ml-0.5">
                        {filteredOrderHistory.length}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 px-4 py-1.5 text-[10px] text-[#787b86] uppercase border-b border-[#1e222d]/60">
              <div className="col-span-2">TIMESTAMP</div>
              <div className="col-span-2">SYMBOL</div>
              <div className="col-span-1">SIDE</div>
              <div className="col-span-1">LOTS</div>
              <div className="col-span-2">ENTRY</div>
              <div className="col-span-2">EXIT</div>
              <div className="col-span-1 text-right">REALIZED P&L</div>
              <div className="col-span-1 text-right">STATUS</div>
            </div>

            {/* Table Rows */}
            {filteredOrderHistory.length === 0 ? (
              <div className="py-8 text-center text-[#787b86] text-[11px]">
                No orders match your filter criteria.
              </div>
            ) : (
              filteredOrderHistory.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 px-4 py-2 items-center hover:bg-[#131722] transition-colors border-b border-[#1e222d]/30 text-[11px]"
                >
                  <div className="col-span-2 text-[#787b86]">{item.closedAt}</div>
                  <div className="col-span-2 font-bold text-[#dfe2f2]">{item.symbol}</div>
                  <div className="col-span-1">
                    <span className={`text-[10px] font-bold ${item.side === 'BUY' ? 'text-[#26a69a]' : 'text-[#f23645]'}`}>
                      {item.side}
                    </span>
                  </div>
                  <div className="col-span-1 text-[#dfe2f2]">{item.lots}</div>
                  <div className="col-span-2 text-[#dfe2f2]">{item.entryPrice.toLocaleString()}</div>
                  <div className="col-span-2 text-[#dfe2f2]">{item.exitPrice.toLocaleString()}</div>
                  <div className={`col-span-1 text-right font-bold ${item.pnl >= 0 ? 'text-[#26a69a]' : 'text-[#f23645]'}`}>
                    {item.pnl >= 0 ? '+' : ''}${item.pnl.toFixed(2)}
                  </div>
                  <div className="col-span-1 text-right flex items-center justify-end gap-1">
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#1e222d] text-[#26a69a]">
                      {item.status}
                    </span>
                    <button
                      onClick={() => {
                        setActiveTab('journal');
                        sounds.playClick();
                      }}
                      title="View & Edit notes in Trade Journal"
                      className="p-1 hover:text-[#f8bd42] text-[#787b86] cursor-pointer transition-colors"
                    >
                      <BookOpen className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'equity' && (
          <div className="p-3">
            <EquityCurveChart
              orderHistory={orderHistory}
              account={account}
              height={isPanelExpanded ? 200 : 120}
              isExpanded={isPanelExpanded}
              onToggleExpand={() => setIsPanelExpanded(!isPanelExpanded)}
            />
          </div>
        )}

        {activeTab === 'audit' && (
          <PerformanceMetricsDashboard
            orderHistory={orderHistory}
            account={account}
          />
        )}

        {activeTab === 'journal' && (
          <TradeJournal
            orderHistory={orderHistory}
            onUpdateOrderHistory={onUpdateOrderHistory || (() => {})}
            isExpanded={isPanelExpanded}
            onToggleExpand={() => setIsPanelExpanded(!isPanelExpanded)}
          />
        )}

        {activeTab === 'correlation' && (
          <CorrelationMatrix
            symbols={symbols}
            isExpanded={isPanelExpanded}
            onToggleExpand={() => setIsPanelExpanded(!isPanelExpanded)}
            onSelectSymbol={onSelectSymbol}
          />
        )}

        {activeTab === 'stale' && (
          <div className="p-4 grid grid-cols-3 gap-4 text-[11px]">
            <div className="bg-[#131722] p-3 rounded border border-[#2a2e39]">
              <div className="flex items-center gap-2 text-[#26a69a] font-bold">
                <Activity className="w-4 h-4" />
                <span>FEED LATENCY</span>
              </div>
              <div className="text-[18px] font-bold text-[#dfe2f2] mt-1">12 ms</div>
              <div className="text-[10px] text-[#787b86] mt-1">Broker: OANDA Primary Gateway</div>
            </div>
            <div className="bg-[#131722] p-3 rounded border border-[#2a2e39]">
              <div className="flex items-center gap-2 text-[#f8bd42] font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>RISK ENGINE</span>
              </div>
              <div className="text-[18px] font-bold text-[#26a69a] mt-1">NOMINAL</div>
              <div className="text-[10px] text-[#787b86] mt-1">Zero invariant violations detected</div>
            </div>
            <div className="bg-[#131722] p-3 rounded border border-[#2a2e39]">
              <div className="flex items-center gap-2 text-[#dfe2f2] font-bold">
                <TrendingUp className="w-4 h-4" />
                <span>SLIPPAGE TOLERANCE</span>
              </div>
              <div className="text-[18px] font-bold text-[#dfe2f2] mt-1">0.10 Pips</div>
              <div className="text-[10px] text-[#787b86] mt-1">Institutional ECN Direct</div>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
};
