/**
 * Workout Logger - Google Apps Script (GAS) バックエンド (v1.3)
 */

function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. exercises (種目マスタ)
  let exSheet = ss.getSheetByName('exercises');
  if (!exSheet) {
    exSheet = ss.insertSheet('exercises');
    exSheet.appendRow(['exercise_id', 'body_part', 'exercise_name', 'equipment', 'note']);
    exSheet.getRange(1, 1, 1, 5).setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
    
    exSheet.appendRow(['ex-bench-press', 'chest', 'ベンチプレス', 'BARBELL', '']);
    exSheet.appendRow(['ex-incline-bench-press', 'chest', 'インクラインベンチプレス', 'BARBELL', '']);
    exSheet.appendRow(['ex-deadlift', 'back', 'デッドリフト', 'BARBELL', '']);
    exSheet.appendRow(['ex-lat-pulldown', 'back', 'ラットプルダウン', 'MACHINE', '']);
    exSheet.appendRow(['ex-seated-row', 'back', 'シーテッドロー', 'CABLE', '']);
    exSheet.appendRow(['ex-assisted-chinup', 'back', 'アシストチンニング', 'MACHINE', '']);
    exSheet.appendRow(['ex-dumbbell-row', 'back', 'ダンベルローイング', 'DUMBBELL', '']);
    exSheet.appendRow(['ex-leg-press', 'legs', 'レッグプレス', 'MACHINE', '']);
    exSheet.appendRow(['ex-leg-curl', 'legs', 'レッグカール', 'MACHINE', '']);
    exSheet.appendRow(['ex-calf-press', 'legs', 'カーフプレス', 'MACHINE', '']);
    exSheet.appendRow(['ex-shoulder-press', 'shoulders', 'ショルダープレス', 'MACHINE', '']);
    exSheet.appendRow(['ex-face-pull', 'shoulders', 'ケーブルフェイスプル', 'CABLE', '']);
    exSheet.appendRow(['ex-shoulder-shrug', 'shoulders', 'ショルダーシュラグ', 'BARBELL', '']);
    exSheet.appendRow(['ex-cable-pushdown', 'arms', 'ケーブルプレスダウン', 'CABLE', '']);
    exSheet.appendRow(['ex-dumbbell-wrist-curl', 'arms', 'ダンベルリストカール', 'DUMBBELL', '']);
  }

  // 2. menus (メニューマスタ)
  let menuSheet = ss.getSheetByName('menus');
  if (!menuSheet) {
    menuSheet = ss.insertSheet('menus');
    menuSheet.appendRow(['menu_id', 'menu_name', 'target_parts', 'sort_order']);
    menuSheet.getRange(1, 1, 1, 4).setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');

    menuSheet.appendRow(['menu-chest-arms', '胸・腕 (Push)', '胸・腕', 1]);
    menuSheet.appendRow(['menu-back', '背中 (Pull)', '背中・肩リア', 2]);
    menuSheet.appendRow(['menu-legs-lower', '下半身 (Legs)', '脚・カーフ', 3]);
  }

  // 3. schedule (曜日別デフォルト)
  let schedSheet = ss.getSheetByName('schedule');
  if (!schedSheet) {
    schedSheet = ss.insertSheet('schedule');
    schedSheet.appendRow(['day_of_week', 'day_name', 'menu_id']);
    schedSheet.getRange(1, 1, 1, 3).setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');

    schedSheet.appendRow([0, '日曜日', '']);
    schedSheet.appendRow([1, '月曜日', 'menu-chest-arms']);
    schedSheet.appendRow([2, '火曜日', '']);
    schedSheet.appendRow([3, '水曜日', 'menu-back']);
    schedSheet.appendRow([4, '木曜日', '']);
    schedSheet.appendRow([5, '金曜日', 'menu-legs-lower']);
    schedSheet.appendRow([6, '土曜日', '']);
  }

  // 4. workouts (セッション履歴) - 時間・総ボリューム列を削除
  let woSheet = ss.getSheetByName('workouts');
  if (!woSheet) {
    woSheet = ss.insertSheet('workouts');
    woSheet.appendRow(['session_id', 'started_at', 'ended_at', 'menu_name', 'note']);
    woSheet.getRange(1, 1, 1, 5).setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
  }

  // 5. sets (セット履歴) - 種別列を削除し、is_completed列を配置
  let setSheet = ss.getSheetByName('sets');
  if (!setSheet) {
    setSheet = ss.insertSheet('sets');
    setSheet.appendRow(['session_id', 'exercise_name', 'set_number', 'weight_kg', 'reps', 'is_completed', 'completed_at']);
    setSheet.getRange(1, 1, 1, 7).setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
  }

  // 6. cardio_types (有酸素種別マスタ)
  let ctSheet = ss.getSheetByName('cardio_types');
  if (!ctSheet) {
    ctSheet = ss.insertSheet('cardio_types');
    ctSheet.appendRow(['type_id', 'name', 'default_mets']);
    ctSheet.getRange(1, 1, 1, 3).setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');

    ctSheet.appendRow(['cardio-run', 'ランニング', 8.3]);
    ctSheet.appendRow(['cardio-cycle', 'サイクリング', 6.8]);
    ctSheet.appendRow(['cardio-walk', 'ウォーキング', 3.8]);
  }

  // 7. cardio_logs (有酸素運動ログ)
  let clSheet = ss.getSheetByName('cardio_logs');
  if (!clSheet) {
    clSheet = ss.insertSheet('cardio_logs');
    clSheet.appendRow(['log_id', 'cardio_type_name', 'distance_km', 'duration_min', 'calories_kcal', 'ended_at', 'note']);
    clSheet.getRange(1, 1, 1, 7).setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
  }

  Logger.log('スプレッドシートの初期セットアップが完了しました。');
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const exSheet = ss.getSheetByName('exercises');
    const exData = exSheet ? exSheet.getDataRange().getValues() : [];
    const exercises = [];
    for (let i = 1; i < exData.length; i++) {
      const row = exData[i];
      if (row[0]) {
        exercises.push({
          id: String(row[0]),
          bodyPartId: String(row[1]),
          name: String(row[2]),
          equipment: String(row[3]),
          note: String(row[4] || '')
        });
      }
    }

    const schedSheet = ss.getSheetByName('schedule');
    const schedData = schedSheet ? schedSheet.getDataRange().getValues() : [];
    const schedule = [];
    for (let i = 1; i < schedData.length; i++) {
      const row = schedData[i];
      schedule.push({
        dayOfWeek: Number(row[0]),
        menuId: row[2] ? String(row[2]) : null
      });
    }

    const result = {
      status: 'success',
      exercises: exercises,
      schedule: schedule
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const data = JSON.parse(e.postData.contents);

    // 筋トレワークアウトの保存
    if (data.action === 'SAVE_WORKOUT') {
      const session = data.session;
      const sets = data.sets || [];

      const woSheet = ss.getSheetByName('workouts') || ss.insertSheet('workouts');
      woSheet.appendRow([
        session.id,
        session.startedAt,
        session.endedAt,
        session.menuName,
        session.note || ''
      ]);

      const setSheet = ss.getSheetByName('sets') || ss.insertSheet('sets');
      if (sets.length > 0) {
        const rowsToAdd = sets.map(function(s) {
          return [
            s.sessionId,
            s.exerciseName,
            s.setNumber,
            s.weight,
            s.reps,
            s.isCompleted ? 'TRUE' : 'FALSE',
            s.completedAt
          ];
        });
        setSheet.getRange(setSheet.getLastRow() + 1, 1, rowsToAdd.length, 7).setValues(rowsToAdd);
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 有酸素運動の保存
    if (data.action === 'SAVE_CARDIO') {
      const cardio = data.cardio;
      const clSheet = ss.getSheetByName('cardio_logs') || ss.insertSheet('cardio_logs');
      clSheet.appendRow([
        cardio.id,
        cardio.cardioTypeName,
        cardio.distanceKm,
        cardio.durationMinutes,
        cardio.calories,
        cardio.endedAt,
        cardio.note || ''
      ]);

      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 新規筋トレ種目の追加
    if (data.action === 'ADD_EXERCISE') {
      const ex = data.exercise;
      const exSheet = ss.getSheetByName('exercises') || ss.insertSheet('exercises');
      exSheet.appendRow([
        ex.id,
        ex.bodyPartId,
        ex.name,
        ex.equipment || 'OTHER',
        ex.note || ''
      ]);

      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'unknown_action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
