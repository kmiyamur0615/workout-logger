/**
 * Workout Logger - Google Apps Script (GAS) バックエンド (v1.4)
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
    menuSheet.appendRow(['menu_id', 'menu_name', 'target_parts', 'sort_order', 'exercises_json']);
    menuSheet.getRange(1, 1, 1, 5).setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');

    menuSheet.appendRow(['menu-chest-arms', '胸・腕 (Push)', '胸・腕', 1, '[]']);
    menuSheet.appendRow(['menu-back', '背中 (Pull)', '背中・肩リア', 2, '[]']);
    menuSheet.appendRow(['menu-legs-lower', '下半身 (Legs)', '脚・カーフ', 3, '[]']);
  } else if (menuSheet.getLastColumn() < 5) {
    menuSheet.getRange(1, 5).setValue('exercises_json');
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

  // 4. workouts (セッション履歴)
  let woSheet = ss.getSheetByName('workouts');
  if (!woSheet) {
    woSheet = ss.insertSheet('workouts');
    woSheet.appendRow(['session_id', 'started_at', 'ended_at', 'menu_name', 'note']);
    woSheet.getRange(1, 1, 1, 5).setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
  }

  // 5. sets (セット履歴)
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

/**
 * session_id を常に "session-YYYY-MM-DD" 形式に正規化
 * 例: "session-20261015" -> "session-2026-10-15"
 *     "session-2026-10-15" -> "session-2026-10-15"
 *     "20261015" -> "session-2026-10-15"
 */
function normalizeSessionId(id) {
  if (!id) return '';
  const str = String(id).trim();
  const match1 = str.match(/^session-(\d{4})-?(\d{2})-?(\d{2})(.*)$/);
  if (match1) {
    return 'session-' + match1[1] + '-' + match1[2] + '-' + match1[3] + (match1[4] || '');
  }
  const match2 = str.match(/^(\d{4})-?(\d{2})-?(\d{2})(.*)$/);
  if (match2) {
    return 'session-' + match2[1] + '-' + match2[2] + '-' + match2[3] + (match2[4] || '');
  }
  return str;
}

