import React, { useState, useRef, useEffect } from 'react';
import { Timeframe, SymbolData, AccountState } from '../types/terminal';
import { 
  ChevronDown, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Bell, 
  Settings,
  Wallet,
  Flame,
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { formatPrice } from '../utils/format';

interface HeaderProps {
  currentSymbol: SymbolData;
  allSymbols: Record<string, SymbolData>;
  onSelectSymbol: (symbolKey: string) => void;
  activeTimeframe: Timeframe;
  onSelectTimeframe: (tf: Timeframe) => void;
  account: AccountState;
  onResetAccount: () => void;
  activeRightTab: 'structure' | 'ticket';
  onChangeRightTab: (tab: 'structure' | 'ticket') => void;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount?: number;
  onOpenHeatmap?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSymbol,
  allSymbols,
  onSelectSymbol,
  activeTimeframe,
  onSelectTimeframe,
  account,
  onResetAccount,
  activeRightTab,
  onChangeRightTab,
  onOpenSettings,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  onOpenHeatmap,
}) => {
  const [symbolDropdownOpen, setSymbolDropdownOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const timeframes: Timeframe[] = ['1m', '5m', '15m', '1H', '4H', '1D'];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSymbolDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.enabled = next;
    if (next) sounds.playClick();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <header className="h-[46px] bg-[#0c0e14] border-b border-[#1e222d] flex items-center justify-between px-2 text-[12px] select-none shrink-0 z-30">
      {/* Left side: Brand & Symbol & High-density Ticker Stats */}
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
        {/* Brand Lockup */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-[22px] h-[22px] bg-[#f8bd42] text-[#0f131e] font-bold text-[11px] flex items-center justify-center rounded-[2px] tracking-tight">
            VK
          </div>
          <span className="font-bold tracking-tight text-[#f8bd42] text-[13px] whitespace-nowrap">
            VK QUANT TERMINAL
          </span>
          <span className="text-[9px] font-mono px-1 py-0.2 border border-[#f8bd42]/40 text-[#f8bd42] rounded-[2px] leading-tight ml-0.5">
            v4.2 PRO
          </span>
        </div>

        {/* Hairline Divider */}
        <div className="w-[1px] h-5 bg-[#2a2e39] shrink-0" />

        {/* Symbol Selector Dropdown */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            onClick={() => {
              sounds.playClick();
              setSymbolDropdownOpen(!symbolDropdownOpen);
            }}
            className="flex items-center gap-2 px-2 py-1 bg-[#131722] hover:bg-[#1e222d] border border-[#2a2e39] rounded-[3px] transition-colors cursor-pointer"
          >
            <span className="font-bold font-mono text-[#dfe2f2] text-[12px]">
              {currentSymbol.symbol}
            </span>
            <span className="text-[11px] text-[#787b86] font-medium">
              {currentSymbol.name}
            </span>
            <span
              className={`font-mono text-[11px] font-semibold ${
                currentSymbol.change24h >= 0 ? 'text-[#26a69a]' : 'text-[#f23645]'
              }`}
            >
              ${formatPrice(currentSymbol.price, currentSymbol.digits)}
              {' '}
              {currentSymbol.change24h >= 0 ? '+' : ''}
              {currentSymbol.change24h.toFixed(2)}%
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#787b86]" />
          </button>

          {/* Dropdown Menu */}
          {symbolDropdownOpen && (
            <div className="absolute left-0 top-[34px] w-64 bg-[#131722] border border-[#2a2e39] rounded shadow-2xl py-1 z-50">
              <div className="px-2 py-1 text-[10px] text-[#787b86] uppercase font-mono tracking-wider border-b border-[#1e222d]">
                SELECT ASSET
              </div>
              {Object.values(allSymbols).map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => {
                    onSelectSymbol(item.symbol);
                    setSymbolDropdownOpen(false);
                    sounds.playClick();
                  }}
                  className={`w-full px-2.5 py-1.5 flex items-center justify-between text-left hover:bg-[#1e222d] transition-colors ${
                    item.symbol === currentSymbol.symbol ? 'bg-[#1b1f2b] text-[#f8bd42]' : 'text-[#dfe2f2]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-[12px]">{item.symbol}</span>
                    <span className="text-[10px] text-[#787b86]">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[11px]">${formatPrice(item.price, item.digits)}</div>
                    <div className={`text-[10px] font-mono ${item.change24h >= 0 ? 'text-[#26a69a]' : 'text-[#f23645]'}`}>
                      {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(2)}%
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hairline Divider */}
        <div className="w-[1px] h-5 bg-[#2a2e39] shrink-0 hidden md:block" />

        {/* High-Density Ticker Data */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-[#787b86]">BID</span>
            <span className="text-[#dfe2f2] font-semibold">{formatPrice(currentSymbol.bid, currentSymbol.digits)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#787b86]">ASK</span>
            <span className="text-[#dfe2f2] font-semibold">{formatPrice(currentSymbol.ask, currentSymbol.digits)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#787b86]">SPREAD</span>
            <span className="text-[#f8bd42] font-semibold">{currentSymbol.spread.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#787b86]">VOL 24H</span>
            <span className="text-[#dfe2f2] font-semibold">{currentSymbol.volume24h}</span>
          </div>
        </div>

        {/* Live Feed Status */}
        <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 bg-[#131722] border border-[#2a2e39] rounded text-[10px] font-mono shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#26a69a] animate-pulse" />
          <span className="text-[#787b86]">FEED:</span>
          <span className="text-[#dfe2f2] font-medium">OANDA /</span>
          <span className="text-[#f8bd42] font-semibold">PRIME-X</span>
          <span className="text-[#26a69a]">(12ms UTC)</span>
        </div>
      </div>

      {/* Middle & Right: Timeframes, Account, Tools, and Panel Tabs */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Timeframe Buttons */}
        <div className="flex items-center bg-[#131722] border border-[#2a2e39] rounded-[3px] p-0.5">
          {timeframes.map((tf) => {
            const isActive = tf === activeTimeframe;
            return (
              <button
                key={tf}
                onClick={() => {
                  onSelectTimeframe(tf);
                  sounds.playClick();
                }}
                className={`px-2 py-0.5 text-[11px] font-mono font-medium rounded-[2px] transition-colors cursor-pointer ${
                  isActive
                    ? 'border border-[#f8bd42] text-[#f8bd42] bg-[#f8bd42]/10 font-bold'
                    : 'text-[#787b86] hover:text-[#dfe2f2]'
                }`}
              >
                {tf}
              </button>
            );
          })}
        </div>

        {/* Account Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#131722] border border-[#f8bd42]/60 rounded-[3px] text-[#f8bd42] font-mono font-semibold text-[11px]">
          <Wallet className="w-3.5 h-3.5 text-[#f8bd42]" />
          <span>Demo ${account.balance.toFixed(2)}</span>
        </div>

        {/* Volatility Heatmap Button */}
        {onOpenHeatmap && (
          <button
            onClick={() => {
              onOpenHeatmap();
              sounds.playClick();
            }}
            title="Open Quantitative Volatility Heatmap & ADR Momentum Engine"
            className="px-2 py-1 bg-[#131722] hover:bg-[#1e222d] border border-[#2a2e39] hover:border-[#f8bd42] rounded-[3px] text-[#f8bd42] text-[11px] font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="hidden xl:inline font-bold">VOL HEATMAP</span>
          </button>
        )}

        {/* Header Tools */}
        <button
          onClick={() => {
            onResetAccount();
            sounds.playClick();
          }}
          title="Reset Demo Balance & Chart"
          className="px-2 py-1 bg-[#131722] hover:bg-[#1e222d] border border-[#2a2e39] rounded-[3px] text-[11px] font-mono text-[#787b86] hover:text-[#dfe2f2] flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        <button
          onClick={toggleSound}
          title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          className="p-1.5 bg-[#131722] hover:bg-[#1e222d] border border-[#2a2e39] rounded-[3px] text-[#787b86] hover:text-[#dfe2f2] cursor-pointer"
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#26a69a]" /> : <VolumeX className="w-3.5 h-3.5 text-[#f23645]" />}
        </button>

        <button
          onClick={toggleFullscreen}
          title="Toggle Fullscreen"
          className="p-1.5 bg-[#131722] hover:bg-[#1e222d] border border-[#2a2e39] rounded-[3px] text-[#787b86] hover:text-[#dfe2f2] cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={onOpenNotifications}
          title="Execution Alerts & Notifications"
          className="relative p-1.5 bg-[#131722] hover:bg-[#1e222d] border border-[#2a2e39] rounded-[3px] text-[#787b86] hover:text-[#dfe2f2] cursor-pointer"
        >
          <Bell className="w-3.5 h-3.5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#f8bd42] rounded-full" />
          )}
        </button>

        <button
          onClick={onOpenSettings}
          title="Terminal Settings"
          className="p-1.5 bg-[#131722] hover:bg-[#1e222d] border border-[#2a2e39] rounded-[3px] text-[#787b86] hover:text-[#dfe2f2] cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* Hairline Divider */}
        <div className="w-[1px] h-5 bg-[#2a2e39] shrink-0" />

        {/* Tab switch for right panel */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              onChangeRightTab('structure');
              sounds.playClick();
            }}
            className={`px-3 py-1 font-mono text-[11px] font-bold tracking-tight uppercase cursor-pointer border-b-2 transition-all ${
              activeRightTab === 'structure'
                ? 'border-[#f8bd42] text-[#f8bd42]'
                : 'border-transparent text-[#787b86] hover:text-[#dfe2f2]'
            }`}
          >
            VK AI STRUCTURE
          </button>
          <button
            onClick={() => {
              onChangeRightTab('ticket');
              sounds.playClick();
            }}
            className={`px-3 py-1 font-mono text-[11px] font-bold tracking-tight uppercase cursor-pointer border-b-2 transition-all ${
              activeRightTab === 'ticket'
                ? 'border-[#f8bd42] text-[#f8bd42]'
                : 'border-transparent text-[#787b86] hover:text-[#dfe2f2]'
            }`}
          >
            EXECUTION TICKET
          </button>
        </div>
      </div>
    </header>
  );
};
