import React from 'react';
import { Delete, Check } from 'lucide-react';

interface NumericKeypadProps {
  currentValue: string;
  field: 'weight' | 'reps';
  onKeyPress: (key: string) => void;
  onQuickAdd: (amount: number) => void;
  onDelete: () => void;
  onConfirm: () => void;
  unit?: string;
  estimated1RM?: number;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  currentValue,
  field,
  onKeyPress,
  onQuickAdd,
  onDelete,
  onConfirm,
  unit = 'kg',
  estimated1RM
}) => {
  const numberKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'];

  const quickWeightAdds = [
    { label: '+1.25', val: 1.25 },
    { label: '+2.5', val: 2.5 },
    { label: '+5', val: 5 },
    { label: '-2.5', val: -2.5 },
  ];

  const quickRepAdds = [
    { label: '+1 rep', val: 1 },
    { label: '+2 reps', val: 2 },
    { label: '+5 reps', val: 5 },
    { label: '-1 rep', val: -1 },
  ];

  const quickButtons = field === 'weight' ? quickWeightAdds : quickRepAdds;

  return (
    <div className="bg-dark-900 border-t border-dark-800 p-2 pb-safe shadow-2xl select-none">
      {/* 入力プレビュー & 1RM推定 */}
      <div className="flex items-center justify-between px-3 py-1.5 mb-1.5 bg-dark-850 rounded-lg text-sm border border-dark-800">
        <span className="text-xs text-slate-400 font-medium">
          {field === 'weight' ? '重量入力' : '回数入力'}
        </span>
        <div className="flex items-center gap-3">
          {estimated1RM && estimated1RM > 0 && field === 'weight' && (
            <span className="text-[11px] text-brand-neon/80 font-mono">
              推定1RM: <strong className="font-semibold text-brand-neon">{estimated1RM}</strong> kg
            </span>
          )}
          <span className="font-mono text-base font-bold text-white tracking-wider">
            {currentValue || '0'} <span className="text-xs font-normal text-slate-400">{field === 'weight' ? unit : 'reps'}</span>
          </span>
        </div>
      </div>

      {/* クイック増減ボタン */}
      <div className="grid grid-cols-4 gap-1.5 mb-1.5">
        {quickButtons.map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={() => onQuickAdd(btn.val)}
            className="py-2 rounded-lg bg-dark-800 hover:bg-dark-700 active:scale-95 text-xs font-semibold text-brand-neon border border-brand-accent/20 transition-all flex items-center justify-center"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* テンキー本体 */}
      <div className="grid grid-cols-3 gap-1.5">
        {numberKeys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onKeyPress(k)}
            className="h-12 rounded-lg bg-dark-800 hover:bg-dark-700 active:bg-dark-600 active:scale-95 text-lg font-semibold text-white transition-all flex items-center justify-center shadow-sm"
          >
            {k}
          </button>
        ))}
        <button
          type="button"
          onClick={onDelete}
          className="h-12 rounded-lg bg-dark-800 hover:bg-dark-700 active:bg-dark-600 active:scale-95 text-slate-300 transition-all flex items-center justify-center shadow-sm"
          aria-label="削除"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>

      {/* 決定ボタン */}
      <div className="mt-1.5">
        <button
          type="button"
          onClick={onConfirm}
          className="w-full h-11 rounded-lg bg-brand-neon hover:bg-green-400 active:scale-98 text-dark-950 font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-brand-neon/20"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>OK</span>
        </button>
      </div>
    </div>
  );
};
