import React from 'react';
import {
  Crosshair,
  TrendingUp,
  Activity,
  Square,
  Layers,
  Magnet,
  Ruler,
  Target,
  Radio,
  SlidersHorizontal,
  Bell,
} from 'lucide-react';
import { sounds } from '../utils/audio';

export type ChartTool = 'crosshair' | 'trendline' | 'fib' | 'box' | 'layers' | 'magnet' | 'ruler' | 'riskReward' | 'priceAlert';

interface LeftSidebarProps {
  activeTool: ChartTool;
  onSelectTool: (tool: ChartTool) => void;
  magnetEnabled: boolean;
  onToggleMagnet: () => void;
  onOpenLayersModal: () => void;
  onOpenSettings: () => void;
  onOpenAlertsModal?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeTool,
  onSelectTool,
  magnetEnabled,
  onToggleMagnet,
  onOpenLayersModal,
  onOpenSettings,
  onOpenAlertsModal,
}) => {
  return (
    <aside className="w-[42px] bg-[#0c0e14] border-r border-[#1e222d] flex flex-col items-center justify-between py-2 shrink-0 select-none z-20">
      {/* Top tools list */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        {/* VK AI Logo badge icon */}
        <div 
          title="VK Quantitative Core Engine"
          className="w-7 h-7 flex flex-col items-center justify-center text-[#f8bd42] font-mono text-[9px] font-bold rounded hover:bg-[#1e222d] transition-colors cursor-pointer border border-[#f8bd42]/30 mb-1"
        >
          <span>VK</span>
          <span className="text-[7px] text-[#787b86] -mt-1">AI</span>
        </div>

        {/* Crosshair Cursor */}
        <button
          onClick={() => {
            onSelectTool('crosshair');
            sounds.playClick();
          }}
          title="Crosshair Tool"
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors cursor-pointer ${
            activeTool === 'crosshair'
              ? 'bg-[#1b1f2b] text-[#f8bd42] border border-[#f8bd42]/50'
              : 'text-[#787b86] hover:text-[#dfe2f2] hover:bg-[#1e222d]'
          }`}
        >
          <Crosshair className="w-4 h-4" />
        </button>

        {/* Trendline */}
        <button
          onClick={() => {
            onSelectTool('trendline');
            sounds.playClick();
          }}
          title="Trendline / Ray"
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors cursor-pointer ${
            activeTool === 'trendline'
              ? 'bg-[#1b1f2b] text-[#f8bd42] border border-[#f8bd42]/50'
              : 'text-[#787b86] hover:text-[#dfe2f2] hover:bg-[#1e222d]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
        </button>

        {/* Fibonacci / Wave */}
        <button
          onClick={() => {
            onSelectTool('fib');
            sounds.playClick();
          }}
          title="Fibonacci Retracement / ICT OTE"
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors cursor-pointer ${
            activeTool === 'fib'
              ? 'bg-[#1b1f2b] text-[#f8bd42] border border-[#f8bd42]/50'
              : 'text-[#787b86] hover:text-[#dfe2f2] hover:bg-[#1e222d]'
          }`}
        >
          <Activity className="w-4 h-4" />
        </button>

        {/* Order Block / Rectangle */}
        <button
          onClick={() => {
            onSelectTool('box');
            sounds.playClick();
          }}
          title="Institutional Order Block / FVG Box"
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors cursor-pointer ${
            activeTool === 'box'
              ? 'bg-[#1b1f2b] text-[#f8bd42] border border-[#f8bd42]/50'
              : 'text-[#787b86] hover:text-[#dfe2f2] hover:bg-[#1e222d]'
          }`}
        >
          <Square className="w-4 h-4" />
        </button>

        {/* Indicators & Overlays */}
        <button
          onClick={() => {
            onOpenLayersModal();
            sounds.playClick();
          }}
          title="Toggle SMC Structure Overlays (OB, FVG, BOS, POC)"
          className="w-7 h-7 flex items-center justify-center rounded text-[#787b86] hover:text-[#f8bd42] hover:bg-[#1e222d] transition-colors cursor-pointer"
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* Magnet Mode */}
        <button
          onClick={() => {
            onToggleMagnet();
            sounds.playClick();
          }}
          title={magnetEnabled ? 'Snap to OHLC (Active)' : 'Snap to OHLC (Inactive)'}
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors cursor-pointer ${
            magnetEnabled
              ? 'bg-[#1b1f2b] text-[#26a69a] border border-[#26a69a]/50'
              : 'text-[#787b86] hover:text-[#dfe2f2] hover:bg-[#1e222d]'
          }`}
        >
          <Magnet className="w-4 h-4" />
        </button>

        {/* Ruler / Measure */}
        <button
          onClick={() => {
            onSelectTool('ruler');
            sounds.playClick();
          }}
          title="Measure Pips / % Price Delta"
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors cursor-pointer ${
            activeTool === 'ruler'
              ? 'bg-[#1b1f2b] text-[#f8bd42] border border-[#f8bd42]/50'
              : 'text-[#787b86] hover:text-[#dfe2f2] hover:bg-[#1e222d]'
          }`}
        >
          <Ruler className="w-4 h-4" />
        </button>

        {/* Risk / Reward Position Tool */}
        <button
          onClick={() => {
            onSelectTool('riskReward');
            sounds.playClick();
          }}
          title="Visual Risk / Reward Ratio Tool (Long/Short Position)"
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors cursor-pointer ${
            activeTool === 'riskReward'
              ? 'bg-[#1b1f2b] text-[#f8bd42] border border-[#f8bd42]/50'
              : 'text-[#787b86] hover:text-[#dfe2f2] hover:bg-[#1e222d]'
          }`}
        >
          <Target className="w-4 h-4" />
        </button>

        {/* Custom Price Alert Tool */}
        <button
          onClick={() => {
            onSelectTool('priceAlert');
            if (onOpenAlertsModal) onOpenAlertsModal();
            sounds.playClick();
          }}
          title="Set Custom Price Alert / Manager"
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors cursor-pointer ${
            activeTool === 'priceAlert'
              ? 'bg-[#1b1f2b] text-[#f8bd42] border border-[#f8bd42]/50'
              : 'text-[#787b86] hover:text-[#dfe2f2] hover:bg-[#1e222d]'
          }`}
        >
          <Bell className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom tools */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        {/* Stream Live status */}
        <div 
          title="Live WebSocket Stream Connected"
          className="w-7 h-7 flex items-center justify-center rounded text-[#26a69a] hover:bg-[#1e222d] transition-colors cursor-pointer"
        >
          <Radio className="w-4 h-4 animate-pulse" />
        </div>

        {/* Workspace controls */}
        <button
          onClick={() => {
            onOpenSettings();
            sounds.playClick();
          }}
          title="Workspace Parameters"
          className="w-7 h-7 flex items-center justify-center rounded text-[#787b86] hover:text-[#dfe2f2] hover:bg-[#1e222d] transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
