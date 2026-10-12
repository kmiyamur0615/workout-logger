import React, { useState } from 'react';
import { CheckCircle2, Save, X, Activity } from 'lucide-react';
import { WorkoutSession } from '../types';

interface WorkoutModalProps {
  session: WorkoutSession;
  isOpen: boolean;
  onClose: () => void;
  onCompleteAndSync: (note: string) => Promise<void>;
  onCompleteLocalOnly: (note: string) => void;
  isSyncing?: boolean;
}

export const WorkoutModal: React.FC<WorkoutModalProps> = ({
  session,
  isOpen,
  onClose,
  onCompleteAndSync,
  onCompleteLocalOnly,
  isSyncing = false,
}) => {
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const totalExercises = session.exercises.length;
  const totalSets = session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSets = session.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.isCompleted).length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-dark-900 border border-dark-700 w-full max-w-sm rounded-3xl p-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white bg-dark-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center pt-2 pb-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-neon/20 border border-brand-accent/50 mx-auto flex items-center justify-center mb-3">
            <CheckCircle2 className="w-8 h-8 text-brand-neon" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">ワークアウトを完了</h2>
          <p className="text-xs text-slate-400 mt-0.5">{session.menuName || 'フリーワークアウト'}</p>
        </div>

        {/* 実施サマリー (時間・ボリュームを排除し、種目数・完了セット数に純化) */}
        <div className="grid grid-cols-2 gap-2 bg-dark-850 p-3 rounded-2xl border border-dark-800 mb-4 text-center">
          <div>
            <div className="text-[10px] text-slate-400 font-medium">実施種目数</div>
            <div className="text-base font-bold text-white font-mono mt-0.5">
              {totalExercises} <span className="text-[10px] font-normal text-slate-400">種目</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-medium">完了セット数</div>
            <div className="text-base font-bold text-brand-neon font-mono mt-0.5">
              {completedSets} / {totalSets}
            </div>
          </div>
        </div>

        {/* メモ入力 */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            セッションメモ (任意)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="今日の感覚や次回へのメモ..."
            className="w-full h-16 bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-neon resize-none"
          />
        </div>

        {/* アクションボタン */}
        <div className="space-y-2">
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => onCompleteAndSync(note)}
            className="w-full py-3.5 px-4 rounded-xl bg-brand-neon hover:bg-green-400 active:scale-98 text-dark-950 font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-neon/20"
          >
            <Activity className="w-4 h-4 stroke-[2.5]" />
            <span>{isSyncing ? '同期処理中...' : '保存 ＆ ヘルスケア同期'}</span>
          </button>

          <button
            type="button"
            onClick={() => onCompleteLocalOnly(note)}
            className="w-full py-2.5 px-4 rounded-xl bg-dark-800 hover:bg-dark-750 active:scale-98 text-xs font-semibold text-slate-300 transition-all flex items-center justify-center gap-1.5 border border-dark-700"
          >
            <Save className="w-3.5 h-3.5" />
            <span>ローカル保存のみで完了</span>
          </button>
        </div>
      </div>
    </div>
  );
};
