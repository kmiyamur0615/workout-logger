import React from 'react';
import { Dumbbell, RefreshCw, Settings as SettingsIcon } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onSyncGAS: () => void;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onSyncGAS, isSyncing = false }) => {
  return (
    <header className="sticky top-0 z-40 bg-dark-900/90 backdrop-blur-md border-b border-dark-800 px-4 pt-safe pb-3 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 rounded-lg bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center">
          <Dumbbell className="w-5 h-5 text-brand-neon" />
        </div>
        <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
          Workout Logger
        </h1>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onSyncGAS}
          disabled={isSyncing}
          className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 active:scale-95 transition-all text-slate-300 hover:text-white"
          title="スプレッドシートと同期"
          aria-label="同期"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-brand-neon' : ''}`} />
        </button>
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 active:scale-95 transition-all text-slate-300 hover:text-white"
          title="設定"
          aria-label="設定"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
