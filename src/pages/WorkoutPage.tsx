import React, { useState, useEffect } from 'react';
import { Plus, Dumbbell, CheckCircle2, X, Sparkles, Check, Smartphone } from 'lucide-react';
import { WorkoutSession, WorkoutExercise, WorkoutSet, Exercise, BodyPart, EquipmentType, RoutineMenu } from '../types';
import { ExerciseCard } from '../components/ExerciseCard';
import { WorkoutModal } from '../components/WorkoutModal';
import { GasApiService } from '../services/gasApi';
import { HealthSyncService } from '../services/healthSync';
import { StorageService } from '../services/storage';

const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  BARBELL: 'バーベル',
  DUMBBELL: 'ダンベル',
  MACHINE: 'マシン',
  CABLE: 'ケーブル',
  BODYWEIGHT: '自重',
  OTHER: 'その他',
};

interface WorkoutPageProps {
  session: WorkoutSession;
  onUpdateSession: (updated: WorkoutSession) => void;
  onFinishSession: (session: WorkoutSession) => void;
  exercises: Exercise[];
  bodyParts: BodyPart[];
  routineMenus?: RoutineMenu[];
  onLoadMenu?: (menuId: string) => void;
  onCreateExercise?: (exercise: Exercise) => void;
}

export const WorkoutPage: React.FC<WorkoutPageProps> = ({
  session,
  onUpdateSession,
  onFinishSession,
  exercises,
  bodyParts,
  routineMenus = [],
  onLoadMenu,
  onCreateExercise,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [isMenuPickerOpen, setIsMenuPickerOpen] = useState(false);
  const [selectedBodyPartFilter, setSelectedBodyPartFilter] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  // 筋トレ記録・保存用の状態
  const [note, setNote] = useState(session.note || '');
  const [syncToHealth, setSyncToHealth] = useState(true);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (session.note !== undefined && session.note !== note) {
      setNote(session.note || '');
    }
  }, [session.note]);

  // 新規種目作成フォーム状態
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExBodyPart, setNewExBodyPart] = useState<string>('chest');
  const [newExEquipment, setNewExEquipment] = useState<EquipmentType>('MACHINE');

  // セットの更新（入力されているセットはすべて完了扱い）
  const handleUpdateSet = (exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => {
    const updatedExercises = session.exercises.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map(s => {
          if (s.id !== setId) return s;
          return {
            ...s,
            ...updates,
            isCompleted: true,
            completedAt: new Date().toISOString(),
          };
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
      isCompleted: true,
      completedAt: new Date().toISOString(),
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

  // 種目の削除（削除した種目IDを記録し、メニュー再読込や自動同期で復活しないようにする）
  const handleDeleteExercise = (exerciseId: string) => {
    const deletedEx = session.exercises.find(e => e.id === exerciseId);
    const updatedExercises = session.exercises.filter(e => e.id !== exerciseId);
    const excludedSet = new Set(session.excludedExerciseIds || []);
    if (deletedEx?.exerciseId) {
      excludedSet.add(deletedEx.exerciseId);
    }

    const updatedSession: WorkoutSession = {
      ...session,
      excludedExerciseIds: Array.from(excludedSet),
      exercises: updatedExercises,
    };

    onUpdateSession(updatedSession);

    // スプレッドシート側にすでに保存されていた種目が同期で復活しないようバックグラウンドで反映
    const settings = StorageService.getSettings();
    if (settings.gasWebAppUrl) {
      GasApiService.syncWorkoutSession(settings.gasWebAppUrl, updatedSession).catch(err =>
        console.error('種目削除のGAS同期エラー:', err)
      );
    }
  };

  // 上のSetからのコピー機能（一括コピー: 重量・回数 / 重量のみ / 回数のみ）
  const handleCopyFromAbove = (exerciseId: string, mode: 'all' | 'weight' | 'reps') => {
    const targetEx = session.exercises.find(e => e.id === exerciseId);
    if (!targetEx || targetEx.sets.length < 2) return;

    const lastIdx = targetEx.sets.length - 1;
    const sourceSet = targetEx.sets[lastIdx - 1];
    const targetSet = targetEx.sets[lastIdx];

    if (!sourceSet || !targetSet) return;

    const updates: Partial<WorkoutSet> = { isCompleted: true };
    if (mode === 'all') {
      updates.weight = sourceSet.weight;
      updates.reps = sourceSet.reps;
    } else if (mode === 'weight') {
      updates.weight = sourceSet.weight;
    } else if (mode === 'reps') {
      updates.reps = sourceSet.reps;
    }

    handleUpdateSet(exerciseId, targetSet.id, updates);
  };

  // 新規種目を今日のシートに追加（前回記録があれば1セット目の重量・回数を初期値として補完）
  const handleAddExerciseToSession = (ex: Exercise) => {
    const prevLog = StorageService.getPreviousLogsForExercise(ex.id, ex.name);
    const firstPrevSet = prevLog?.sets?.[0];

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
          weight: firstPrevSet ? firstPrevSet.weight : 0,
          reps: firstPrevSet ? firstPrevSet.reps : 0,
          isAssisted: false,
          isCompleted: true,
          completedAt: new Date().toISOString(),
        }
      ]
    };

    const updated = [...session.exercises, newEx];
    const remainingExcluded = (session.excludedExerciseIds || []).filter(id => id !== ex.id);
    onUpdateSession({
      ...session,
      excludedExerciseIds: remainingExcluded,
      exercises: updated,
    });
    setIsAddExerciseOpen(false);
    setIsCreatingExercise(false);
  };

  // 新規種目マスタを作成してそのまま今日のシートに追加
  const handleCreateAndSelectExercise = () => {
    const trimmed = newExName.trim();
    if (!trimmed) return;

    const newExercise: Exercise = {
      id: `ex-custom-${Date.now()}`,
      bodyPartId: newExBodyPart,
      name: trimmed,
      equipment: newExEquipment,
      isCustom: true,
    };

    if (onCreateExercise) {
      onCreateExercise(newExercise);
    } else {
      StorageService.addExercise(newExercise);
    }

    setNewExName('');
    setIsCreatingExercise(false);
    handleAddExerciseToSession(newExercise);
  };

  // 外部連携（GAS & Appleヘルスケア送信、画面は閉じずにそのまま継続可能）
  const handleCompleteAndSync = async (note: string) => {
    setIsSyncing(true);
    const endedAt = new Date().toISOString();

    const finalSession: WorkoutSession = {
      ...session,
      endedAt,
      note: note || session.note,
      isSyncedWithGAS: session.isSyncedWithGAS || false,
      isSyncedWithHealth: true,
    };

    const settings = StorageService.getSettings();

    try {
      if (settings.gasWebAppUrl) {
        const gasOk = await GasApiService.syncWorkoutSession(settings.gasWebAppUrl, finalSession);
        finalSession.isSyncedWithGAS = gasOk;
      }

      onUpdateSession(finalSession);
      HealthSyncService.triggerShortcut(finalSession, settings.appleShortcutName);
      onFinishSession(finalSession);
    } catch (e) {
      console.error('同期エラー:', e);
      onUpdateSession(finalSession);
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
      note: note || session.note,
    };

    onUpdateSession(finalSession);
    setIsModalOpen(false);
  };

  // 筋トレ内容を明示的に記録・保存（GAS送信・Appleヘルスケア連携後に履歴へ遷移）
  const handleRecordWorkout = async () => {
    if (isRecording || isSavedSuccess) return;
    setIsRecording(true);

    const endedAt = new Date().toISOString();
    const finalSession: WorkoutSession = {
      ...session,
      endedAt,
      note: note.trim() || session.note || '',
      isSyncedWithGAS: session.isSyncedWithGAS || false,
      isSyncedWithHealth: syncToHealth,
    };

    const settings = StorageService.getSettings();

    // まずローカルストレージへ即時保存
    onUpdateSession(finalSession);

    try {
      if (settings.gasWebAppUrl) {
        const gasOk = await GasApiService.syncWorkoutSession(settings.gasWebAppUrl, finalSession);
        finalSession.isSyncedWithGAS = gasOk;
        onUpdateSession(finalSession);
      }
    } catch (e) {
      console.error('筋トレ記録エラー:', e);
    } finally {
      setIsRecording(false);
    }

    setIsSavedSuccess(true);

    if (syncToHealth) {
      HealthSyncService.triggerShortcut(finalSession, settings.appleShortcutName);
    }

    setTimeout(() => {
      onFinishSession(finalSession);
    }, 500);
  };

  const totalSetsCount = session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const todayFormatted = new Date().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' });

  return (
    <div className="pb-28 px-4 pt-3 max-w-lg mx-auto">
      {/* 上部ステータスバー（常時入力・自動保存仕様） */}
      <div className="sub-header-sticky sticky z-30 bg-dark-900 py-2.5 px-3.5 rounded-2xl border border-dark-800 flex items-center justify-between mb-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white tracking-tight">
              {todayFormatted} の筋トレ
            </h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-brand-neon/15 text-brand-neon font-bold">
              自動保存
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-brand-neon" />
            <span>
              {session.exercises.length}種目 · {totalSetsCount} セット
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {routineMenus.length > 0 && (
            <button
              type="button"
              onClick={() => setIsMenuPickerOpen(true)}
              className="py-2 px-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 active:scale-95 text-slate-200 font-bold text-[11px] border border-dark-700 transition-all flex items-center gap-1"
              title="メニューから種目を一括追加"
            >
              <Sparkles className="w-3 h-3 text-brand-neon" />
              <span>メニュー読込</span>
            </button>
          )}

          {session.exercises.length > 0 && (
            <button
              type="button"
              onClick={handleRecordWorkout}
              disabled={isRecording || isSavedSuccess}
              className={`py-2 px-3.5 rounded-xl font-black text-[11px] tracking-wide transition-all flex items-center gap-1.5 active:scale-95 shadow-md ${
                isSavedSuccess
                  ? 'bg-green-500 text-dark-950 shadow-green-500/25'
                  : 'bg-brand-neon hover:bg-green-400 text-dark-950 shadow-brand-neon/20'
              }`}
              title="筋トレを記録して保存"
            >
              {isSavedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>記録完了</span>
                </>
              ) : isRecording ? (
                <>
                  <div className="w-3 h-3 border-2 border-dark-950 border-t-transparent rounded-full animate-spin" />
                  <span>保存中</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>記録する</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 種目追加ボタン（いつでもすぐ押せるよう上部・下部に配置） */}
      {session.exercises.length === 0 ? (
        <div className="space-y-4 mb-6">
          <div className="text-center py-8 px-4 bg-dark-850 border border-dark-800 rounded-3xl">
            <Dumbbell className="w-10 h-10 text-brand-neon mx-auto mb-2 opacity-80" />
            <h3 className="text-sm font-bold text-white">本日の種目を追加して記録</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              入力した重量・回数はすべて自動で履歴に保存されます
            </p>
            <button
              type="button"
              onClick={() => setIsAddExerciseOpen(true)}
              className="w-full py-3.5 rounded-2xl bg-brand-neon hover:bg-green-400 active:scale-98 text-dark-950 font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-neon/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>種目を追加する</span>
            </button>
          </div>

          {/* ルーティンメニューから一括セット */}
          {routineMenus.length > 0 && onLoadMenu && (
            <div className="bg-dark-850 border border-dark-800 rounded-3xl p-4">
              <div className="flex items-center gap-1.5 mb-2.5 px-1">
                <Sparkles className="w-3.5 h-3.5 text-brand-neon" />
                <span className="text-xs font-bold text-slate-300">登録メニューから種目を一括セット</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {routineMenus.map(menu => (
                  <button
                    key={menu.id}
                    type="button"
                    onClick={() => onLoadMenu(menu.id)}
                    className="w-full text-left p-3 rounded-2xl bg-dark-900 hover:bg-dark-800 border border-dark-800 hover:border-brand-neon/30 active:scale-98 transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{menu.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {menu.targetParts} · {menu.exercises.length}種目
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-brand-neon px-2.5 py-1 rounded-lg bg-brand-neon/10">
                      セットする
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {session.exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              onUpdateSet={handleUpdateSet}
              onAddSet={handleAddSet}
              onDeleteSet={handleDeleteSet}
              onDeleteExercise={handleDeleteExercise}
              onCopyFromAbove={handleCopyFromAbove}
            />
          ))}

          <button
            type="button"
            onClick={() => setIsAddExerciseOpen(true)}
            className="w-full py-3.5 rounded-2xl bg-dark-800 hover:bg-dark-750 active:scale-98 text-slate-200 font-bold text-sm border border-dark-700/80 transition-all flex items-center justify-center gap-2 mb-4"
          >
            <Plus className="w-4 h-4 text-brand-neon" />
            <span>種目を追加する</span>
          </button>

          {/* 筋トレ記録・保存カード (有酸素運動と同様の保存UX) */}
          <div className="bg-dark-850 border border-dark-800 rounded-3xl p-4 space-y-3.5 mb-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Dumbbell className="w-4 h-4 text-brand-neon" />
                <span>ワークアウトの記録</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {session.exercises.length}種目 · {totalSetsCount}セット
              </div>
            </div>

            {/* メモ入力 */}
            <div>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="メモ (任意: 体調、追い込み具合など)"
                className="w-full bg-dark-900 border border-dark-750 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-neon"
              />
            </div>

            {/* Appleヘルスケア連携トグル */}
            <div className="flex items-center justify-between px-3 py-2 bg-dark-900/70 rounded-2xl border border-dark-750">
              <div className="flex items-center gap-2">
                <Smartphone className={`w-4 h-4 transition-colors ${syncToHealth ? 'text-brand-neon' : 'text-slate-500'}`} />
                <span className="text-xs font-medium text-slate-300">Appleヘルスケアに連携</span>
              </div>
              <button
                type="button"
                onClick={() => setSyncToHealth(!syncToHealth)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 active:scale-95 ${
                  syncToHealth ? 'bg-brand-neon' : 'bg-dark-750'
                }`}
                aria-label="Appleヘルスケア連携の切り替え"
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-dark-950 transition-transform ${
                    syncToHealth ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* メイン保存・記録ボタン */}
            <button
              type="button"
              onClick={handleRecordWorkout}
              disabled={isRecording || isSavedSuccess}
              className={`w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-xl active:scale-98 ${
                isSavedSuccess
                  ? 'bg-green-500 text-dark-950 shadow-green-500/25'
                  : 'bg-brand-neon hover:bg-green-400 text-dark-950 shadow-brand-neon/25'
              }`}
            >
              {isSavedSuccess ? (
                <>
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>記録しました！履歴に保存中...</span>
                </>
              ) : isRecording ? (
                <>
                  <div className="w-4 h-4 border-2 border-dark-950 border-t-transparent rounded-full animate-spin" />
                  <span>記録・送信中...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 stroke-[2.5]" />
                  <span>筋トレを記録</span>
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* ルーティンメニュー読込モーダル */}
      {isMenuPickerOpen && onLoadMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-dark-900 border border-dark-700 w-full max-w-sm rounded-3xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-dark-800">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-neon" />
                <h3 className="font-bold text-white text-sm">メニューから種目を追加</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuPickerOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {routineMenus.map(menu => (
                <button
                  key={menu.id}
                  type="button"
                  onClick={() => {
                    onLoadMenu(menu.id);
                    setIsMenuPickerOpen(false);
                  }}
                  className="w-full text-left p-3 rounded-2xl bg-dark-800 hover:bg-dark-750 active:scale-98 transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-white">{menu.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {menu.targetParts} ({menu.exercises.length}種目)
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-brand-neon" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 種目追加モーダル */}
      {isAddExerciseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-dark-900 border border-dark-700 w-full max-w-sm rounded-3xl p-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-dark-800 shrink-0">
              <h3 className="font-bold text-white text-base">種目を選択</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!isCreatingExercise && selectedBodyPartFilter !== 'all') {
                      setNewExBodyPart(selectedBodyPartFilter);
                    }
                    setIsCreatingExercise(!isCreatingExercise);
                  }}
                  className="text-xs text-brand-neon hover:underline flex items-center gap-1 font-bold px-2.5 py-1.5 rounded-lg bg-brand-neon/10 border border-brand-neon/30 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新規種目を作成</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddExerciseOpen(false);
                    setIsCreatingExercise(false);
                  }}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 新規種目作成フォーム */}
            {isCreatingExercise && (
              <div className="p-3.5 rounded-2xl bg-dark-850 border border-brand-neon/40 my-2.5 space-y-2.5 animate-in fade-in duration-150 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-neon">新しい筋トレ種目を登録</span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingExercise(false)}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    キャンセル
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    種目名
                  </label>
                  <input
                    type="text"
                    value={newExName}
                    onChange={(e) => setNewExName(e.target.value)}
                    placeholder="例: ペックフライ、ブルガリアンスクワット"
                    className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-neon"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      対象部位
                    </label>
                    <select
                      value={newExBodyPart}
                      onChange={(e) => setNewExBodyPart(e.target.value)}
                      className="w-full bg-dark-800 border border-dark-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brand-neon"
                    >
                      {bodyParts.map(bp => (
                        <option key={bp.id} value={bp.id}>{bp.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      器具タイプ
                    </label>
                    <select
                      value={newExEquipment}
                      onChange={(e) => setNewExEquipment(e.target.value as EquipmentType)}
                      className="w-full bg-dark-800 border border-dark-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brand-neon"
                    >
                      {(Object.keys(EQUIPMENT_LABELS) as EquipmentType[]).map(eq => (
                        <option key={eq} value={eq}>{EQUIPMENT_LABELS[eq]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!newExName.trim()}
                  onClick={handleCreateAndSelectExercise}
                  className="w-full py-2.5 rounded-xl bg-brand-neon disabled:opacity-40 text-dark-950 font-black text-xs active:scale-98 transition-all shadow-md shadow-brand-neon/20"
                >
                  作成してワークアウトに追加
                </button>
              </div>
            )}

            {/* 部位フィルター (iOS Safariで縦に潰れないよう shrink-0 と flex-wrap を指定) */}
            <div className="flex flex-wrap items-center gap-1.5 py-3 shrink-0 border-b border-dark-800/60">
              <button
                type="button"
                onClick={() => setSelectedBodyPartFilter('all')}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold leading-snug whitespace-nowrap transition-all active:scale-95 ${
                  selectedBodyPartFilter === 'all'
                    ? 'bg-brand-neon text-dark-950 shadow-sm shadow-brand-neon/20'
                    : 'bg-dark-800 text-slate-300 border border-dark-700'
                }`}
              >
                すべて
              </button>
              {bodyParts.map(bp => (
                <button
                  key={bp.id}
                  type="button"
                  onClick={() => setSelectedBodyPartFilter(bp.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold leading-snug whitespace-nowrap transition-all active:scale-95 ${
                    selectedBodyPartFilter === bp.id
                      ? 'bg-brand-neon text-dark-950 shadow-sm shadow-brand-neon/20'
                      : 'bg-dark-800 text-slate-300 border border-dark-700'
                  }`}
                >
                  {bp.name}
                </button>
              ))}
            </div>

            {/* 種目リスト */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 py-2.5">
              {exercises
                .filter(e => selectedBodyPartFilter === 'all' || e.bodyPartId === selectedBodyPartFilter)
                .map(ex => {
                  const bpName = bodyParts.find(b => b.id === ex.bodyPartId)?.name || ex.bodyPartId;
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => handleAddExerciseToSession(ex)}
                      className="w-full text-left p-3 rounded-xl bg-dark-800 hover:bg-dark-750 active:scale-98 transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{ex.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {bpName} · {EQUIPMENT_LABELS[ex.equipment] || ex.equipment}
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-brand-neon shrink-0 ml-2" />
                    </button>
                  );
                })}
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
