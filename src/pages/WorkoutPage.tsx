import React, { useState } from 'react';
import { Plus, Dumbbell, CheckCircle2 } from 'lucide-react';
import { WorkoutSession, WorkoutExercise, WorkoutSet, Exercise, BodyPart } from '../types';
import { ExerciseCard } from '../components/ExerciseCard';
import { NumericKeypad } from '../components/NumericKeypad';
import { WorkoutModal } from '../components/WorkoutModal';
import { GasApiService } from '../services/gasApi';
import { HealthSyncService } from '../services/healthSync';
import { StorageService } from '../services/storage';

interface WorkoutPageProps {
  session: WorkoutSession;
  onUpdateSession: (updated: WorkoutSession) => void;
  onFinishSession: (session: WorkoutSession) => void;
  exercises: Exercise[];
  bodyParts: BodyPart[];
}

export const WorkoutPage: React.FC<WorkoutPageProps> = ({
  session,
  onUpdateSession,
  onFinishSession,
  exercises,
  bodyParts,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [selectedBodyPartFilter, setSelectedBodyPartFilter] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  // テンキー入力状態
  const [activeInput, setActiveInput] = useState<{
    exerciseId: string;
    setId: string;
    field: 'weight' | 'reps';
  } | null>(null);
  const [inputBuffer, setInputBuffer] = useState('');

  // フィールド選択（テンキー起動）
  const handleSelectField = (exerciseId: string, setId: string, field: 'weight' | 'reps') => {
    const targetEx = session.exercises.find(e => e.id === exerciseId);
    const targetSet = targetEx?.sets.find(s => s.id === setId);
    const val = targetSet ? (field === 'weight' ? targetSet.weight : targetSet.reps) : 0;

    setActiveInput({ exerciseId, setId, field });
    setInputBuffer(val > 0 ? val.toString() : '');
  };

  // テンキー入力
  const handleKeyPress = (key: string) => {
    if (key === '.' && inputBuffer.includes('.')) return;
    if (inputBuffer.length >= 6) return;
    const next = inputBuffer + key;
    setInputBuffer(next);
    applyValue(next);
  };

  const handleDelete = () => {
    const next = inputBuffer.slice(0, -1);
    setInputBuffer(next);
    applyValue(next);
  };

  const handleQuickAdd = (amount: number) => {
    const current = parseFloat(inputBuffer) || 0;
    const next = Math.max(0, current + amount);
    const rounded = Math.round(next * 100) / 100;
    setInputBuffer(rounded.toString());
    applyValue(rounded.toString());
  };

  const applyValue = (valStr: string) => {
    if (!activeInput) return;
    const num = parseFloat(valStr) || 0;
    handleUpdateSet(activeInput.exerciseId, activeInput.setId, {
      [activeInput.field]: num
    });
  };

  const handleConfirmInput = () => {
    setActiveInput(null);
  };

  // セットの更新
  const handleUpdateSet = (exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => {
    const updatedExercises = session.exercises.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map(s => {
          if (s.id !== setId) return s;
          const updatedSet = { ...s, ...updates };
          if (updates.isCompleted !== undefined && updates.isCompleted) {
            updatedSet.completedAt = new Date().toISOString();
          }
          return updatedSet;
        })
      };
    });

    onUpdateSession({
      ...session,
      exercises: updatedExercises,
    });
  };

  // セットの追加
  const handleAddSet = (exerciseId: string) => {
    const targetEx = session.exercises.find(e => e.id === exerciseId);
    if (!targetEx) return;

    const lastSet = targetEx.sets[targetEx.sets.length - 1];
    const newSetNumber = targetEx.sets.length + 1;

    // 前のセットの重量とレップを自動補完
    const newSet: WorkoutSet = {
      id: `s-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      setNumber: newSetNumber,
      weight: lastSet ? lastSet.weight : 0,
      reps: lastSet ? lastSet.reps : 0,
      isAssisted: lastSet ? lastSet.isAssisted : false,
      isCompleted: false,
    };

    const updatedExercises = session.exercises.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return { ...ex, sets: [...ex.sets, newSet] };
    });

    onUpdateSession({
      ...session,
      exercises: updatedExercises,
    });
  };

  // セットの削除
  const handleDeleteSet = (exerciseId: string, setId: string) => {
    const updatedExercises = session.exercises.map(ex => {
      if (ex.id !== exerciseId) return ex;
      const filtered = ex.sets.filter(s => s.id !== setId);
      const renumbered = filtered.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
      return { ...ex, sets: renumbered };
    });

    onUpdateSession({
      ...session,
      exercises: updatedExercises,
    });
  };

  // 種目の削除
  const handleDeleteExercise = (exerciseId: string) => {
    const updatedExercises = session.exercises.filter(e => e.id !== exerciseId);
    onUpdateSession({
      ...session,
      exercises: updatedExercises,
    });
  };

  // 上のSetからのコピー機能（一括コピー: 重量・回数・完了フラグ / 重量のみ / 回数のみ）
  const handleCopyFromAbove = (exerciseId: string, mode: 'all' | 'weight' | 'reps') => {
    const targetEx = session.exercises.find(e => e.id === exerciseId);
    if (!targetEx || targetEx.sets.length < 2) return;

    const lastIdx = targetEx.sets.length - 1;
    const sourceSet = targetEx.sets[lastIdx - 1];
    const targetSet = targetEx.sets[lastIdx];

    if (!sourceSet || !targetSet) return;

    const updates: Partial<WorkoutSet> = {};
    if (mode === 'all') {
      updates.weight = sourceSet.weight;
      updates.reps = sourceSet.reps;
      updates.isCompleted = sourceSet.isCompleted; // 完了フラグもコピー
    } else if (mode === 'weight') {
      updates.weight = sourceSet.weight;
    } else if (mode === 'reps') {
      updates.reps = sourceSet.reps;
    }

    handleUpdateSet(exerciseId, targetSet.id, updates);
  };

  // 新規種目をセッションに追加
  const handleAddExerciseToSession = (ex: Exercise) => {
    const newEx: WorkoutExercise = {
      id: `we-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      exerciseId: ex.id,
      exerciseName: ex.name,
      bodyPartId: ex.bodyPartId,
      orderIndex: session.exercises.length + 1,
      note: ex.note,
      sets: [
        {
          id: `s-${Date.now()}-1`,
          setNumber: 1,
          weight: 0,
          reps: 0,
          isAssisted: false,
          isCompleted: false,
        }
      ]
    };

    const updated = [...session.exercises, newEx];
    onUpdateSession({
      ...session,
      exercises: updated,
    });
    setIsAddExerciseOpen(false);
  };

  // ワークアウト完了 & 同期
  const handleCompleteAndSync = async (note: string) => {
    setIsSyncing(true);
    const endedAt = new Date().toISOString();

    const finalSession: WorkoutSession = {
      ...session,
      endedAt,
      note,
      isSyncedWithGAS: false,
      isSyncedWithHealth: false,
    };

    const settings = StorageService.getSettings();

    try {
      if (settings.gasWebAppUrl) {
        const gasOk = await GasApiService.syncWorkoutSession(settings.gasWebAppUrl, finalSession);
        finalSession.isSyncedWithGAS = gasOk;
      }

      StorageService.addCompletedSession(finalSession);
      StorageService.clearActiveSession();

      HealthSyncService.triggerShortcut(finalSession, settings.appleShortcutName);
      onFinishSession(finalSession);
    } catch (e) {
      console.error('同期エラー:', e);
      StorageService.addCompletedSession(finalSession);
      StorageService.clearActiveSession();
      onFinishSession(finalSession);
    } finally {
      setIsSyncing(false);
      setIsModalOpen(false);
    }
  };

  const handleCompleteLocalOnly = (note: string) => {
    const endedAt = new Date().toISOString();

    const finalSession: WorkoutSession = {
      ...session,
      endedAt,
      note,
      isSyncedWithGAS: false,
      isSyncedWithHealth: false,
    };

    StorageService.addCompletedSession(finalSession);
    StorageService.clearActiveSession();
    setIsModalOpen(false);
    onFinishSession(finalSession);
  };

  // 1RM推定計算 (参考表示)
  const currentSetFor1RM = activeInput
    ? session.exercises.find(e => e.id === activeInput.exerciseId)?.sets.find(s => s.id === activeInput.setId)
    : null;
  const estimated1RM = currentSetFor1RM && currentSetFor1RM.reps > 0 && currentSetFor1RM.weight > 0
    ? Math.round(currentSetFor1RM.weight * (1 + currentSetFor1RM.reps / 30))
    : undefined;

  const completedSetsCount = session.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.isCompleted).length, 0);
  const totalSetsCount = session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  return (
    <div className="pb-36 px-4 pt-3 max-w-lg mx-auto">
      {/* 上部ステータスバー（経過時間タイマーと総ボリュームを削除し、ミニマル化） */}
      <div className="sticky top-[57px] z-30 bg-dark-900/95 backdrop-blur-md py-2.5 px-3.5 rounded-2xl border border-dark-800 flex items-center justify-between mb-4 shadow-xl">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">
            {session.menuName || 'ワークアウト記録中'}
          </h2>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-brand-neon" />
            <span>完了: {completedSetsCount} / {totalSetsCount} セット</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="py-2 px-4 rounded-xl bg-brand-neon hover:bg-green-400 active:scale-95 text-dark-950 font-black text-xs tracking-wide transition-all shadow-md shadow-brand-neon/20"
        >
          セッション終了
        </button>
      </div>

      {/* 種目一覧 */}
      {session.exercises.length > 0 ? (
        session.exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            activeInput={activeInput}
            onSelectField={handleSelectField}
            onUpdateSet={handleUpdateSet}
            onAddSet={handleAddSet}
            onDeleteSet={handleDeleteSet}
            onDeleteExercise={handleDeleteExercise}
            onCopyFromAbove={handleCopyFromAbove}
          />
        ))
      ) : (
        <div className="text-center py-12 px-4 bg-dark-850 border border-dark-800 rounded-3xl mb-4">
          <Dumbbell className="w-10 h-10 text-slate-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white">種目が登録されていません</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            「種目を追加」ボタンからトレーニング種目を追加してください
          </p>
        </div>
      )}

      {/* 種目追加ボタン */}
      <button
        type="button"
        onClick={() => setIsAddExerciseOpen(true)}
        className="w-full py-3.5 rounded-2xl bg-dark-800 hover:bg-dark-750 active:scale-98 text-slate-200 font-bold text-sm border border-dark-700/80 transition-all flex items-center justify-center gap-2 mb-6"
      >
        <Plus className="w-4 h-4 text-brand-neon" />
        <span>種目を追加する</span>
      </button>

      {/* 画面下部フロートテンキー */}
      {activeInput && (
        <div className="fixed bottom-16 left-0 right-0 z-50 max-w-lg mx-auto animate-in slide-in-from-bottom duration-150">
          <NumericKeypad
            currentValue={inputBuffer}
            field={activeInput.field}
            onKeyPress={handleKeyPress}
            onQuickAdd={handleQuickAdd}
            onDelete={handleDelete}
            onConfirm={handleConfirmInput}
            estimated1RM={estimated1RM}
          />
        </div>
      )}

      {/* 種目追加モーダル */}
      {isAddExerciseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-dark-900 border border-dark-700 w-full max-w-sm rounded-3xl p-4 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-dark-800">
              <h3 className="font-bold text-white text-base">種目を選択</h3>
              <button
                onClick={() => setIsAddExerciseOpen(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1"
              >
                閉じる
              </button>
            </div>

            {/* 部位フィルター */}
            <div className="flex gap-1.5 overflow-x-auto py-2.5">
              <button
                onClick={() => setSelectedBodyPartFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedBodyPartFilter === 'all' ? 'bg-brand-neon text-dark-950' : 'bg-dark-800 text-slate-300'
                }`}
              >
                すべて
              </button>
              {bodyParts.map(bp => (
                <button
                  key={bp.id}
                  onClick={() => setSelectedBodyPartFilter(bp.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedBodyPartFilter === bp.id ? 'bg-brand-neon text-dark-950' : 'bg-dark-800 text-slate-300'
                  }`}
                >
                  {bp.name}
                </button>
              ))}
            </div>

            {/* 種目リスト */}
            <div className="flex-1 overflow-y-auto space-y-1.5 py-2">
              {exercises
                .filter(e => selectedBodyPartFilter === 'all' || e.bodyPartId === selectedBodyPartFilter)
                .map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => handleAddExerciseToSession(ex)}
                    className="w-full text-left p-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 active:scale-98 transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{ex.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{ex.equipment}</div>
                    </div>
                    <Plus className="w-4 h-4 text-brand-neon" />
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ワークアウト終了モーダル */}
      <WorkoutModal
        session={session}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCompleteAndSync={handleCompleteAndSync}
        onCompleteLocalOnly={handleCompleteLocalOnly}
        isSyncing={isSyncing}
      />
    </div>
  );
};
