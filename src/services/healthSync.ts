import { WorkoutSession } from '../types';

export const HealthSyncService = {
  // ショートカット呼び出し用URLの生成
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
  }
};
