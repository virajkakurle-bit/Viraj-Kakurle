import React from 'react';
import { X, Layers, Check } from 'lucide-react';
import { sounds } from '../utils/audio';

interface LayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  layers: {
    supplyOB: boolean;
    fvg: boolean;
    bslSwept: boolean;
    bos: boolean;
    volumeProfile: boolean;
  };
  onToggleLayer: (key: 'supplyOB' | 'fvg' | 'bslSwept' | 'bos' | 'volumeProfile') => void;
}

export const LayersModal: React.FC<LayersModalProps> = ({
  isOpen,
  onClose,
  layers,
  onToggleLayer,
}) => {
  if (!isOpen) return null;

  const items = [
    { key: 'supplyOB' as const, label: 'Bearish Order Blocks (-OB Supply Zone)', color: '#f23645' },
    { key: 'fvg' as const, label: 'Fair Value Gaps (+FVG Imbalances)', color: '#26a69a' },
    { key: 'bslSwept' as const, label: 'Buy-Side Liquidity Swept (BSL)', color: '#ff79c6' },
    { key: 'bos' as const, label: 'Break of Structure (BOS / MSS)', color: '#f8bd42' },
    { key: 'volumeProfile' as const, label: 'Volume Profile (POC, VAH, VAL)', color: '#e0a82e' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      <div className="w-full max-w-sm bg-[#131722] border border-[#2a2e39] rounded-lg shadow-2xl overflow-hidden font-mono text-[11px]">
        {/* Header */}
        <div className="h-10 px-4 bg-[#0c0e14] border-b border-[#1e222d] flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-[#f8bd42]">
            <Layers className="w-4 h-4" />
            <span>SMC & ICT OVERLAY LAYERS</span>
          </div>
          <button onClick={onClose} className="text-[#787b86] hover:text-[#dfe2f2] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Layer Checkboxes */}
        <div className="p-3 divide-y divide-[#1e222d]">
          {items.map((item) => {
            const active = layers[item.key];
            return (
              <button
                key={item.key}
                onClick={() => {
                  onToggleLayer(item.key);
                  sounds.playClick();
                }}
                className="w-full py-2.5 px-2 flex items-center justify-between hover:bg-[#1b1f2b] transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[#dfe2f2]">{item.label}</span>
                </div>
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    active ? 'bg-[#f8bd42] border-[#f8bd42] text-[#0f131e]' : 'border-[#2a2e39]'
                  }`}
                >
                  {active && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0c0e14] border-t border-[#1e222d] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#f8bd42] text-[#0f131e] font-bold rounded cursor-pointer hover:bg-[#e0a82e]"
          >
            APPLY OVERLAYS
          </button>
        </div>
      </div>
    </div>
  );
};
