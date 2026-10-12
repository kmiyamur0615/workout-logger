import { BodyPart, Exercise, RoutineMenu, WeekdaySchedule, AppSettings, WorkoutSession, CardioType, CardioLog } from '../types';

export const INITIAL_BODY_PARTS: BodyPart[] = [
  { id: 'chest', name: '胸', sortOrder: 1, lastTrainedAt: '2026-10-12T16:40:00.000+09:00' },
  { id: 'arms', name: '腕', sortOrder: 5, lastTrainedAt: '2026-10-12T16:40:00.000+09:00' },
  { id: 'shoulders', name: '肩', sortOrder: 4, lastTrainedAt: '2026-10-11T16:40:00.000+09:00' },
  { id: 'back', name: '背中', sortOrder: 2, lastTrainedAt: '2026-10-10T16:40:00.000+09:00' },
  { id: 'legs', name: '脚', sortOrder: 3, lastTrainedAt: '2026-10-10T16:40:00.000+09:00' },
  { id: 'abs', name: '腹筋', sortOrder: 6, lastTrainedAt: '2026-10-01T16:40:00.000+09:00' },
  { id: 'other', name: 'その他', sortOrder: 7 },
];

export const INITIAL_EXERCISES: Exercise[] = [
  // 胸
  { id: 'ex-bench-press', bodyPartId: 'chest', name: 'ベンチプレス', equipment: 'BARBELL' },
  { id: 'ex-incline-bench-press', bodyPartId: 'chest', name: 'インクラインベンチプレス', equipment: 'BARBELL' },
  { id: 'ex-incline-db-press', bodyPartId: 'chest', name: 'インクライン ダンベルプレス', equipment: 'DUMBBELL' },
  { id: 'ex-dips', bodyPartId: 'chest', name: 'ディップス', equipment: 'BODYWEIGHT' },
  { id: 'ex-cable-crossover', bodyPartId: 'chest', name: 'ケーブル クロスオーバー', equipment: 'CABLE' },
  
  // 背中
  { id: 'ex-deadlift', bodyPartId: 'back', name: 'デッドリフト', equipment: 'BARBELL' },
  { id: 'ex-lat-pulldown', bodyPartId: 'back', name: 'ラットプルダウン', equipment: 'MACHINE' },
  { id: 'ex-seated-row', bodyPartId: 'back', name: 'シーテッドロー', equipment: 'CABLE' },
  { id: 'ex-assisted-chinup', bodyPartId: 'back', name: 'アシストチンニング', equipment: 'MACHINE' },
  { id: 'ex-dumbbell-row', bodyPartId: 'back', name: 'ダンベルローイング', equipment: 'DUMBBELL' },
  { id: 'ex-db-one-arm-row', bodyPartId: 'back', name: 'ワンハンド ダンベルロー', equipment: 'DUMBBELL' },

  // 脚
  { id: 'ex-squat', bodyPartId: 'legs', name: 'バーベル スクワット', equipment: 'BARBELL' },
  { id: 'ex-leg-press', bodyPartId: 'legs', name: 'レッグプレス', equipment: 'MACHINE' },
  { id: 'ex-leg-curl', bodyPartId: 'legs', name: 'レッグカール', equipment: 'MACHINE' },
  { id: 'ex-calf-press', bodyPartId: 'legs', name: 'カーフプレス', equipment: 'MACHINE' },
  { id: 'ex-leg-extension', bodyPartId: 'legs', name: 'レッグエクステンション', equipment: 'MACHINE' },

  // 肩
  { id: 'ex-shoulder-press', bodyPartId: 'shoulders', name: 'ショルダープレス', equipment: 'MACHINE' },
  { id: 'ex-face-pull', bodyPartId: 'shoulders', name: 'ケーブルフェイスプル', equipment: 'CABLE' },
  { id: 'ex-shoulder-shrug', bodyPartId: 'shoulders', name: 'ショルダーシュラグ', equipment: 'BARBELL' },
  { id: 'ex-side-raise', bodyPartId: 'shoulders', name: 'サイドレイズ', equipment: 'DUMBBELL' },

  // 腕
  { id: 'ex-cable-pushdown', bodyPartId: 'arms', name: 'ケーブルプレスダウン', equipment: 'CABLE' },
  { id: 'ex-dumbbell-wrist-curl', bodyPartId: 'arms', name: 'ダンベルリストカール', equipment: 'DUMBBELL' },
  { id: 'ex-barbell-curl', bodyPartId: 'arms', name: 'バーベル アームカール', equipment: 'BARBELL' },

  // 腹
  { id: 'ex-cable-crunch', bodyPartId: 'abs', name: 'ケーブルクランチ', equipment: 'CABLE' },
  { id: 'ex-hanging-leg-raise', bodyPartId: 'abs', name: 'ハンギング レッグレイズ', equipment: 'BODYWEIGHT' },
];

