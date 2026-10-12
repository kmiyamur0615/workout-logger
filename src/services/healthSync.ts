import { WorkoutSession, CardioLog, AppSettings } from '../types';

export const HealthSyncService = {
  // 筋トレ用ショートカット呼び出しURLの生成
  buildShortcutUrl(session: WorkoutSession, shortcutName: string = 'WorkoutLoggerSync'): string {
    const startedAt = new Date(session.startedAt);
    const endedAt = session.endedAt ? new Date(session.endedAt) : new Date();
    const durationMinutes = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));

    const payload = {
      workoutType: "Traditional Strength Training",
      startDate: startedAt.toISOString(),
      endDate: endedAt.toISOString(),
      durationMinutes: durationMinutes,
      menuName: session.menuName || "ワークアウト",
    };

    const jsonString = JSON.stringify(payload);
    const encodedText = encodeURIComponent(jsonString);
    const encodedShortcutName = encodeURIComponent(shortcutName);

    return `shortcuts://run-shortcut?name=${encodedShortcutName}&input=text&text=${encodedText}`;
  },

  triggerShortcut(session: WorkoutSession, shortcutName: string = 'WorkoutLoggerSync'): void {
    const url = this.buildShortcutUrl(session, shortcutName);
    window.location.href = url;
  },

  // 種別（ランニング、サイクリング、ウォーキング等）に応じたショートカット名を解決
  getCardioShortcutName(cardioTypeId: string, cardioTypeName: string, settings?: Partial<AppSettings>): string {
    const custom = settings?.cardioShortcuts;
    const nameLower = (cardioTypeName || '').toLowerCase();
    const idLower = (cardioTypeId || '').toLowerCase();

    // ランニング判定 (IDまたは種別名に run / ランニング)
    if (idLower.includes('run') || nameLower.includes('ランニング') || nameLower.includes('run')) {
      return custom?.run || 'CardioSync_Run';
    }

    // サイクリング判定 (IDまたは種別名に cycle / bike / サイクリング / 自転車)
    if (
      idLower.includes('cycle') ||
      idLower.includes('bike') ||
      nameLower.includes('サイクリング') ||
      nameLower.includes('バイク') ||
      nameLower.includes('自転車')
    ) {
      return custom?.cycle || 'CardioSync_Cycle';
    }

    // ウォーキング判定 (IDまたは種別名に walk / ウォーキング / 散歩)
    if (idLower.includes('walk') || nameLower.includes('ウォーキング') || nameLower.includes('歩行') || nameLower.includes('散歩')) {
      return custom?.walk || 'CardioSync_Walk';
    }

    // その他・カスタム種目は共通フォールバック
    return settings?.cardioShortcutName || 'CardioLoggerSync';
  },

  // 有酸素運動用ショートカット呼び出しURLの生成
  buildCardioShortcutUrl(log: CardioLog, shortcutName: string = 'CardioLoggerSync'): string {
    const endedAt = new Date(log.endedAt);
    const startedAt = new Date(endedAt.getTime() - log.durationMinutes * 60000);

    const payload = {
      workoutCategory: "cardio",
      cardioTypeId: log.cardioTypeId,
      cardioTypeName: log.cardioTypeName,
      startDate: startedAt.toISOString(),
      endDate: endedAt.toISOString(),
      durationMinutes: log.durationMinutes,
      distanceKm: log.distanceKm,
      calories: log.calories,
      note: log.note || "",
    };

    const jsonString = JSON.stringify(payload);
    const encodedText = encodeURIComponent(jsonString);
    const encodedShortcutName = encodeURIComponent(shortcutName);

    return `shortcuts://run-shortcut?name=${encodedShortcutName}&input=text&text=${encodedText}`;
  },

  triggerCardioShortcut(log: CardioLog, shortcutName: string = 'CardioLoggerSync'): void {
    const url = this.buildCardioShortcutUrl(log, shortcutName);
    window.location.href = url;
  }
};
