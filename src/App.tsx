import { useState, useEffect } from 'react';
import { Timeframe, SymbolData, Position, OrderHistoryItem, AccountState, RiskRewardSetup, PriceAlert } from './types/terminal';
import { 
  SYMBOLS_DATABASE, 
  INITIAL_ACCOUNT, 
  INITIAL_POSITIONS, 
  INITIAL_ORDER_HISTORY 
} from './data/mockData';
import { Header } from './components/Header';
import { LeftSidebar, ChartTool } from './components/LeftSidebar';
import { InstitutionalRadar } from './components/InstitutionalRadar';
import { CandlestickChart } from './components/CandlestickChart';
import { RightPanel } from './components/RightPanel';
import { BottomPanel } from './components/BottomPanel';
import { SettingsModal } from './components/SettingsModal';
import { LayersModal } from './components/LayersModal';
import { NotificationsModal, NotificationItem } from './components/NotificationsModal';
import { VolatilityHeatmap } from './components/VolatilityHeatmap';
import { PriceAlertsModal } from './components/PriceAlertsModal';
import { sounds } from './utils/audio';
import { formatPrice } from './utils/format';
import { Bell, X } from 'lucide-react';

export default function App() {
  const [symbols, setSymbols] = useState<Record<string, SymbolData>>(SYMBOLS_DATABASE);
  const [selectedSymbolKey, setSelectedSymbolKey] = useState<string>('XAUUSD');
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('15m');
  const [account, setAccount] = useState<AccountState>(INITIAL_ACCOUNT);
  const [positions, setPositions] = useState<Position[]>(INITIAL_POSITIONS);
  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>(INITIAL_ORDER_HISTORY);
  
  // Right panel active tab
  const [activeRightTab, setActiveRightTab] = useState<'structure' | 'ticket'>('structure');

  // Left toolbar tools
  const [activeTool, setActiveTool] = useState<ChartTool>('crosshair');
  const [magnetEnabled, setMagnetEnabled] = useState(true);

  // Visual Risk / Reward Tool State on Chart
  const [riskReward, setRiskReward] = useState<RiskRewardSetup>({
    visible: true,
    side: 'LONG',
    entryPrice: 2381.5,
    stopLoss: 2376.0,
    takeProfit: 2392.5,
    lots: 0.04,
  });

  // Price Alerts State
  const [alerts, setAlerts] = useState<PriceAlert[]>([
    {
      id: 'alert-initial-1',
      symbol: 'XAUUSD',
      targetPrice: 2385.0,
      condition: 'CROSSES_ABOVE',
      note: 'London session high liquidity sweep',
      createdAt: '12:30:00',
      triggered: false,
    },
    {
      id: 'alert-initial-2',
      symbol: 'XAUUSD',
      targetPrice: 2375.0,
      condition: 'CROSSES_BELOW',
      note: 'Key discount FVG invalidation level',
      createdAt: '13:15:00',
      triggered: false,
    },
    {
      id: 'alert-initial-3',
      symbol: 'BTCUSD',
      targetPrice: 64800.0,
      condition: 'CROSSES_ABOVE',
      note: 'Range breakout confirmation trigger',
      createdAt: '10:00:00',
      triggered: false,
    },
  ]);

  // Active Alert Toast Banner (popup when triggered)
  const [triggeredToast, setTriggeredToast] = useState<{
    id: string;
    alert: PriceAlert;
    crossedPrice: number;
  } | null>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHeatmapOpen, setIsHeatmapOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [feedLatency, setFeedLatency] = useState(12);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sentiment tape percentage
  const [buyTapePercentage, setBuyTapePercentage] = useState(58);

  // Layers state
  const [layers, setLayers] = useState({
    supplyOB: true,
    fvg: true,
    bslSwept: true,
    bos: true,
    volumeProfile: true,
  });

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      time: '14:28:15',
      title: 'XAUUSD 15m FVG Zone Reclaimed',
      description: 'Institutional absorption identified at $2,376.10 with positive order flow delta.',
      type: 'alert',
    },
    {
      id: 'notif-2',
      time: '14:16:02',
      title: 'Order Executed: BUY 0.04 XAUUSD',
      description: 'Fill price $2,380.20 | Stop Loss set to trailing $2,378.00.',
      type: 'order',
    },
  ]);

  const currentSymbol = symbols[selectedSymbolKey] || symbols.XAUUSD;

  // Live market price simulation ticker (breathes life into the quant terminal)
  useEffect(() => {
    const interval = setInterval(() => {
      setSymbols((prev) => {
        const symbol = prev[selectedSymbolKey];
        if (!symbol) return prev;

        const oldPrice = symbol.price;
        // Subtly fluctuate price
        const tickDelta = (Math.random() - 0.49) * (symbol.digits === 1 ? 2.5 : symbol.digits === 5 ? 0.0001 : 0.25);
        const newPrice = Math.max(0.1, +(symbol.price + tickDelta).toFixed(symbol.digits));
        const newBid = +(newPrice - symbol.spread / 2).toFixed(symbol.digits);
        const newAsk = +(newPrice + symbol.spread / 2).toFixed(symbol.digits);

        // Update the last candle
        const updatedCandles = [...symbol.candles];
        const lastCandle = { ...updatedCandles[updatedCandles.length - 1] };
        lastCandle.close = newPrice;
        if (newPrice > lastCandle.high) lastCandle.high = newPrice;
        if (newPrice < lastCandle.low) lastCandle.low = newPrice;
        updatedCandles[updatedCandles.length - 1] = lastCandle;

        // Check if any active price alert was crossed by this price tick
        setAlerts((currentAlerts) => {
          let triggeredAny = false;
          const nextAlerts = currentAlerts.map((alert) => {
            if (alert.symbol !== selectedSymbolKey || alert.triggered) {
              return alert;
            }

            const target = alert.targetPrice;
            let didCross = false;

            if (alert.condition === 'CROSSES_ABOVE') {
              didCross = (oldPrice < target && newPrice >= target) || (oldPrice <= target && newPrice > target);
            } else if (alert.condition === 'CROSSES_BELOW') {
              didCross = (oldPrice > target && newPrice <= target) || (oldPrice >= target && newPrice < target);
            } else {
              // CROSSES either direction
              didCross = (oldPrice <= target && newPrice >= target) || (oldPrice >= target && newPrice <= target);
            }

            if (didCross) {
              triggeredAny = true;
              const now = new Date();
              const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
              
              // Trigger Audio alert chime
              sounds.playAlertChime();

              // Trigger Visual Toast Banner notification
              setTriggeredToast({
                id: `toast-${Date.now()}`,
                alert: { ...alert, triggered: true, triggeredAt: timeStr },
                crossedPrice: newPrice,
              });

              // Add to terminal notifications stream
              setNotifications((prevNotifs) => [
                {
                  id: `notif-${Date.now()}`,
                  time: timeStr,
                  title: `PRICE ALERT TRIGGERED: ${alert.symbol} @ $${formatPrice(newPrice, symbol.digits)}`,
                  description: `Target $${formatPrice(target, symbol.digits)} (${alert.condition.replace('_', ' ')}) reached.${alert.note ? ` Note: "${alert.note}"` : ''}`,
                  type: 'alert',
                },
                ...prevNotifs,
              ]);

              return {
                ...alert,
                triggered: true,
                triggeredAt: timeStr,
              };
            }

            return alert;
          });

          return nextAlerts;
        });

        return {
          ...prev,
          [selectedSymbolKey]: {
            ...symbol,
            price: newPrice,
            bid: newBid,
            ask: newAsk,
            candles: updatedCandles,
          },
        };
      });

      // Fluctuate buy tape slightly
      if (Math.random() > 0.6) {
        setBuyTapePercentage((prev) => {
          const shift = Math.random() > 0.5 ? 1 : -1;
          return Math.min(85, Math.max(25, prev + shift));
        });
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [selectedSymbolKey]);

  // Update open positions mark price and P&L dynamically
  useEffect(() => {
    setPositions((prev) =>
      prev.map((pos) => {
        const sym = symbols[pos.symbol];
        if (!sym) return pos;

        const currentMark = sym.price;
        const diff = pos.side === 'BUY' ? currentMark - pos.entryPrice : pos.entryPrice - currentMark;
        const netPnL = +(diff * pos.lots * 100).toFixed(2);
        const netPnLPercent = +((diff / pos.entryPrice) * 100).toFixed(1);

        return {
          ...pos,
          markPrice: currentMark,
          netPnL,
          netPnLPercent,
        };
      })
    );
  }, [symbols]);

  // Recalculate account equity from open positions
  useEffect(() => {
    const totalOpenPnL = positions.reduce((acc, curr) => acc + curr.netPnL, 0);
    const totalMargin = positions.reduce((acc, curr) => acc + (curr.lots * 100 * (curr.entryPrice / 50)), 0);
    
    setAccount((prev) => ({
      ...prev,
      equity: +(prev.balance + totalOpenPnL).toFixed(2),
      margin: +totalMargin.toFixed(2),
      freeMargin: +(prev.balance + totalOpenPnL - totalMargin).toFixed(2),
    }));
  }, [positions]);

  // Close open position
  const handleClosePosition = (id: string) => {
    const target = positions.find((p) => p.id === id);
    if (!target) return;

    // Realize PnL
    const realizedPnL = target.netPnL;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const newHistoryItem: OrderHistoryItem = {
      id: `ord-hist-${Date.now()}`,
      symbol: target.symbol,
      side: target.side,
      lots: target.lots,
      entryPrice: target.entryPrice,
      exitPrice: target.markPrice,
      pnl: realizedPnL,
      pnlPercent: target.netPnLPercent,
      closedAt: timeStr,
      status: 'MANUAL_CLOSE',
      notes: '',
      tags: target.netPnL >= 0 ? ['Followed plan'] : ['Early exit'],
      sentiment: target.netPnL >= 0 ? 'DISCIPLINED' : 'NEUTRAL',
    };

    setOrderHistory((prev) => [newHistoryItem, ...prev]);
    setPositions((prev) => prev.filter((p) => p.id !== id));
    setAccount((prev) => ({
      ...prev,
      balance: +(prev.balance + realizedPnL).toFixed(2),
    }));

    // Add alert notification
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        time: timeStr,
        title: `Closed ${target.side} ${target.lots} ${target.symbol}`,
        description: `Realized P&L: ${realizedPnL >= 0 ? '+' : ''}$${realizedPnL.toFixed(2)} (${target.netPnLPercent >= 0 ? '+' : ''}${target.netPnLPercent.toFixed(1)}%)`,
        type: 'order',
      },
      ...prev,
    ]);
  };

  // Update order history trade notes / tags
  const handleUpdateOrderHistory = (id: string, updates: Partial<OrderHistoryItem>) => {
    setOrderHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // Place new order
  const handleExecuteOrder = (orderData: Omit<Position, 'id' | 'netPnL' | 'netPnLPercent' | 'openTime'>) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const newPos: Position = {
      ...orderData,
      id: `pos-${Date.now()}`,
      netPnL: 0,
      netPnLPercent: 0,
      openTime: timeStr,
    };

    setPositions((prev) => [newPos, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        time: timeStr,
        title: `Executed ${orderData.side} ${orderData.lots} ${orderData.symbol}`,
        description: `Entry @ ${orderData.entryPrice} | SL ${orderData.stopLoss} | TP ${orderData.takeProfit}`,
        type: 'order',
      },
      ...prev,
    ]);
  };

  // Handle symbol change
  const handleSelectSymbol = (symbolKey: string) => {
    setSelectedSymbolKey(symbolKey);
    const sym = symbols[symbolKey];
    if (sym) {
      const isBull = sym.aiStructure.bias !== 'BEARISH';
      setRiskReward((prev) => ({
        ...prev,
        side: isBull ? 'LONG' : 'SHORT',
        entryPrice: sym.aiStructure.levels.triggerEntry,
        stopLoss: sym.aiStructure.levels.invalidationSL,
        takeProfit: sym.aiStructure.levels.target1,
      }));
    }
  };

  // Handle Tool Selection
  const handleSelectTool = (tool: ChartTool) => {
    setActiveTool(tool);
    if (tool === 'riskReward') {
      setRiskReward((prev) => ({ ...prev, visible: true }));
    }
  };

  // Reset to default demo balance
  const handleResetAccount = () => {
    setAccount(INITIAL_ACCOUNT);
    setPositions(INITIAL_POSITIONS);
    setSymbols(SYMBOLS_DATABASE);
  };

  const handleToggleLayer = (key: 'supplyOB' | 'fvg' | 'bslSwept' | 'bos' | 'volumeProfile') => {
    setLayers((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Price Alert Handlers
  const handleAddAlert = (alertData: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const newAlert: PriceAlert = {
      ...alertData,
      id: `alert-${Date.now()}`,
      createdAt: timeStr,
      triggered: false,
    };
    setAlerts((prev) => [newAlert, ...prev]);
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleClearTriggeredAlerts = () => {
    setAlerts((prev) => prev.filter((a) => !a.triggered));
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0f131e] text-[#dfe2f2] relative">
      {/* 0. Realtime Triggered Price Alert Visual Banner */}
      {triggeredToast && (
        <div className="absolute top-14 right-4 z-50 animate-in slide-in-from-top duration-200">
          <div className="w-[340px] bg-[#0c0e14] border-2 border-[#f8bd42] rounded-lg shadow-2xl p-3 font-mono text-[11px] flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#f8bd42]/20 border border-[#f8bd42] flex items-center justify-center shrink-0 mt-0.5 animate-bounce">
              <Bell className="w-4 h-4 text-[#f8bd42]" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#f8bd42] tracking-wider text-[11px]">
                  PRICE THRESHOLD REACHED
                </span>
                <button
                  onClick={() => setTriggeredToast(null)}
                  className="text-[#787b86] hover:text-[#dfe2f2] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-[#dfe2f2] font-bold text-sm">
                {triggeredToast.alert.symbol} @ ${formatPrice(triggeredToast.crossedPrice, symbols[triggeredToast.alert.symbol]?.digits || 2)}
              </div>
              <div className="text-[#787b86] text-[10px]">
                Target: ${formatPrice(triggeredToast.alert.targetPrice, symbols[triggeredToast.alert.symbol]?.digits || 2)} ({triggeredToast.alert.condition.replace('_', ' ')})
              </div>
              {triggeredToast.alert.note && (
                <div className="text-[10px] text-[#26a69a] italic">
                  "{triggeredToast.alert.note}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1. Header Navigation Bar */}
      <Header
        currentSymbol={currentSymbol}
        allSymbols={symbols}
        onSelectSymbol={handleSelectSymbol}
        activeTimeframe={activeTimeframe}
        onSelectTimeframe={setActiveTimeframe}
        account={account}
        onResetAccount={handleResetAccount}
        activeRightTab={activeRightTab}
        onChangeRightTab={setActiveRightTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadNotificationsCount={notifications.length}
        onOpenHeatmap={() => setIsHeatmapOpen(true)}
      />

      {/* 2. Main Workspace Layout: Left Sidebar + Radar + Candlestick Chart + Right AI Panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Leftmost Tool Rail */}
        <LeftSidebar
          activeTool={activeTool}
          onSelectTool={handleSelectTool}
          magnetEnabled={magnetEnabled}
          onToggleMagnet={() => setMagnetEnabled(!magnetEnabled)}
          onOpenLayersModal={() => setIsLayersOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAlertsModal={() => setIsAlertsModalOpen(true)}
        />

        {/* Institutional Radar Watchlist */}
        <InstitutionalRadar
          symbols={symbols}
          selectedSymbol={selectedSymbolKey}
          onSelectSymbol={handleSelectSymbol}
          buyTapePercentage={buyTapePercentage}
          onOpenHeatmapModal={() => setIsHeatmapOpen(true)}
        />

        {/* Center: Interactive Candlestick Chart */}
        <main className="flex-1 flex flex-col min-w-0 h-full relative">
          <CandlestickChart
            symbolData={currentSymbol}
            timeframe={activeTimeframe}
            riskReward={riskReward}
            onChangeRiskReward={setRiskReward}
            onSyncToOrderTicket={(setup) => {
              setRiskReward(setup);
              setActiveRightTab('ticket');
            }}
            alerts={alerts}
            onAddAlert={handleAddAlert}
            onDeleteAlert={handleDeleteAlert}
            onOpenAlertsModal={() => setIsAlertsModalOpen(true)}
          />
        </main>

        {/* Right Panel: VK AI Structure & Execution Ticket */}
        <RightPanel
          symbolData={currentSymbol}
          activeTab={activeRightTab}
          onChangeTab={setActiveRightTab}
          onExecuteOrder={handleExecuteOrder}
          accountBalance={account.balance}
          riskReward={riskReward}
          onSyncRiskReward={setRiskReward}
        />
      </div>

      {/* 3. Bottom Panel: Positions, Pending, History, Audit, Journal, Correlation */}
      <BottomPanel
        positions={positions}
        onClosePosition={handleClosePosition}
        orderHistory={orderHistory}
        account={account}
        onUpdateOrderHistory={handleUpdateOrderHistory}
        symbols={symbols}
        onSelectSymbol={handleSelectSymbol}
      />

      {/* Modal Dialogs */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        feedLatency={feedLatency}
        onSetFeedLatency={setFeedLatency}
        soundEnabled={soundEnabled}
        onToggleSound={() => {
          const next = !soundEnabled;
          setSoundEnabled(next);
          sounds.enabled = next;
        }}
      />

      <LayersModal
        isOpen={isLayersOpen}
        onClose={() => setIsLayersOpen(false)}
        layers={layers}
        onToggleLayer={handleToggleLayer}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onClear={() => setNotifications([])}
      />

      {/* Volatility Heatmap & ADR Modal */}
      {isHeatmapOpen && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
          <VolatilityHeatmap
            symbols={symbols}
            selectedSymbol={selectedSymbolKey}
            onSelectSymbol={(sym) => {
              handleSelectSymbol(sym);
              setIsHeatmapOpen(false);
            }}
            onClose={() => setIsHeatmapOpen(false)}
            isModal={true}
          />
        </div>
      )}

      {/* Price Alerts Manager Modal */}
      <PriceAlertsModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        symbolData={currentSymbol}
        alerts={alerts}
        onAddAlert={handleAddAlert}
        onDeleteAlert={handleDeleteAlert}
        onClearTriggered={handleClearTriggeredAlerts}
      />
    </div>
  );
}
