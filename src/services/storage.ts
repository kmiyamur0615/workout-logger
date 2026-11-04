import { 
  BodyPart, 
  Exercise, 
  RoutineMenu, 
  WeekdaySchedule, 
  AppSettings, 
  WorkoutSession, 
  PreviousExerciseLog,
  ExerciseMaxRecord,
  CardioType,
  CardioLog,
  UserProfile,
  BodyMetricLog
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
  USER_PROFILE: 'wl_user_profile',
  BODY_METRICS: 'wl_body_metrics',
  DATA_VERSION: 'wl_data_version',
};

const CURRENT_DATA_VERSION = '20261018_v4';

// 重量(kg)と回数から推定1RMを計算 (O'Conner式: weight * (1 + reps / 40), 1回時はweightそのまま)
export function calculate1RM(weight: number, reps: number): number {
  if (!weight || weight <= 0 || !reps || reps <= 0) return 0;
  if (reps === 1) return Math.round(weight * 10) / 10;
  return Math.round(weight * (1 + reps / 40) * 10) / 10;
}

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
    const s = getStored<AppSettings>(KEYS.SETTINGS, {
      ...INITIAL_SETTINGS,
      profile: { ...INITIAL_SETTINGS.profile },
    });
    const backupProfile = getStored<UserProfile | null>(KEYS.USER_PROFILE, null);
    let changed = false;

    // profileフィールドが存在しない場合、またはバックアップ側に更新済みデータがある場合の復元
    if (!s.profile || !s.profile.heightCm || !s.profile.weightKg) {
      s.profile = backupProfile && backupProfile.heightCm > 0 && backupProfile.weightKg > 0
        ? { ...backupProfile }
        : { ...INITIAL_SETTINGS.profile };
      changed = true;
    } else if (backupProfile && backupProfile.heightCm > 0 && backupProfile.weightKg > 0) {
      const sIsDefault =
        !s.profile.weightUpdatedAt &&
        s.profile.heightCm === INITIAL_SETTINGS.profile.heightCm &&
        s.profile.weightKg === INITIAL_SETTINGS.profile.weightKg;
      const backupTime = backupProfile.weightUpdatedAt ? new Date(backupProfile.weightUpdatedAt).getTime() : 0;
      const sTime = s.profile.weightUpdatedAt ? new Date(s.profile.weightUpdatedAt).getTime() : 0;
      if (sIsDefault || backupTime > sTime) {
        s.profile = { ...backupProfile };
        changed = true;
      }
    }

    // cardioShortcutsフィールドが存在しない場合のマイグレーション
    if (!s.cardioShortcuts) {
      s.cardioShortcuts = { ...INITIAL_SETTINGS.cardioShortcuts! };
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
    if (data.profile && data.profile.heightCm > 0 && data.profile.weightKg > 0) {
      setStored(KEYS.USER_PROFILE, data.profile);
    }
  },
  saveUserProfile(profile: UserProfile): void {
    const settings = this.getSettings();
    settings.profile = { ...profile };
    this.saveSettings(settings);
  },

  // 日付文字列を YYYY-MM-DD に正規化 (iOSショートカットの多様な日付フォーマットに対応)
  parseFlexibleDateKey(raw?: string | null): string | null {
    if (!raw) return null;
    const str = String(raw).trim();
    if (!str) return null;

    // 1. YYYY-MM-DD / YYYY/MM/DD / YYYY年M月D日
    const m1 = str.match(/(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
    if (m1) {
      const y = Number(m1[1]);
      const m = Number(m1[2]);
      const d = Number(m1[3]);
      if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }

    // 2. Dateオブジェクトとしてパース試行
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      if (y >= 2000 && y <= 2100) {
        return this.getDateKey(parsed);
      }
    }
    return null;
  },

  // 体重・筋肉量(除脂肪体重)の数値パース (kg / lb 対応)
  parseMassKgValue(raw?: string | null): number | undefined {
    if (!raw) return undefined;
    const trimmed = String(raw).trim();
    if (!trimmed) return undefined;
    const isPounds = /\b(lbs?|pounds?)\b/i.test(trimmed) || /\d\s*(lbs?|pounds?)$/i.test(trimmed);
    const numMatch = trimmed.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    if (!numMatch) return undefined;
    const rawNum = parseFloat(numMatch[0]);
    if (isNaN(rawNum)) return undefined;
    const kg = isPounds ? rawNum * 0.45359237 : rawNum;
    const rounded = Math.round(kg * 10) / 10;
    if (rounded >= 15 && rounded <= 300) {
      return rounded;
    }
    return undefined;
  },

  // 体脂肪率(%)の数値パース ("15.4 %", "15.4", または小数 "0.154" に対応)
  parseBodyFatPctValue(raw?: string | null): number | undefined {
    if (!raw) return undefined;
    const trimmed = String(raw).trim();
    if (!trimmed) return undefined;
    const numMatch = trimmed.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    if (!numMatch) return undefined;
    let val = parseFloat(numMatch[0]);
    if (isNaN(val) || val <= 0) return undefined;
    // HealthKitが 0.154 のような小数比率で返した場合の自動補正
    if (val > 0.02 && val < 1.0 && !trimmed.includes('%')) {
      val = val * 100;
    }
    const rounded = Math.round(val * 10) / 10;
    if (rounded >= 2.0 && rounded <= 75.0) {
      return rounded;
    }
    return undefined;
  },

  // URLクエリパラメータから体組成データ（体重・筋肉量・体脂肪率・日付、単一または複数日分）を取得・反映
  checkUrlBodyMetricsParam(): { syncedLogs: BodyMetricLog[]; latestLog: BodyMetricLog } | null {
    try {
      let params = new URLSearchParams(window.location.search);
      const bulkParam = params.get('bulk') || params.get('q') || params.get('data');
      if (bulkParam && bulkParam.includes('=')) {
        params = new URLSearchParams(bulkParam);
      } else if (
        !params.get('weight') &&
        !params.get('weights') &&
        !params.get('w') &&
        !params.get('muscle') &&
        !params.get('fat') &&
        window.location.search.includes('%3D')
      ) {
        try {
          params = new URLSearchParams(decodeURIComponent(window.location.search.slice(1)));
        } catch {
          // デコード失敗時は通常のparamsを維持
        }
      }

      const weightStr = params.get('weight') || params.get('weights') || params.get('w');
      const muscleStr =
        params.get('muscle') ||
        params.get('muscleMass') ||
        params.get('lbm') ||
        params.get('leanBodyMass') ||
        params.get('m');
      const fatStr = params.get('fat') || params.get('bodyFat') || params.get('bf') || params.get('f');
      const dateStr = params.get('date') || params.get('dates') || params.get('wdate') || params.get('d');
      const mDateStr = params.get('mdate') || params.get('mdates') || params.get('muscleDate');
      const fDateStr = params.get('fdate') || params.get('fdates') || params.get('fatDate');

      if (!weightStr && !muscleStr && !fatStr) {
        return null;
      }

      const splitValues = (s?: string | null): string[] => {
        if (!s) return [];
        return String(s)
          .split(/\r?\n|;|,/)
          .map(line => line.trim())
          .filter(Boolean);
      };

      const splitDates = (s?: string | null): string[] => {
        if (!s) return [];
        return String(s)
          .split(/\r?\n|;|,\s*(?=\d{4})/)
          .map(line => line.trim())
          .filter(Boolean);
      };

      const weights = splitValues(weightStr);
      const muscles = splitValues(muscleStr);
      const fats = splitValues(fatStr);
      const wDates = splitDates(dateStr);
      const mDates = splitDates(mDateStr);
      const fDates = splitDates(fDateStr);

      const todayKey = this.getDateKey();
      const nowIso = new Date().toISOString();
      const byDate = new Map<string, Partial<BodyMetricLog>>();

      const ensureDateEntry = (dKey: string) => {
        if (!byDate.has(dKey)) {
          byDate.set(dKey, {
            id: `body-${dKey}`,
            date: dKey,
            measuredAt: `${dKey}T08:00:00.000+09:00`,
          });
        }
        return byDate.get(dKey)!;
      };

      // 1. 体重サンプルの格納
      weights.forEach((wRaw, idx) => {
        const val = this.parseMassKgValue(wRaw);
        if (val === undefined) return;
        const dKey =
          this.parseFlexibleDateKey(wDates[idx]) ||
          (idx === 0 && wDates.length === 0 ? todayKey : null);
        if (!dKey) return;
        const entry = ensureDateEntry(dKey);
        if (entry.weightKg === undefined) {
          entry.weightKg = val;
        }
      });

      // 2. 筋肉量（除脂肪体重）サンプルの格納
      muscles.forEach((mRaw, idx) => {
        const val = this.parseMassKgValue(mRaw);
        if (val === undefined) return;
        let dKey = this.parseFlexibleDateKey(mDates[idx]);
        if (!dKey && mDates.length === 0) {
          if (idx < wDates.length) {
            dKey = this.parseFlexibleDateKey(wDates[idx]);
          } else if (idx === 0 && wDates.length === 0) {
            dKey = todayKey;
          }
        }
        if (!dKey) return;
        const entry = ensureDateEntry(dKey);
        if (entry.muscleMassKg === undefined) {
          entry.muscleMassKg = val;
        }
      });

      // 3. 体脂肪率サンプルの格納
      fats.forEach((fRaw, idx) => {
        const val = this.parseBodyFatPctValue(fRaw);
        if (val === undefined) return;
        let dKey = this.parseFlexibleDateKey(fDates[idx]);
        if (!dKey && fDates.length === 0) {
          if (idx < wDates.length) {
            dKey = this.parseFlexibleDateKey(wDates[idx]);
          } else if (idx === 0 && wDates.length === 0) {
            dKey = todayKey;
          }
        }
        if (!dKey) return;
        const entry = ensureDateEntry(dKey);
        if (entry.bodyFatPct === undefined) {
          entry.bodyFatPct = val;
        }
      });

      const incomingLogs: BodyMetricLog[] = Array.from(byDate.values())
        .filter(e => e.date && (e.weightKg !== undefined || e.muscleMassKg !== undefined || e.bodyFatPct !== undefined))
        .map(e => ({
          id: `body-${e.date}`,
          date: e.date!,
          weightKg: e.weightKg,
          muscleMassKg: e.muscleMassKg,
          bodyFatPct: e.bodyFatPct,
          measuredAt: e.date === todayKey ? nowIso : (e.measuredAt || nowIso),
        }))
        .sort((a, b) => b.date.localeCompare(a.date));

      if (incomingLogs.length === 0) {
        return null;
      }

      const upserted = this.upsertBodyMetrics(incomingLogs);

      // 最新体重があればプロフィール設定の体重も自動更新（有酸素のカロリー計算用）
      const latestWithWeight = incomingLogs.find(l => l.weightKg && l.weightKg > 0);
      if (latestWithWeight && latestWithWeight.weightKg) {
        const settings = this.getSettings();
        settings.profile.weightKg = latestWithWeight.weightKg;
        settings.profile.weightUpdatedAt = nowIso;
        this.saveSettings(settings);
      }

      // URLからクエリパラメータを除去（画面リロード時の再取得防止）
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      const latestLog = upserted.find(l => l.date === incomingLogs[0].date) || incomingLogs[0];
      return {
        syncedLogs: incomingLogs,
        latestLog,
      };
    } catch (e) {
      console.error('URLパラメータの解析に失敗しました:', e);
    }
    return null;
  },

  // 後方互換用
  checkUrlWeightParam(): number | null {
    const res = this.checkUrlBodyMetricsParam();
    return res?.latestLog?.weightKg ?? null;
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

  // 実施種目リストから表示用タイトルを自動生成（メニューテンプレート名に依存しない）
  formatExercisesSummary(exercises: { exerciseName: string }[]): string {
    const names = exercises.map(e => e.exerciseName).filter(Boolean);
    if (names.length === 0) return '本日の筋トレ';
    if (names.length <= 2) return names.join(' / ');
    return `${names.slice(0, 2).join(' / ')} 他${names.length - 2}種目`;
  },

  // 今日のワークアウトシートを取得（なければ空のシートを生成）
  getOrCreateTodaySession(): WorkoutSession {
    const todayKey = this.getDateKey();
    const targetSessionId = `session-${todayKey}`;
    const sessions = this.getPastSessions();

    // 当日の一時メタデータ（削除済み種目リスト等）を確認
    const activeMeta = getStored<WorkoutSession | null>(KEYS.ACTIVE_SESSION, null);
    const isSameDayMeta = activeMeta && normalizeSessionId(activeMeta.id) === targetSessionId;

    const existingToday = sessions.find(s => 
      this.getDateKey(s.startedAt) === todayKey || normalizeSessionId(s.id) === targetSessionId
    );
    if (existingToday) {
      return {
        ...existingToday,
        id: normalizeSessionId(existingToday.id),
        excludedExerciseIds: isSameDayMeta
          ? Array.from(new Set([...(existingToday.excludedExerciseIds || []), ...(activeMeta?.excludedExerciseIds || [])]))
          : existingToday.excludedExerciseIds,
      };
    }

    if (isSameDayMeta) {
      return {
        ...activeMeta,
        id: targetSessionId,
      };
    }

    return {
      id: targetSessionId,
      startedAt: new Date().toISOString(),
      menuName: '本日の筋トレ',
      excludedExerciseIds: [],
      exercises: [],
    };
  },

  // 今日のワークアウトを自動保存（種目が1つ以上あれば履歴に自動保存、0なら履歴から除去しつつ削除済み種目メタデータは保持）
  saveTodaySession(session: WorkoutSession): void {
    const targetDateKey = this.getDateKey(session.startedAt);
    const normSessionId = normalizeSessionId(session.id);
    const nowIso = new Date().toISOString();
    const sessions = this.getPastSessions();
    const otherSessions = sessions.filter(
      s => normalizeSessionId(s.id) !== normSessionId && this.getDateKey(s.startedAt) !== targetDateKey
    );

    const updatedSession: WorkoutSession = {
      ...session,
      id: normSessionId,
      menuName: session.exercises.length > 0
        ? this.formatExercisesSummary(session.exercises)
        : (session.menuName || '本日の筋トレ'),
      endedAt: session.endedAt || nowIso,
      updatedAt: nowIso,
    };

    // 削除済み種目リスト等を含む当日状態をACTIVE_SESSIONにも保存
    setStored(KEYS.ACTIVE_SESSION, updatedSession);

    if (session.exercises.length > 0) {
      this.savePastSessions([updatedSession, ...otherSessions]);

      // 部位ごとの最終トレーニング日時を再計算して更新
      this.recalculateBodyPartRecovery([updatedSession, ...otherSessions]);
    } else {
      this.savePastSessions(otherSessions);
      this.recalculateBodyPartRecovery(otherSessions);
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

  // 前回ログおよび過去のMax値（フロート表示用：今日の記録は除外して過去の実績・自己ベストを返す）
  getPreviousLogsForExercise(exerciseId: string, exerciseName?: string): PreviousExerciseLog | null {
    const todayKey = this.getDateKey();
    const sessions = this.getPastSessions();
    const targetEx = this.getExercises().find(e => e.id === exerciseId) || INITIAL_EXERCISES.find(e => e.id === exerciseId);
    const normName = (str?: string) => (str || '').trim().replace(/\s+/g, '').toLowerCase();
    const targetNormName = normName(exerciseName || targetEx?.name);

    let latestDate: string | undefined;
    let latestSets: { setNumber: number; weight: number; reps: number }[] = [];
    let maxWeightRecord: ExerciseMaxRecord | undefined;
    let max1RMRecord: ExerciseMaxRecord | undefined;

    for (const session of sessions) {
      if (this.getDateKey(session.startedAt) === todayKey) continue;
      const sessionDate = session.endedAt || session.startedAt;
      const matchEx = session.exercises.find(
        e => e.exerciseId === exerciseId || (targetNormName && normName(e.exerciseName) === targetNormName)
      );
      if (!matchEx || !matchEx.sets || matchEx.sets.length === 0) continue;

      const validSets = matchEx.sets.filter(s => (s.isCompleted || s.reps > 0) && (s.weight > 0 || s.reps > 0));
      if (validSets.length === 0) continue;

      // 直近（前回）のセット一覧を保持
      if (!latestDate) {
        latestDate = sessionDate;
        latestSets = validSets.map(s => ({
          setNumber: s.setNumber,
          weight: s.weight,
          reps: s.reps,
        }));
      }

      // 全過去セッションから最大重量および最大推定1RMを集計
      for (const s of validSets) {
        if (s.weight <= 0 || s.reps <= 0) continue;
        const rm = calculate1RM(s.weight, s.reps);

        if (
          !maxWeightRecord ||
          s.weight > maxWeightRecord.weight ||
          (s.weight === maxWeightRecord.weight && s.reps > maxWeightRecord.reps)
        ) {
          maxWeightRecord = {
            weight: s.weight,
            reps: s.reps,
            estimated1RM: rm,
            date: sessionDate,
          };
        }

        if (
          !max1RMRecord ||
          rm > max1RMRecord.estimated1RM ||
          (rm === max1RMRecord.estimated1RM && s.weight > max1RMRecord.weight)
        ) {
          max1RMRecord = {
            weight: s.weight,
            reps: s.reps,
            estimated1RM: rm,
            date: sessionDate,
          };
        }
      }
    }

    if (!latestDate && !maxWeightRecord && !max1RMRecord) {
      return null;
    }

    return {
      date: latestDate,
      sets: latestSets,
      maxWeightRecord,
      max1RMRecord,
    };
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
    const seen = new Set<string>();
    const unique = logs.filter(l => {
      if (!l.id || seen.has(l.id)) return false;
      seen.add(l.id);
      return true;
    });
    setStored(KEYS.CARDIO_LOGS, unique);
  },
  addCardioLog(log: CardioLog): void {
    const logs = this.getCardioLogs().filter(l => l.id !== log.id);
    this.saveCardioLogs([log, ...logs]);
  },
  updateCardioLog(log: CardioLog): void {
    const logs = this.getCardioLogs().map(l => l.id === log.id ? log : l);
    this.saveCardioLogs(logs);
  },
  deleteCardioLog(logId: string): void {
    const logs = this.getCardioLogs().filter(l => l.id !== logId);
    this.saveCardioLogs(logs);
  },

  // 体組成・体重推移ログ (Appleヘルスケアから共有されたデータ)
  getBodyMetrics(): BodyMetricLog[] {
    const stored = getStored<BodyMetricLog[]>(KEYS.BODY_METRICS, []);
    if (stored.length > 0) {
      return stored
        .filter(m => m && m.date)
        .sort((a, b) => b.date.localeCompare(a.date));
    }
    // 過去にヘルスケアから取得済みの最新体重がprofileにあれば1件目として引き継ぐ
    const settings = this.getSettings();
    if (settings.profile?.weightUpdatedAt && settings.profile?.weightKg > 0) {
      const dKey = this.parseFlexibleDateKey(settings.profile.weightUpdatedAt) || this.getDateKey();
      const initialEntry: BodyMetricLog = {
        id: `body-${dKey}`,
        date: dKey,
        weightKg: settings.profile.weightKg,
        measuredAt: settings.profile.weightUpdatedAt,
      };
      setStored(KEYS.BODY_METRICS, [initialEntry]);
      return [initialEntry];
    }
    return [];
  },

  saveBodyMetrics(logs: BodyMetricLog[]): void {
    const map = new Map<string, BodyMetricLog>();
    logs.forEach(l => {
      const dKey = this.parseFlexibleDateKey(l.date) || l.date;
      if (!dKey) return;
      if (l.weightKg === undefined && l.muscleMassKg === undefined && l.bodyFatPct === undefined) return;
      map.set(dKey, {
        ...l,
        id: `body-${dKey}`,
        date: dKey,
      });
    });
    const sorted = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
    setStored(KEYS.BODY_METRICS, sorted);
  },

  upsertBodyMetrics(newLogs: BodyMetricLog[]): BodyMetricLog[] {
    const existing = this.getBodyMetrics();
    const map = new Map<string, BodyMetricLog>();
    existing.forEach(item => {
      if (item.date) map.set(item.date, { ...item });
    });

    newLogs.forEach(incoming => {
      const dKey = this.parseFlexibleDateKey(incoming.date) || incoming.date;
      if (!dKey) return;
      const prev = map.get(dKey);
      const merged: BodyMetricLog = {
        id: `body-${dKey}`,
        date: dKey,
        weightKg: incoming.weightKg !== undefined ? incoming.weightKg : prev?.weightKg,
        muscleMassKg: incoming.muscleMassKg !== undefined ? incoming.muscleMassKg : prev?.muscleMassKg,
        bodyFatPct: incoming.bodyFatPct !== undefined ? incoming.bodyFatPct : prev?.bodyFatPct,
        measuredAt: incoming.measuredAt || prev?.measuredAt || new Date().toISOString(),
        note: incoming.note !== undefined ? incoming.note : prev?.note,
      };
      map.set(dKey, merged);
    });

    const result = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
    this.saveBodyMetrics(result);
    return result;
  },

  deleteBodyMetric(date: string): void {
    const filtered = this.getBodyMetrics().filter(m => m.date !== date);
    setStored(KEYS.BODY_METRICS, filtered);
  },
};
