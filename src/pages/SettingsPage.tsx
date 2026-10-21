import React, { useState } from 'react';
import { 
  Settings, 
  Database, 
  Download, 
  Check, 
  RefreshCw, 
  User, 
  Activity, 
  Plus, 
  Trash2, 
  ArrowDownToLine, 
  Smartphone,
  Calendar,
  Dumbbell,
  Edit3,
  RotateCcw
} from 'lucide-react';
import { AppSettings, CardioType, RoutineMenu, WeekdaySchedule, Exercise, DayOfWeek, BodyPart, EquipmentType } from '../types';
import { StorageService } from '../services/storage';

const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  BARBELL: 'バーベル',
  DUMBBELL: 'ダンベル',
  MACHINE: 'マシン',
  CABLE: 'ケーブル',
  BODYWEIGHT: '自重',
  OTHER: 'その他',
};

interface SettingsPageProps {
  settings: AppSettings;
  cardioTypes: CardioType[];
  routineMenus: RoutineMenu[];
  schedule: WeekdaySchedule[];
  exercises: Exercise[];
  bodyParts: BodyPart[];
  onSaveSettings: (settings: AppSettings) => void;
  onAddExercise: (exercise: Exercise) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onAddCardioType: (type: CardioType) => void;
  onDeleteCardioType: (typeId: string) => void;
  onUpdateSchedule: (newSchedule: WeekdaySchedule[]) => void;
  onSaveMenu: (menu: RoutineMenu) => void;
  onDeleteMenu: (menuId: string) => void;
  onSyncGAS: () => Promise<void>;
  isSyncing: boolean;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  cardioTypes,
  routineMenus,
  schedule,
  exercises,
  bodyParts,
  onSaveSettings,
  onAddExercise,
  onDeleteExercise,
  onAddCardioType,
  onDeleteCardioType,
  onUpdateSchedule,
  onSaveMenu,
  onDeleteMenu,
  onSyncGAS,
  isSyncing,
}) => {
  const [height, setHeight] = useState<string>(settings.profile?.heightCm?.toString() || '172');
  const [weight, setWeight] = useState<string>(settings.profile?.weightKg?.toString() || '68');
  const [gasUrl, setGasUrl] = useState(settings.gasWebAppUrl);
  const [shortcutName, setShortcutName] = useState(settings.appleShortcutName);
  const [cardioShortcutName, setCardioShortcutName] = useState(settings.cardioShortcutName || 'CardioLoggerSync');
  const [runShortcut, setRunShortcut] = useState(settings.cardioShortcuts?.run || 'CardioSync_Run');
  const [cycleShortcut, setCycleShortcut] = useState(settings.cardioShortcuts?.cycle || 'CardioSync_Cycle');
  const [walkShortcut, setWalkShortcut] = useState(settings.cardioShortcuts?.walk || 'CardioSync_Walk');
  const [hapticsEnabled, setHapticsEnabled] = useState(settings.hapticsEnabled ?? true);
  const [isSaved, setIsSaved] = useState(false);

  React.useEffect(() => {
    if (settings.gasWebAppUrl && settings.gasWebAppUrl !== gasUrl) {
      setGasUrl(settings.gasWebAppUrl);
    }
  }, [settings.gasWebAppUrl]);

  React.useEffect(() => {
    if (settings.profile?.heightCm) {
      setHeight(settings.profile.heightCm.toString());
    }
    if (settings.profile?.weightKg) {
      setWeight(settings.profile.weightKg.toString());
    }
  }, [settings.profile?.heightCm, settings.profile?.weightKg]);

  // 身長・体重の入力時に即座にローカル保存し、フォーカスアウト時にGASへも同期する
  const commitProfileChange = (nextHeightStr: string, nextWeightStr: string, syncToRemote: boolean) => {
    const parsedH = parseFloat(nextHeightStr);
    const parsedW = parseFloat(nextWeightStr);
    const validH = !isNaN(parsedH) && parsedH >= 100 && parsedH <= 250 ? parsedH : (settings.profile?.heightCm || 172);
    const validW = !isNaN(parsedW) && parsedW >= 20 && parsedW <= 300 ? parsedW : (settings.profile?.weightKg || 68);

    const updated: AppSettings = {
      ...StorageService.getSettings(),
      profile: {
        heightCm: validH,
        weightKg: validW,
        weightUpdatedAt: new Date().toISOString(),
      },
    };
    StorageService.saveSettings(updated);
    if (syncToRemote) {
      onSaveSettings(updated);
    }
  };

  // 筋トレ種目追加
  const [exerciseFilterPart, setExerciseFilterPart] = useState<string>('all');
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExercisePart, setNewExercisePart] = useState<string>('chest');
  const [newExerciseEquipment, setNewExerciseEquipment] = useState<EquipmentType>('MACHINE');

  // 有酸素種別追加
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeMets, setNewTypeMets] = useState('7.0');

  // メニュー編集モーダル状態
  const [editingMenu, setEditingMenu] = useState<RoutineMenu | null>(null);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isCreatingExInMenu, setIsCreatingExInMenu] = useState(false);

  const weekdays: { day: DayOfWeek; name: string }[] = [
    { day: 1, name: '月曜日' },
    { day: 2, name: '火曜日' },
    { day: 3, name: '水曜日' },
    { day: 4, name: '木曜日' },
    { day: 5, name: '金曜日' },
    { day: 6, name: '土曜日' },
    { day: 0, name: '日曜日' },
  ];

  const handleSaveAll = () => {
    const updated: AppSettings = {
      ...settings,
      profile: {
        heightCm: parseFloat(height) || 170,
        weightKg: parseFloat(weight) || 65,
        weightUpdatedAt: new Date().toISOString(),
      },
      gasWebAppUrl: gasUrl.trim(),
      appleShortcutName: shortcutName.trim() || 'WorkoutLoggerSync',
      cardioShortcutName: cardioShortcutName.trim() || 'CardioLoggerSync',
      cardioShortcuts: {
        run: runShortcut.trim() || 'CardioSync_Run',
        cycle: cycleShortcut.trim() || 'CardioSync_Cycle',
        walk: walkShortcut.trim() || 'CardioSync_Walk',
      },
      hapticsEnabled: hapticsEnabled,
    };
    onSaveSettings(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleFetchWeightFromHealth = () => {
    commitProfileChange(height, weight, true);
    const currentOrigin = window.location.origin + window.location.pathname;
    const shortcutCmd = `GetWeightFromHealth`;
    const targetUrl = `shortcuts://run-shortcut?name=${encodeURIComponent(shortcutCmd)}&input=text&text=${encodeURIComponent(currentOrigin)}`;
    window.location.href = targetUrl;
  };

  const handleChangeDayMenu = (day: DayOfWeek, menuId: string) => {
    const updated = schedule.map(s => {
      if (s.dayOfWeek === day) {
        return { ...s, menuId: menuId === 'none' ? null : menuId };
      }
      return s;
    });
    onUpdateSchedule(updated);
  };

  const handleOpenNewMenu = () => {
    setEditingMenu({
      id: `menu-${Date.now()}`,
      name: '',
      targetParts: '',
      sortOrder: routineMenus.length + 1,
      exercises: []
    });
    setIsMenuModalOpen(true);
  };

  const handleOpenEditMenu = (menu: RoutineMenu) => {
    setEditingMenu({ ...menu });
    setIsMenuModalOpen(true);
  };

  const handleSaveMenuModal = () => {
    if (!editingMenu || !editingMenu.name.trim()) return;
    onSaveMenu(editingMenu);
    setIsMenuModalOpen(false);
    setEditingMenu(null);
  };

  const handleAddExerciseToEditingMenu = (exerciseId: string) => {
    if (!editingMenu) return;
    setEditingMenu({
      ...editingMenu,
      exercises: [
        ...editingMenu.exercises,
        { exerciseId, targetSets: 3, targetReps: 10 }
      ]
    });
  };

  const handleRemoveExerciseFromEditingMenu = (idx: number) => {
    if (!editingMenu) return;
    const updated = [...editingMenu.exercises];
    updated.splice(idx, 1);
    setEditingMenu({ ...editingMenu, exercises: updated });
  };

  const handleCreateNewExercise = (andAddToMenu = false) => {
    const trimmed = newExerciseName.trim();
    if (!trimmed) return;
    const newEx: Exercise = {
      id: `ex-custom-${Date.now()}`,
      bodyPartId: newExercisePart,
      name: trimmed,
      equipment: newExerciseEquipment,
      isCustom: true,
    };
    onAddExercise(newEx);
    setNewExerciseName('');

    if (andAddToMenu && editingMenu) {
      handleAddExerciseToEditingMenu(newEx.id);
      setIsCreatingExInMenu(false);
    }
  };

  const handleCreateNewCardioType = () => {
    if (!newTypeName.trim()) return;
    const type: CardioType = {
      id: `cardio-custom-${Date.now()}`,
      name: newTypeName.trim(),
      defaultMets: parseFloat(newTypeMets) || 6.0,
      isCustom: true,
    };
    onAddCardioType(type);
    setNewTypeName('');
  };

  const handleExportData = () => {
    const data = {
      bodyParts: StorageService.getBodyParts(),
      exercises: StorageService.getExercises(),
      routineMenus: StorageService.getRoutineMenus(),
      schedule: StorageService.getSchedule(),
      pastSessions: StorageService.getPastSessions(),
      cardioTypes: StorageService.getCardioTypes(),
      cardioLogs: StorageService.getCardioLogs(),
      settings: StorageService.getSettings(),
      exportedAt: new Date().toISOString()
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-logger-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pb-28 px-4 pt-3 max-w-lg mx-auto space-y-5 animate-in fade-in duration-150">
      <div className="flex items-center gap-2 mb-1 px-1">
        <Settings className="w-5 h-5 text-slate-300" />
        <h2 className="text-base font-bold text-white tracking-tight">設定 ＆ メニュー管理</h2>
      </div>

      {/* 1. 曜日別デフォルトメニュー設定 */}
      <div className="bg-dark-850 border border-dark-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-neon" />
          <h3 className="text-sm font-bold text-white">曜日別デフォルトメニュー</h3>
        </div>
        <p className="text-[11px] text-slate-400">
          曜日ごとにデフォルトで実施するメニューを割り当てます。
        </p>

        <div className="space-y-1.5">
          {weekdays.map(({ day, name }) => {
            const currentSched = schedule.find(s => s.dayOfWeek === day);
            const currentVal = currentSched?.menuId || 'none';

            return (
              <div key={day} className="flex items-center justify-between p-2 rounded-xl bg-dark-900/60 border border-dark-800 text-xs">
                <span className="font-bold text-slate-200 w-16">{name}</span>
                <select
                  value={currentVal}
                  onChange={(e) => handleChangeDayMenu(day, e.target.value)}
                  className="bg-dark-800 border border-dark-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-brand-neon max-w-[180px] truncate"
                >
                  <option value="none">オフ (休養日)</option>
                  {routineMenus.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. メニューテンプレート一覧・編集 */}
      <div className="bg-dark-850 border border-dark-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-brand-neon" />
            <h3 className="text-sm font-bold text-white">メニューテンプレート</h3>
          </div>
          <button
            onClick={handleOpenNewMenu}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-neon text-dark-950 text-xs font-bold active:scale-95 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新規作成</span>
          </button>
        </div>

        <div className="space-y-2">
          {routineMenus.map((menu) => (
            <div key={menu.id} className="p-3 rounded-2xl bg-dark-900/60 border border-dark-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-white text-xs">{menu.name}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{menu.targetParts} · {menu.exercises.length}種目</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEditMenu(menu)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800"
                  title="編集"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteMenu(menu.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-dark-800"
                  title="削除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2.5 筋トレ種目の管理（追加・削除） */}
      <div className="bg-dark-850 border border-dark-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-brand-neon" />
            <h3 className="text-sm font-bold text-white">筋トレ種目の管理</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">{exercises.length}種目</span>
        </div>

        {/* 新規筋トレ種目追加フォーム */}
        <div className="p-3 rounded-2xl bg-dark-900/70 border border-dark-800 space-y-2.5">
          <div className="text-[11px] font-bold text-brand-neon">新しい筋トレ種目を追加</div>
          <input
            type="text"
            value={newExerciseName}
            onChange={(e) => setNewExerciseName(e.target.value)}
            placeholder="種目名 (例: ペックフライ、チンニング)"
            className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-neon"
          />
          <div className="flex items-center gap-2">
            <select
              value={newExercisePart}
              onChange={(e) => setNewExercisePart(e.target.value)}
              className="flex-1 bg-dark-800 border border-dark-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brand-neon"
            >
              {bodyParts.map(bp => (
                <option key={bp.id} value={bp.id}>{bp.name}</option>
              ))}
            </select>
            <select
              value={newExerciseEquipment}
              onChange={(e) => setNewExerciseEquipment(e.target.value as EquipmentType)}
              className="flex-1 bg-dark-800 border border-dark-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brand-neon"
            >
              {(Object.keys(EQUIPMENT_LABELS) as EquipmentType[]).map(eq => (
                <option key={eq} value={eq}>{EQUIPMENT_LABELS[eq]}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!newExerciseName.trim()}
              onClick={() => handleCreateNewExercise(false)}
              className="px-3.5 py-2 rounded-xl bg-brand-neon disabled:opacity-40 text-dark-950 font-black text-xs active:scale-95 transition-all flex items-center gap-1 shrink-0 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>追加</span>
            </button>
          </div>
        </div>

        {/* 部位別フィルター */}
        <div className="flex flex-wrap items-center gap-1.5 py-1 shrink-0">
          <button
            type="button"
            onClick={() => setExerciseFilterPart('all')}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold leading-snug whitespace-nowrap transition-all active:scale-95 ${
              exerciseFilterPart === 'all'
                ? 'bg-brand-neon text-dark-950 shadow-sm shadow-brand-neon/20'
                : 'bg-dark-800 text-slate-300 border border-dark-700'
            }`}
          >
            すべて
          </button>
          {bodyParts.map(bp => (
            <button
              key={bp.id}
              type="button"
              onClick={() => {
                setExerciseFilterPart(bp.id);
                setNewExercisePart(bp.id);
              }}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold leading-snug whitespace-nowrap transition-all active:scale-95 ${
                exerciseFilterPart === bp.id
                  ? 'bg-brand-neon text-dark-950 shadow-sm shadow-brand-neon/20'
                  : 'bg-dark-800 text-slate-300 border border-dark-700'
              }`}
            >
              {bp.name}
            </button>
          ))}
        </div>

        {/* 登録種目一覧 */}
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
          {exercises
            .filter(ex => exerciseFilterPart === 'all' || ex.bodyPartId === exerciseFilterPart)
            .map((ex) => {
              const bpName = bodyParts.find(b => b.id === ex.bodyPartId)?.name || ex.bodyPartId;
              return (
                <div
                  key={ex.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-dark-900/60 border border-dark-800 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-1.5 py-0.5 rounded bg-dark-800 text-slate-300 text-[10px] font-semibold shrink-0">
                      {bpName}
                    </span>
                    <span className="font-bold text-slate-100 truncate">{ex.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] text-slate-400">
                      {EQUIPMENT_LABELS[ex.equipment] || ex.equipment}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteExercise(ex.id)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-dark-800 transition-colors"
                      title="種目を削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* 3. 身体データ (体重・身長) */}
      <div className="bg-dark-850 border border-dark-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">身体データ (体重・身長)</h3>
          </div>
          {settings.profile?.weightUpdatedAt && (
            <span className="text-[10px] text-slate-400">
              更新: {new Date(settings.profile.weightUpdatedAt).toLocaleDateString('ja-JP')}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          有酸素運動時の正確な消費カロリー計算に使用されます。
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              身長 (cm)
            </label>
            <input
              type="number"
              step="0.5"
              value={height}
              onChange={(e) => {
                const next = e.target.value;
                setHeight(next);
                commitProfileChange(next, weight, false);
              }}
              onBlur={() => commitProfileChange(height, weight, true)}
              placeholder="172"
              className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-neon font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              体重 (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => {
                const next = e.target.value;
                setWeight(next);
                commitProfileChange(height, next, false);
              }}
              onBlur={() => commitProfileChange(height, weight, true)}
              placeholder="68.0"
              className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-neon font-mono font-bold"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleFetchWeightFromHealth}
          className="w-full py-2.5 px-3 rounded-xl bg-dark-800 hover:bg-dark-750 active:scale-98 text-xs font-semibold text-amber-400 border border-amber-500/30 transition-all flex items-center justify-center gap-1.5 shadow-sm"
        >
          <ArrowDownToLine className="w-4 h-4" />
          <span>Appleヘルスケアから最新体重を取得</span>
        </button>
      </div>

      {/* 4. 操作・フィードバック設定 (ハプティクス) */}
      <div className="bg-dark-850 border border-dark-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-brand-neon" />
          <h3 className="text-sm font-bold text-white">操作・フィードバック設定</h3>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-dark-900/60 border border-dark-800">
          <div>
            <div className="text-xs font-bold text-white">ハプティクス (触感バイブレーション)</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              画面タップや記録保存時の微細な振動フィードバック
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !hapticsEnabled;
              setHapticsEnabled(next);
              if (next && typeof navigator !== 'undefined' && navigator.vibrate) {
                try { navigator.vibrate(20); } catch (_) {}
              }
            }}
            className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 active:scale-95 ${
              hapticsEnabled ? 'bg-brand-neon' : 'bg-dark-700'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-dark-950 transition-transform ${
                hapticsEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 5. 有酸素運動の種別管理 */}
      <div className="bg-dark-850 border border-dark-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">有酸素運動の種別管理</h3>
        </div>

        <div className="space-y-1.5">
          {cardioTypes.map((type) => (
            <div key={type.id} className="flex items-center justify-between p-2 rounded-xl bg-dark-900/60 border border-dark-800 text-xs">
              <span className="font-bold text-slate-200">{type.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono">基準METs: {type.defaultMets}</span>
                {type.isCustom && (
                  <button
                    onClick={() => onDeleteCardioType(type.id)}
                    className="text-slate-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-dark-800 flex items-center gap-2">
          <input
            type="text"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            placeholder="種目名 (例: 水泳)"
            className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-neon"
          />
          <input
            type="number"
            step="0.1"
            value={newTypeMets}
            onChange={(e) => setNewTypeMets(e.target.value)}
            placeholder="METs"
            className="w-16 bg-dark-800 border border-dark-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
          />
          <button
            type="button"
            onClick={handleCreateNewCardioType}
            className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-brand-neon border border-dark-700"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 6. Googleスプレッドシート & ヘルスケア書き込みショートカット */}
      <div className="bg-dark-850 border border-dark-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-brand-neon" />
          <h3 className="text-sm font-bold text-white">Googleスプレッドシート連携</h3>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
            GAS Web App URL
          </label>
          <input
            type="url"
            value={gasUrl}
            onChange={(e) => setGasUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-neon font-mono"
          />
        </div>

        <button
          type="button"
          disabled={isSyncing || !gasUrl}
          onClick={onSyncGAS}
          className="w-full py-2 px-3 rounded-xl bg-dark-800 hover:bg-dark-750 active:scale-98 text-xs font-semibold text-slate-200 border border-dark-700 transition-all flex items-center justify-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-brand-neon' : ''}`} />
          <span>スプレッドシートから最新マスタを取得</span>
        </button>

        <div className="pt-2 border-t border-dark-800 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-brand-neon" />
              <span>筋トレ書き込みショートカット名</span>
            </label>
            <input
              type="text"
              value={shortcutName}
              onChange={(e) => setShortcutName(e.target.value)}
              placeholder="WorkoutLoggerSync"
              className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-neon font-mono"
            />
          </div>

          <div className="bg-dark-900/80 rounded-2xl p-3 border border-dark-750 space-y-2.5">
            <div className="flex items-center gap-1.5 text-amber-400">
              <Smartphone className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold">有酸素運動ショートカット（種別別連携）</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Appleヘルスケア側で「ランニング」「屋外サイクリング」「屋外ウォーキング」を正確に区別して記録するために、種別ごとのショートカットを指定できます。
            </p>

            <div className="grid grid-cols-1 gap-2 pt-1">
              <div>
                <label className="block text-[10px] text-slate-300 mb-0.5 flex items-center gap-1">
                  <span>🏃‍♂️ ランニング用ショートカット</span>
                </label>
                <input
                  type="text"
                  value={runShortcut}
                  onChange={(e) => setRunShortcut(e.target.value)}
                  placeholder="CardioSync_Run"
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-300 mb-0.5 flex items-center gap-1">
                  <span>🚴‍♂️ サイクリング用ショートカット</span>
                </label>
                <input
                  type="text"
                  value={cycleShortcut}
                  onChange={(e) => setCycleShortcut(e.target.value)}
                  placeholder="CardioSync_Cycle"
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-300 mb-0.5 flex items-center gap-1">
                  <span>🚶‍♂️ ウォーキング用ショートカット</span>
                </label>
                <input
                  type="text"
                  value={walkShortcut}
                  onChange={(e) => setWalkShortcut(e.target.value)}
                  placeholder="CardioSync_Walk"
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 flex items-center gap-1">
                  <span>⚡ その他・カスタム種別用 (フォールバック)</span>
                </label>
                <input
                  type="text"
                  value={cardioShortcutName}
                  onChange={(e) => setCardioShortcutName(e.target.value)}
                  placeholder="CardioLoggerSync"
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 設定保存ボタン */}
      <button
        type="button"
        onClick={handleSaveAll}
        className="w-full py-4 rounded-2xl bg-brand-neon hover:bg-green-400 active:scale-98 text-dark-950 font-black text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-xl shadow-brand-neon/25"
      >
        <Check className="w-4 h-4 stroke-[3]" />
        <span>{isSaved ? '設定を保存しました！' : '設定をすべて保存する'}</span>
      </button>

      {/* バックアップ */}
      <div className="bg-dark-850 border border-dark-800 rounded-3xl p-5 shadow-lg space-y-2">
        <h3 className="text-xs font-bold text-slate-300">データバックアップ</h3>
        <button
          type="button"
          onClick={handleExportData}
          className="w-full py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 active:scale-98 text-xs font-semibold text-slate-200 border border-dark-700 transition-all flex items-center justify-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5 text-brand-neon" />
          <span>全データをJSONでエクスポート</span>
        </button>
      </div>

      {/* アプリ情報 ＆ キャッシュクリア */}
      <div className="bg-dark-850 border border-dark-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300">アプリバージョン</span>
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-brand-neon/15 text-brand-neon font-bold">
            v1.6 (PWA自動同期対応)
          </span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          iPhoneホーム画面から起動した際に最新画面が反映されない場合は、下のボタンを押すとキャッシュを完全に削除して即座に最新版へ更新します。
        </p>
        <button
          type="button"
          onClick={async () => {
            if ('serviceWorker' in navigator) {
              const registrations = await navigator.serviceWorker.getRegistrations();
              for (const r of registrations) {
                await r.unregister();
              }
            }
            if ('caches' in window) {
              const keys = await caches.keys();
              for (const k of keys) {
                await caches.delete(k);
              }
            }
            window.location.replace(window.location.pathname + '?v=' + Date.now());
          }}
          className="w-full py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 active:scale-98 text-xs font-semibold text-slate-200 border border-dark-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
        >
          <RotateCcw className="w-3.5 h-3.5 text-brand-neon" />
          <span>キャッシュを完全削除して最新版に更新</span>
        </button>
      </div>

      {/* メニュー編集モーダル */}
      {isMenuModalOpen && editingMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-dark-900 border border-dark-700 w-full max-w-sm rounded-3xl p-5 shadow-2xl max-h-[85vh] flex flex-col">
            <h3 className="font-bold text-white text-base mb-3 pb-2 border-b border-dark-800">
              メニューを編集
            </h3>

            <div className="space-y-3 mb-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  メニュー名
                </label>
                <input
                  type="text"
                  value={editingMenu.name}
                  onChange={(e) => setEditingMenu({ ...editingMenu, name: e.target.value })}
                  placeholder="例: Push Day A"
                  className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-neon"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  対象部位 / 説明
                </label>
                <input
                  type="text"
                  value={editingMenu.targetParts}
                  onChange={(e) => setEditingMenu({ ...editingMenu, targetParts: e.target.value })}
                  placeholder="例: 胸・肩・三頭"
                  className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-neon"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  登録種目 ({editingMenu.exercises.length})
                </label>
                <div className="space-y-1.5 mb-2">
                  {editingMenu.exercises.map((item, idx) => {
                    const ex = exercises.find(e => e.id === item.exerciseId);
                    return (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-dark-800 border border-dark-700 text-xs">
                        <span className="font-semibold text-white truncate max-w-[150px]">
                          {ex?.name || '種目'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.targetSets}s × {item.targetReps}r
                          </span>
                          <button
                            onClick={() => handleRemoveExerciseFromEditingMenu(idx)}
                            className="text-slate-400 hover:text-red-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddExerciseToEditingMenu(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                  className="w-full bg-dark-800 border border-dashed border-dark-600 rounded-xl px-3 py-2 text-xs text-brand-neon focus:outline-none"
                >
                  <option value="" disabled>+ 既存の種目から追加する</option>
                  {exercises.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>

                {/* メニュー編集中の新規種目作成トグル */}
                <div className="mt-2">
                  {!isCreatingExInMenu ? (
                    <button
                      type="button"
                      onClick={() => setIsCreatingExInMenu(true)}
                      className="text-[11px] text-brand-neon hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Plus className="w-3 h-3" />
                      <span>新しい種目を作成して追加</span>
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl bg-dark-800 border border-brand-neon/30 space-y-2 mt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-brand-neon">新規種目を作成</span>
                        <button
                          type="button"
                          onClick={() => setIsCreatingExInMenu(false)}
                          className="text-[10px] text-slate-400 hover:text-white"
                        >
                          閉じる
                        </button>
                      </div>
                      <input
                        type="text"
                        value={newExerciseName}
                        onChange={(e) => setNewExerciseName(e.target.value)}
                        placeholder="種目名 (例: ペックフライ)"
                        className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-neon"
                      />
                      <div className="flex items-center gap-1.5">
                        <select
                          value={newExercisePart}
                          onChange={(e) => setNewExercisePart(e.target.value)}
                          className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-2 py-1.5 text-xs text-white"
                        >
                          {bodyParts.map(bp => (
                            <option key={bp.id} value={bp.id}>{bp.name}</option>
                          ))}
                        </select>
                        <select
                          value={newExerciseEquipment}
                          onChange={(e) => setNewExerciseEquipment(e.target.value as EquipmentType)}
                          className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-2 py-1.5 text-xs text-white"
                        >
                          {(Object.keys(EQUIPMENT_LABELS) as EquipmentType[]).map(eq => (
                            <option key={eq} value={eq}>{EQUIPMENT_LABELS[eq]}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!newExerciseName.trim()}
                          onClick={() => handleCreateNewExercise(true)}
                          className="px-3 py-1.5 rounded-lg bg-brand-neon disabled:opacity-40 text-dark-950 font-bold text-xs shrink-0"
                        >
                          追加
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-dark-800">
              <button
                type="button"
                onClick={() => setIsMenuModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-dark-800 text-slate-300 text-xs font-semibold"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSaveMenuModal}
                className="flex-1 py-2.5 rounded-xl bg-brand-neon text-dark-950 text-xs font-bold shadow-md shadow-brand-neon/20"
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