export const INITIAL_ROUTINE_MENUS: RoutineMenu[] = [
  {
    id: 'menu-chest-arms',
    name: '胸・腕 (Push)',
    targetParts: '胸・腕',
    sortOrder: 1,
    exercises: [
      { exerciseId: 'ex-bench-press', targetSets: 3, targetReps: 10, targetWeight: 100 },
      { exerciseId: 'ex-cable-pushdown', targetSets: 3, targetReps: 10, targetWeight: 23.75 },
      { exerciseId: 'ex-incline-bench-press', targetSets: 3, targetReps: 10, targetWeight: 24 },
    ]
  },
  {
    id: 'menu-back',
    name: '背中 (Pull)',
    targetParts: '背中・肩リア',
    sortOrder: 2,
    exercises: [
      { exerciseId: 'ex-lat-pulldown', targetSets: 3, targetReps: 10, targetWeight: 89 },
      { exerciseId: 'ex-seated-row', targetSets: 3, targetReps: 10, targetWeight: 89 },
      { exerciseId: 'ex-face-pull', targetSets: 3, targetReps: 20, targetWeight: 18.75 },
    ]
  },
  {
    id: 'menu-legs-lower',
    name: '下半身 (Legs)',
    targetParts: '脚・カーフ',
    sortOrder: 3,
    exercises: [
      { exerciseId: 'ex-deadlift', targetSets: 3, targetReps: 8, targetWeight: 120 },
      { exerciseId: 'ex-leg-curl', targetSets: 3, targetReps: 10, targetWeight: 61 },
      { exerciseId: 'ex-calf-press', targetSets: 3, targetReps: 20, targetWeight: 200 },
    ]
  }
];

export const INITIAL_SCHEDULE: WeekdaySchedule[] = [
  { dayOfWeek: 0, menuId: null },                // 日曜: オフ
  { dayOfWeek: 1, menuId: 'menu-chest-arms' },   // 月曜: 胸・腕
  { dayOfWeek: 2, menuId: null },                // 火曜: オフ
  { dayOfWeek: 3, menuId: 'menu-back' },         // 水曜: 背中
  { dayOfWeek: 4, menuId: null },                // 木曜: オフ
  { dayOfWeek: 5, menuId: 'menu-legs-lower' },   // 金曜: 下半身
  { dayOfWeek: 6, menuId: null },                // 土曜: オフ
];

// 有酸素運動の初期種別
export const INITIAL_CARDIO_TYPES: CardioType[] = [
  { id: 'cardio-run', name: 'ランニング', defaultMets: 8.3 },
  { id: 'cardio-cycle', name: 'サイクリング', defaultMets: 6.8 },
  { id: 'cardio-walk', name: 'ウォーキング', defaultMets: 3.8 },
];

export const INITIAL_SETTINGS: AppSettings = {
  profile: {
    heightCm: 172,
    weightKg: 68,
  },
  gasWebAppUrl: '',
  appleShortcutName: 'WorkoutLoggerSync',
  cardioShortcutName: 'CardioLoggerSync',
  cardioShortcuts: {
    run: 'CardioSync_Run',
    cycle: 'CardioSync_Cycle',
    walk: 'CardioSync_Walk',
  },
  weightUnit: 'kg',
  hapticsEnabled: true,
  autoSyncGAS: true,
};

