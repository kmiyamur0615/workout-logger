import React, { useState } from 'react';
import { Activity, Flame, Plus, Check, Calendar, Trash2, Smartphone } from 'lucide-react';
import { CardioType, CardioLog, UserProfile } from '../types';
import { calculateCardioCalories } from '../services/calorieCalculator';
import { HealthSyncService } from '../services/healthSync';

interface CardioPageProps {
  cardioTypes: CardioType[];
  cardioLogs: CardioLog[];
  userProfile: UserProfile;
  cardioShortcutName?: string;
  onSaveCardioLog: (log: CardioLog) => void;
  onAddCardioType: (type: CardioType) => void;
  onDeleteCardioLog: (logId: string) => void;
}

export const CardioPage: React.FC<CardioPageProps> = ({
  cardioTypes,
  cardioLogs,
  userProfile,
  cardioShortcutName = 'CardioLoggerSync',
  onSaveCardioLog,
  onAddCardioType,
  onDeleteCardioLog,
}) => {
  const [selectedTypeId, setSelectedTypeId] = useState<string>(cardioTypes[0]?.id || '');
  const [distance, setDistance] = useState<string>('5.0');
  const [duration, setDuration] = useState<string>('30');
  const [endedAt, setEndedAt] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [note, setNote] = useState<string>('');
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  // 新規種別追加
  const [isAddingType, setIsAddingType] = useState<boolean>(false);
  const [newTypeName, setNewTypeName] = useState<string>('');
  const [newTypeMets, setNewTypeMets] = useState<string>('7.0');

  const currentType = cardioTypes.find(t => t.id === selectedTypeId) || cardioTypes[0];
  const distanceNum = parseFloat(distance) || 0;
  const durationNum = parseFloat(duration) || 0;

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

    // 触感フィードバック
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([20, 50, 20]); } catch (_) {}
    }

    const newLog: CardioLog = {
      id: `cardio-${Date.now()}`,
      cardioTypeId: currentType.id,
      cardioTypeName: currentType.name,
      distanceKm: distanceNum,
      durationMinutes: durationNum,
      endedAt: new Date(endedAt).toISOString(),
      calories: calculatedCalories,
      note: note.trim() || undefined,
    };

    onSaveCardioLog(newLog);
    setIsSavedSuccess(true);

    if (syncToHealth) {
      HealthSyncService.triggerCardioShortcut(newLog, cardioShortcutName);
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
              type="number"
              step="0.01"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="5.0"
              className="w-full bg-dark-800 border border-dark-700 rounded-2xl px-3.5 py-3 text-lg font-mono font-bold text-white focus:outline-none focus:border-amber-400 text-center"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              時間 (分)
            </label>
            <input
              type="number"
              step="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="30"
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
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-dark-950 font-black text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-xl shadow-amber-500/30"
          >
            <Smartphone className="w-4 h-4 stroke-[2.5]" />
            <span>{isSavedSuccess ? '記録を保存しました！' : '保存してAppleヘルスケアに同期'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            className="w-full py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 active:scale-98 text-xs font-semibold text-slate-300 border border-dark-700 transition-all flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 text-slate-400" />
            <span>アプリ内のみ保存（ヘルスケア連携なし）</span>
          </button>
        </div>
      </div>

      {/* 直近の有酸素記録 */}
      {cardioLogs.length > 0 && (
        <div className="bg-dark-850 border border-dark-800 rounded-3xl p-4 shadow-lg space-y-3">
          <h3 className="text-xs font-bold text-slate-400 px-1">直近の有酸素履歴</h3>
          <div className="space-y-2">
            {cardioLogs.slice(0, 3).map((log) => (
              <div key={log.id} className="p-3 rounded-2xl bg-dark-900/60 border border-dark-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>{log.cardioTypeName}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    {new Date(log.endedAt).toLocaleDateString('ja-JP')} · {log.distanceKm > 0 && `${log.distanceKm}km · `}{log.durationMinutes}分
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-mono font-bold text-amber-400">{log.calories} kcal</div>
                  </div>
                  <button
                    onClick={() => onDeleteCardioLog(log.id)}
                    className="text-slate-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
