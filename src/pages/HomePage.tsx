import React from 'react';
import { Play, Sparkles, Clock, ChevronRight, Activity, X, Dumbbell, Settings } from 'lucide-react';
import { RoutineMenu, WeekdaySchedule, BodyPart, WorkoutSession, DayOfWeek } from '../types';

interface HomePageProps {
  schedule: WeekdaySchedule[];
  routineMenus: RoutineMenu[];
  bodyParts: BodyPart[];
  pastSessions: WorkoutSession[];
  onStartSession: (menuId?: string) => void;
  onNavigateToWorkout: () => void;
  hasActiveSession: boolean;
  onNavigateToCardio: () => void;
  onNavigateToSettings: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  schedule,
  routineMenus,
  bodyParts,
  pastSessions,
  onStartSession,
  onNavigateToWorkout,
  hasActiveSession,
  onNavigateToCardio,
  onNavigateToSettings,
}) => {
  const [isSelectMenuOpen, setIsSelectMenuOpen] = React.useState(false);
  const today = new Date();
  const currentDayOfWeek = today.getDay() as DayOfWeek;
  const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];

  const todaySchedule = schedule.find(s => s.dayOfWeek === currentDayOfWeek);
  const todayMenu = todaySchedule?.menuId
    ? routineMenus.find(m => m.id === todaySchedule.menuId)
    : null;

  const getDaysAgo = (isoDate?: string): { days: number; text: string; percent: number } => {
    if (!isoDate) return { days: 99, text: '未記録', percent: 100 };
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    let text = `${days}日前`;
    if (days === 0) text = `今日 (${hours}時間前)`;
    
    const percent = Math.min(100, Math.round((diffMs / (4 * 24 * 60 * 60 * 1000)) * 100));
    return { days, text, percent };
  };

  return (
    <div className="pb-24 px-4 pt-4 max-w-lg mx-auto space-y-5 animate-in fade-in duration-150">
      {/* 実行中セッションバナー */}
      {hasActiveSession && (
        <div 
          onClick={onNavigateToWorkout}
          className="bg-brand-neon/15 border-2 border-brand-neon rounded-2xl p-3.5 flex items-center justify-between cursor-pointer active:scale-98 transition-all shadow-lg shadow-brand-neon/10"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-brand-neon animate-ping" />
            <div>
              <div className="text-xs font-bold text-brand-neon tracking-wide">ワークアウトが進行中</div>
              <div className="text-[11px] text-slate-300">タップして記録画面へ戻る</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-brand-neon" />
        </div>
      )}

      {/* 今日のメニューカード (Today's Workout) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-dark-850 to-dark-800 border-2 border-brand-accent/40 rounded-3xl p-5 shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-neon/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-dim text-brand-neon text-[11px] font-bold tracking-wide">
            <Sparkles className="w-3 h-3" />
            <span>{dayNames[currentDayOfWeek]}のメニュー</span>
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            {today.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
          </span>
        </div>

        {todayMenu ? (
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight mt-1 mb-1">
              {todayMenu.name}
            </h2>
            <p className="text-xs text-slate-300 font-medium mb-4">
              対象: {todayMenu.targetParts} ({todayMenu.exercises.length}種目)
            </p>

            <button
              type="button"
              onClick={() => onStartSession(todayMenu.id)}
              className="w-full py-3.5 px-4 rounded-2xl bg-brand-neon hover:bg-green-400 active:scale-98 text-dark-950 font-black text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-xl shadow-brand-neon/25"
            >
              <Play className="w-4 h-4 fill-dark-950 stroke-none" />
              <span>筋トレを開始</span>
            </button>

            {/* サブアクション */}
            <div className="mt-3 pt-3 border-t border-dark-750/60 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setIsSelectMenuOpen(true)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                メニューを変更
              </button>
              <button
                type="button"
                onClick={() => onStartSession()}
                className="text-slate-400 hover:text-brand-neon font-medium transition-colors"
              >
                フリー開始 →
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight mt-1 mb-1">
              本日はオフ（休養日）
            </h2>
            <p className="text-xs text-slate-400 font-medium mb-4">
              筋肉を休めるか、別メニューや有酸素運動を実施できます
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsSelectMenuOpen(true)}
                className="py-3 px-3 rounded-xl bg-dark-750 hover:bg-dark-700 active:scale-98 text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-1.5 border border-dark-600"
              >
                <span>メニューを選ぶ</span>
              </button>
              <button
                type="button"
                onClick={() => onStartSession()}
                className="py-3 px-3 rounded-xl bg-brand-neon/15 hover:bg-brand-neon/25 active:scale-98 text-brand-neon font-bold text-xs transition-all flex items-center justify-center gap-1.5 border border-brand-neon/30"
              >
                <span>フリー開始</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 有酸素運動クイック記録カード */}
      <div 
        onClick={onNavigateToCardio}
        className="bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer active:scale-98 transition-all hover:bg-amber-500/20"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-300">有酸素運動を記録する</div>
            <div className="text-[10px] text-slate-400">ランニング・サイクリング・ウォーキング（カロリー自動計算）</div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-amber-400" />
      </div>

      {/* 部位別リカバリー状況 */}
      <div className="bg-dark-850 border border-dark-800 rounded-3xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-brand-neon" />
            <h3 className="text-sm font-bold text-white tracking-tight">部位別リカバリー状況</h3>
          </div>
          <span className="text-[10px] text-slate-400">超回復目安</span>
        </div>

        <div className="space-y-2.5">
          {bodyParts.map((part) => {
            const recovery = getDaysAgo(part.lastTrainedAt);
            const isReady = recovery.days >= 3;

            return (
              <div key={part.id} className="p-2 rounded-xl bg-dark-900/60 border border-dark-800">
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="font-semibold text-white tracking-tight">{part.name}</span>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className={isReady ? 'text-brand-neon font-semibold' : 'text-slate-400'}>
                      {recovery.text}
                    </span>
                    {isReady && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-dim text-brand-neon font-bold">
                        回復完了
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full h-1.5 bg-dark-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isReady ? 'bg-brand-neon' : 'bg-slate-500'
                    }`}
                    style={{ width: `${recovery.percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 直近の筋トレ履歴 */}
      {pastSessions.length > 0 && (
        <div className="bg-dark-850 border border-dark-800 rounded-3xl p-4 shadow-lg">
          <h3 className="text-sm font-bold text-white tracking-tight mb-3 px-1">
            直近のワークアウト
          </h3>
          <div className="space-y-2">
            {pastSessions.slice(0, 3).map((s) => (
              <div key={s.id} className="p-3 rounded-2xl bg-dark-900/60 border border-dark-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white">{s.menuName || 'ワークアウト'}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(s.startedAt).toLocaleDateString('ja-JP')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-300">
                    {s.exercises.length} 種目
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {s.exercises.reduce((acc, ex) => acc + ex.sets.filter(st => st.isCompleted).length, 0)} セット完了
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* メニュー選択モーダル */}
      {isSelectMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-dark-850 w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-dark-700 shadow-2xl p-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-dark-750">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-brand-neon" />
                <h3 className="text-base font-bold text-white">メニューを選択して開始</h3>
              </div>
              <button
                onClick={() => setIsSelectMenuOpen(false)}
                className="p-1.5 rounded-full hover:bg-dark-750 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-2.5 flex-1 pr-1">
              {routineMenus.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  登録されたメニューがありません
                </div>
              ) : (
                routineMenus.map((menu) => (
                  <button
                    key={menu.id}
                    onClick={() => {
                      setIsSelectMenuOpen(false);
                      onStartSession(menu.id);
                    }}
                    className="w-full text-left p-3.5 rounded-2xl bg-dark-900 hover:bg-dark-750 border border-dark-800 hover:border-brand-neon/40 transition-all flex items-center justify-between group active:scale-98"
                  >
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-brand-neon transition-colors">
                        {menu.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {menu.targetParts} ({menu.exercises.length}種目)
                      </div>
                    </div>
                    <Play className="w-4 h-4 text-slate-500 group-hover:text-brand-neon group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-dark-750 flex items-center justify-between">
              <button
                onClick={() => {
                  setIsSelectMenuOpen(false);
                  onNavigateToSettings();
                }}
                className="text-xs text-slate-400 hover:text-brand-neon flex items-center gap-1.5 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>設定でメニューを編集</span>
              </button>
              <button
                onClick={() => {
                  setIsSelectMenuOpen(false);
                  onStartSession();
                }}
                className="text-xs text-brand-neon font-bold hover:underline"
              >
                フリー開始 →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
