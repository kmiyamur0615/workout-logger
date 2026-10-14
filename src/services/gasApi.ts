import { WorkoutSession, CardioLog, Exercise, WeekdaySchedule } from '../types';

export const GasApiService = {
  // スプレッドシートからマスタ取得 (doGet)
  async fetchSpreadsheetData(gasUrl: string) {
    if (!gasUrl) {
      throw new Error('GAS Web App URLが設定されていません');
    }

    const response = await fetch(gasUrl, {
      method: 'GET',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`GAS通信エラー: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  },

  // ワークアウト終了時にセッション＋全セットを一括送信 (doPost)
  async syncWorkoutSession(gasUrl: string, session: WorkoutSession): Promise<boolean> {
    if (!gasUrl) {
      console.warn('GAS URLが未設定のため、ローカル保存のみ完了しました。');
      return false;
    }

    try {
      const payload = {
        action: 'SAVE_WORKOUT',
        session: {
          id: session.id,
          startedAt: session.startedAt,
          endedAt: session.endedAt || new Date().toISOString(),
          menuName: session.menuName || 'フリーワークアウト',
          note: session.note || '',
        },
        sets: session.exercises.flatMap(ex => 
          ex.sets.map(s => ({
            sessionId: session.id,
            exerciseName: ex.exerciseName,
            setNumber: s.setNumber,
            weight: s.weight,
            reps: s.reps,
            isCompleted: s.isCompleted,
            isAssisted: s.isAssisted,
            completedAt: s.completedAt || new Date().toISOString()
          }))
        )
      };

      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error('GAS送信失敗:', response.statusText);
        return false;
      }

      const resJson = await response.json();
      return resJson.status === 'success';
    } catch (err) {
      console.error('GAS同期エラー:', err);
      return false;
    }
  },

  // 有酸素運動ログの送信
  async syncCardioLog(gasUrl: string, log: CardioLog): Promise<boolean> {
    if (!gasUrl) return false;

    try {
      const payload = {
        action: 'SAVE_CARDIO',
        cardio: log
      };

      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) return false;
      const resJson = await response.json();
      return resJson.status === 'success';
    } catch (err) {
      console.error('GAS有酸素同期エラー:', err);
      return false;
    }
  },

  // 新規筋トレ種目の送信
  async syncNewExercise(gasUrl: string, exercise: Exercise): Promise<boolean> {
    if (!gasUrl) return false;

    try {
      const payload = {
        action: 'ADD_EXERCISE',
        exercise
      };

      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) return false;
      const resJson = await response.json();
      return resJson.status === 'success';
    } catch (err) {
      console.error('GAS種目追加同期エラー:', err);
      return false;
    }
  },

  // 曜日別デフォルトスケジュールの送信
  async syncSchedule(gasUrl: string, schedule: WeekdaySchedule[]): Promise<boolean> {
    if (!gasUrl) return false;

    try {
      const payload = {
        action: 'SAVE_SCHEDULE',
        schedule
      };

      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) return false;
      const resJson = await response.json();
      return resJson.status === 'success';
    } catch (err) {
      console.error('GASスケジュール同期エラー:', err);
      return false;
    }
  }
};
