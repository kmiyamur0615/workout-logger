import { 
  BodyPart, 
  Exercise, 
  RoutineMenu, 
  WeekdaySchedule, 
  AppSettings, 
  WorkoutSession, 
  PreviousExerciseLog,
  CardioType,
  CardioLog,
  UserProfile
} from '../types';
import { 
  INITIAL_BODY_PARTS, 
  INITIAL_EXERCISES, 
  INITIAL_ROUTINE_MENUS, 
  INITIAL_SCHEDULE, 
  INITIAL_SETTINGS, 
  INITIAL_PAST_SESSIONS,
  INITIAL_CARDIO_TYPES,
  INITIAL_CARDIO_LOGS
} from '../mock/initialData';

const KEYS = {
  BODY_PARTS: 'wl_body_parts',
  EXERCISES: 'wl_exercises',
  ROUTINE_MENUS: 'wl_routine_menus',
  SCHEDULE: 'wl_schedule',
  SETTINGS: 'wl_settings',
  PAST_SESSIONS: 'wl_past_sessions',
  ACTIVE_SESSION: 'wl_active_session',
  CARDIO_TYPES: 'wl_cardio_types',
  CARDIO_LOGS: 'wl_cardio_logs',
  DATA_VERSION: 'wl_data_version',
};

const CURRENT_DATA_VERSION = '20261012_v2';

function getStored<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item);
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e);
  }
}

