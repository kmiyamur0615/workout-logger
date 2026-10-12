import React, { useState } from 'react';
import { CheckCircle2, X, Activity } from 'lucide-react';
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
  const [syncExternal, setSyncExternal] = useState(true);

  if (!isOpen) return null;

  const totalExercises = session.exercises.length;
  const totalSets = session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSets = session.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.isCompleted).length, 0);

  const handleFinish = () => {
    if (syncExternal) {
      onCompleteAndSync(note);
    } else {
      onCompleteLocalOnly(note);
    }
  };

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

        {/* 実施サマリー */}
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

        {/* アクションエリア */}
        <div className="space-y-3">
          {/* 外部同期トグル */}
          <div className="flex items-center justify-between px-2 py-1 bg-dark-850 rounded-xl border border-dark-800">
            <div className="flex items-center gap-2">
              <Activity className={`w-4 h-4 transition-colors ${syncExternal ? 'text-brand-neon' : 'text-slate-500'}`} />
              <span className="text-xs font-medium text-slate-300">ヘルスケア ＆ スプレッドシート連携</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncExternal(!syncExternal)}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 active:scale-95 ${
                syncExternal ? 'bg-brand-neon' : 'bg-dark-750'
              }`}
              aria-label="外部同期の切り替え"
            >
              <span
                className={`block w-5 h-5 rounded-full bg-dark-950 transition-transform ${
                  syncExternal ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* メイン完了ボタン */}
          <button
            type="button"
            disabled={isSyncing}
            onClick={handleFinish}
            className="w-full py-3.5 px-4 rounded-xl bg-brand-neon hover:bg-green-400 active:scale-98 text-dark-950 font-black text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-neon/20"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>{isSyncing ? '同期保存中...' : 'ワークアウトを保存して終了'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
