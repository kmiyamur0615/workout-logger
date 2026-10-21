import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Dumbbell, 
  Activity, 
  Flame, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  ListFilter,
  Edit2,
  X,
  Plus,
  Check,
  Trophy
} from 'lucide-react';
import { WorkoutSession, CardioLog, CardioType, UserProfile, WorkoutSet, ExerciseMaxRecord } from '../types';
import { calculateCardioCalories } from '../services/calorieCalculator';
import { calculate1RM } from '../services/storage';

interface HistoryPageProps {
  sessions: WorkoutSession[];
  cardioLogs: CardioLog[];
  cardioTypes?: CardioType[];
  userProfile?: UserProfile;
  onDeleteSession: (sessionId: string) => void;
  onUpdateSession?: (session: WorkoutSession) => void;
  onDeleteCardioLog: (logId: string) => void;
  onUpdateCardioLog?: (log: CardioLog) => void;
}

// 日付文字列 (YYYY-MM-DD) ヘルパー（ローカルタイム基準）
const toDateKey = (date: Date | string) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// タイムゾーンのUTC解釈ズレを防ぐ表示用フォーマッター
const formatDisplayDate = (dateKey: string) => {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
};

const formatListDate = (dateKey: string) => {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' });
};

export const HistoryPage: React.FC<HistoryPageProps> = ({
  sessions,
  cardioLogs,
  cardioTypes = [],
  userProfile = { heightCm: 172, weightKg: 68 },
  onDeleteSession,
  onUpdateSession,
  onDeleteCardioLog,
  onUpdateCardioLog,
}) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'max'>('calendar');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => toDateKey(new Date()));
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // 編集モーダル用の状態
  const [editingSession, setEditingSession] = useState<WorkoutSession | null>(null);
  const [editingCardio, setEditingCardio] = useState<CardioLog | null>(null);

  const toInputDateTime = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    } catch (_) {
      return '';
    }
  };

  const handleSaveEditedSession = () => {
    if (!editingSession || !onUpdateSession) return;
    onUpdateSession(editingSession);
    setEditingSession(null);
  };

  const handleUpdateSetInEditingSession = (exerciseIndex: number, setIndex: number, field: keyof WorkoutSet, val: any) => {
    if (!editingSession) return;
    const updatedExercises = [...editingSession.exercises];
    const targetExercise = { ...updatedExercises[exerciseIndex] };
    const updatedSets = [...targetExercise.sets];
    updatedSets[setIndex] = { ...updatedSets[setIndex], [field]: val };
    targetExercise.sets = updatedSets;
    updatedExercises[exerciseIndex] = targetExercise;
    setEditingSession({ ...editingSession, exercises: updatedExercises });
  };

  const handleDeleteSetInEditingSession = (exerciseIndex: number, setIndex: number) => {
    if (!editingSession) return;
    const updatedExercises = [...editingSession.exercises];
    const targetExercise = { ...updatedExercises[exerciseIndex] };
    targetExercise.sets = targetExercise.sets.filter((_, idx) => idx !== setIndex);
    updatedExercises[exerciseIndex] = targetExercise;
    setEditingSession({ ...editingSession, exercises: updatedExercises });
  };

  const handleAddSetInEditingSession = (exerciseIndex: number) => {
    if (!editingSession) return;
    const updatedExercises = [...editingSession.exercises];
    const targetExercise = { ...updatedExercises[exerciseIndex] };
    const lastSet = targetExercise.sets[targetExercise.sets.length - 1];
    const newSet: WorkoutSet = {
      id: `set-${Date.now()}-${Math.random()}`,
      setNumber: targetExercise.sets.length + 1,
      weight: lastSet ? lastSet.weight : 50,
      reps: lastSet ? lastSet.reps : 10,
      isCompleted: true,
    };
    targetExercise.sets = [...targetExercise.sets, newSet];
    updatedExercises[exerciseIndex] = targetExercise;
    setEditingSession({ ...editingSession, exercises: updatedExercises });
  };

  const handleRecalculateCalories = (c: CardioLog) => {
    const cType = cardioTypes.find(t => t.id === c.cardioTypeId);
    return calculateCardioCalories({
      cardioTypeName: c.cardioTypeName,
      defaultMets: cType?.defaultMets || 6.0,
      distanceKm: c.distanceKm || 0,
      durationMinutes: c.durationMinutes || 0,
      weightKg: userProfile.weightKg || 65,
      heightCm: userProfile.heightCm || 170,
    });
  };

  const handleSaveEditedCardio = () => {
    if (!editingCardio || !onUpdateCardioLog) return;
    onUpdateCardioLog(editingCardio);
    setEditingCardio(null);
  };

  // カレンダー計算
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // 日付ごとの記録マップを作成 (O(1)でルックアップ可能に)
  const historyMap = useMemo(() => {
    const map = new Map<string, { strength: WorkoutSession[]; cardio: CardioLog[] }>();

    sessions.forEach(s => {
      const key = toDateKey(s.startedAt);
      if (!map.has(key)) map.set(key, { strength: [], cardio: [] });
      map.get(key)!.strength.push(s);
    });

    cardioLogs.forEach(c => {
      const key = toDateKey(c.endedAt);
      if (!map.has(key)) map.set(key, { strength: [], cardio: [] });
      map.get(key)!.cardio.push(c);
    });

    return map;
  }, [sessions, cardioLogs]);

  // 当月のカレンダーグリッド生成
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay(); // 0: 日曜
    const totalDays = lastDay.getDate();

    const days: { dayNumber: number | null; dateStr: string | null }[] = [];

    // 前月の空白埋め
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ dayNumber: null, dateStr: null });
    }

    // 当月の日付
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr });
    }

    return days;
  }, [year, month]);

  // 当月のサマリー集計
  const currentMonthStats = useMemo(() => {
    let strengthDays = 0;
    let cardioDays = 0;
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    historyMap.forEach((entry, key) => {
      if (key.startsWith(prefix)) {
        if (entry.strength.length > 0) strengthDays++;
        if (entry.cardio.length > 0) cardioDays++;
      }
    });

    return { strengthDays, cardioDays };
  }, [historyMap, year, month]);

  // 種目別の過去Max値 (最大1RM・最大重量) 集計
  const exerciseMaxList = useMemo(() => {
    const map = new Map<
      string,
      {
        exerciseName: string;
        max1RM: ExerciseMaxRecord;
        maxWeight: ExerciseMaxRecord;
        sessionCount: number;
      }
    >();

    const normKey = (name: string) => name.trim().replace(/\s+/g, '').toLowerCase();

    sessions.forEach((session) => {
      const dateStr = session.endedAt || session.startedAt;
      session.exercises.forEach((ex) => {
        const key = normKey(ex.exerciseName || ex.exerciseId);
        if (!key) return;
        const validSets = (ex.sets || []).filter((s) => s.weight > 0 && s.reps > 0);
        if (validSets.length === 0) return;

        let entry = map.get(key);
        validSets.forEach((s) => {
          const rm = calculate1RM(s.weight, s.reps);
          const rec: ExerciseMaxRecord = {
            weight: s.weight,
            reps: s.reps,
            estimated1RM: rm,
            date: dateStr,
          };

          if (!entry) {
            entry = {
              exerciseName: ex.exerciseName,
              max1RM: rec,
              maxWeight: rec,
              sessionCount: 0,
            };
            map.set(key, entry);
          } else {
            if (
              rm > entry.max1RM.estimated1RM ||
              (rm === entry.max1RM.estimated1RM && s.weight > entry.max1RM.weight)
            ) {
              entry.max1RM = rec;
            }
            if (
              s.weight > entry.maxWeight.weight ||
              (s.weight === entry.maxWeight.weight && s.reps > entry.maxWeight.reps)
            ) {
              entry.maxWeight = rec;
            }
          }
        });
        if (entry) {
          entry.sessionCount += 1;
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.max1RM.estimated1RM - a.max1RM.estimated1RM);
  }, [sessions]);

  // 月送り・戻し
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(toDateKey(now));
  };

  // 選択日のデータ
  const selectedDayData = historyMap.get(selectedDateStr) || { strength: [], cardio: [] };
  const todayStr = toDateKey(new Date());

  return (
    <div className="pb-28 px-4 pt-3 max-w-lg mx-auto space-y-4 animate-in fade-in duration-150">
      {/* 画面ヘッダー ＆ 表示切替 */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <CalendarIcon className="w-4 h-4 text-blue-400 shrink-0" />
          <h2 className="text-sm font-bold text-white tracking-tight">トレーニング履歴</h2>
        </div>

        <div className="flex items-center gap-1 bg-dark-850 p-1 rounded-xl border border-dark-800">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
              viewMode === 'calendar' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarIcon className="w-3 h-3" />
            <span>カレンダー</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
              viewMode === 'list' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListFilter className="w-3 h-3" />
            <span>全リスト</span>
          </button>
          <button
            onClick={() => setViewMode('max')}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
              viewMode === 'max' ? 'bg-amber-500 text-dark-950 shadow-sm' : 'text-amber-400/90 hover:text-amber-300'
            }`}
          >
            <Trophy className="w-3 h-3" />
            <span>Max値</span>
          </button>
        </div>
      </div>

      {/* カレンダー表示モード */}
      {viewMode === 'calendar' && (
        <div className="space-y-4">
          {/* 月間カレンダーカード */}
          <div className="bg-dark-850 border border-dark-800 rounded-3xl p-4 shadow-xl">
            {/* カレンダーヘッダー */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-white tracking-tight">
                  {year}年 {month + 1}月
                </span>
                <button
                  onClick={handleToday}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-dark-800 text-slate-300 hover:text-white border border-dark-700 active:scale-95"
                >
                  今日
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 active:scale-95"
                  aria-label="前月"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 active:scale-95"
                  aria-label="翌月"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 当月サマリーバッジ */}
            <div className="flex items-center gap-2 mb-3 px-1 text-[11px]">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-dim text-brand-neon font-bold">
                <span className="w-2 h-2 rounded-full bg-brand-neon" />
                筋トレ: {currentMonthStats.strengthDays}日
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                有酸素: {currentMonthStats.cardioDays}日
              </span>
            </div>

            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500 mb-1">
              <span className="text-red-400">日</span>
              <span>月</span>
              <span>火</span>
              <span>水</span>
              <span>木</span>
              <span>金</span>
              <span className="text-blue-400">土</span>
            </div>

            {/* カレンダー日付グリッド */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((item, index) => {
                if (!item.dateStr) {
                  return <div key={`empty-${index}`} className="h-11" />;
                }

                const dayEntry = historyMap.get(item.dateStr);
                const hasStrength = dayEntry && dayEntry.strength.length > 0;
                const hasCardio = dayEntry && dayEntry.cardio.length > 0;
                const isSelected = selectedDateStr === item.dateStr;
                const isToday = todayStr === item.dateStr;

                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => setSelectedDateStr(item.dateStr!)}
                    className={`h-11 rounded-xl flex flex-col items-center justify-center relative transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-blue-600/30 border-2 border-blue-400 shadow-md'
                        : isToday
                        ? 'bg-dark-800/80 border border-slate-600'
                        : 'hover:bg-dark-800/60'
                    }`}
                  >
                    <span className={`text-xs font-mono ${isToday ? 'font-black text-white' : 'text-slate-300 font-semibold'}`}>
                      {item.dayNumber}
                    </span>

                    {/* 筋トレ ＆ 有酸素のカラーインジケータードット */}
                    <div className="flex items-center gap-1 mt-0.5 h-1.5">
                      {hasStrength && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-neon shadow-sm shadow-brand-neon" title="筋トレ" />
                      )}
                      {hasCardio && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400" title="有酸素" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 選択日の記録詳細カード */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>{formatDisplayDate(selectedDateStr)} の記録</span>
              </h3>
            </div>

            {selectedDayData.strength.length === 0 && selectedDayData.cardio.length === 0 ? (
              <div className="text-center py-8 bg-dark-850/60 border border-dark-800 rounded-2xl">
                <p className="text-xs text-slate-400">この日のトレーニング記録はありません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 選択日の筋トレセッション */}
                {selectedDayData.strength.map((session) => {
                  const totalSets = session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
                  const isExpanded = expandedSessionId === session.id;

                  return (
                    <div key={session.id} className="bg-dark-850 border border-dark-800 rounded-2xl overflow-hidden shadow-md">
                      <div
                        onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                        className="p-3.5 cursor-pointer hover:bg-dark-800/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-brand-dim text-brand-neon text-[10px] font-bold">
                            <Dumbbell className="w-3 h-3" />
                            <span>筋トレ</span>
                          </span>
                          <span className="text-[11px] font-semibold text-brand-neon">
                            {totalSets} セット
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <div>
                            <div className="text-sm font-bold text-white">{session.menuName || '筋トレ'}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{session.exercises.length} 種目</div>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </div>

                      {/* 展開時：セット内訳 */}
                      {isExpanded && (
                        <div className="px-3.5 pb-3.5 pt-2 border-t border-dark-800/80 bg-dark-900/40 space-y-2.5">
                          {session.note && (
                            <div className="p-2 rounded-lg bg-dark-800/60 text-xs text-slate-300 italic">
                              "{session.note}"
                            </div>
                          )}

                          <div className="space-y-2">
                            {session.exercises.map((ex) => {
                              const sessionMax1RM = ex.sets.reduce(
                                (max, s) => Math.max(max, calculate1RM(s.weight, s.reps)),
                                0
                              );
                              return (
                                <div key={ex.id} className="p-2.5 rounded-xl bg-dark-850 border border-dark-800 text-xs">
                                  <div className="font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                                    <span>{ex.exerciseName}</span>
                                    <div className="flex items-center gap-1.5">
                                      {sessionMax1RM > 0 && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono font-bold">
                                          Max 1RM: {sessionMax1RM}kg
                                        </span>
                                      )}
                                      <span className="text-[10px] text-slate-400 font-normal">
                                        {ex.sets.length}セット
                                      </span>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 gap-1 font-mono text-[11px]">
                                    {ex.sets.map((s) => {
                                      const rm = calculate1RM(s.weight, s.reps);
                                      return (
                                        <div key={s.id} className="px-2 py-1 rounded-lg flex items-center justify-between bg-dark-800 text-white">
                                          <span className="text-slate-400 text-[10px]">Set {s.setNumber}</span>
                                          <div className="flex items-center gap-2">
                                            <span>{s.weight}kg × {s.reps}回</span>
                                            {rm > 0 && (
                                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-neon/15 text-brand-neon font-bold">
                                                1RM {rm}kg
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-dark-800">
                            <button
                              type="button"
                              onClick={() => setEditingSession(JSON.parse(JSON.stringify(session)))}
                              className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 py-1 px-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 active:scale-95"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>編集</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteSession(session.id)}
                              className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 py-1 px-2.5 rounded-lg bg-red-500/10 border border-red-500/20 active:scale-95"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>削除</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 選択日の有酸素ログ */}
                {selectedDayData.cardio.map((log) => (
                  <div key={log.id} className="bg-dark-850 border border-dark-800 rounded-2xl p-3.5 shadow-md">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 text-[10px] font-bold">
                        <Activity className="w-3 h-3" />
                        <span>有酸素</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingCardio({ ...log })}
                          className="text-slate-400 hover:text-blue-400 p-1 rounded-lg hover:bg-dark-800 active:scale-95"
                          title="編集"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteCardioLog(log.id)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-dark-800 active:scale-95"
                          title="削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-white">{log.cardioTypeName}</div>
                        <div className="text-xs text-slate-300 font-mono mt-0.5">
                          {log.distanceKm > 0 && `${log.distanceKm} km · `}{log.durationMinutes} 分
                        </div>
                      </div>

                      <div className="flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-sm font-mono font-black text-amber-400">{log.calories}</span>
                        <span className="text-[10px] text-amber-300">kcal</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 全リスト表示モード */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {sessions.length === 0 && cardioLogs.length === 0 ? (
            <div className="text-center py-16 bg-dark-850 border border-dark-800 rounded-3xl">
              <CalendarIcon className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-300">記録がありません</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* 日付順にソートして並べる */}
              {Array.from(historyMap.entries())
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([dateKey, entry]) => (
                  <div key={dateKey} className="bg-dark-850 border border-dark-800 rounded-2xl p-3.5 space-y-2">
                    <div className="text-xs font-bold text-slate-300 pb-1.5 border-b border-dark-750 flex items-center justify-between">
                      <span>{formatListDate(dateKey)}</span>
                      <div className="flex items-center gap-1">
                        {entry.strength.length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-brand-neon" />
                        )}
                        {entry.cardio.length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                        )}
                      </div>
                    </div>

                    {/* 筋トレ一覧 */}
                    {entry.strength.map(s => (
                      <div key={s.id} className="flex items-center justify-between text-xs py-1.5 border-b border-dark-800/40 last:border-0">
                        <span className="text-white font-semibold flex items-center gap-1">
                          <Dumbbell className="w-3.5 h-3.5 text-brand-neon" />
                          <span>{s.menuName || '筋トレ'}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono text-[11px]">
                            {s.exercises.reduce((acc, ex) => acc + ex.sets.length, 0)} sets
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingSession(JSON.parse(JSON.stringify(s)))}
                            className="text-slate-400 hover:text-blue-400 p-1 rounded hover:bg-dark-800 active:scale-95"
                            title="編集"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSession(s.id)}
                            className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-dark-800 active:scale-95"
                            title="削除"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* 有酸素一覧 */}
                    {entry.cardio.map(c => (
                      <div key={c.id} className="flex items-center justify-between text-xs py-1.5 border-b border-dark-800/40 last:border-0">
                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5" />
                          <span>{c.cardioTypeName}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 font-mono text-[11px]">
                            {c.distanceKm > 0 && `${c.distanceKm}km · `}{c.durationMinutes}分 · {c.calories} kcal
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingCardio({ ...c })}
                            className="text-slate-400 hover:text-blue-400 p-1 rounded hover:bg-dark-800 active:scale-95"
                            title="編集"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteCardioLog(c.id)}
                            className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-dark-800 active:scale-95"
                            title="削除"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* 種目別 過去Max値 (自己ベスト) 表示モード */}
      {viewMode === 'max' && (
        <div className="space-y-3">
          {exerciseMaxList.length === 0 ? (
            <div className="text-center py-16 bg-dark-850 border border-dark-800 rounded-3xl">
              <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-300">筋トレの記録がありません</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {exerciseMaxList.map((item) => (
                <div
                  key={item.exerciseName}
                  className="bg-dark-850 border border-dark-800 rounded-2xl p-3.5 shadow-md space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-sm font-bold text-white">{item.exerciseName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      計 {item.sessionCount} 回実施
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                      <div className="text-[10px] font-bold text-amber-400 mb-0.5">過去最大 1RM (推定)</div>
                      <div className="font-mono">
                        <span className="text-base font-black text-amber-300">{item.max1RM.estimated1RM}</span>
                        <span className="text-[10px] text-amber-400/80 ml-0.5">kg</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {item.max1RM.weight}kg × {item.max1RM.reps}回 ({formatDisplayDate(toDateKey(item.max1RM.date))})
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-750">
                      <div className="text-[10px] font-bold text-slate-300 mb-0.5">過去最大重量</div>
                      <div className="font-mono">
                        <span className="text-base font-black text-white">{item.maxWeight.weight}</span>
                        <span className="text-[10px] text-slate-400 ml-0.5">kg</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {item.maxWeight.weight}kg × {item.maxWeight.reps}回 ({formatDisplayDate(toDateKey(item.maxWeight.date))})
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 筋トレ編集モーダル */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-dark-900 border border-dark-700 w-full max-w-md rounded-3xl p-5 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-dark-800">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-brand-neon" />
                <h3 className="font-bold text-white text-base">筋トレ記録を編集</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  メニュー / ワークアウト名
                </label>
                <input
                  type="text"
                  value={editingSession.menuName || ''}
                  onChange={(e) => setEditingSession({ ...editingSession, menuName: e.target.value })}
                  placeholder="例: 胸・腕"
                  className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-neon font-bold"
                />
              </div>

              <div className="min-w-0">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  開始日時
                </label>
                <div className="w-full overflow-hidden bg-dark-800 border border-dark-700 rounded-xl focus-within:border-brand-neon">
                  <input
                    type="datetime-local"
                    value={toInputDateTime(editingSession.startedAt)}
                    onChange={(e) => setEditingSession({ ...editingSession, startedAt: new Date(e.target.value).toISOString() })}
                    className="block w-full max-w-full min-w-0 box-border appearance-none bg-transparent border-0 px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  メモ (任意)
                </label>
                <input
                  type="text"
                  value={editingSession.note || ''}
                  onChange={(e) => setEditingSession({ ...editingSession, note: e.target.value })}
                  placeholder="メモを入力..."
                  className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-neon"
                />
              </div>

              {/* 種目・セット編集 */}
              <div className="space-y-3 pt-2 border-t border-dark-800">
                <div className="text-xs font-bold text-slate-300">種目 & セット</div>
                {editingSession.exercises.map((ex, exIdx) => (
                  <div key={ex.id} className="p-3 rounded-2xl bg-dark-850 border border-dark-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{ex.exerciseName}</span>
                      <button
                        type="button"
                        onClick={() => handleAddSetInEditingSession(exIdx)}
                        className="text-[10px] text-brand-neon hover:underline flex items-center gap-0.5 font-bold"
                      >
                        <Plus className="w-3 h-3" />
                        <span>セット追加</span>
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {ex.sets.map((set, setIdx) => (
                        <div key={set.id} className="flex items-center gap-2 bg-dark-900/60 p-1.5 rounded-xl border border-dark-800">
                          <span className="text-[10px] font-mono text-slate-400 w-6">#{set.setNumber}</span>
                          <div className="flex items-center gap-1 flex-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={set.weight}
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) => handleUpdateSetInEditingSession(exIdx, setIdx, 'weight', parseFloat(e.target.value) || 0)}
                              className="w-16 bg-dark-800 border border-dark-700 rounded-lg px-1.5 py-1 text-center font-mono text-base text-white"
                            />
                            <span className="text-[10px] text-slate-400">kg</span>
                            <span className="text-slate-500 mx-0.5">×</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={set.reps}
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) => handleUpdateSetInEditingSession(exIdx, setIdx, 'reps', parseInt(e.target.value, 10) || 0)}
                              className="w-14 bg-dark-800 border border-dark-700 rounded-lg px-1.5 py-1 text-center font-mono text-base text-white"
                            />
                            <span className="text-[10px] text-slate-400">回</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteSetInEditingSession(exIdx, setIdx)}
                            className="p-1 text-slate-500 hover:text-red-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-dark-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="flex-1 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-xs font-semibold text-slate-300"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSaveEditedSession}
                className="flex-1 py-2.5 rounded-xl bg-brand-neon hover:bg-green-400 text-dark-950 text-xs font-black shadow-lg shadow-brand-neon/20 flex items-center justify-center gap-1"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>保存する</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 有酸素編集モーダル */}
      {editingCardio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-dark-900 border border-dark-700 w-full max-w-sm rounded-3xl p-5 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-dark-800">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">有酸素記録を編集</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCardio(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 my-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  運動種別
                </label>
                <select
                  value={editingCardio.cardioTypeId}
                  onChange={(e) => {
                    const sel = cardioTypes.find(t => t.id === e.target.value);
                    const updated = {
                      ...editingCardio,
                      cardioTypeId: e.target.value,
                      cardioTypeName: sel ? sel.name : editingCardio.cardioTypeName,
                    };
                    updated.calories = handleRecalculateCalories(updated);
                    setEditingCardio(updated);
                  }}
                  className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-bold"
                >
                  {cardioTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                  {!cardioTypes.some(t => t.id === editingCardio.cardioTypeId) && (
                    <option value={editingCardio.cardioTypeId}>{editingCardio.cardioTypeName}</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    時間 (分)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={editingCardio.durationMinutes}
                    onChange={(e) => {
                      const updated = { ...editingCardio, durationMinutes: parseFloat(e.target.value) || 0 };
                      updated.calories = handleRecalculateCalories(updated);
                      setEditingCardio(updated);
                    }}
                    className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    距離 (km)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingCardio.distanceKm}
                    onChange={(e) => {
                      const updated = { ...editingCardio, distanceKm: parseFloat(e.target.value) || 0 };
                      updated.calories = handleRecalculateCalories(updated);
                      setEditingCardio(updated);
                    }}
                    className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="min-w-0">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  終了日時
                </label>
                <div className="w-full overflow-hidden bg-dark-800 border border-dark-700 rounded-xl focus-within:border-amber-400">
                  <input
                    type="datetime-local"
                    value={toInputDateTime(editingCardio.endedAt)}
                    onChange={(e) => setEditingCardio({ ...editingCardio, endedAt: new Date(e.target.value).toISOString() })}
                    className="block w-full max-w-full min-w-0 box-border appearance-none bg-transparent border-0 px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  消費カロリー (kcal)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={editingCardio.calories}
                    onChange={(e) => setEditingCardio({ ...editingCardio, calories: parseInt(e.target.value) || 0 })}
                    className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-xs text-amber-400 focus:outline-none focus:border-amber-400 font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setEditingCardio({ ...editingCardio, calories: handleRecalculateCalories(editingCardio) })}
                    className="px-2.5 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-[10px] text-slate-300 whitespace-nowrap border border-dark-700 active:scale-95"
                  >
                    再計算
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  メモ (任意)
                </label>
                <input
                  type="text"
                  value={editingCardio.note || ''}
                  onChange={(e) => setEditingCardio({ ...editingCardio, note: e.target.value })}
                  placeholder="メモを入力..."
                  className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-dark-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingCardio(null)}
                className="flex-1 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-xs font-semibold text-slate-300"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSaveEditedCardio}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-dark-950 text-xs font-black shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>保存する</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