function toIsoDateSafe(val, fallbackSessionId) {
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString();
  }
  if (val) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }
  if (fallbackSessionId) {
    const m = fallbackSessionId.match(/^session-(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return m[1] + '-' + m[2] + '-' + m[3] + 'T09:00:00.000+09:00';
    }
  }
  return new Date().toISOString();
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. exercises (種目マスタ)
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

    // 2. routineMenus (メニューテンプレートマスタ)
    const menuSheet = ss.getSheetByName('menus');
    const menuData = menuSheet ? menuSheet.getDataRange().getValues() : [];
    const routineMenus = [];
    for (let i = 1; i < menuData.length; i++) {
      const row = menuData[i];
      const mId = String(row[0] || '').trim();
      if (!mId) continue;
      let menuExercises = [];
      if (row[4]) {
        try {
          menuExercises = JSON.parse(String(row[4]));
        } catch (_) {}
      }
      routineMenus.push({
        id: mId,
        name: String(row[1] || 'メニュー'),
        targetParts: String(row[2] || ''),
        sortOrder: Number(row[3]) || i,
        exercises: menuExercises
      });
    }

    // 3. schedule (曜日別デフォルト)
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

    // 4. workouts & sets (筋トレ履歴) - session_idを正規化して突合
    const woSheet = ss.getSheetByName('workouts');
    const woData = woSheet ? woSheet.getDataRange().getValues() : [];
    const setSheet = ss.getSheetByName('sets');
    const setData = setSheet ? setSheet.getDataRange().getValues() : [];

    const setsBySession = {};
    for (let i = 1; i < setData.length; i++) {
      const row = setData[i];
      const sId = normalizeSessionId(row[0]);
      if (!sId) continue;
      if (!setsBySession[sId]) setsBySession[sId] = [];

      const exName = String(row[1] || '種目').trim();
      const setNum = Number(row[2]) || 1;
      const weight = Number(row[3]) || 0;
      const reps = Number(row[4]) || 0;
      const completedAt = toIsoDateSafe(row[6], sId);

      // 同一セットの二重登録防止
      const isDuplicate = setsBySession[sId].some(function(existing) {
        return existing.exerciseName === exName && existing.setNumber === setNum && existing.weight === weight && existing.reps === reps;
      });
      if (isDuplicate) continue;

      setsBySession[sId].push({
        sessionId: sId,
        exerciseName: exName,
        setNumber: setNum,
        weight: weight,
        reps: reps,
        isCompleted: String(row[5]).toUpperCase() === 'TRUE',
        completedAt: completedAt
      });
    }

    const pastSessions = [];
    const processedSessionIds = {};

    for (let i = 1; i < woData.length; i++) {
      const row = woData[i];
      const sId = normalizeSessionId(row[0]);
      if (!sId || processedSessionIds[sId]) continue;
      processedSessionIds[sId] = true;

      const rawSets = setsBySession[sId] || [];
      const exerciseMap = {};
      const exList = [];
      rawSets.forEach((s, idx) => {
        if (!exerciseMap[s.exerciseName]) {
          const exObj = {
            id: 'we-' + sId + '-' + (exList.length + 1),
            exerciseId: 'ex-custom-' + s.exerciseName,
            exerciseName: s.exerciseName,
            bodyPartId: 'other',
            orderIndex: exList.length + 1,
            sets: []
          };
          exerciseMap[s.exerciseName] = exObj;
          exList.push(exObj);
        }
        exerciseMap[s.exerciseName].sets.push({
          id: 's-' + sId + '-' + (idx + 1),
          setNumber: s.setNumber,
          weight: s.weight,
          reps: s.reps,
          isCompleted: s.isCompleted,
          completedAt: s.completedAt
        });
      });

      const startedAt = toIsoDateSafe(row[1], sId);
      const endedAt = row[2] ? toIsoDateSafe(row[2], sId) : undefined;

      pastSessions.push({
        id: sId,
        startedAt: startedAt,
        endedAt: endedAt,
        menuName: String(row[3] || '筋トレ'),
        note: String(row[4] || ''),
        isSyncedWithGAS: true,
        exercises: exList
      });
    }

    // workoutsシートに未登録だがsetsシートにあるセッションも救出
    for (const sId in setsBySession) {
      if (!processedSessionIds[sId]) {
        processedSessionIds[sId] = true;
        const rawSets = setsBySession[sId];
        const exerciseMap = {};
        const exList = [];
        rawSets.forEach((s, idx) => {
          if (!exerciseMap[s.exerciseName]) {
            const exObj = {
              id: 'we-' + sId + '-' + (exList.length + 1),
              exerciseId: 'ex-custom-' + s.exerciseName,
              exerciseName: s.exerciseName,
              bodyPartId: 'other',
              orderIndex: exList.length + 1,
              sets: []
            };
            exerciseMap[s.exerciseName] = exObj;
            exList.push(exObj);
          }
          exerciseMap[s.exerciseName].sets.push({
            id: 's-' + sId + '-' + (idx + 1),
            setNumber: s.setNumber,
            weight: s.weight,
            reps: s.reps,
            isCompleted: s.isCompleted,
            completedAt: s.completedAt
          });
        });

        const startedAt = toIsoDateSafe('', sId);

        pastSessions.push({
          id: sId,
          startedAt: startedAt,
          menuName: '筋トレ',
          note: '',
          isSyncedWithGAS: true,
          exercises: exList
        });
      }
    }

    // 5. cardio_logs (有酸素運動ログ)
    const clSheet = ss.getSheetByName('cardio_logs');
    const clData = clSheet ? clSheet.getDataRange().getValues() : [];
    const cardioLogs = [];
    for (let i = 1; i < clData.length; i++) {
      const row = clData[i];
      const cId = String(row[0] || '').trim();
      if (!cId) continue;
      const endedAt = toIsoDateSafe(row[5]);
      cardioLogs.push({
        id: cId,
        cardioTypeId: 'cardio-custom',
        cardioTypeName: String(row[1] || '有酸素運動'),
        distanceKm: Number(row[2]) || 0,
        durationMinutes: Number(row[3]) || 0,
        calories: Number(row[4]) || 0,
        endedAt: endedAt,
        note: String(row[6] || '')
      });
    }

    const result = {
      status: 'success',
      exercises: exercises,
      routineMenus: routineMenus,
      schedule: schedule,
      pastSessions: pastSessions,
      cardioLogs: cardioLogs
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

    // 筋トレワークアウトの保存（重複時は既存を更新・正規化session_id利用）
    if (data.action === 'SAVE_WORKOUT') {
      const session = data.session;
      const normSessionId = normalizeSessionId(session.id);
      const sets = data.sets || [];

      const woSheet = ss.getSheetByName('workouts') || ss.insertSheet('workouts');
      const woData = woSheet.getDataRange().getValues();
      let existingWoRow = -1;
      for (let i = 1; i < woData.length; i++) {
        if (normalizeSessionId(woData[i][0]) === normSessionId) {
          existingWoRow = i + 1;
          break;
        }
      }

      const rowValues = [
        normSessionId,
        session.startedAt,
        session.endedAt || new Date().toISOString(),
        session.menuName || '筋トレ',
        session.note || ''
      ];

      if (existingWoRow > 0) {
        woSheet.getRange(existingWoRow, 1, 1, 5).setValues([rowValues]);
      } else {
        woSheet.appendRow(rowValues);
      }

      // setsシートの更新（高速一括処理: deleteRowループを排除）
      const setSheet = ss.getSheetByName('sets') || ss.insertSheet('sets');
      const setData = setSheet.getDataRange().getValues();
      const remainingSets = [];
      for (let i = 1; i < setData.length; i++) {
        if (normalizeSessionId(setData[i][0]) !== normSessionId && setData[i][0]) {
          remainingSets.push(setData[i]);
        }
      }

      const rowsToAdd = sets.map(function(s) {
        return [
          normSessionId,
          s.exerciseName,
          s.setNumber,
          s.weight,
          s.reps,
          s.isCompleted ? 'TRUE' : 'FALSE',
          s.completedAt || new Date().toISOString()
        ];
      });

      const allSetRows = remainingSets.concat(rowsToAdd);
      if (setData.length > 1) {
        setSheet.getRange(2, 1, setData.length - 1, 7).clearContent();
      }
      if (allSetRows.length > 0) {
        setSheet.getRange(2, 1, allSetRows.length, 7).setValues(allSetRows);
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 有酸素運動の保存（重複時は既存を更新）
    if (data.action === 'SAVE_CARDIO') {
      const cardio = data.cardio;
      const clSheet = ss.getSheetByName('cardio_logs') || ss.insertSheet('cardio_logs');
      const clData = clSheet.getDataRange().getValues();
      let existingClRow = -1;
      for (let i = 1; i < clData.length; i++) {
        if (String(clData[i][0]).trim() === cardio.id) {
          existingClRow = i + 1;
          break;
        }
      }

      const rowValues = [
        cardio.id,
        cardio.cardioTypeName,
        cardio.distanceKm,
        cardio.durationMinutes,
        cardio.calories,
        cardio.endedAt,
        cardio.note || ''
      ];

      if (existingClRow > 0) {
        clSheet.getRange(existingClRow, 1, 1, 7).setValues([rowValues]);
      } else {
        clSheet.appendRow(rowValues);
      }

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

    // 曜日別デフォルトスケジュールの保存
    if (data.action === 'SAVE_SCHEDULE') {
      const schedule = data.schedule || [];
      const schedSheet = ss.getSheetByName('schedule') || ss.insertSheet('schedule');
      const lastRow = schedSheet.getLastRow();
      if (lastRow > 1) {
        schedSheet.getRange(2, 1, lastRow - 1, 3).clearContent();
      }
      const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
      const rows = schedule.map(function(s) {
        return [s.dayOfWeek, dayNames[s.dayOfWeek] || '', s.menuId || ''];
      });
      if (rows.length > 0) {
        schedSheet.getRange(2, 1, rows.length, 3).setValues(rows);
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // メニューテンプレートの保存
    if (data.action === 'SAVE_MENUS') {
      const routineMenus = data.routineMenus || [];
      const menuSheet = ss.getSheetByName('menus') || ss.insertSheet('menus');
      const lastRow = menuSheet.getLastRow();
      if (lastRow > 1) {
        menuSheet.getRange(2, 1, lastRow - 1, 5).clearContent();
      }
      const rows = routineMenus.map(function(m, idx) {
        return [
          m.id,
          m.name,
          m.targetParts || '',
          m.sortOrder !== undefined ? m.sortOrder : idx + 1,
          JSON.stringify(m.exercises || [])
        ];
      });
      if (rows.length > 0) {
        menuSheet.getRange(2, 1, rows.length, 5).setValues(rows);
      }

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
