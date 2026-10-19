export type BodyPartId = 
  | 'chest' 
  | 'back' 
  | 'legs' 
  | 'shoulders' 
  | 'arms' 
  | 'abs' 
  | 'other';

export interface BodyPart {
  id: string;
  name: string;
  sortOrder: number;
  lastTrainedAt?: string; // ISO date string
}

export type EquipmentType = 
  | 'BARBELL' 
  | 'DUMBBELL' 
  | 'MACHINE' 
  | 'CABLE' 
  | 'BODYWEIGHT' 
  | 'OTHER';

export interface Exercise {
  id: string;
  bodyPartId: string;
  name: string;
  equipment: EquipmentType;
  note?: string;
  isCustom?: boolean;
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  weight: number; // kg
  reps: number;
  isAssisted?: boolean;
  isCompleted: boolean;
  completedAt?: string;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  bodyPartId: string;
  orderIndex: number;
  note?: string;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  updatedAt?: string;
  menuId?: string;
  menuName?: string;
  note?: string;
  isSyncedWithGAS?: boolean;
  isSyncedWithHealth?: boolean;
  excludedExerciseIds?: string[];
  exercises: WorkoutExercise[];
}

export interface RoutineExerciseItem {
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  targetWeight?: number;
}

export interface RoutineMenu {
  id: string;
  name: string;
  targetParts: string;
  note?: string;
  exercises: RoutineExerciseItem[];
  sortOrder: number;
}

// 0: 日曜, 1: 月曜, ... 6: 土曜
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface WeekdaySchedule {
  dayOfWeek: DayOfWeek;
  menuId: string | null;
}

export interface ExerciseMaxRecord {
  weight: number;
  reps: number;
  estimated1RM: number;
  date: string;
}

export interface PreviousExerciseLog {
  date?: string;
  sets: {
    setNumber: number;
    weight: number;
    reps: number;
  }[];
  maxWeightRecord?: ExerciseMaxRecord;
  max1RMRecord?: ExerciseMaxRecord;
}

// 有酸素運動の種別マスタ
export interface CardioType {
  id: string;
  name: string;
  defaultMets: number;
  isCustom?: boolean;
}

// 有酸素運動の記録ログ
export interface CardioLog {
  id: string;
  cardioTypeId: string;
  cardioTypeName: string;
  distanceKm: number; // 距離(km)
  durationMinutes: number; // 時間(分)
  endedAt: string; // 終了日時 (ISO)
  calories: number; // 消費カロリー (kcal, 自動計算)
  note?: string;
}

// ユーザープロフィール (体重・身長)
export interface UserProfile {
  heightCm: number; // 身長 (cm)
  weightKg: number; // 体重 (kg)
  weightUpdatedAt?: string;
}

export interface CardioShortcutsConfig {
  run?: string;
  cycle?: string;
  walk?: string;
}

export interface AppSettings {
  profile: UserProfile;
  gasWebAppUrl: string;
  appleShortcutName: string;
  cardioShortcutName?: string;
  cardioShortcuts?: CardioShortcutsConfig;
  weightUnit: 'kg' | 'lb';
  hapticsEnabled: boolean;
  autoSyncGAS: boolean;
}