export const StorageService = {
  // データの自動マイグレーション（過去スクショデータの初回反映等）
  initMigration(): void {
    try {
      const currentVer = localStorage.getItem(KEYS.DATA_VERSION);
      if (currentVer !== CURRENT_DATA_VERSION) {
        // 過去セッションを実データで更新
        setStored(KEYS.PAST_SESSIONS, INITIAL_PAST_SESSIONS);
        setStored(KEYS.BODY_PARTS, INITIAL_BODY_PARTS);
        setStored(KEYS.EXERCISES, INITIAL_EXERCISES);
        setStored(KEYS.ROUTINE_MENUS, INITIAL_ROUTINE_MENUS);
        setStored(KEYS.SCHEDULE, INITIAL_SCHEDULE);
        localStorage.setItem(KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
      }
    } catch (e) {
      console.error('Data migration error:', e);
    }
  },

  // 部位
  getBodyParts(): BodyPart[] {
    this.initMigration();
    return getStored<BodyPart[]>(KEYS.BODY_PARTS, INITIAL_BODY_PARTS);
  },
  saveBodyParts(data: BodyPart[]): void {
    setStored(KEYS.BODY_PARTS, data);
  },

  // 種目
  getExercises(): Exercise[] {
    return getStored<Exercise[]>(KEYS.EXERCISES, INITIAL_EXERCISES);
  },
  saveExercises(data: Exercise[]): void {
    setStored(KEYS.EXERCISES, data);
  },
  addExercise(exercise: Exercise): void {
    const list = this.getExercises();
    this.saveExercises([...list, exercise]);
  },

  // ルーティンメニュー
  getRoutineMenus(): RoutineMenu[] {
    return getStored<RoutineMenu[]>(KEYS.ROUTINE_MENUS, INITIAL_ROUTINE_MENUS);
  },
  saveRoutineMenus(data: RoutineMenu[]): void {
    setStored(KEYS.ROUTINE_MENUS, data);
  },
  saveOrUpdateMenu(menu: RoutineMenu): void {
    const menus = this.getRoutineMenus();
    const index = menus.findIndex(m => m.id === menu.id);
    if (index >= 0) {
      menus[index] = menu;
      this.saveRoutineMenus(menus);
    } else {
      this.saveRoutineMenus([...menus, menu]);
    }
  },

  // 曜日スケジュール
  getSchedule(): WeekdaySchedule[] {
    return getStored<WeekdaySchedule[]>(KEYS.SCHEDULE, INITIAL_SCHEDULE);
  },
  saveSchedule(data: WeekdaySchedule[]): void {
    setStored(KEYS.SCHEDULE, data);
  },

  // 設定
  getSettings(): AppSettings {
    const s = getStored<AppSettings>(KEYS.SETTINGS, INITIAL_SETTINGS);
    let changed = false;
    // profileフィールドが存在しない場合のマイグレーション
    if (!s.profile) {
      s.profile = INITIAL_SETTINGS.profile;
      changed = true;
    }
    // cardioShortcutsフィールドが存在しない場合のマイグレーション
    if (!s.cardioShortcuts) {
      s.cardioShortcuts = INITIAL_SETTINGS.cardioShortcuts;
      changed = true;
    }
    if (changed) {
      this.saveSettings(s);
    }
    return s;
  },
  saveSettings(data: AppSettings): void {
    setStored(KEYS.SETTINGS, data);
  },
  saveUserProfile(profile: UserProfile): void {
    const settings = this.getSettings();
    settings.profile = profile;
    this.saveSettings(settings);
  },

  // URLクエリパラメータから体重を取得・反映 (iOSショートカット連携用)
  checkUrlWeightParam(): number | null {
    try {
      const params = new URLSearchParams(window.location.search);
      const weightStr = params.get('weight');
      if (weightStr) {
        const weight = parseFloat(weightStr);
        if (!isNaN(weight) && weight > 20 && weight < 300) {
          const settings = this.getSettings();
          settings.profile.weightKg = Math.round(weight * 10) / 10;
          settings.profile.weightUpdatedAt = new Date().toISOString();
          this.saveSettings(settings);

          // URLからクエリパラメータを除去（画面リロード時の再取得防止）
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
          return settings.profile.weightKg;
        }
      }
    } catch (e) {
      console.error('URLパラメータの解析に失敗しました:', e);
    }
    return null;
  },

  // ワークアウト履歴
  getPastSessions(): WorkoutSession[] {
    this.initMigration();
    return getStored<WorkoutSession[]>(KEYS.PAST_SESSIONS, INITIAL_PAST_SESSIONS);
  },
  savePastSessions(sessions: WorkoutSession[]): void {
    setStored(KEYS.PAST_SESSIONS, sessions);
  },
  addCompletedSession(session: WorkoutSession): void {
    const sessions = this.getPastSessions();
    this.savePastSessions([session, ...sessions]);

    // 部位ごとの最終トレーニング日時を更新
    const trainedPartIds = new Set(session.exercises.map(e => e.bodyPartId));
    const nowIso = session.endedAt || session.startedAt;
    const parts = this.getBodyParts().map(part => {
      if (trainedPartIds.has(part.id)) {
        return { ...part, lastTrainedAt: nowIso };
      }
      return part;
    });
    this.saveBodyParts(parts);
  },

  // 実行中セッション
  getActiveSession(): WorkoutSession | null {
    return getStored<WorkoutSession | null>(KEYS.ACTIVE_SESSION, null);
  },
  saveActiveSession(session: WorkoutSession | null): void {
    setStored(KEYS.ACTIVE_SESSION, session);
  },
  clearActiveSession(): void {
    localStorage.removeItem(KEYS.ACTIVE_SESSION);
  },

  // 前回ログ（フロート表示用）
  getPreviousLogsForExercise(exerciseId: string): PreviousExerciseLog | null {
    const sessions = this.getPastSessions();
    for (const session of sessions) {
      const matchEx = session.exercises.find(e => e.exerciseId === exerciseId);
      if (matchEx && matchEx.sets.length > 0) {
        return {
          date: session.endedAt || session.startedAt,
          sets: matchEx.sets
            .filter(s => s.isCompleted || s.reps > 0)
            .map(s => ({
              setNumber: s.setNumber,
              weight: s.weight,
              reps: s.reps,
            }))
        };
      }
    }
    return null;
  },

  // 有酸素運動の種別マスタ
  getCardioTypes(): CardioType[] {
    return getStored<CardioType[]>(KEYS.CARDIO_TYPES, INITIAL_CARDIO_TYPES);
  },
  saveCardioTypes(data: CardioType[]): void {
    setStored(KEYS.CARDIO_TYPES, data);
  },
  addCardioType(type: CardioType): void {
    const types = this.getCardioTypes();
    this.saveCardioTypes([...types, type]);
  },
  deleteCardioType(typeId: string): void {
    const types = this.getCardioTypes().filter(t => t.id !== typeId);
    this.saveCardioTypes(types);
  },

  // 有酸素運動のログ履歴
  getCardioLogs(): CardioLog[] {
    return getStored<CardioLog[]>(KEYS.CARDIO_LOGS, INITIAL_CARDIO_LOGS);
  },
  saveCardioLogs(logs: CardioLog[]): void {
    setStored(KEYS.CARDIO_LOGS, logs);
  },
  addCardioLog(log: CardioLog): void {
    const logs = this.getCardioLogs();
    this.saveCardioLogs([log, ...logs]);
  },
  deleteCardioLog(logId: string): void {
    const logs = this.getCardioLogs().filter(l => l.id !== logId);
    this.saveCardioLogs(logs);
  }
};
