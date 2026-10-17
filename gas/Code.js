/**
 * Workout Logger - Google Apps Script (GAS) バックエンド (v1.6)
 */

const STANDARD_EXERCISES = [
  { id: 'ex-bench-press', bodyPartId: 'chest', name: 'ベンチプレス', equipment: 'BARBELL' },
  { id: 'ex-incline-bench-press', bodyPartId: 'chest', name: 'インクラインベンチプレス', equipment: 'BARBELL' },
  { id: 'ex-dumbbell-press', bodyPartId: 'chest', name: 'ダンベルプレス', equipment: 'DUMBBELL' },
  { id: 'ex-pec-fly', bodyPartId: 'chest', name: 'ペックフライ (チェストフライ)', equipment: 'MACHINE' },
  { id: 'ex-dips', bodyPartId: 'chest', name: 'ディップス', equipment: 'BODYWEIGHT' },
  { id: 'ex-deadlift', bodyPartId: 'back', name: 'デッドリフト', equipment: 'BARBELL' },
  { id: 'ex-lat-pulldown', bodyPartId: 'back', name: 'ラットプルダウン', equipment: 'MACHINE' },
  { id: 'ex-seated-row', bodyPartId: 'back', name: 'シーテッドロー', equipment: 'CABLE' },
  { id: 'ex-assisted-chinup', bodyPartId: 'back', name: 'アシストチンニング', equipment: 'MACHINE' },
  { id: 'ex-chinup', bodyPartId: 'back', name: 'チンニング (懸垂)', equipment: 'BODYWEIGHT' },
  { id: 'ex-dumbbell-row', bodyPartId: 'back', name: 'ダンベルローイング', equipment: 'DUMBBELL' },
  { id: 'ex-bent-over-row', bodyPartId: 'back', name: 'ベントオーバー バーベルロー', equipment: 'BARBELL' },
  { id: 'ex-squat', bodyPartId: 'legs', name: 'バーベル スクワット', equipment: 'BARBELL' },
  { id: 'ex-leg-press', bodyPartId: 'legs', name: 'レッグプレス', equipment: 'MACHINE' },
  { id: 'ex-leg-curl', bodyPartId: 'legs', name: 'レッグカール', equipment: 'MACHINE' },
  { id: 'ex-calf-press', bodyPartId: 'legs', name: 'カーフプレス', equipment: 'MACHINE' },
  { id: 'ex-leg-extension', bodyPartId: 'legs', name: 'レッグエクステンション', equipment: 'MACHINE' },
  { id: 'ex-shoulder-press', bodyPartId: 'shoulders', name: 'ショルダープレス', equipment: 'MACHINE' },
  { id: 'ex-face-pull', bodyPartId: 'shoulders', name: 'ケーブルフェイスプル', equipment: 'CABLE' },
  { id: 'ex-shoulder-shrug', bodyPartId: 'shoulders', name: 'ショルダーシュラグ', equipment: 'BARBELL' },
  { id: 'ex-side-raise', bodyPartId: 'shoulders', name: 'サイドレイズ', equipment: 'DUMBBELL' },
  { id: 'ex-cable-pushdown', bodyPartId: 'arms', name: 'ケーブルプレスダウン', equipment: 'CABLE' },
  { id: 'ex-dumbbell-wrist-curl', bodyPartId: 'arms', name: 'ダンベルリストカール', equipment: 'DUMBBELL' },
  { id: 'ex-barbell-curl', bodyPartId: 'arms', name: 'バーベル アームカール', equipment: 'BARBELL' },
  { id: 'ex-cable-crunch', bodyPartId: 'abs', name: 'ケーブルクランチ', equipment: 'CABLE' },
  { id: 'ex-hanging-leg-raise', bodyPartId: 'abs', name: 'ハンギング レッグレイズ', equipment: 'BODYWEIGHT' }
];

function normalizeNameKey(name) {
  return String(name || '')
    .replace(/[\s　]+/g, '')
    .replace(/\(.*?\)|（.*?）/g, '')
    .trim();
}

