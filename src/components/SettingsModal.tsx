import React from 'react';
import { X, Volume2, Shield, Sliders } from 'lucide-react';
import { sounds } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedLatency: number;
  onSetFeedLatency: (ms: number) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  feedLatency,
  onSetFeedLatency,
  soundEnabled,
  onToggleSound,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      <div className="w-full max-w-md bg-[#131722] border border-[#2a2e39] rounded-lg shadow-2xl overflow-hidden font-mono text-[11px]">
        {/* Modal Header */}
        <div className="h-10 px-4 bg-[#0c0e14] border-b border-[#1e222d] flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-[#f8bd42]">
            <Sliders className="w-4 h-4" />
            <span>TERMINAL SETTINGS & RISK GOVERNANCE</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#787b86] hover:text-[#dfe2f2] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4">
          {/* Feed latency */}
          <div>
            <div className="flex justify-between text-[#787b86] mb-1.5">
              <span>BROKER FEED LATENCY</span>
              <span className="text-[#dfe2f2] font-bold">{feedLatency} ms</span>
            </div>
            <input
              type="range"
              min="5"
              max="200"
              value={feedLatency}
              onChange={(e) => onSetFeedLatency(parseInt(e.target.value))}
              className="w-full accent-[#f8bd42] cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-[#787b86] mt-0.5">
              <span>5ms (HFT Direct)</span>
              <span>200ms (Retail DSL)</span>
            </div>
          </div>

          {/* Sound Synthesizer */}
          <div className="flex items-center justify-between p-2.5 bg-[#0c0e14] rounded border border-[#1e222d]">
            <div className="flex items-center gap-2.5">
              <Volume2 className="w-4 h-4 text-[#f8bd42]" />
              <div>
                <div className="font-bold text-[#dfe2f2]">SYNTHESIZED AUDIO CUES</div>
                <div className="text-[10px] text-[#787b86]">Ticks & execution triggers via Web Audio</div>
              </div>
            </div>
            <button
              onClick={() => {
                onToggleSound();
                sounds.playClick();
              }}
              className={`px-3 py-1 rounded font-bold cursor-pointer transition-colors ${
                soundEnabled
                  ? 'bg-[#26a69a] text-[#0f131e]'
                  : 'bg-[#1e222d] text-[#787b86]'
              }`}
            >
              {soundEnabled ? 'ENABLED' : 'MUTED'}
            </button>
          </div>

          {/* Risk Limits */}
          <div className="p-2.5 bg-[#0c0e14] rounded border border-[#1e222d] space-y-1.5">
            <div className="flex items-center gap-2 text-[#26a69a] font-bold">
              <Shield className="w-4 h-4" />
              <span>MAX INSTITUTIONAL ALLOCATION</span>
            </div>
            <div className="text-[10px] text-[#787b86]">
              Maximum lot size per order ticket capped at 5.00 lots to preserve demo margin adequacy.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#0c0e14] border-t border-[#1e222d] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#f8bd42] text-[#0f131e] font-bold rounded cursor-pointer hover:bg-[#e0a82e] transition-colors"
          >
            SAVE PREFERENCES
          </button>
        </div>
      </div>
    </div>
  );
};
