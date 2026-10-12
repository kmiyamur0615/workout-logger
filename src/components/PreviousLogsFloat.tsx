import React, { useState, useRef, useEffect } from 'react';
import { History, X } from 'lucide-react';
import { PreviousExerciseLog } from '../types';

interface PreviousLogsFloatProps {
  exerciseName: string;
  previousLog: PreviousExerciseLog | null;
}

export const PreviousLogsFloat: React.FC<PreviousLogsFloatProps> = ({
  exerciseName,
  previousLog
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 外側タップで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formattedDate = previousLog?.date 
    ? new Date(previousLog.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all active:scale-95 ${
          isOpen
            ? 'bg-brand-neon text-dark-950 font-semibold'
            : previousLog
            ? 'bg-dark-800 text-brand-neon border border-brand-accent/30 hover:bg-dark-700'
            : 'bg-dark-800/60 text-slate-400'
        }`}
        title="前回の記録を表示"
      >
        <History className="w-3.5 h-3.5" />
        <span>履歴</span>
      </button>

      {/* フロート表示（ポップオーバー） */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-dark-850/95 backdrop-blur-xl border border-brand-accent/40 rounded-xl p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-dark-700">
            <div>
              <div className="text-[11px] font-semibold text-slate-300 truncate max-w-[170px]">
                {exerciseName}
              </div>
              <div className="text-[10px] text-slate-400">
                {formattedDate ? `前回の実績 (${formattedDate})` : '前回の記録'}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-dark-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {previousLog && previousLog.sets.length > 0 ? (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {previousLog.sets.map((set) => (
                <div 
                  key={set.setNumber} 
                  className="flex items-center justify-between text-xs px-2 py-1 rounded bg-dark-800/80"
                >
                  <span className="text-slate-400 font-mono text-[11px]">
                    Set {set.setNumber}
                  </span>
                  <span className="font-semibold text-white tracking-wide">
                    {set.weight} <span className="text-[10px] text-slate-400 font-normal">kg</span> × {set.reps} <span className="text-[10px] text-slate-400 font-normal">reps</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3 text-xs text-slate-400">
              前回の記録がありません
            </div>
          )}
        </div>
      )}
    </div>
  );
};
