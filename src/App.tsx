import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { HomePage } from './pages/HomePage';
import { WorkoutPage } from './pages/WorkoutPage';
import { CardioPage } from './pages/CardioPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { StorageService, normalizeSessionId } from './services/storage';
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

  // スプレッドシート同期（silent=true の場合はアラートを出さずにバックグラウンド同期）
  const handleSyncGAS = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    const currentSettings = StorageService.getSettings();
    const gasUrl = currentSettings.gasWebAppUrl;

    if (!gasUrl) {
      if (!silent) {
        alert('「設定」タブからGAS Web App URLを入力してください。');
        setCurrentTab('settings');
      }
      return;
    }

    setIsSyncing(true);
    try {
      const data = await GasApiService.fetchSpreadsheetData(gasUrl);
      if (data) {
        // 1. 種目マスタの同期（標準種目・ローカル追加種目を欠落させずにマージ）
        const currentLocalExercises = StorageService.getExercises();
        let mergedExercises = currentLocalExercises;
        if (Array.isArray(data.exercises) && data.exercises.length > 0) {
          const remoteIds = new Set(data.exercises.map((e: Exercise) => e.id));
          const remoteNames = new Set(data.exercises.map((e: Exercise) => e.name.trim()));
          const localMissingFromRemote = currentLocalExercises.filter(
            e => !remoteIds.has(e.id) && !remoteNames.has(e.name.trim())
          );
          mergedExercises = [...data.exercises, ...localMissingFromRemote];
          StorageService.saveExercises(mergedExercises);
          setExercises(mergedExercises);
        }

        const exById = new Map<string, Exercise>();
        const exByName = new Map<string, Exercise>();
        mergedExercises.forEach(ex => {
          exById.set(ex.id, ex);
          exByName.set(ex.name.trim(), ex);
        });

        // 2. メニューテンプレートの同期（種目が登録されているメニューを優先して保護）
        const remoteMenus: RoutineMenu[] = Array.isArray(data.routineMenus) ? data.routineMenus : [];
        const localMenus = StorageService.getRoutineMenus();
        let mergedMenus = localMenus;
        let shouldUploadMenus = false;

        if (remoteMenus.length > 0) {
          const initialDefaultMenuIds = new Set(['menu-chest-arms', 'menu-back', 'menu-legs-lower']);
          const menuMap = new Map<string, RoutineMenu>();
          remoteMenus.forEach(rm => menuMap.set(rm.id, rm));
          localMenus.forEach(lm => {
            const existing = menuMap.get(lm.id);
            if (!existing) {
              // リモートで既に削除・置き換え済みの初期デフォルトメニュー（menu-back等）は復活させない
              if (!initialDefaultMenuIds.has(lm.id)) {
                menuMap.set(lm.id, lm);
                shouldUploadMenus = true;
              }
            } else if ((!existing.exercises || existing.exercises.length === 0) && lm.exercises && lm.exercises.length > 0) {
              // リモート側が空でローカル側に種目がある場合はローカル側を優先
              menuMap.set(lm.id, lm);
              shouldUploadMenus = true;
            }
          });
          mergedMenus = Array.from(menuMap.values()).sort(
            (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
          );
          StorageService.saveRoutineMenus(mergedMenus);
          setRoutineMenus(mergedMenus);
        } else if (localMenus.length > 0) {
          shouldUploadMenus = true;
        }

        // 3. 曜日別デフォルトスケジュールの同期
        const remoteSchedule: WeekdaySchedule[] = Array.isArray(data.schedule) ? data.schedule : [];
        const localSchedule = StorageService.getSchedule();
        const hasRemoteSchedule = remoteSchedule.some(s => s.menuId);
        const hasLocalSchedule = localSchedule.some(s => s.menuId);
        let shouldUploadSchedule = false;

        if (hasRemoteSchedule) {
          StorageService.saveSchedule(remoteSchedule);
          setSchedule(remoteSchedule);
        } else if (hasLocalSchedule) {
          shouldUploadSchedule = true;
        }

        // 4. 筋トレ履歴 (pastSessions) の双方向同期（session_idを正規化して突合）
        const enrichSessionExercises = (s: WorkoutSession): WorkoutSession => ({
          ...s,
          id: normalizeSessionId(s.id),
          exercises: (s.exercises || []).map(ex => {
            const matched = exById.get(ex.exerciseId) || exByName.get((ex.exerciseName || '').trim());
            return {
              ...ex,
              exerciseId: matched ? matched.id : ex.exerciseId,
              bodyPartId: (!ex.bodyPartId || ex.bodyPartId === 'other') && matched ? matched.bodyPartId : ex.bodyPartId,
            };
          }),
        });

        const remoteSessions: WorkoutSession[] = (data.pastSessions || []).map(enrichSessionExercises);
        const normLocalSessions = StorageService.getPastSessions().map(enrichSessionExercises);

        const remoteSessionMap = new Map<string, WorkoutSession>();
        remoteSessions.forEach(s => {
          if (s.id) remoteSessionMap.set(s.id, s);
        });

        // リモートにまだ存在しないローカルセッションのみ抽出
        const localOnlySessions = normLocalSessions.filter(
          s => s.id && !remoteSessionMap.has(s.id) && s.exercises && s.exercises.length > 0
        );

        // リモートとローカルをマージ（セット数・種目数の多い方を優先）
        const mergedSessionsMap = new Map<string, WorkoutSession>();
        remoteSessions.forEach(s => {
          if (s.id) mergedSessionsMap.set(s.id, s);
        });
        normLocalSessions.forEach(s => {
          if (!s.id) return;
          const existing = mergedSessionsMap.get(s.id);
          if (!existing) {
            mergedSessionsMap.set(s.id, s);
          } else {
            const existingSetCount = (existing.exercises || []).reduce((sum, ex) => sum + (ex.sets ? ex.sets.length : 0), 0);
            const localSetCount = (s.exercises || []).reduce((sum, ex) => sum + (ex.sets ? ex.sets.length : 0), 0);
            if (localSetCount > existingSetCount) {
              mergedSessionsMap.set(s.id, s);
            }
          }
        });

        const mergedSessions = Array.from(mergedSessionsMap.values())
          .filter(s => s.id && s.exercises && s.exercises.length > 0)
          .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

        // 即座にローカルストレージと画面Stateへ反映（POST通信を待たない）
        StorageService.savePastSessions(mergedSessions);
        setPastSessions(mergedSessions);
        const updatedBodyParts = StorageService.recalculateBodyPartRecovery(mergedSessions);
        setBodyParts(updatedBodyParts);
        setActiveSession(StorageService.getOrCreateTodaySession());

        // 5. 有酸素運動履歴 (cardioLogs) の双方向同期
        const remoteCardio: CardioLog[] = Array.isArray(data.cardioLogs) ? data.cardioLogs : [];
        const currentLocalCardio = StorageService.getCardioLogs();
        const remoteCardioIds = new Set(remoteCardio.map(c => c.id));
        const localOnlyCardio = currentLocalCardio.filter(c => !remoteCardioIds.has(c.id));

        const mergedCardioMap = new Map<string, CardioLog>();
        remoteCardio.forEach(c => {
          if (c.id) mergedCardioMap.set(c.id, c);
        });
        currentLocalCardio.forEach(c => {
          if (c.id && !mergedCardioMap.has(c.id)) {
            mergedCardioMap.set(c.id, c);
          }
        });
        const mergedCardio = Array.from(mergedCardioMap.values())
          .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());

        StorageService.saveCardioLogs(mergedCardio);
        setCardioLogs(mergedCardio);

        // 6. ローカル未同期データの並列送信（ローカル保存完了後に実行し、alertで通信がブロックされる前に完了させる）
        const uploadPromises: Promise<any>[] = [];
        if (shouldUploadMenus) {
          uploadPromises.push(
            GasApiService.syncMenus(gasUrl, mergedMenus).catch(e =>
              console.error('メニューのGAS同期失敗:', e)
            )
          );
        }
        if (shouldUploadSchedule) {
          uploadPromises.push(
            GasApiService.syncSchedule(gasUrl, localSchedule).catch(e =>
              console.error('スケジュールのGAS同期失敗:', e)
            )
          );
        }
        for (const localSession of localOnlySessions) {
          uploadPromises.push(
            GasApiService.syncWorkoutSession(gasUrl, localSession).catch(e =>
              console.error('ローカルセッションのGAS同期失敗:', e)
            )
          );
        }
        for (const localC of localOnlyCardio) {
          uploadPromises.push(
            GasApiService.syncCardioLog(gasUrl, localC).catch(e =>
              console.error('ローカル有酸素ログのGAS同期失敗:', e)
            )
          );
        }

        if (uploadPromises.length > 0) {
          await Promise.allSettled(uploadPromises);
        }

        if (!silent) {
          alert(
            `スプレッドシートとの同期が完了しました！\n・筋トレ履歴: ${mergedSessions.length}件\n・有酸素ログ: ${mergedCardio.length}件\n・メニュー: ${mergedMenus.length}件`
          );
        }
      }
    } catch (e: any) {
      if (!silent) {
        alert(`同期エラー: ${e.message || e}`);
      } else {
        console.warn('バックグラウンド自動同期エラー:', e);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // 初回データ読み込み ＆ 自動同期
  useEffect(() => {
    // URLに ?weight=XX.X が付与されている場合は自動反映
    const syncedWeight = StorageService.checkUrlWeightParam();
    if (syncedWeight) {
      alert(`Appleヘルスケアから最新体重 (${syncedWeight} kg) を取得・反映しました！`);
    }

    const initialSessions = StorageService.getPastSessions();
    setExercises(StorageService.getExercises());
    setRoutineMenus(StorageService.getRoutineMenus());
    setSchedule(StorageService.getSchedule());
    setPastSessions(initialSessions);
    setBodyParts(StorageService.recalculateBodyPartRecovery(initialSessions));
    setCardioTypes(StorageService.getCardioTypes());
    setCardioLogs(StorageService.getCardioLogs());
    setActiveSession(StorageService.getOrCreateTodaySession());
    const currentSettings = StorageService.getSettings();
    setSettings(currentSettings);

    // 起動時に自動でスプレッドシートから最新データを同期
    if (currentSettings.gasWebAppUrl) {
      handleSyncGAS({ silent: true });
    }

    // iPhone PWAをホーム画面から再度開いた（フォアグラウンド復帰）際にも自動同期
    let lastAutoSync = Date.now();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastAutoSync > 15000) {
        lastAutoSync = Date.now();
        const latestSettings = StorageService.getSettings();
        if (latestSettings.gasWebAppUrl) {
          handleSyncGAS({ silent: true });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
              isCompleted: true,
              completedAt: new Date().toISOString(),
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

  // 外部連携・記録完了時
  const handleFinishSession = (synced: WorkoutSession) => {
    handleUpdateSession(synced);
    setCurrentTab('history');
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
    const updated = StorageService.getRoutineMenus();
    setRoutineMenus(updated);
    if (settings.gasWebAppUrl) {
      GasApiService.syncMenus(settings.gasWebAppUrl, updated).catch(err =>
        console.error('GASへのメニュー同期に失敗:', err)
      );
    }
  };

  const handleDeleteMenu = (menuId: string) => {
    const updated = routineMenus.filter(m => m.id !== menuId);
    StorageService.saveRoutineMenus(updated);
    setRoutineMenus(updated);
    if (settings.gasWebAppUrl) {
      GasApiService.syncMenus(settings.gasWebAppUrl, updated).catch(err =>
        console.error('GASへのメニュー削除同期に失敗:', err)
      );
    }
  };

  const handleUpdateSchedule = (newSchedule: WeekdaySchedule[]) => {
    StorageService.saveSchedule(newSchedule);
    setSchedule(newSchedule);
    if (settings.gasWebAppUrl) {
      GasApiService.syncSchedule(settings.gasWebAppUrl, newSchedule).catch(err =>
        console.error('GASへのスケジュール同期に失敗:', err)
      );
    }
  };

  const handleDeletePastSession = (sessionId: string) => {
    const updated = pastSessions.filter(s => s.id !== sessionId);
    StorageService.savePastSessions(updated);
    setPastSessions(updated);
    setActiveSession(StorageService.getOrCreateTodaySession());
  };

  const handleUpdatePastSession = (session: WorkoutSession) => {
    StorageService.updatePastSession(session);
    const updatedSessions = StorageService.getPastSessions();
    setPastSessions(updatedSessions);
    setBodyParts(StorageService.recalculateBodyPartRecovery(updatedSessions));
    setActiveSession(StorageService.getOrCreateTodaySession());
    const gasUrl = StorageService.getSettings().gasWebAppUrl;
    if (gasUrl) {
      GasApiService.syncWorkoutSession(gasUrl, session).catch(err =>
        console.error('GASへのセッション編集同期に失敗:', err)
      );
    }
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
    const gasUrl = StorageService.getSettings().gasWebAppUrl;
    if (gasUrl) {
      GasApiService.syncCardioLog(gasUrl, log).catch(err =>
        console.error('GASへの有酸素編集同期に失敗:', err)
      );
    }
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
            cardioLogs={cardioLogs}
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
