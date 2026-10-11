import React from 'react';
import { X, Bell, CheckCircle2 } from 'lucide-react';

export interface NotificationItem {
  id: string;
  time: string;
  title: string;
  description: string;
  type: 'order' | 'alert' | 'system';
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onClear: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onClear,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      <div className="w-full max-w-md bg-[#131722] border border-[#2a2e39] rounded-lg shadow-2xl overflow-hidden font-mono text-[11px]">
        {/* Header */}
        <div className="h-10 px-4 bg-[#0c0e14] border-b border-[#1e222d] flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-[#f8bd42]">
            <Bell className="w-4 h-4" />
            <span>INSTITUTIONAL SIGNALS & EXECUTION ALERTS</span>
          </div>
          <button onClick={onClose} className="text-[#787b86] hover:text-[#dfe2f2] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[320px] overflow-y-auto custom-scrollbar p-3 space-y-2">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-[#787b86]">
              No active execution alerts.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="p-2.5 bg-[#0c0e14] rounded border border-[#1e222d] space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-[#dfe2f2]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#26a69a]" />
                    <span>{n.title}</span>
                  </div>
                  <span className="text-[#787b86] text-[10px]">{n.time}</span>
                </div>
                <div className="text-[10px] text-[#787b86] leading-relaxed">
                  {n.description}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0c0e14] border-t border-[#1e222d] flex justify-between items-center">
          <button
            onClick={onClear}
            className="text-[10px] text-[#787b86] hover:text-[#dfe2f2] cursor-pointer"
          >
            Clear All Alerts
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1b1f2b] text-[#dfe2f2] rounded hover:bg-[#2a2e39] cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