// スクショから読み取った過去の筋トレ履歴データ（全12セッション）
export const INITIAL_PAST_SESSIONS: WorkoutSession[] = [
  // 1. 2026/10/12 (IMG_5972.jpg)
  {
    id: 'session-20261012',
    startedAt: '2026-10-12T15:40:00.000+09:00',
    endedAt: '2026-10-12T16:40:00.000+09:00',
    menuName: '胸・腕',
    isSyncedWithGAS: true,
    isSyncedWithHealth: true,
    exercises: [
      {
        id: 'we-20261012-1',
        exerciseId: 'ex-bench-press',
        exerciseName: 'ベンチプレス',
        bodyPartId: 'chest',
        orderIndex: 1,
        sets: [
          { id: 's-1012-1-1', setNumber: 1, weight: 100.0, reps: 12, isCompleted: true },
          { id: 's-1012-1-2', setNumber: 2, weight: 100.0, reps: 12, isCompleted: true },
          { id: 's-1012-1-3', setNumber: 3, weight: 100.0, reps: 10, isCompleted: true },
        ]
      },
      {
        id: 'we-20261012-2',
        exerciseId: 'ex-cable-pushdown',
        exerciseName: 'ケーブルプレスダウン',
        bodyPartId: 'arms',
        orderIndex: 2,
        sets: [
          { id: 's-1012-2-1', setNumber: 1, weight: 23.75, reps: 9, isCompleted: true },
          { id: 's-1012-2-2', setNumber: 2, weight: 23.75, reps: 9, isCompleted: true },
          { id: 's-1012-2-3', setNumber: 3, weight: 23.75, reps: 8, isCompleted: true },
        ]
      }
    ]
  },

  // 2. 2026/10/11 (IMG_5973.PNG)
  {
    id: 'session-20261011',
    startedAt: '2026-10-11T16:00:00.000+09:00',
    endedAt: '2026-10-11T16:40:00.000+09:00',
    menuName: '肩リア',
    isSyncedWithGAS: true,
    isSyncedWithHealth: true,
    exercises: [
      {
        id: 'we-20261011-1',
        exerciseId: 'ex-face-pull',
        exerciseName: 'ケーブルフェイスプル',
        bodyPartId: 'shoulders',
        orderIndex: 1,
        sets: [
          { id: 's-1011-1-1', setNumber: 1, weight: 18.75, reps: 20, isCompleted: true },
          { id: 's-1011-1-2', setNumber: 2, weight: 18.75, reps: 15, isCompleted: true },
          { id: 's-1011-1-3', setNumber: 3, weight: 18.75, reps: 20, isCompleted: true },
        ]
      }
    ]
  },

  // 3. 2026/10/10 (IMG_5974.PNG)
  {
    id: 'session-20261010',
    startedAt: '2026-10-10T15:30:00.000+09:00',
    endedAt: '2026-10-10T16:40:00.000+09:00',
    menuName: '下半身',
    isSyncedWithGAS: true,
    isSyncedWithHealth: true,
    exercises: [
      {
        id: 'we-20261010-1',
        exerciseId: 'ex-deadlift',
        exerciseName: 'デッドリフト',
        bodyPartId: 'back',
        orderIndex: 1,
        sets: [
          { id: 's-1010-1-1', setNumber: 1, weight: 120.0, reps: 8, isCompleted: true },
          { id: 's-1010-1-2', setNumber: 2, weight: 120.0, reps: 8, isCompleted: true },
          { id: 's-1010-1-3', setNumber: 3, weight: 120.0, reps: 8, isCompleted: true },
        ]
      },
      {
        id: 'we-20261010-2',
        exerciseId: 'ex-leg-curl',
        exerciseName: 'レッグカール',
        bodyPartId: 'legs',
        orderIndex: 2,
        sets: [
          { id: 's-1010-2-1', setNumber: 1, weight: 61.0, reps: 10, isCompleted: true },
          { id: 's-1010-2-2', setNumber: 2, weight: 61.0, reps: 10, isCompleted: true },
          { id: 's-1010-2-3', setNumber: 3, weight: 61.0, reps: 10, isCompleted: true },
        ]
      },
      {
        id: 'we-20261010-3',
        exerciseId: 'ex-calf-press',
        exerciseName: 'カーフプレス',
        bodyPartId: 'legs',
        orderIndex: 3,
        sets: [
          { id: 's-1010-3-1', setNumber: 1, weight: 195.0, reps: 20, isCompleted: true },
          { id: 's-1010-3-2', setNumber: 2, weight: 195.0, reps: 20, isCompleted: true },
          { id: 's-1010-3-3', setNumber: 3, weight: 195.0, reps: 20, isCompleted: true },
        ]
      }
    ]
  },

  // 4. 2026/10/09 (IMG_5975.PNG)
  {
    id: 'session-20261009',
    startedAt: '2026-10-09T15:30:00.000+09:00',
    endedAt: '2026-10-09T16:40:00.000+09:00',
    menuName: '背中・肩リア',
    isSyncedWithGAS: true,
    isSyncedWithHealth: true,
    exercises: [
      {
        id: 'we-20261009-1',
        exerciseId: 'ex-lat-pulldown',
        exerciseName: 'ラットプルダウン',
        bodyPartId: 'back',
        orderIndex: 1,
        sets: [
          { id: 's-1009-1-1', setNumber: 1, weight: 89.0, reps: 10, isCompleted: true },
          { id: 's-1009-1-2', setNumber: 2, weight: 89.0, reps: 6, isCompleted: true },
          { id: 's-1009-1-3', setNumber: 3, weight: 89.0, reps: 5, isCompleted: true },
        ]
      },
      {
        id: 'we-20261009-2',
        exerciseId: 'ex-seated-row',
        exerciseName: 'シーテッドロー',
        bodyPartId: 'back',
        orderIndex: 2,
        sets: [
          { id: 's-1009-2-1', setNumber: 1, weight: 89.0, reps: 10, isCompleted: true },
          { id: 's-1009-2-2', setNumber: 2, weight: 89.0, reps: 7, isCompleted: true },
          { id: 's-1009-2-3', setNumber: 3, weight: 89.0, reps: 10, isCompleted: true },
        ]
      },
      {
        id: 'we-20261009-3',
        exerciseId: 'ex-face-pull',
        exerciseName: 'ケーブルフェイスプル',
        bodyPartId: 'shoulders',
        orderIndex: 3,
        sets: [
          { id: 's-1009-3-1', setNumber: 1, weight: 16.25, reps: 20, isCompleted: true },
          { id: 's-1009-3-2', setNumber: 2, weight: 18.75, reps: 17, isCompleted: true },
          { id: 's-1009-3-3', setNumber: 3, weight: 18.75, reps: 14, isCompleted: true },
        ]
      }
    ]
  },

  // 5. 2026/10/08 (IMG_5976.PNG)
  {
    id: 'session-20261008',
    startedAt: '2026-10-08T16:00:00.000+09:00',
    endedAt: '2026-10-08T16:40:00.000+09:00',
    menuName: '肩',
    isSyncedWithGAS: true,
    isSyncedWithHealth: true,
    exercises: [
      {
        id: 'we-20261008-1',
        exerciseId: 'ex-shoulder-press',
        exerciseName: 'ショルダープレス',
        bodyPartId: 'shoulders',
        orderIndex: 1,
        sets: [
          { id: 's-1008-1-1', setNumber: 1, weight: 60.0, reps: 10, isCompleted: true },
          { id: 's-1008-1-2', setNumber: 2, weight: 81.0, reps: 10, isCompleted: true },
          { id: 's-1008-1-3', setNumber: 3, weight: 81.0, reps: 10, isCompleted: true },
        ]
      }
    ]
  },

  // 6. 2026/10/06 (IMG_5977.PNG)
  {
    id: 'session-20261006',
    startedAt: '2026-10-06T15:30:00.000+09:00',
    endedAt: '2026-10-06T16:40:00.000+09:00',
    menuName: '背中・前腕',
    isSyncedWithGAS: true,
    isSyncedWithHealth: true,
    exercises: [
      {
        id: 'we-20261006-1',
        exerciseId: 'ex-assisted-chinup',
        exerciseName: 'アシストチンニング',
        bodyPartId: 'back',
        orderIndex: 1,
        sets: [
          { id: 's-1006-1-1', setNumber: 1, weight: 89.0, reps: 7, isCompleted: true },
          { id: 's-1006-1-2', setNumber: 2, weight: 89.0, reps: 7, isCompleted: true },
          { id: 's-1006-1-3', setNumber: 3, weight: 89.0, reps: 7, isCompleted: true },
        ]
      },
      {
        id: 'we-20261006-2',
        exerciseId: 'ex-dumbbell-row',
        exerciseName: 'ダンベルローイング',
        bodyPartId: 'back',
        orderIndex: 2,
        sets: [
          { id: 's-1006-2-1', setNumber: 1, weight: 18.0, reps: 10, isCompleted: true },
          { id: 's-1006-2-2', setNumber: 2, weight: 20.0, reps: 10, isCompleted: true },
          { id: 's-1006-2-3', setNumber: 3, weight: 20.0, reps: 10, isCompleted: true },
        ]
      },
      {
        id: 'we-20261006-3',
        exerciseId: 'ex-dumbbell-wrist-curl',
        exerciseName: 'ダンベルリストカール',
        bodyPartId: 'arms',
        orderIndex: 3,
        sets: [
          { id: 's-1006-3-1', setNumber: 1, weight: 9.0, reps: 10, isCompleted: true },
          { id: 's-1006-3-2', setNumber: 2, weight: 9.0, reps: 10, isCompleted: true },
          { id: 's-1006-3-3', setNumber: 3, weight: 9.0, reps: 10, isCompleted: true },
        ]
      }
    ]
  },

  // 7. 2026/10/05 (IMG_5978.PNG)
  {
    id: 'session-20261005',
    startedAt: '2026-10-05T15:30:00.000+09:00',
    endedAt: '2026-10-05T16:40:00.000+09:00',
    menuName: '胸・腕',
    isSyncedWithGAS: true,
    isSyncedWithHealth: true,
    exercises: [
      {
        id: 'we-20261005-1',
        exerciseId: 'ex-bench-press',
        exerciseName: 'ベンチプレス',
        bodyPartId: 'chest',
        orderIndex: 1,
        sets: [
          { id: 's-1005-1-1', setNumber: 1, weight: 100.0, reps: 6, isCompleted: true },
          { id: 's-1005-1-2', setNumber: 2, weight: 100.0, reps: 7, isCompleted: true },
          { id: 's-1005-1-3', setNumber: 3, weight: 100.0, reps: 8, isCompleted: true },
        ]
      },
      {
        id: 'we-20261005-2',
        exerciseId: 'ex-cable-pushdown',
        exerciseName: 'ケーブルプレスダウン',
        bodyPartId: 'arms',
        orderIndex: 2,
        sets: [
          { id: 's-1005-2-1', setNumber: 1, weight: 23.75, reps: 10, isCompleted: true },
          { id: 's-1005-2-2', setNumber: 2, weight: 23.75, reps: 10, isCompleted: true },
          { id: 's-1005-2-3', setNumber: 3, weight: 23.75, reps: 10, isCompleted: true },
        ]
      },
      {
        id: 'we-20261005-3',
        exerciseId: 'ex-incline-bench-press',
        exerciseName: 'インクラインベンチプレス',
        bodyPartId: 'chest',
        orderIndex: 3,
        sets: [
          { id: 's-1005-3-1', setNumber: 1, weight: 24.0, reps: 10, isCompleted: true },
          { id: 's-1005-3-2', setNumber: 2, weight: 24.0, reps: 10, isCompleted: true },
          { id: 's-1005-3-3', setNumber: 3, weight: 24.0, reps: 10, isCompleted: true },
        ]
      }
    ]
  },

  // 8. 2026/10/04 (IMG_5979.PNG)
  {
    id: 'session-20261004',
    startedAt: '2026-10-04T16:00:00.000+09:00',
    endedAt: '2026-10-04T16:40:00.000+09:00',
    menuName: '肩リア',
    isSyncedWithGAS: true,
    isSyncedWithHealth: true,
    exercises: [
      {
        id: 'we-20261004-1',
        exerciseId: 'ex-face-pull',
        exerciseName: 'ケーブルフェイスプル',
        bodyPartId: 'shoulders',
        orderIndex: 1,
        sets: [
          { id: 's-1004-1-1', setNumber: 1, weight: 16.25, reps: 20, isCompleted: true },
          { id: 's-1004-1-2', setNumber: 2, weight: 16.25, reps: 20, isCompleted: true },
          { id: 's-1004-1-3', setNumber: 3, weight: 16.25, reps: 20, isCompleted: true },
        ]
      }
    ]
  },

  // 9. 2026/10/03 (IMG_5980.PNG)
  {
    id: 'session-20261003',
    startedAt: '2026-10-03T15:30:00.000+09:00',
    endedAt: '2026-10-03T16:40:00.000+09:00',
    menuName: '下半身',
    isSyncedWithGAS: true,
    isSyncedWithHealth: true,
    exercises: [
      {
        id: 'we-20261003-1',
        exerciseId: 'ex-leg-curl',
        exerciseName: 'レッグカール',
        bodyPartId: 'legs',
        orderIndex: 1,
        sets: [
          { id: 's-1003-1-1', setNumber: 1, weight: 61.0, reps: 10, isCompleted: true },
          { id: 's-1003-1-2', setNumber: 2, weight: 61.0, reps: 10, isCompleted: true },
          { id: 's-1003-1-3', setNumber: 3, weight: 61.0, reps: 10, isCompleted: true },
        ]
      },
      {
        id: 'we-20261003-2',
        exerciseId: 'ex-deadlift',
        exerciseName: 'デッドリフト',
        bodyPartId: 'back',
        orderIndex: 2,
        sets: [
          { id: 's-1003-2-1', setNumber: 1, weight: 100.0, reps: 10, isCompleted: true },
          { id: 's-1003-2-2', setNumber: 2, weight: 100.0, reps: 10, isCompleted: true },
          { id: 's-1003-2-3', setNumber: 3, weight: 100.0, reps: 10, isCompleted: true },
        ]
      },
      {
        id: 'we-20261003-3',
        exerciseId: 'ex-calf-press',
        exerciseName: 'カーフプレス',
        bodyPartId: 'legs',
        orderIndex: 3,
        sets: [
          { id: 's-1003-3-1', setNumber: 1, weight: 200.0, reps: 20, isCompleted: true },
          { id: 's-1003-3-2', setNumber: 2, weight: 200.0, reps: 20, isCompleted: true },
          { id: 's-1003-3-3', setNumber: 3, weight: 200.0, reps: 20, isCompleted: true },
        ]
      }
    ]
  },

  // 10. 2026/10/02 (IMG_5981.PNG)
  {
    id: 'session-20261002',
    startedAt: '2026-10-02T15:30:00.000+09:00',
    endedAt: '2026-10-02T16:40:00.000+09:00',
    menuName: '背中・肩・脚',
    isSyncedWithGAS: true,
    isSyncedWithHealth: true,
    exercises: [
      {
        id: 'we-20261002-1',
        exerciseId: 'ex-seated-row',
        exerciseName: 'シーテッドロー',
        bodyPartId: 'back',
        orderIndex: 1,
        sets: [
          { id: 's-1002-1-1', setNumber: 1, weight: 82.0, reps: 12, isCompleted: true },
          { id: 's-1002-1-2', setNumber: 2, weight: 89.0, reps: 10, isCompleted: true },
          { id: 's-1002-1-3', setNumber: 3, weight: 89.0, reps: 10, isCompleted: true },
        ]
      },
      {
        id: 'we-20261002-2',
        exerciseId: 'ex-face-pull',
        exerciseName: 'ケーブルフェイスプル',
        bodyPartId: 'shoulders',
        orderIndex: 2,
        sets: [
          { id: 's-1002-2-1', setNumber: 1, weight: 13.75, reps: 15, isCompleted: true },
          { id: 's-1002-2-2', setNumber: 2, weight: 16.25, reps: 15, isCompleted: true },
          { id: 's-1002-2-3', setNumber: 3, weight: 16.25, reps: 15, isCompleted: true },
        ]
      },
      {
        id: 'we-20261002-3',
        exerciseId: 'ex-leg-press',
        exerciseName: 'レッグプレス',
        bodyPartId: 'legs',
        orderIndex: 3,
        sets: [
          { id: 's-1002-3-1', setNumber: 1, weight: 200.0, reps: 20, isCompleted: true },
          { id: 's-1002-3-2', setNumber: 2, weight: 200.0, reps: 20, isCompleted: true },
          { id: 's-1002-3-3', setNumber: 3, weight: 200.0, reps: 20, isCompleted: true },
        ]
      }
    ]
  },

  // 11. 2026/10/01 (IMG_5982.PNG)
  {
    id: 'session-20261001',
    startedAt: '2026-10-01T15:50:00.000+09:00',
    endedAt: '2026-10-01T16:40:00.000+09:00',
    menuName: '背中・脚',
    isSyncedWithGAS: true,
    isSyncedWithHealth: true,
    exercises: [
      {
        id: 'we-20261001-1',
        exerciseId: 'ex-lat-pulldown',
        exerciseName: 'ラットプルダウン',
        bodyPartId: 'back',
        orderIndex: 1,
        sets: [
          { id: 's-1001-1-1', setNumber: 1, weight: 96.0, reps: 6, isCompleted: true },
          { id: 's-1001-1-2', setNumber: 2, weight: 89.0, reps: 7, isCompleted: true },
          { id: 's-1001-1-3', setNumber: 3, weight: 89.0, reps: 6, isCompleted: true },
        ]
      },
      {
        id: 'we-20261001-2',
        exerciseId: 'ex-leg-curl',
        exerciseName: 'レッグカール',
        bodyPartId: 'legs',
        orderIndex: 2,
        sets: [
          { id: 's-1001-2-1', setNumber: 1, weight: 54.0, reps: 10, isCompleted: true },
          { id: 's-1001-2-2', setNumber: 2, weight: 61.0, reps: 10, isCompleted: true },
          { id: 's-1001-2-3', setNumber: 3, weight: 61.0, reps: 10, isCompleted: true },
        ]
      }
    ]
  },

  // 12. 2026/09/30 (IMG_5983.PNG)
  {
    id: 'session-20260930',
    startedAt: '2026-09-30T15:30:00.000+09:00',
    endedAt: '2026-09-30T16:40:00.000+09:00',
    menuName: '胸・肩・カーフ',
    isSyncedWithGAS: true,
    isSyncedWithHealth: true,
    exercises: [
      {
        id: 'we-20260930-1',
        exerciseId: 'ex-bench-press',
        exerciseName: 'ベンチプレス',
        bodyPartId: 'chest',
        orderIndex: 1,
        sets: [
          { id: 's-0930-1-1', setNumber: 1, weight: 100.0, reps: 6, isCompleted: true },
          { id: 's-0930-1-2', setNumber: 2, weight: 100.0, reps: 6, isCompleted: true },
          { id: 's-0930-1-3', setNumber: 3, weight: 100.0, reps: 6, isCompleted: true },
        ]
      },
      {
        id: 'we-20260930-2',
        exerciseId: 'ex-shoulder-shrug',
        exerciseName: 'ショルダーシュラグ',
        bodyPartId: 'shoulders',
        orderIndex: 2,
        sets: [
          { id: 's-0930-2-1', setNumber: 1, weight: 100.0, reps: 10, isCompleted: true },
          { id: 's-0930-2-2', setNumber: 2, weight: 100.0, reps: 10, isCompleted: true },
          { id: 's-0930-2-3', setNumber: 3, weight: 100.0, reps: 10, isCompleted: true },
        ]
      },
      {
        id: 'we-20260930-3',
        exerciseId: 'ex-calf-press',
        exerciseName: 'カーフプレス',
        bodyPartId: 'legs',
        orderIndex: 3,
        sets: [
          { id: 's-0930-3-1', setNumber: 1, weight: 200.0, reps: 20, isCompleted: true },
          { id: 's-0930-3-2', setNumber: 2, weight: 200.0, reps: 20, isCompleted: true },
          { id: 's-0930-3-3', setNumber: 3, weight: 200.0, reps: 20, isCompleted: true },
        ]
      }
    ]
  }
];

// 初期有酸素ログ（サンプル）
export const INITIAL_CARDIO_LOGS: CardioLog[] = [
  {
    id: 'cardio-sample-1',
    cardioTypeId: 'cardio-run',
    cardioTypeName: 'ランニング',
    distanceKm: 5.0,
    durationMinutes: 30,
    endedAt: '2026-10-07T18:00:00.000+09:00',
    calories: 357,
    note: 'トレッドミル傾斜1%'
  }
];
