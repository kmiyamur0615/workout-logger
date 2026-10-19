import { WorkoutSession, CardioLog, AppSettings } from '../types';
import { StorageService } from './storage';

export const HealthSyncService = {
  // 筋トレ用ショートカット呼び出しURLの生成
  buildShortcutUrl(session: WorkoutSession, shortcutName: string = 'WorkoutLoggerSync'): string {
    const now = new Date();
    const rawEndedAt = session.endedAt ? new Date(session.endedAt) : now;
    // 終了時刻が未来にならないよう現在時刻以下に丸める
    const endedAt = isNaN(rawEndedAt.getTime()) || rawEndedAt.getTime() > now.getTime() ? now : rawEndedAt;

    const rawStartedAt = new Date(session.startedAt);
    const totalSets = (session.exercises || []).reduce(
      (sum, ex) => sum + (ex.sets ? ex.sets.length : 0),
      0
    );
    const estimatedMinutesFromSets = Math.max(10, totalSets * 2);

    let durationMinutes = estimatedMinutesFromSets;
    if (!isNaN(rawStartedAt.getTime())) {
      const diffMin = Math.floor((endedAt.getTime() - rawStartedAt.getTime()) / 60000);
      // 3分〜120分の範囲内なら実測時間を採用、短すぎる一括入力や放置時はセット数ベースで算出
      if (diffMin >= 3 && diffMin <= 120) {
        durationMinutes = diffMin;
      }
    }
    durationMinutes = Math.max(1, Number(durationMinutes) || 15);

    // endDate が未来になって HealthKit エラーになるのを防ぐため、endedAt から逆算して startDate を確定
    const startedAt = new Date(endedAt.getTime() - durationMinutes * 60000);
    const startDate = startedAt.toISOString().replace(/\.\d{3}Z$/, 'Z');
    const endDate = endedAt.toISOString().replace(/\.\d{3}Z$/, 'Z');

    // 筋トレの推定消費カロリー算出 (METs 4.5 基準)
    let weightKg = 68;
    try {
      weightKg = StorageService.getSettings().profile?.weightKg || 68;
    } catch (_) {}
    const caloriesNum = Math.max(15, Math.round(4.5 * weightKg * (durationMinutes / 60) * 1.05));

    const payload = {
      workoutType: 'Traditional Strength Training',
      cardioTypeName: session.menuName || '筋トレ',
      menuName: session.menuName || 'ワークアウト',
      startDate: startDate,
      endDate: endDate,
      開始日: startDate,
      開始日時: startDate,
      start: startDate,
      durationMinutes: durationMinutes,
      duration: durationMinutes,
      minutes: durationMinutes,
      時間: durationMinutes,
      分: durationMinutes,
      calories: caloriesNum,
      calorie: caloriesNum,
      kcal: caloriesNum,
      カロリー: caloriesNum,
      distanceKm: 0,
      distance: 0,
      km: 0,
      距離: 0,
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
    const durationNum = Number(log.durationMinutes) || 0;
    const distanceNum = Number(log.distanceKm) || 0;
    const caloriesNum = Number(log.calories) || 0;
    const startedAt = new Date(endedAt.getTime() - durationNum * 60000);

    // ミリ秒を落とす（"2026-10-12T14:40:00Z"）- iOSショートカットのパース用
    const startDate = startedAt.toISOString().replace(/\.\d{3}Z$/, "Z");

    const payload = {
      cardioTypeName: log.cardioTypeName,
      startDate: startDate,
      durationMinutes: durationNum,
      distanceKm: distanceNum,
      calories: caloriesNum,
      // ショートカット側の表記揺れ・簡略指定用エイリアス
      duration: durationNum,
      distance: distanceNum,
      calorie: caloriesNum,
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
