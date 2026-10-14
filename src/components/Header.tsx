import React from 'react';
import { Dumbbell, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onSyncGAS: () => void;
  isSyncing?: boolean;
  activeSessionName?: string;
}

export const Header: React.FC<HeaderProps> = ({ onSyncGAS, isSyncing = false, activeSessionName }) => {
  return (
    <header
      className="sticky top-0 z-40 bg-dark-900/95 backdrop-blur-md border-b border-dark-800 px-4 flex items-center justify-between"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.65rem)',
        paddingBottom: '0.65rem',
      }}
    >
      <div className="flex items-center space-x-2.5">
        <div className="w-8 h-8 rounded-xl bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center">
          <Dumbbell className="w-4 h-4 text-brand-neon" />
        </div>
        <div>
          <h1 className="text-base font-extrabold tracking-tight text-white leading-tight">
            Workout Logger
          </h1>
          {activeSessionName && (
            <div className="flex items-center gap-1.5 text-[10px] text-brand-neon font-bold leading-none mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-neon animate-pulse" />
              <span>記録中: {activeSessionName}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onSyncGAS}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 active:scale-95 transition-all text-slate-300 hover:text-white border border-dark-750 text-xs font-semibold"
          title="Googleスプレッドシートと同期"
          aria-label="同期"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-brand-neon' : 'text-slate-400'}`} />
          <span className="text-[11px] text-slate-300">同期</span>
        </button>
      </div>
    </header>
  );
};
