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

const CURRENT_DATA_VERSION = '20261018_v4';

export function normalizeSessionId(id?: string): string {
  if (!id) return '';
  const str = String(id).trim();
  const match1 = str.match(/^session-(\d{4})-?(\d{2})-?(\d{2})(.*)$/);
  if (match1) {
    return `session-${match1[1]}-${match1[2]}-${match1[3]}${match1[4] || ''}`;
  }
  const match2 = str.match(/^(\d{4})-?(\d{2})-?(\d{2})(.*)$/);
  if (match2) {
    return `session-${match2[1]}-${match2[2]}-${match2[3]}${match2[4] || ''}`;
  }
  return str;
}

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
  // データの自動マイグレーション（ユーザー設定や履歴を壊さずキーが未作成の場合のみ初期値を投入）
  initMigration(): void {
    try {
      const currentVer = localStorage.getItem(KEYS.DATA_VERSION);
      if (currentVer !== CURRENT_DATA_VERSION) {
        if (localStorage.getItem(KEYS.PAST_SESSIONS) === null) {
          setStored(KEYS.PAST_SESSIONS, INITIAL_PAST_SESSIONS);
        }
        if (localStorage.getItem(KEYS.BODY_PARTS) === null) {
          setStored(KEYS.BODY_PARTS, INITIAL_BODY_PARTS);
        }
        if (localStorage.getItem(KEYS.EXERCISES) === null) {
          setStored(KEYS.EXERCISES, INITIAL_EXERCISES);
        } else {
          // 過去の同期処理で標準種目が欠落していた場合に復元
          const existingEx = getStored<Exercise[]>(KEYS.EXERCISES, INITIAL_EXERCISES);
          const existingIds = new Set(existingEx.map(e => e.id));
          const existingNames = new Set(existingEx.map(e => e.name));
          const missingInitial = INITIAL_EXERCISES.filter(
            e => !existingIds.has(e.id) && !existingNames.has(e.name)
          );
          if (missingInitial.length > 0) {
            setStored(KEYS.EXERCISES, [...existingEx, ...missingInitial]);
          }
        }
        if (localStorage.getItem(KEYS.ROUTINE_MENUS) === null) {
          setStored(KEYS.ROUTINE_MENUS, INITIAL_ROUTINE_MENUS);
        }
        if (localStorage.getItem(KEYS.SCHEDULE) === null) {
          setStored(KEYS.SCHEDULE, INITIAL_SCHEDULE);
        }
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

  // 全ワークアウト履歴から部位別の最終トレーニング日時を再計算して保存
  recalculateBodyPartRecovery(sessionsInput?: WorkoutSession[]): BodyPart[] {
    const sessions = sessionsInput || this.getPastSessions();
    const exercises = this.getExercises();
    const exById = new Map<string, Exercise>();
    const exByName = new Map<string, Exercise>();
    [...INITIAL_EXERCISES, ...exercises].forEach(ex => {
      exById.set(ex.id, ex);
      exByName.set(ex.name.trim(), ex);
    });

    const latestByPart = new Map<string, string>();
    sessions.forEach(session => {
      const sessionDate = session.endedAt || session.startedAt;
      if (!sessionDate || !session.exercises) return;
      const sessionTime = new Date(sessionDate).getTime();
      if (isNaN(sessionTime)) return;

      session.exercises.forEach(ex => {
        if (!ex.sets || ex.sets.length === 0) return;
        let partId = ex.bodyPartId;
        if (!partId || partId === 'other') {
          const matched = exById.get(ex.exerciseId) || exByName.get((ex.exerciseName || '').trim());
          if (matched) partId = matched.bodyPartId;
        }
        if (!partId || partId === 'other') return;

        const prevIso = latestByPart.get(partId);
        if (!prevIso || sessionTime > new Date(prevIso).getTime()) {
          latestByPart.set(partId, sessionDate);
        }
      });
    });

    const updatedParts = this.getBodyParts().map(part => {
      const latestIso = latestByPart.get(part.id);
      if (latestIso) {
        return { ...part, lastTrainedAt: latestIso };
      }
      return part;
    });
    this.saveBodyParts(updatedParts);
    return updatedParts;
  },

  // 種目
  getExercises(): Exercise[] {
    this.initMigration();
    return getStored<Exercise[]>(KEYS.EXERCISES, INITIAL_EXERCISES);
  },
  saveExercises(data: Exercise[]): void {
    setStored(KEYS.EXERCISES, data);
  },
  addExercise(exercise: Exercise): void {
    const list = this.getExercises();
    this.saveExercises([...list, exercise]);
  },
  deleteExercise(exerciseId: string): void {
    const list = this.getExercises().filter(e => e.id !== exerciseId);
    this.saveExercises(list);
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
    // gasWebAppUrlが空、または旧デプロイURL（AKfycbxi...等）が残っている場合は最新デプロイURLに自動更新
    if (
      INITIAL_SETTINGS.gasWebAppUrl &&
      (!s.gasWebAppUrl ||
        !s.gasWebAppUrl.includes('AKfycbzp5ZJCHTRw3XvdSulCb7RgbXO3bdMm3jMbSMfO3n4BjlYNOBRU1mlyds2eRbD_Z4_5'))
    ) {
      s.gasWebAppUrl = INITIAL_SETTINGS.gasWebAppUrl;
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

  // 日付キー生成 (YYYY-MM-DD)
  getDateKey(dateOrIso?: Date | string): string {
    const d = dateOrIso ? new Date(dateOrIso) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  // ワークアウト履歴
  getPastSessions(): WorkoutSession[] {
    this.initMigration();
    const sessions = getStored<WorkoutSession[]>(KEYS.PAST_SESSIONS, INITIAL_PAST_SESSIONS);
    return sessions.map(s => ({
      ...s,
      id: normalizeSessionId(s.id)
    }));
  },
  savePastSessions(sessions: WorkoutSession[]): void {
    const normalized = sessions.map(s => ({
      ...s,
      id: normalizeSessionId(s.id)
    }));
    const seen = new Set<string>();
    const unique = normalized.filter(s => {
      if (!s.id || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
    setStored(KEYS.PAST_SESSIONS, unique);
  },
  updatePastSession(session: WorkoutSession): void {
    const normId = normalizeSessionId(session.id);
    const sessions = this.getPastSessions().map(s => 
      normalizeSessionId(s.id) === normId ? { ...session, id: normId } : s
    );
    this.savePastSessions(sessions);
  },
  addCompletedSession(session: WorkoutSession): void {
    this.saveTodaySession(session);
  },

  // 今日のワークアウトシートを取得（なければ空のシートを生成）
  getOrCreateTodaySession(): WorkoutSession {
    const todayKey = this.getDateKey();
    const targetSessionId = `session-${todayKey}`;
    const sessions = this.getPastSessions();

    // 旧バージョンの実行中セッションが残っていれば引き継ぐ
    const legacyActive = getStored<WorkoutSession | null>(KEYS.ACTIVE_SESSION, null);
    if (legacyActive && legacyActive.exercises.length > 0) {
      localStorage.removeItem(KEYS.ACTIVE_SESSION);
      this.saveTodaySession(legacyActive);
      return legacyActive;
    }

    const existingToday = sessions.find(s => 
      this.getDateKey(s.startedAt) === todayKey || normalizeSessionId(s.id) === targetSessionId
    );
    if (existingToday) {
      return {
        ...existingToday,
        id: normalizeSessionId(existingToday.id)
      };
    }

    return {
      id: targetSessionId,
      startedAt: new Date().toISOString(),
      menuName: '本日の筋トレ',
      exercises: [],
    };
  },

  // 今日のワークアウトを自動保存（種目が1つ以上あれば履歴に自動保存、0なら履歴から除去）
  saveTodaySession(session: WorkoutSession): void {
    const targetDateKey = this.getDateKey(session.startedAt);
    const normSessionId = normalizeSessionId(session.id);
    const sessions = this.getPastSessions();
    const otherSessions = sessions.filter(
      s => normalizeSessionId(s.id) !== normSessionId && this.getDateKey(s.startedAt) !== targetDateKey
    );

    if (session.exercises.length > 0) {
      const updatedSession: WorkoutSession = {
        ...session,
        id: normSessionId,
        endedAt: session.endedAt || new Date().toISOString(),
      };
      this.savePastSessions([updatedSession, ...otherSessions]);

      // 部位ごとの最終トレーニング日時を更新
      const trainedPartIds = new Set(session.exercises.map(e => e.bodyPartId));
      const nowIso = updatedSession.endedAt || updatedSession.startedAt;
      const parts = this.getBodyParts().map(part => {
        if (trainedPartIds.has(part.id)) {
          return { ...part, lastTrainedAt: nowIso };
        }
        return part;
      });
      this.saveBodyParts(parts);
    } else {
      this.savePastSessions(otherSessions);
    }
  },

  // 実行中セッション（後方互換）
  getActiveSession(): WorkoutSession | null {
    return this.getOrCreateTodaySession();
  },
  saveActiveSession(session: WorkoutSession | null): void {
    if (session) this.saveTodaySession(session);
  },
  clearActiveSession(): void {
    localStorage.removeItem(KEYS.ACTIVE_SESSION);
  },

  // 前回ログ（フロート表示用：今日の記録は除外して過去の実績を返す）
  getPreviousLogsForExercise(exerciseId: string): PreviousExerciseLog | null {
    const todayKey = this.getDateKey();
    const sessions = this.getPastSessions();
    const targetEx = this.getExercises().find(e => e.id === exerciseId) || INITIAL_EXERCISES.find(e => e.id === exerciseId);
    const targetName = targetEx?.name?.trim();

    for (const session of sessions) {
      if (this.getDateKey(session.startedAt) === todayKey) continue;
      const matchEx = session.exercises.find(
        e => e.exerciseId === exerciseId || (targetName && e.exerciseName?.trim() === targetName)
      );
      if (matchEx && matchEx.sets.length > 0) {
        const validSets = matchEx.sets.filter(s => s.isCompleted || s.reps > 0);
        if (validSets.length > 0) {
          return {
            date: session.endedAt || session.startedAt,
            sets: validSets.map(s => ({
              setNumber: s.setNumber,
              weight: s.weight,
              reps: s.reps,
            }))
          };
        }
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
  updateCardioLog(log: CardioLog): void {
    const logs = this.getCardioLogs().map(l => l.id === log.id ? log : l);
    this.saveCardioLogs(logs);
  },
  deleteCardioLog(logId: string): void {
    const logs = this.getCardioLogs().filter(l => l.id !== logId);
    this.saveCardioLogs(logs);
  }
};
