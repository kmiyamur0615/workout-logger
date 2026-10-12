import { WorkoutSession, CardioLog } from '../types';

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

  // 有酸素運動用ショートカット呼び出しURLの生成
  buildCardioShortcutUrl(log: CardioLog, shortcutName: string = 'CardioLoggerSync'): string {
    const endedAt = new Date(log.endedAt);
    const startedAt = new Date(endedAt.getTime() - log.durationMinutes * 60000);

    const payload = {
      workoutCategory: "cardio",
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
