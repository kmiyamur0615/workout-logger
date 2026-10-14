import React, { useState } from 'react';
import { Activity, Flame, Plus, Check, Calendar, Smartphone } from 'lucide-react';
import { CardioType, CardioLog, UserProfile, AppSettings } from '../types';
import { calculateCardioCalories } from '../services/calorieCalculator';
import { HealthSyncService } from '../services/healthSync';

interface CardioPageProps {
  cardioTypes: CardioType[];
  cardioLogs?: CardioLog[];
  userProfile: UserProfile;
  settings?: AppSettings;
  cardioShortcutName?: string;
  onSaveCardioLog: (log: CardioLog) => void;
  onAddCardioType: (type: CardioType) => void;
  onDeleteCardioLog?: (logId: string) => void;
}

export const CardioPage: React.FC<CardioPageProps> = ({
  cardioTypes,
  userProfile,
  settings,
  cardioShortcutName = 'CardioLoggerSync',
  onSaveCardioLog,
  onAddCardioType,
}) => {
  const [selectedTypeId, setSelectedTypeId] = useState<string>(cardioTypes[0]?.id || '');
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [endedAt, setEndedAt] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [note, setNote] = useState<string>('');
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [syncToHealth, setSyncToHealth] = useState(true);

  // 数字のみの入力制限ハンドラー
  const handleDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setDistance(val);
    }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*$/.test(val)) {
      setDuration(val);
    }
  };

  // 新規種別追加
  const [isAddingType, setIsAddingType] = useState<boolean>(false);
  const [newTypeName, setNewTypeName] = useState<string>('');
  const [newTypeMets, setNewTypeMets] = useState<string>('7.0');

  const currentType = cardioTypes.find(t => t.id === selectedTypeId) || cardioTypes[0];
  const distanceNum = parseFloat(distance) || 0;
  const durationNum = parseFloat(duration) || 0;

  // 種別（ランニング/サイクリング/ウォーキング/その他）に応じたショートカット名
  const targetShortcutName = HealthSyncService.getCardioShortcutName(
    currentType?.id || '',
    currentType?.name || '',
    settings || { cardioShortcutName }
  );

  const calculatedCalories = calculateCardioCalories({
    cardioTypeName: currentType?.name || '',
    defaultMets: currentType?.defaultMets || 6.0,
    distanceKm: distanceNum,
    durationMinutes: durationNum,
    weightKg: userProfile.weightKg || 65,
    heightCm: userProfile.heightCm || 170,
  });

  const handleSave = (syncToHealth: boolean = true) => {
    if (!currentType) return;
    if (durationNum <= 0) {
      alert('運動時間（分）を入力してください');
      return;
    }

    // 触感フィードバック (設定がONの場合のみ)
    if (settings?.hapticsEnabled !== false && typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([20, 50, 20]); } catch (_) {}
    }

    const safeEndedAt = (() => {
      try {
        const formatted = endedAt.length === 16 ? `${endedAt}:00` : endedAt;
        const d = new Date(formatted);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      } catch (_) {
        return new Date().toISOString();
      }
    })();

    const newLog: CardioLog = {
      id: `cardio-${Date.now()}`,
      cardioTypeId: currentType.id,
      cardioTypeName: currentType.name,
      distanceKm: distanceNum,
      durationMinutes: durationNum,
      endedAt: safeEndedAt,
      calories: calculatedCalories,
      note: note.trim() || undefined,
    };

    onSaveCardioLog(newLog);
    setIsSavedSuccess(true);

    if (syncToHealth) {
      HealthSyncService.triggerCardioShortcut(newLog, targetShortcutName);
    }

    setTimeout(() => setIsSavedSuccess(false), 2000);
  };

  const handleAddNewType = () => {
    if (!newTypeName.trim()) return;
    const mets = parseFloat(newTypeMets) || 6.0;
    const newType: CardioType = {
      id: `cardio-custom-${Date.now()}`,
      name: newTypeName.trim(),
      defaultMets: mets,
      isCustom: true,
    };
    onAddCardioType(newType);
    setSelectedTypeId(newType.id);
    setNewTypeName('');
    setIsAddingType(false);
  };

  return (
    <div className="pb-28 px-4 pt-3 max-w-lg mx-auto space-y-4 animate-in fade-in duration-150">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 px-1">
        <Activity className="w-5 h-5 text-amber-400" />
        <h2 className="text-base font-bold text-white tracking-tight">有酸素運動の記録</h2>
      </div>

      {/* 記録カード */}
      <div className="bg-dark-850 border border-dark-800 rounded-3xl p-5 shadow-xl space-y-4">
        {/* 種別選択 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300">運動種別</label>
            <button
              type="button"
              onClick={() => setIsAddingType(!isAddingType)}
              className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-medium"
            >
              <Plus className="w-3 h-3" />
              <span>種別を追加</span>
            </button>
          </div>

          {/* 新規種別追加フォーム */}
          {isAddingType && (
            <div className="p-3 rounded-2xl bg-dark-800 border border-dark-700 mb-3 space-y-2">
              <div className="text-[11px] font-bold text-white">新しい有酸素種別を追加</div>
              <input
                type="text"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="例: 水泳、ステアマスター"
                className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">METs基準値:</span>
                <input
                  type="number"
                  step="0.1"
                  value={newTypeMets}
                  onChange={(e) => setNewTypeMets(e.target.value)}
                  className="w-20 bg-dark-850 border border-dark-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddNewType}
                  className="ml-auto px-4 py-1.5 bg-amber-500 text-dark-950 font-bold text-xs rounded-xl active:scale-95 shadow-sm"
                >
                  追加
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {cardioTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedTypeId(type.id)}
                className={`py-3 px-2 rounded-2xl text-xs font-bold transition-all text-center truncate active:scale-95 ${
                  selectedTypeId === type.id
                    ? 'bg-amber-500 text-dark-950 shadow-lg shadow-amber-500/25 ring-2 ring-amber-400'
                    : 'bg-dark-800 text-slate-300 hover:bg-dark-750 border border-dark-750'
                }`}
              >
                {type.name}
              </button>
            ))}
          </div>
        </div>

        {/* 距離 ＆ 時間 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              距離 (km)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={distance}
              onChange={handleDistanceChange}
              placeholder="0.0"
              className="w-full bg-dark-800 border border-dark-700 rounded-2xl px-3.5 py-3 text-lg font-mono font-bold text-white focus:outline-none focus:border-amber-400 text-center"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              時間 (分)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={duration}
              onChange={handleDurationChange}
              placeholder="0"
              className="w-full bg-dark-800 border border-dark-700 rounded-2xl px-3.5 py-3 text-lg font-mono font-bold text-white focus:outline-none focus:border-amber-400 text-center"
            />
          </div>
        </div>

        {/* 終了日時 */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>終了日時</span>
          </label>
          <input
            type="datetime-local"
            value={endedAt}
            onChange={(e) => setEndedAt(e.target.value)}
            className="w-full bg-dark-800 border border-dark-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
          />
        </div>

        {/* カロリー自動計算カード */}
        <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Flame className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-300">推定消費カロリー</div>
              <div className="text-[10px] text-slate-400">
                体重 {userProfile.weightKg}kg / 身長 {userProfile.heightCm}cm 基準
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-black text-amber-400">
              {calculatedCalories} <span className="text-xs font-normal text-amber-300">kcal</span>
            </div>
          </div>
        </div>

        {/* メモ */}
        <div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="メモ (任意: トレッドミル傾斜2%、心拍140等)"
            className="w-full bg-dark-800 border border-dark-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* 保存アクション */}
        <div className="space-y-3 pt-2">
          {/* Appleヘルスケア連携トグル */}
          <div className="flex items-center justify-between px-2 py-1 bg-dark-900/60 rounded-xl border border-dark-800">
            <div className="flex items-center gap-2">
              <Smartphone className={`w-4 h-4 transition-colors ${syncToHealth ? 'text-amber-400' : 'text-slate-500'}`} />
              <span className="text-xs font-medium text-slate-300">Appleヘルスケアに連携</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncToHealth(!syncToHealth)}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 active:scale-95 ${
                syncToHealth ? 'bg-amber-500' : 'bg-dark-750'
              }`}
              aria-label="Appleヘルスケア連携の切り替え"
            >
              <span
                className={`block w-5 h-5 rounded-full bg-dark-950 transition-transform ${
                  syncToHealth ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* メイン保存ボタン */}
          <button
            type="button"
            onClick={() => handleSave(syncToHealth)}
            disabled={isSavedSuccess}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-xl active:scale-98 ${
              isSavedSuccess
                ? 'bg-green-500 text-dark-950 shadow-green-500/25'
                : 'bg-amber-500 hover:bg-amber-400 text-dark-950 shadow-amber-500/25'
            }`}
          >
            {isSavedSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>保存しました！</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>有酸素運動を記録</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
