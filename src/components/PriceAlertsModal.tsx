import React, { useState } from 'react';
import { PriceAlert, SymbolData } from '../types/terminal';
import { formatPrice } from '../utils/format';
import { sounds } from '../utils/audio';
import { 
  Bell, 
  Plus, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Clock,
  Sparkles
} from 'lucide-react';

interface PriceAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbolData: SymbolData;
  alerts: PriceAlert[];
  onAddAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => void;
  onDeleteAlert: (id: string) => void;
  onClearTriggered: () => void;
}

export const PriceAlertsModal: React.FC<PriceAlertsModalProps> = ({
  isOpen,
  onClose,
  symbolData,
  alerts,
  onAddAlert,
  onDeleteAlert,
  onClearTriggered,
}) => {
  const currentPrice = symbolData.price;
  const digits = symbolData.digits;

  // New Alert Form state
  const [targetPrice, setTargetPrice] = useState<string>(
    (+currentPrice.toFixed(digits)).toString()
  );
  const [condition, setCondition] = useState<'CROSSES' | 'CROSSES_ABOVE' | 'CROSSES_BELOW'>('CROSSES');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const symbolAlerts = alerts.filter((a) => a.symbol === symbolData.symbol);
  const activeAlerts = symbolAlerts.filter((a) => !a.triggered);
  const triggeredAlerts = symbolAlerts.filter((a) => a.triggered);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(targetPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid target price');
      return;
    }

    onAddAlert({
      symbol: symbolData.symbol,
      targetPrice: +priceNum.toFixed(digits),
      condition,
      note: note.trim() || undefined,
    });

    sounds.playOrderFill();
    setNote('');
    setError('');
  };

  const handleQuickPreset = (offsetPercent: number) => {
    const calculated = +(currentPrice * (1 + offsetPercent / 100)).toFixed(digits);
    setTargetPrice(calculated.toString());
    if (offsetPercent > 0) {
      setCondition('CROSSES_ABOVE');
    } else if (offsetPercent < 0) {
      setCondition('CROSSES_BELOW');
    } else {
      setCondition('CROSSES');
    }
    sounds.playClick();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#131722] border border-[#2a2e39] rounded-lg shadow-2xl overflow-hidden font-mono text-[11px] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="h-11 px-4 bg-[#0c0e14] border-b border-[#1e222d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 font-bold text-[#f8bd42]">
            <Bell className="w-4 h-4 text-[#f8bd42]" />
            <span>PRICE ALERT MANAGER — {symbolData.symbol}</span>
          </div>
          <button
            onClick={() => {
              onClose();
              sounds.playClick();
            }}
            className="text-[#787b86] hover:text-[#dfe2f2] cursor-pointer transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Symbol Status Ribbon */}
        <div className="px-4 py-2 bg-[#1b1f2b] border-b border-[#2a2e39] flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-[#dfe2f2] font-bold">{symbolData.symbol}</span>
            <span className="text-[#787b86]">MARK:</span>
            <span className="font-bold text-[#f8bd42]">${formatPrice(currentPrice, digits)}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-[#787b86]">ACTIVE:</span>
            <span className="px-1.5 py-0.2 bg-[#0c0e14] text-[#26a69a] rounded font-bold border border-[#26a69a]/30">
              {activeAlerts.length}
            </span>
            <span className="text-[#787b86] ml-1">TRIGGERED:</span>
            <span className="px-1.5 py-0.2 bg-[#0c0e14] text-[#ef5350] rounded font-bold border border-[#ef5350]/30">
              {triggeredAlerts.length}
            </span>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* Create Alert Section */}
          <div className="bg-[#0c0e14] border border-[#1e222d] rounded p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#dfe2f2] flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-[#f8bd42]" />
                CREATE CUSTOM PRICE ALERT
              </span>
              <span className="text-[10px] text-[#787b86]">Audible + Visual Chime</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Target Price */}
                <div>
                  <label className="block text-[10px] text-[#787b86] mb-1">
                    TARGET PRICE ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={targetPrice}
                    onChange={(e) => {
                      setTargetPrice(e.target.value);
                      setError('');
                    }}
                    placeholder={currentPrice.toString()}
                    className="w-full bg-[#131722] border border-[#2a2e39] focus:border-[#f8bd42] rounded px-2.5 py-1.5 text-[#dfe2f2] font-mono text-xs outline-none"
                  />
                </div>

                {/* Condition Trigger */}
                <div>
                  <label className="block text-[10px] text-[#787b86] mb-1">
                    TRIGGER CONDITION
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as any)}
                    className="w-full bg-[#131722] border border-[#2a2e39] focus:border-[#f8bd42] rounded px-2.5 py-1.5 text-[#dfe2f2] font-mono text-xs outline-none cursor-pointer"
                  >
                    <option value="CROSSES">Crossing Price (Any direction)</option>
                    <option value="CROSSES_ABOVE">Crosses Above (Bullish threshold)</option>
                    <option value="CROSSES_BELOW">Crosses Below (Bearish threshold)</option>
                  </select>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[9px] text-[#787b86] mr-1">QUICK PRESETS:</span>
                <button
                  type="button"
                  onClick={() => handleQuickPreset(0.25)}
                  className="px-2 py-0.5 bg-[#1e222d] hover:bg-[#2a2e39] text-[#26a69a] rounded text-[10px] transition-colors cursor-pointer border border-[#26a69a]/20"
                >
                  +0.25%
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset(0.5)}
                  className="px-2 py-0.5 bg-[#1e222d] hover:bg-[#2a2e39] text-[#26a69a] rounded text-[10px] transition-colors cursor-pointer border border-[#26a69a]/20"
                >
                  +0.5%
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset(-0.25)}
                  className="px-2 py-0.5 bg-[#1e222d] hover:bg-[#2a2e39] text-[#ef5350] rounded text-[10px] transition-colors cursor-pointer border border-[#ef5350]/20"
                >
                  -0.25%
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset(-0.5)}
                  className="px-2 py-0.5 bg-[#1e222d] hover:bg-[#2a2e39] text-[#ef5350] rounded text-[10px] transition-colors cursor-pointer border border-[#ef5350]/20"
                >
                  -0.5%
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTargetPrice(currentPrice.toString());
                    setCondition('CROSSES');
                    sounds.playClick();
                  }}
                  className="px-2 py-0.5 bg-[#1e222d] hover:bg-[#2a2e39] text-[#f8bd42] rounded text-[10px] transition-colors cursor-pointer ml-auto flex items-center gap-1"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Current Mark</span>
                </button>
              </div>

              {/* Note / Label */}
              <div>
                <label className="block text-[10px] text-[#787b86] mb-1">
                  OPTIONAL DESCRIPTIVE NOTE / STRATEGY TAG
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., London session liquidity sweep / Invalidation level"
                  maxLength={60}
                  className="w-full bg-[#131722] border border-[#2a2e39] focus:border-[#f8bd42] rounded px-2.5 py-1.5 text-[#dfe2f2] font-mono text-xs outline-none"
                />
              </div>

              {error && (
                <div className="text-[#ef5350] text-[10px] flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-[#f8bd42] hover:bg-[#e6ab33] text-[#0f131e] font-bold rounded flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-[0.99]"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>ARM PRICE ALERT ON CHART</span>
              </button>
            </form>
          </div>

          {/* Active Alerts List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#dfe2f2] text-[10px] tracking-wider uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f8bd42] animate-ping" />
                ACTIVE ALERTS MONITORING ({activeAlerts.length})
              </span>
              <span className="text-[10px] text-[#787b86]">Interactive on Chart Canvas</span>
            </div>

            {activeAlerts.length === 0 ? (
              <div className="p-4 bg-[#0c0e14] border border-[#1e222d] rounded text-center text-[#787b86]">
                No active price alerts set for {symbolData.symbol}. Click anywhere on the chart's price axis or use the form above to arm one.
              </div>
            ) : (
              <div className="space-y-1.5">
                {activeAlerts.map((alert) => {
                  const distance = alert.targetPrice - currentPrice;
                  const distancePercent = ((distance / currentPrice) * 100).toFixed(2);
                  const isAbove = alert.targetPrice >= currentPrice;

                  return (
                    <div
                      key={alert.id}
                      className="p-2.5 bg-[#0c0e14] border border-[#1e222d] hover:border-[#f8bd42]/40 rounded flex items-center justify-between transition-colors group"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Bell className="w-3.5 h-3.5 text-[#f8bd42]" />
                          <span className="font-bold text-sm text-[#dfe2f2]">
                            ${formatPrice(alert.targetPrice, digits)}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold flex items-center gap-0.5 ${
                              alert.condition === 'CROSSES_ABOVE'
                                ? 'bg-[#26a69a]/15 text-[#26a69a] border border-[#26a69a]/30'
                                : alert.condition === 'CROSSES_BELOW'
                                ? 'bg-[#ef5350]/15 text-[#ef5350] border border-[#ef5350]/30'
                                : 'bg-[#f8bd42]/15 text-[#f8bd42] border border-[#f8bd42]/30'
                            }`}
                          >
                            {alert.condition === 'CROSSES_ABOVE' && <ArrowUp className="w-2.5 h-2.5" />}
                            {alert.condition === 'CROSSES_BELOW' && <ArrowDown className="w-2.5 h-2.5" />}
                            {alert.condition.replace('_', ' ')}
                          </span>
                        </div>
                        {alert.note && (
                          <div className="text-[10px] text-[#9ca3af] italic">
                            "{alert.note}"
                          </div>
                        )}
                        <div className="text-[9px] text-[#787b86] flex items-center gap-2">
                          <span>Dist: {distance > 0 ? `+${distance.toFixed(digits)}` : distance.toFixed(digits)} ({distancePercent}%)</span>
                          <span>•</span>
                          <span>Set: {alert.createdAt}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            onDeleteAlert(alert.id);
                            sounds.playClick();
                          }}
                          title="Delete Alert"
                          className="p-1.5 text-[#787b86] hover:text-[#ef5350] hover:bg-[#1e222d] rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Triggered Alerts History */}
          {triggeredAlerts.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#1e222d]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#787b86] text-[10px] tracking-wider uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-[#26a69a]" />
                  TRIGGERED ALERTS HISTORY ({triggeredAlerts.length})
                </span>
                <button
                  onClick={() => {
                    onClearTriggered();
                    sounds.playClick();
                  }}
                  className="text-[10px] text-[#787b86] hover:text-[#dfe2f2] cursor-pointer hover:underline"
                >
                  Clear History
                </button>
              </div>

              <div className="space-y-1">
                {triggeredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-2 bg-[#0c0e14]/60 border border-[#1e222d] rounded flex items-center justify-between text-[10px] opacity-75"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-[#26a69a]" />
                      <span className="text-[#dfe2f2] font-semibold">
                        ${formatPrice(alert.targetPrice, digits)}
                      </span>
                      {alert.note && <span className="text-[#787b86]">({alert.note})</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[#787b86] text-[9px]">
                      <Clock className="w-2.5 h-2.5" />
                      <span>Triggered at {alert.triggeredAt || 'recent'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-[#0c0e14] border-t border-[#1e222d] flex items-center justify-between text-[10px] text-[#787b86] shrink-0">
          <span>Tip: Hover or drag alert lines directly on the chart right axis.</span>
          <button
            onClick={() => {
              onClose();
              sounds.playClick();
            }}
            className="px-3 py-1 bg-[#1e222d] hover:bg-[#2a2e39] text-[#dfe2f2] rounded transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
