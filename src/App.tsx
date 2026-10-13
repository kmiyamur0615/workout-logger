import { useState, useEffect } from 'react';
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
  const [activeSession, setActiveSession] = useState<WorkoutSession>(() =>
    StorageService.getOrCreateTodaySession()
  );

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
    setActiveSession(StorageService.getOrCreateTodaySession());
    setSettings(StorageService.getSettings());
  }, []);

  // ルーティンメニューを今日のシートに読み込む / 筋トレタブへ遷移
  const handleStartSession = (menuId?: string) => {
    if (menuId) {
      handleLoadMenuIntoToday(menuId);
    }
    setCurrentTab('workout');
  };

  // 指定したメニューの種目を本日のワークアウトシートへ追加（すでに存在する種目は重複追加しない）
  const handleLoadMenuIntoToday = (menuId: string) => {
    const selectedMenu = routineMenus.find(m => m.id === menuId);
    if (!selectedMenu) return;

    const currentSession = StorageService.getOrCreateTodaySession();
    const existingExerciseIds = new Set(currentSession.exercises.map(e => e.exerciseId));

    const addedExercises: WorkoutExercise[] = selectedMenu.exercises
      .filter(item => !existingExerciseIds.has(item.exerciseId))
      .map((item, idx) => {
        const exMaster = exercises.find(e => e.id === item.exerciseId);
        const prevLog = StorageService.getPreviousLogsForExercise(item.exerciseId);
        return {
          id: `we-${Date.now()}-${idx}`,
          exerciseId: item.exerciseId,
          exerciseName: exMaster?.name || '種目',
          bodyPartId: exMaster?.bodyPartId || 'chest',
          orderIndex: currentSession.exercises.length + idx + 1,
          sets: Array.from({ length: item.targetSets }).map((_, sIdx) => {
            const prevSet = prevLog?.sets?.[sIdx] || prevLog?.sets?.[0];
            return {
              id: `s-${Date.now()}-${idx}-${sIdx}`,
              setNumber: sIdx + 1,
              weight: prevSet ? prevSet.weight : (item.targetWeight || 0),
              reps: prevSet ? prevSet.reps : (item.targetReps || 10),
              isAssisted: false,
              isCompleted: false,
            };
          })
        };
      });

    const updatedSession: WorkoutSession = {
      ...currentSession,
      menuId: selectedMenu.id,
      menuName: selectedMenu.name,
      exercises: [...currentSession.exercises, ...addedExercises],
    };

    handleUpdateSession(updatedSession);
  };

  // 本日のシート更新（リアルタイム自動保存）
  const handleUpdateSession = (updated: WorkoutSession) => {
    setActiveSession(updated);
    StorageService.saveTodaySession(updated);
    setPastSessions(StorageService.getPastSessions());
    setBodyParts(StorageService.getBodyParts());
  };

  // 外部連携完了時
  const handleFinishSession = (synced: WorkoutSession) => {
    handleUpdateSession(synced);
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
          // ローカルで追加したカスタム種目が消えないようにマージ
          const remoteIds = new Set(data.exercises.map((e: Exercise) => e.id));
          const remoteNames = new Set(data.exercises.map((e: Exercise) => e.name));
          const localCustom = exercises.filter(
            e => e.isCustom && !remoteIds.has(e.id) && !remoteNames.has(e.name)
          );
          const mergedExercises = [...data.exercises, ...localCustom];
          StorageService.saveExercises(mergedExercises);
          setExercises(mergedExercises);
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

  // 種目マスタ操作
  const handleAddExercise = (exercise: Exercise) => {
    StorageService.addExercise(exercise);
    setExercises(StorageService.getExercises());
    if (settings.gasWebAppUrl) {
      GasApiService.syncNewExercise(settings.gasWebAppUrl, exercise).catch(err =>
        console.error('GASへの種目追加同期に失敗:', err)
      );
    }
  };

  const handleDeleteExerciseMaster = (exerciseId: string) => {
    StorageService.deleteExercise(exerciseId);
    setExercises(StorageService.getExercises());
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
    setActiveSession(StorageService.getOrCreateTodaySession());
  };

  const handleUpdatePastSession = (session: WorkoutSession) => {
    StorageService.updatePastSession(session);
    setPastSessions(StorageService.getPastSessions());
    setActiveSession(StorageService.getOrCreateTodaySession());
  };

  // 有酸素運動操作
  const handleSaveCardioLog = (log: CardioLog) => {
    StorageService.addCardioLog(log);
    setCardioLogs(StorageService.getCardioLogs());
    setCurrentTab('history');
  };

  const handleUpdateCardioLog = (log: CardioLog) => {
    StorageService.updateCardioLog(log);
    setCardioLogs(StorageService.getCardioLogs());
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

  const hasTodayExercises = activeSession.exercises.length > 0;

  return (
    <div className="min-h-screen bg-dark-900 text-slate-100 flex flex-col font-sans">
      <Header
        onSyncGAS={handleSyncGAS}
        isSyncing={isSyncing}
        activeSessionName={hasTodayExercises ? `${activeSession.exercises.length}種目 記録済み` : undefined}
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
            hasActiveSession={hasTodayExercises}
            onNavigateToCardio={() => setCurrentTab('cardio')}
            onNavigateToSettings={() => setCurrentTab('settings')}
          />
        )}

        {currentTab === 'workout' && (
          <WorkoutPage
            session={activeSession}
            onUpdateSession={handleUpdateSession}
            onFinishSession={handleFinishSession}
            exercises={exercises}
            bodyParts={bodyParts}
            routineMenus={routineMenus}
            onLoadMenu={handleLoadMenuIntoToday}
            onCreateExercise={handleAddExercise}
          />
        )}

        {currentTab === 'cardio' && (
          <CardioPage
            cardioTypes={cardioTypes}
            cardioLogs={cardioLogs}
            userProfile={settings.profile}
            settings={settings}
            cardioShortcutName={settings.cardioShortcutName || 'CardioLoggerSync'}
            onSaveCardioLog={handleSaveCardioLog}
            onAddCardioType={handleAddCardioType}
            onDeleteCardioLog={handleDeleteCardioLog}
          />
        )}

        {currentTab === 'history' && (
          <HistoryPage
            sessions={pastSessions}
            cardioLogs={cardioLogs}
            cardioTypes={cardioTypes}
            userProfile={settings.profile}
            onDeleteSession={handleDeletePastSession}
            onUpdateSession={handleUpdatePastSession}
            onDeleteCardioLog={handleDeleteCardioLog}
            onUpdateCardioLog={handleUpdateCardioLog}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsPage
            settings={settings}
            cardioTypes={cardioTypes}
            routineMenus={routineMenus}
            schedule={schedule}
            exercises={exercises}
            bodyParts={bodyParts}
            onSaveSettings={(s) => {
              StorageService.saveSettings(s);
              setSettings(s);
            }}
            onAddExercise={handleAddExercise}
            onDeleteExercise={handleDeleteExerciseMaster}
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
        hasActiveWorkout={hasTodayExercises}
        hapticsEnabled={settings.hapticsEnabled}
      />
    </div>
  );
}
export default App;
