import React, { useState, useRef, useEffect } from 'react';
import { History, X, Trophy } from 'lucide-react';
import { PreviousExerciseLog } from '../types';
import { calculate1RM } from '../services/storage';

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

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    } catch {
      return null;
    }
  };

  const formattedDate = formatShortDate(previousLog?.date);
  const max1RM = previousLog?.max1RMRecord;
  const maxWeight = previousLog?.maxWeightRecord;

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-95 ${
          isOpen
            ? 'bg-brand-neon text-dark-950 font-semibold'
            : previousLog
            ? 'bg-dark-800 text-brand-neon border border-brand-accent/30 hover:bg-dark-700'
            : 'bg-dark-800/60 text-slate-400'
        }`}
        title="過去のMax値・前回の記録を表示"
      >
        <History className="w-3.5 h-3.5" />
        <span>履歴</span>
      </button>

      {/* フロート表示（ポップオーバー） */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-dark-850/95 backdrop-blur-xl border border-brand-accent/40 rounded-2xl p-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-dark-700">
            <div className="text-xs font-bold text-white truncate max-w-[210px]">
              {exerciseName}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-dark-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {previousLog ? (
            <>
              {/* 過去のMax値（自己ベスト）セクション */}
              {(max1RM || maxWeight) && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                    <Trophy className="w-3 h-3" />
                    <span>過去のMax記録 (自己ベスト)</span>
                  </div>

                  {max1RM && (
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-[11px] text-slate-300">最大1RM</span>
                      <div className="text-right font-mono">
                        <span className="font-black text-amber-300 text-sm">{max1RM.estimated1RM}</span>
                        <span className="text-[10px] text-amber-400/80 ml-0.5">kg</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">
                          ({max1RM.weight}kg×{max1RM.reps}{formatShortDate(max1RM.date) ? ` · ${formatShortDate(max1RM.date)}` : ''})
                        </span>
                      </div>
                    </div>
                  )}

                  {maxWeight && (
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-[11px] text-slate-300">最大重量</span>
                      <div className="text-right font-mono">
                        <span className="font-extrabold text-white text-xs">{maxWeight.weight}</span>
                        <span className="text-[10px] text-slate-400 ml-0.5">kg</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">
                          (×{maxWeight.reps}回{formatShortDate(maxWeight.date) ? ` · ${formatShortDate(maxWeight.date)}` : ''})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 前回の実績セット一覧 */}
              {previousLog.sets.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 mb-1.5">
                    {formattedDate ? `前回の実績 (${formattedDate})` : '前回の実績'}
                  </div>
                  <div className="space-y-1 max-h-44 overflow-y-auto">
                    {previousLog.sets.map((set) => {
                      const rm = calculate1RM(set.weight, set.reps);
                      return (
                        <div
                          key={set.setNumber}
                          className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-dark-800/90 font-mono"
                        >
                          <span className="text-slate-400 text-[11px]">
                            Set {set.setNumber}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">
                              {set.weight}
                              <span className="text-[10px] text-slate-400 font-normal ml-0.5">kg</span> × {set.reps}
                            </span>
                            {rm > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-neon/15 text-brand-neon font-bold">
                                1RM {rm}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-3 text-xs text-slate-400">
              過去の記録がありません
            </div>
          )}
        </div>
      )}
    </div>
  );
};
