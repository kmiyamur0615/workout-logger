import { useState, useEffect } from 'react';
import { Play, Dumbbell, Sparkles } from 'lucide-react';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { HomePage } from './pages/HomePage';
import { WorkoutPage } from './pages/WorkoutPage';
import { CardioPage } from './pages/CardioPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { StorageService } from './services/storage';
import { GasApiService } from './services/gasApi';
import { 
  WorkoutSession, 
  WorkoutExercise, 
  RoutineMenu, 
  WeekdaySchedule, 
  BodyPart, 
  Exercise, 
  AppSettings,
  CardioType,
  CardioLog
} from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);

  // マスタ & 履歴データ
  const [bodyParts, setBodyParts] = useState<BodyPart[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routineMenus, setRoutineMenus] = useState<RoutineMenu[]>([]);
  const [schedule, setSchedule] = useState<WeekdaySchedule[]>([]);
  const [pastSessions, setPastSessions] = useState<WorkoutSession[]>([]);
  const [cardioTypes, setCardioTypes] = useState<CardioType[]>([]);
  const [cardioLogs, setCardioLogs] = useState<CardioLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  const [isSyncing, setIsSyncing] = useState(false);

  // 初回データ読み込み
  useEffect(() => {
    // URLに ?weight=XX.X が付与されている場合は自動反映
    const syncedWeight = StorageService.checkUrlWeightParam();
    if (syncedWeight) {
      alert(`Appleヘルスケアから最新体重 (${syncedWeight} kg) を取得・反映しました！`);
    }

    setBodyParts(StorageService.getBodyParts());
    setExercises(StorageService.getExercises());
    setRoutineMenus(StorageService.getRoutineMenus());
    setSchedule(StorageService.getSchedule());
    setPastSessions(StorageService.getPastSessions());
    setCardioTypes(StorageService.getCardioTypes());
    setCardioLogs(StorageService.getCardioLogs());
    setActiveSession(StorageService.getActiveSession());
    setSettings(StorageService.getSettings());
  }, []);

  // ワークアウトの開始
  const handleStartSession = (menuId?: string) => {
    const selectedMenu = menuId ? routineMenus.find(m => m.id === menuId) : null;
    const nowIso = new Date().toISOString();

    let initialExercises: WorkoutExercise[] = [];
    if (selectedMenu) {
      initialExercises = selectedMenu.exercises.map((item, idx) => {
        const exMaster = exercises.find(e => e.id === item.exerciseId);
        return {
          id: `we-${Date.now()}-${idx}`,
          exerciseId: item.exerciseId,
          exerciseName: exMaster?.name || '種目',
          bodyPartId: exMaster?.bodyPartId || 'chest',
          orderIndex: idx + 1,
          sets: Array.from({ length: item.targetSets }).map((_, sIdx) => ({
            id: `s-${Date.now()}-${idx}-${sIdx}`,
            setNumber: sIdx + 1,
            weight: item.targetWeight || 0,
            reps: item.targetReps || 10,
            isAssisted: false,
            isCompleted: false,
          }))
        };
      });
    }

    const newSession: WorkoutSession = {
      id: `session-${Date.now()}`,
      startedAt: nowIso,
      menuId: selectedMenu?.id,
      menuName: selectedMenu ? selectedMenu.name : 'フリーワークアウト',
      exercises: initialExercises,
    };

    setActiveSession(newSession);
    StorageService.saveActiveSession(newSession);
    setCurrentTab('workout');
  };

  const handleUpdateSession = (updated: WorkoutSession) => {
    setActiveSession(updated);
    StorageService.saveActiveSession(updated);
  };

  const handleFinishSession = (_completed: WorkoutSession) => {
    setActiveSession(null);
    setPastSessions(StorageService.getPastSessions());
    setBodyParts(StorageService.getBodyParts());
    setCurrentTab('history');
  };

  // スプレッドシート同期
  const handleSyncGAS = async () => {
    if (!settings.gasWebAppUrl) {
      alert('「設定」タブからGAS Web App URLを入力してください。');
      setCurrentTab('settings');
      return;
    }

    setIsSyncing(true);
    try {
      const data = await GasApiService.fetchSpreadsheetData(settings.gasWebAppUrl);
      if (data) {
        if (data.exercises) {
          StorageService.saveExercises(data.exercises);
          setExercises(data.exercises);
        }
        if (data.schedule) {
          StorageService.saveSchedule(data.schedule);
          setSchedule(data.schedule);
        }
        alert('スプレッドシートとの同期が完了しました！');
      }
    } catch (e: any) {
      alert(`同期エラー: ${e.message || e}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // メニュー操作
  const handleSaveMenu = (menu: RoutineMenu) => {
    StorageService.saveOrUpdateMenu(menu);
    setRoutineMenus(StorageService.getRoutineMenus());
  };

  const handleDeleteMenu = (menuId: string) => {
    const updated = routineMenus.filter(m => m.id !== menuId);
    StorageService.saveRoutineMenus(updated);
    setRoutineMenus(updated);
  };

  const handleUpdateSchedule = (newSchedule: WeekdaySchedule[]) => {
    StorageService.saveSchedule(newSchedule);
    setSchedule(newSchedule);
  };

  const handleDeletePastSession = (sessionId: string) => {
    const updated = pastSessions.filter(s => s.id !== sessionId);
    StorageService.savePastSessions(updated);
    setPastSessions(updated);
  };

  // 有酸素運動操作
  const handleSaveCardioLog = (log: CardioLog) => {
    StorageService.addCardioLog(log);
    setCardioLogs(StorageService.getCardioLogs());
    setCurrentTab('history');
  };

  const handleDeleteCardioLog = (logId: string) => {
    StorageService.deleteCardioLog(logId);
    setCardioLogs(StorageService.getCardioLogs());
  };

  const handleAddCardioType = (type: CardioType) => {
    StorageService.addCardioType(type);
    setCardioTypes(StorageService.getCardioTypes());
  };

  const handleDeleteCardioType = (typeId: string) => {
    StorageService.deleteCardioType(typeId);
    setCardioTypes(StorageService.getCardioTypes());
  };

  return (
    <div className="min-h-screen bg-dark-900 text-slate-100 flex flex-col font-sans">
      <Header
        onOpenSettings={() => setCurrentTab('settings')}
        onSyncGAS={handleSyncGAS}
        isSyncing={isSyncing}
      />

      <main className="flex-1">
        {currentTab === 'home' && (
          <HomePage
            schedule={schedule}
            routineMenus={routineMenus}
            bodyParts={bodyParts}
            pastSessions={pastSessions}
            onStartSession={handleStartSession}
            onNavigateToWorkout={() => setCurrentTab('workout')}
            hasActiveSession={!!activeSession}
            onNavigateToCardio={() => setCurrentTab('cardio')}
            onNavigateToSettings={() => setCurrentTab('settings')}
          />
        )}

        {currentTab === 'workout' && (
          activeSession ? (
            <WorkoutPage
              session={activeSession}
              onUpdateSession={handleUpdateSession}
              onFinishSession={handleFinishSession}
              exercises={exercises}
              bodyParts={bodyParts}
            />
          ) : (
            <div className="pb-24 px-4 pt-4 max-w-lg mx-auto space-y-4 animate-in fade-in duration-150">
              <div className="text-center py-6 px-4 bg-dark-850 border border-dark-800 rounded-3xl">
                <div className="w-14 h-14 rounded-2xl bg-brand-neon/15 border border-brand-neon/30 mx-auto flex items-center justify-center mb-3">
                  <Dumbbell className="w-7 h-7 text-brand-neon" />
                </div>
                <h2 className="text-base font-bold text-white mb-1">
                  筋トレを開始する
                </h2>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
                  今日のメニューまたは登録ルーティンを選んでワークアウトを記録しましょう
                </p>
                <button
                  type="button"
                  onClick={() => handleStartSession()}
                  className="w-full py-3.5 rounded-2xl bg-brand-neon hover:bg-green-400 active:scale-98 text-dark-950 font-black text-sm shadow-lg shadow-brand-neon/20 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-dark-950 stroke-none" />
                  <span>フリーワークアウト開始</span>
                </button>
              </div>

              {/* 登録ルーティン一覧から開始 */}
              <div className="bg-dark-850 border border-dark-800 rounded-3xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-brand-neon" />
                    <h3 className="text-sm font-bold text-white">メニューから開始</h3>
                  </div>
                  <button
                    onClick={() => setCurrentTab('settings')}
                    className="text-[11px] text-slate-400 hover:text-brand-neon transition-colors"
                  >
                    メニュー作成・編集 →
                  </button>
                </div>

                <div className="space-y-2">
                  {routineMenus.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500">
                      メニューが登録されていません。「設定」から作成できます。
                    </div>
                  ) : (
                    routineMenus.map((menu) => (
                      <div
                        key={menu.id}
                        className="p-3.5 rounded-2xl bg-dark-900 border border-dark-800 flex items-center justify-between hover:border-brand-neon/30 transition-all"
                      >
                        <div>
                          <div className="text-sm font-bold text-white">{menu.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            対象: {menu.targetParts} ({menu.exercises.length}種目)
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartSession(menu.id)}
                          className="px-3.5 py-2 rounded-xl bg-brand-neon/15 hover:bg-brand-neon active:scale-95 text-brand-neon hover:text-dark-950 font-bold text-xs border border-brand-neon/30 hover:border-brand-neon transition-all flex items-center gap-1"
                        >
                          <Play className="w-3.5 h-3.5 fill-current stroke-none" />
                          <span>開始</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )
        )}

        {currentTab === 'cardio' && (
          <CardioPage
            cardioTypes={cardioTypes}
            cardioLogs={cardioLogs}
            userProfile={settings.profile}
            onSaveCardioLog={handleSaveCardioLog}
            onAddCardioType={handleAddCardioType}
            onDeleteCardioLog={handleDeleteCardioLog}
          />
        )}

        {currentTab === 'history' && (
          <HistoryPage
            sessions={pastSessions}
            cardioLogs={cardioLogs}
            onDeleteSession={handleDeletePastSession}
            onDeleteCardioLog={handleDeleteCardioLog}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsPage
            settings={settings}
            cardioTypes={cardioTypes}
            routineMenus={routineMenus}
            schedule={schedule}
            exercises={exercises}
            onSaveSettings={(s) => {
              StorageService.saveSettings(s);
              setSettings(s);
            }}
            onAddCardioType={handleAddCardioType}
            onDeleteCardioType={handleDeleteCardioType}
            onUpdateSchedule={handleUpdateSchedule}
            onSaveMenu={handleSaveMenu}
            onDeleteMenu={handleDeleteMenu}
            onSyncGAS={handleSyncGAS}
            isSyncing={isSyncing}
          />
        )}
      </main>

      <Navigation
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        hasActiveWorkout={!!activeSession}
      />
    </div>
  );
}
export default App;
