import React, { useState } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import { WorkoutExercise, WorkoutSet } from '../types';
import { PreviousLogsFloat } from './PreviousLogsFloat';
import { StorageService, calculate1RM } from '../services/storage';

interface SetFieldInputProps {
  value: number;
  mode: 'decimal' | 'numeric';
  placeholder: string;
  onChangeValue: (val: number) => void;
}

const SetFieldInput: React.FC<SetFieldInputProps> = ({
  value,
  mode,
  placeholder,
  onChangeValue,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [rawText, setRawText] = useState('');

  const handleFocus = () => {
    setIsFocused(true);
    setRawText('');
    onChangeValue(0);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (mode === 'decimal') {
      if (val === '' || /^\d*\.?\d*$/.test(val)) {
        setRawText(val);
        onChangeValue(parseFloat(val) || 0);
      }
    } else {
      if (val === '' || /^\d*$/.test(val)) {
        setRawText(val);
        onChangeValue(parseInt(val, 10) || 0);
      }
    }
  };

  const displayedValue = isFocused ? rawText : (value > 0 ? String(value) : '');

  return (
    <input
      type="text"
      inputMode={mode}
      pattern={mode === 'numeric' ? '[0-9]*' : undefined}
      value={displayedValue}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      placeholder={placeholder}
      className="w-full py-2.5 px-1.5 rounded-xl font-mono font-bold text-base text-center transition-all bg-dark-750 text-white placeholder-slate-500 border border-dark-700 focus:outline-none focus:border-brand-neon focus:ring-2 focus:ring-brand-neon/40"
    />
  );
};

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  onUpdateSet: (exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
  onAddSet: (exerciseId: string) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onCopyFromAbove: (exerciseId: string, mode: 'all' | 'weight' | 'reps') => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  onUpdateSet,
  onAddSet,
  onDeleteSet,
  onDeleteExercise,
  onCopyFromAbove,
}) => {
  const previousLog = StorageService.getPreviousLogsForExercise(
    exercise.exerciseId,
    exercise.exerciseName
  );
  const pastMax1RM = previousLog?.max1RMRecord?.estimated1RM || 0;

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
        <div className="flex items-center gap-1.5 py-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => onCopyFromAbove(exercise.id, 'all')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-neon/15 hover:bg-brand-neon/25 active:scale-95 text-[11px] font-bold text-brand-neon border border-brand-neon/30 transition-all whitespace-nowrap shrink-0"
            title="上のセットの重量・回数をコピー"
          >
            <Copy className="w-3 h-3" />
            <span>前セットを複製</span>
          </button>
          <button
            type="button"
            onClick={() => onCopyFromAbove(exercise.id, 'weight')}
            className="px-2 py-1 rounded-lg bg-dark-800 hover:bg-dark-750 active:scale-95 text-[10px] text-slate-300 border border-dark-700 transition-all whitespace-nowrap shrink-0"
          >
            重量のみ
          </button>
          <button
            type="button"
            onClick={() => onCopyFromAbove(exercise.id, 'reps')}
            className="px-2 py-1 rounded-lg bg-dark-800 hover:bg-dark-750 active:scale-95 text-[10px] text-slate-300 border border-dark-700 transition-all whitespace-nowrap shrink-0"
          >
            回数のみ
          </button>
        </div>
      )}

      {/* セットテーブル (Set・重量・回数・1RM) */}
      <div className="mt-2">
        <div className="grid grid-cols-12 gap-1.5 text-[11px] font-semibold text-slate-400 px-1 pb-1.5 text-center">
          <div className="col-span-2 text-left pl-1">Set</div>
          <div className="col-span-4">重量 (kg)</div>
          <div className="col-span-3">回数</div>
          <div className="col-span-3">1RM</div>
        </div>

        <div className="space-y-1.5">
          {exercise.sets.map((set) => {
            const rm = calculate1RM(set.weight, set.reps);
            const isNewPR = rm > 0 && pastMax1RM > 0 && rm > pastMax1RM;

            return (
              <div
                key={set.id}
                className="grid grid-cols-12 gap-1.5 items-center p-2 rounded-xl bg-dark-800/80 border border-dark-700/60 transition-all"
              >
                {/* セット番号 ＆ 削除 */}
                <div className="col-span-2 flex items-center gap-1 font-mono text-xs font-bold text-slate-300 pl-0.5">
                  <span>{set.setNumber}</span>
                  {exercise.sets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteSet(exercise.id, set.id)}
                      className="text-slate-500 hover:text-red-400 p-0.5"
                      title="セットを削除"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* 重量入力セル (OSネイティブ数値キーボード・タップ時クリア) */}
                <div className="col-span-4">
                  <SetFieldInput
                    value={set.weight}
                    mode="decimal"
                    placeholder="0"
                    onChangeValue={(val) =>
                      onUpdateSet(exercise.id, set.id, { weight: val, isCompleted: true })
                    }
                  />
                </div>

                {/* 回数入力セル (OSネイティブ数値キーボード・タップ時クリア) */}
                <div className="col-span-3">
                  <SetFieldInput
                    value={set.reps}
                    mode="numeric"
                    placeholder="0"
                    onChangeValue={(val) =>
                      onUpdateSet(exercise.id, set.id, { reps: val, isCompleted: true })
                    }
                  />
                </div>

                {/* 推定1RM表示 (回数の右) */}
                <div className="col-span-3">
                  {rm > 0 ? (
                    <div
                      className={`py-2 px-1 rounded-xl border text-center font-mono transition-all ${
                        isNewPR
                          ? 'bg-amber-500/15 border-amber-400/50 text-amber-300'
                          : 'bg-dark-900/70 border-dark-700/80 text-brand-neon'
                      }`}
                      title={`推定1RM: ${rm}kg`}
                    >
                      <div className="text-xs font-extrabold leading-tight">
                        {rm}
                        <span className="text-[9px] font-normal text-slate-400 ml-0.5">kg</span>
                      </div>
                      {isNewPR && (
                        <div className="text-[8px] font-black text-amber-400 leading-none mt-0.5">
                          MAX更新!
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-2.5 px-1 rounded-xl bg-dark-900/40 border border-dark-800 text-center font-mono text-xs text-slate-600">
                      -
                    </div>
                  )}
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
