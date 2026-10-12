import React from 'react';
import { Plus, Trash2, Copy, Check } from 'lucide-react';
import { WorkoutExercise, WorkoutSet } from '../types';
import { PreviousLogsFloat } from './PreviousLogsFloat';
import { StorageService } from '../services/storage';

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  activeInput: { exerciseId: string; setId: string; field: 'weight' | 'reps' } | null;
  onSelectField: (exerciseId: string, setId: string, field: 'weight' | 'reps') => void;
  onUpdateSet: (exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
  onAddSet: (exerciseId: string) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onCopyFromAbove: (exerciseId: string, mode: 'all' | 'weight' | 'reps') => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  activeInput,
  onSelectField,
  onUpdateSet,
  onAddSet,
  onDeleteSet,
  onDeleteExercise,
  onCopyFromAbove,
}) => {
  const previousLog = StorageService.getPreviousLogsForExercise(exercise.exerciseId);

  return (
    <div className="bg-dark-850 border border-dark-700/80 rounded-2xl p-3.5 mb-4 shadow-lg transition-all">
      {/* 種目ヘッダー */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-750">
        <div className="flex-1 mr-2">
          <h2 className="text-base font-bold text-white tracking-tight leading-snug">
            {exercise.exerciseName}
          </h2>
          {exercise.note && (
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">{exercise.note}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Previousフロート表示ボタン */}
          <PreviousLogsFloat 
            exerciseName={exercise.exerciseName} 
            previousLog={previousLog} 
          />
          <button
            onClick={() => onDeleteExercise(exercise.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-dark-800 transition-all"
            title="種目を削除"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 上のSetからのコピーボタングループ */}
      {exercise.sets.length > 1 && (
        <div className="flex items-center gap-1.5 py-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => onCopyFromAbove(exercise.id, 'all')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 active:scale-95 text-[11px] font-bold text-brand-neon border border-brand-accent/40 transition-all whitespace-nowrap shadow-sm"
          >
            <Copy className="w-3 h-3" />
            <span>上のSetをコピー (重量・回数・完了)</span>
          </button>
          <button
            type="button"
            onClick={() => onCopyFromAbove(exercise.id, 'weight')}
            className="px-2.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 active:scale-95 text-[11px] font-medium text-slate-300 hover:text-white border border-dark-700 transition-all whitespace-nowrap"
          >
            重量のみ
          </button>
          <button
            type="button"
            onClick={() => onCopyFromAbove(exercise.id, 'reps')}
            className="px-2.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 active:scale-95 text-[11px] font-medium text-slate-300 hover:text-white border border-dark-700 transition-all whitespace-nowrap"
          >
            回数のみ
          </button>
        </div>
      )}

      {/* セットテーブル (種別列を排除し、ゆったり押しやすい3列構成) */}
      <div className="mt-2">
        <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-400 px-1 pb-1.5 text-center">
          <div className="col-span-2 text-left">Set</div>
          <div className="col-span-5">重量 (kg)</div>
          <div className="col-span-3">回数</div>
          <div className="col-span-2 text-right pr-1">完了</div>
        </div>

        <div className="space-y-1.5">
          {exercise.sets.map((set) => {
            const isWeightActive = activeInput?.exerciseId === exercise.id && activeInput.setId === set.id && activeInput.field === 'weight';
            const isRepsActive = activeInput?.exerciseId === exercise.id && activeInput.setId === set.id && activeInput.field === 'reps';

            return (
              <div
                key={set.id}
                className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl transition-all ${
                  set.isCompleted 
                    ? 'bg-dark-900/60 border border-brand-accent/25' 
                    : 'bg-dark-800/80 border border-dark-700/60'
                }`}
              >
                {/* セット番号 ＆ 削除 */}
                <div className="col-span-2 flex items-center gap-1.5 font-mono text-xs font-bold text-slate-400 pl-1">
                  <span>{set.setNumber}</span>
                  {exercise.sets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteSet(exercise.id, set.id)}
                      className="text-slate-600 hover:text-red-400 p-0.5"
                      title="セットを削除"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>

                {/* 重量入力セル */}
                <div className="col-span-5">
                  <button
                    type="button"
                    onClick={() => onSelectField(exercise.id, set.id, 'weight')}
                    className={`w-full py-2.5 px-2 rounded-xl font-mono font-bold text-base text-center transition-all ${
                      isWeightActive
                        ? 'bg-brand-neon text-dark-950 ring-2 ring-brand-neon font-black'
                        : set.weight > 0
                        ? 'bg-dark-750 text-white hover:bg-dark-700'
                        : 'bg-dark-750/50 text-slate-400 hover:bg-dark-700'
                    }`}
                  >
                    {set.weight > 0 ? set.weight : '---'}
                  </button>
                </div>

                {/* 回数入力セル */}
                <div className="col-span-3">
                  <button
                    type="button"
                    onClick={() => onSelectField(exercise.id, set.id, 'reps')}
                    className={`w-full py-2.5 px-2 rounded-xl font-mono font-bold text-base text-center transition-all ${
                      isRepsActive
                        ? 'bg-brand-neon text-dark-950 ring-2 ring-brand-neon font-black'
                        : set.reps > 0
                        ? 'bg-dark-750 text-white hover:bg-dark-700'
                        : 'bg-dark-750/50 text-slate-400 hover:bg-dark-700'
                    }`}
                  >
                    {set.reps > 0 ? set.reps : '--'}
                  </button>
                </div>

                {/* 完了チェックボックス */}
                <div className="col-span-2 flex justify-end pr-1">
                  <button
                    type="button"
                    onClick={() => onUpdateSet(exercise.id, set.id, { isCompleted: !set.isCompleted })}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                      set.isCompleted
                        ? 'bg-brand-neon text-dark-950 shadow-md shadow-brand-neon/30'
                        : 'bg-dark-700 text-slate-400 border border-dark-600 hover:border-slate-400'
                    }`}
                  >
                    <Check className={`w-4 h-4 ${set.isCompleted ? 'stroke-[3]' : 'opacity-0'}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* セット追加ボタン */}
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onAddSet(exercise.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-750 hover:bg-dark-700 active:scale-95 text-xs font-semibold text-brand-neon transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>セットを追加</span>
          </button>
        </div>
      </div>
    </div>
  );
};