function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. exercises (種目マスタ)
  let exSheet = ss.getSheetByName('exercises');
  if (!exSheet) {
    exSheet = ss.insertSheet('exercises');
    exSheet.appendRow(['exercise_id', 'body_part', 'exercise_name', 'equipment', 'note']);
    exSheet.getRange(1, 1, 1, 5).setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
    STANDARD_EXERCISES.forEach(function(ex) {
      exSheet.appendRow([ex.id, ex.bodyPartId, ex.name, ex.equipment, '']);
    });
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

/**
 * スプレッドシート内のデータ整合性マイグレーション
 */
function migrateExistingSessionIds() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let updatedWorkouts = 0;
  let updatedSets = 0;
  let dedupedCardio = 0;
  let addedExercises = 0;
  let updatedMenus = 0;

  // 1. exercises シートに標準種目が不足していれば追加
  const exSheet = ss.getSheetByName('exercises');
  if (exSheet) {
    const exData = exSheet.getDataRange().getValues();
    const existingIds = {};
    const existingNames = {};
    for (let i = 1; i < exData.length; i++) {
      if (exData[i][0]) {
        existingIds[String(exData[i][0])] = true;
        existingNames[normalizeNameKey(exData[i][2])] = true;
      }
    }
    STANDARD_EXERCISES.forEach(function(std) {
      if (!existingIds[std.id] && !existingNames[normalizeNameKey(std.name)]) {
        exSheet.appendRow([std.id, std.bodyPartId, std.name, std.equipment, '']);
        addedExercises++;
      }
    });
  }

  // 2. workouts シートの session_id を一括置換 ＆ 重複行排除
  const woSheet = ss.getSheetByName('workouts');
  if (woSheet) {
    const data = woSheet.getDataRange().getValues();
    const seenSessions = {};
    const cleanRows = [data[0]];
    let changed = false;
    for (let i = 1; i < data.length; i++) {
      const orig = String(data[i][0] || '').trim();
      if (!orig) continue;
      const norm = normalizeSessionId(orig);
      if (norm !== orig) {
        data[i][0] = norm;
        changed = true;
        updatedWorkouts++;
      }
      if (seenSessions[norm]) {
        changed = true;
        continue;
      }
      seenSessions[norm] = true;
      cleanRows.push(data[i]);
    }
    if (changed) {
      woSheet.clearContents();
      woSheet.getRange(1, 1, cleanRows.length, cleanRows[0].length).setValues(cleanRows);
    }
  }

  // 3. sets シートの session_id を一括置換
  const setSheet = ss.getSheetByName('sets');
  if (setSheet) {
    const data = setSheet.getDataRange().getValues();
    let changed = false;
    for (let i = 1; i < data.length; i++) {
      const orig = String(data[i][0] || '').trim();
      const norm = normalizeSessionId(orig);
      if (norm && norm !== orig) {
        data[i][0] = norm;
        changed = true;
        updatedSets++;
      }
    }
    if (changed) {
      setSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    }
  }

  // 4. cardio_logs シートの重複排除
  const clSheet = ss.getSheetByName('cardio_logs');
  if (clSheet) {
    const data = clSheet.getDataRange().getValues();
    const seenIds = {};
    const cleanRows = [data[0]];
    for (let i = 1; i < data.length; i++) {
      const cid = String(data[i][0] || '').trim();
      if (!cid) continue;
      if (seenIds[cid]) {
        dedupedCardio++;
        continue;
      }
      seenIds[cid] = true;
      cleanRows.push(data[i]);
    }
    if (dedupedCardio > 0) {
      clSheet.clearContents();
      clSheet.getRange(1, 1, cleanRows.length, cleanRows[0].length).setValues(cleanRows);
    }
  }

  // 5. menus シートの補完（scheduleで参照されているカスタムメニューと初期メニューの種目復元）
  const menuSheet = ss.getSheetByName('menus');
  if (menuSheet) {
    if (menuSheet.getLastColumn() < 5) {
      menuSheet.getRange(1, 5).setValue('exercises_json');
    }
    const reconstructedMenus = [
      {
        id: 'menu-chest-arms',
        name: '胸・腕 (Push)',
        targetParts: '胸・腕',
        sortOrder: 1,
        exercises: [
          { exerciseId: 'ex-bench-press', targetSets: 3, targetReps: 10, targetWeight: 100 },
          { exerciseId: 'ex-cable-pushdown', targetSets: 3, targetReps: 10, targetWeight: 23.75 },
          { exerciseId: 'ex-incline-bench-press', targetSets: 3, targetReps: 10, targetWeight: 24 }
        ]
      },
      {
        id: 'menu-1791865411429',
        name: 'Pull A（背中・二頭）',
        targetParts: '背中・二頭',
        sortOrder: 2,
        exercises: [
          { exerciseId: 'ex-chinup', targetSets: 3, targetReps: 8, targetWeight: 0 },
          { exerciseId: 'ex-dips', targetSets: 3, targetReps: 10, targetWeight: 0 },
          { exerciseId: 'ex-bent-over-row', targetSets: 3, targetReps: 10, targetWeight: 50 }
        ]
      },
      {
        id: 'menu-1791866449124',
        name: 'Legs & Abs A（脚・大腿四頭筋中心 ＋ 腹筋）',
        targetParts: '脚・腹筋',
        sortOrder: 3,
        exercises: [
          { exerciseId: 'ex-squat', targetSets: 3, targetReps: 10, targetWeight: 100 },
          { exerciseId: 'ex-leg-extension', targetSets: 3, targetReps: 8, targetWeight: 75 },
          { exerciseId: 'ex-hanging-leg-raise', targetSets: 2, targetReps: 10, targetWeight: 0 }
        ]
      },
      {
        id: 'menu-1792013452275',
        name: 'Push B（肩中部・上部胸・三頭）',
        targetParts: '肩・胸・三頭',
        sortOrder: 4,
        exercises: [
          { exerciseId: 'ex-custom-1792013511026', targetSets: 3, targetReps: 10, targetWeight: 24 },
          { exerciseId: 'ex-custom-1792013533591', targetSets: 3, targetReps: 10, targetWeight: 14 },
          { exerciseId: 'ex-custom-1792013575919', targetSets: 3, targetReps: 10, targetWeight: 18 }
        ]
      },
      {
        id: 'menu-1792100129673',
        name: 'Pull B（背中・後部三角筋・二頭）',
        targetParts: '背中・肩リア・二頭',
        sortOrder: 5,
        exercises: [
          { exerciseId: 'ex-lat-pulldown', targetSets: 3, targetReps: 8, targetWeight: 89 },
          { exerciseId: 'ex-face-pull', targetSets: 3, targetReps: 16, targetWeight: 21.25 },
          { exerciseId: 'ex-seated-row', targetSets: 3, targetReps: 10, targetWeight: 89 }
        ]
      },
      {
        id: 'menu-1792185639585',
        name: 'Legs & Abs B（下半身・ハムストリング中心）',
        targetParts: '脚・カーフ',
        sortOrder: 6,
        exercises: [
          { exerciseId: 'ex-deadlift', targetSets: 3, targetReps: 10, targetWeight: 100 },
          { exerciseId: 'ex-leg-curl', targetSets: 3, targetReps: 10, targetWeight: 61 },
          { exerciseId: 'ex-calf-press', targetSets: 3, targetReps: 20, targetWeight: 200 }
        ]
      }
    ];

    const mData = menuSheet.getDataRange().getValues();
    const existingMenuMap = {};
    for (let i = 1; i < mData.length; i++) {
      const mid = String(mData[i][0] || '').trim();
      if (!mid) continue;
      let exArr = [];
      try {
        if (mData[i][4]) exArr = JSON.parse(String(mData[i][4]));
      } catch (_) {}
      existingMenuMap[mid] = {
        id: mid,
        name: String(mData[i][1] || ''),
        targetParts: String(mData[i][2] || ''),
        sortOrder: Number(mData[i][3]) || i,
        exercises: exArr
      };
    }

    reconstructedMenus.forEach(function(rm) {
      const existing = existingMenuMap[rm.id];
      if (!existing || !existing.exercises || existing.exercises.length === 0) {
        existingMenuMap[rm.id] = rm;
        updatedMenus++;
      }
    });

    // 種目が空のまま残っている旧初期メニュー（menu-back, menu-legs-lower）を整理
    ['menu-back', 'menu-legs-lower'].forEach(function(oldId) {
      if (existingMenuMap[oldId] && (!existingMenuMap[oldId].exercises || existingMenuMap[oldId].exercises.length === 0)) {
        delete existingMenuMap[oldId];
        updatedMenus++;
      }
    });

    if (updatedMenus > 0) {
      const finalMenus = Object.keys(existingMenuMap)
        .map(function(k) { return existingMenuMap[k]; })
        .sort(function(a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
      const rows = finalMenus.map(function(m, idx) {
        return [
          m.id,
          m.name,
          m.targetParts || '',
          idx + 1,
          JSON.stringify(m.exercises || [])
        ];
      });
      const lastRow = menuSheet.getLastRow();
      if (lastRow > 1) {
        menuSheet.getRange(2, 1, lastRow - 1, 5).clearContent();
      }
      if (rows.length > 0) {
        menuSheet.getRange(2, 1, rows.length, 5).setValues(rows);
      }
    }
  }

  return {
    updatedWorkouts: updatedWorkouts,
    updatedSets: updatedSets,
    dedupedCardio: dedupedCardio,
    addedExercises: addedExercises,
    updatedMenus: updatedMenus
  };
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 表記ゆれ一括マイグレーションのリクエスト時
    if (e && e.parameter && e.parameter.action === 'MIGRATE_SESSION_IDS') {
      const migResult = migrateExistingSessionIds();
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', migration: migResult }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 1. exercises (種目マスタ)
    const exSheet = ss.getSheetByName('exercises');
    const exData = exSheet ? exSheet.getDataRange().getValues() : [];
    const exercises = [];
    const exerciseByNormName = {};

    // 標準種目を初期辞書に登録
    STANDARD_EXERCISES.forEach(function(std) {
      exerciseByNormName[normalizeNameKey(std.name)] = std;
    });

    for (let i = 1; i < exData.length; i++) {
      const row = exData[i];
      if (row[0]) {
        const exObj = {
          id: String(row[0]),
          bodyPartId: String(row[1]),
          name: String(row[2]),
          equipment: String(row[3]),
          note: String(row[4] || ''),
          isCustom: String(row[0]).indexOf('ex-custom-') === 0
        };
        exercises.push(exObj);
        exerciseByNormName[normalizeNameKey(exObj.name)] = exObj;
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

    function buildExercisesForSession(sId, rawSets) {
      const exerciseMap = {};
      const exList = [];
      rawSets.forEach(function(s, idx) {
        if (!exerciseMap[s.exerciseName]) {
          const matchedMaster = exerciseByNormName[normalizeNameKey(s.exerciseName)];
          const exObj = {
            id: 'we-' + sId + '-' + (exList.length + 1),
            exerciseId: matchedMaster ? matchedMaster.id : ('ex-custom-' + s.exerciseName),
            exerciseName: s.exerciseName,
            bodyPartId: matchedMaster ? matchedMaster.bodyPartId : 'other',
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
      return exList;
    }

    const pastSessions = [];
    const processedSessionIds = {};

    for (let i = 1; i < woData.length; i++) {
      const row = woData[i];
      const sId = normalizeSessionId(row[0]);
      if (!sId || processedSessionIds[sId]) continue;
      processedSessionIds[sId] = true;

      const rawSets = setsBySession[sId] || [];
      const exList = buildExercisesForSession(sId, rawSets);
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
        const exList = buildExercisesForSession(sId, rawSets);
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

    // 新しい日時順にソート
    pastSessions.sort(function(a, b) {
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
    });

    // 5. cardio_logs (有酸素運動ログ) - 重複IDを排除
    const clSheet = ss.getSheetByName('cardio_logs');
    const clData = clSheet ? clSheet.getDataRange().getValues() : [];
    const cardioLogs = [];
    const processedCardioIds = {};
    for (let i = 1; i < clData.length; i++) {
      const row = clData[i];
      const cId = String(row[0] || '').trim();
      if (!cId || processedCardioIds[cId]) continue;
      processedCardioIds[cId] = true;
      const cName = String(row[1] || '有酸素運動').trim();
      let cTypeId = 'cardio-custom';
      if (cName.indexOf('ランニング') >= 0) cTypeId = 'cardio-run';
      else if (cName.indexOf('サイクリング') >= 0 || cName.indexOf('バイク') >= 0) cTypeId = 'cardio-cycle';
      else if (cName.indexOf('ウォーキング') >= 0) cTypeId = 'cardio-walk';

      const endedAt = toIsoDateSafe(row[5]);
      const durationMin = Number(row[3]) || 0;
      const startedAtIso = new Date(new Date(endedAt).getTime() - durationMin * 60000).toISOString();
      cardioLogs.push({
        id: cId,
        cardioTypeId: cTypeId,
        cardioTypeName: cName,
        distanceKm: Number(row[2]) || 0,
        durationMinutes: durationMin,
        calories: Number(row[4]) || 0,
        startedAt: startedAtIso,
        endedAt: endedAt,
        note: String(row[6] || '')
      });
    }

    cardioLogs.sort(function(a, b) {
      return new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime();
    });

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

    // 新規筋トレ種目の追加（重複登録防止）
    if (data.action === 'ADD_EXERCISE') {
      const ex = data.exercise;
      const exSheet = ss.getSheetByName('exercises') || ss.insertSheet('exercises');
      const exData = exSheet.getDataRange().getValues();
      let exists = false;
      for (let i = 1; i < exData.length; i++) {
        if (String(exData[i][0]) === ex.id || normalizeNameKey(exData[i][2]) === normalizeNameKey(ex.name)) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        exSheet.appendRow([
          ex.id,
          ex.bodyPartId,
          ex.name,
          ex.equipment || 'OTHER',
          ex.note || ''
        ]);
      }

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

    // 既存セッションIDの表記ゆれ一括マイグレーション
    if (data.action === 'MIGRATE_SESSION_IDS') {
      const migResult = migrateExistingSessionIds();
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', migration: migResult }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'unknown_action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
