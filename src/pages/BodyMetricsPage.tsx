import React, { useState, useMemo } from 'react';
import {
  Scale,
  ArrowDownToLine,
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  X,
  Calendar,
  Layers,
  Trash2,
  Eye,
  Check,
  Copy,
  Sparkles,
} from 'lucide-react';
import { BodyMetricLog, UserProfile } from '../types';

export type MetricKey = 'weightKg' | 'muscleMassKg' | 'bodyFatPct';
export type AggregationMode = 'daily' | 'weekly' | 'monthly';
export type PeriodRange = '1m' | '3m' | '6m' | '1y' | 'all';

interface BodyMetricsPageProps {
  bodyMetrics: BodyMetricLog[];
  userProfile?: UserProfile;
  onDeleteMetric?: (date: string) => void;
}

interface AggregatedBucket {
  key: string; // YYYY-MM-DD | YYYY-Wxx | YYYY-MM
  label: string; // グラフX軸用の短いラベル
  fullLabel: string; // 詳細・一覧表示用のラベル
  sortDate: string; // YYYY-MM-DD (期間フィルタ・ソート基準日)
  sampleCount: number;
  weightKg?: number;
  weightMin?: number;
  weightMax?: number;
  muscleMassKg?: number;
  muscleMin?: number;
  muscleMax?: number;
  bodyFatPct?: number;
  bodyFatMin?: number;
  bodyFatMax?: number;
}

const METRIC_META: Record<
  MetricKey,
  {
    label: string;
    shortLabel: string;
    unit: string;
    colorHex: string;
    strokeClass: string;
    textClass: string;
    bgBadgeClass: string;
    borderActiveClass: string;
    cardGlowClass: string;
  }
> = {
  weightKg: {
    label: '体重',
    shortLabel: '体重',
    unit: 'kg',
    colorHex: '#22d3ee', // cyan-400
    strokeClass: 'stroke-cyan-400',
    textClass: 'text-cyan-400',
    bgBadgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    borderActiveClass: 'border-cyan-400 bg-cyan-500/10',
    cardGlowClass: 'shadow-cyan-500/15',
  },
  muscleMassKg: {
    label: '筋肉量 (除脂肪体重)',
    shortLabel: '筋肉量',
    unit: 'kg',
    colorHex: '#4ade80', // brand-neon / green-400
    strokeClass: 'stroke-brand-neon',
    textClass: 'text-brand-neon',
    bgBadgeClass: 'bg-brand-neon/15 text-brand-neon border-brand-neon/30',
    borderActiveClass: 'border-brand-neon bg-brand-neon/10',
    cardGlowClass: 'shadow-brand-neon/15',
  },
  bodyFatPct: {
    label: '体脂肪率',
    shortLabel: '体脂肪率',
    unit: '%',
    colorHex: '#fbbf24', // amber-400
    strokeClass: 'stroke-amber-400',
    textClass: 'text-amber-400',
    bgBadgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    borderActiveClass: 'border-amber-400 bg-amber-500/10',
    cardGlowClass: 'shadow-amber-500/15',
  },
};

// YYYY-MM-DD をローカルDateに変換
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1);
}

// 日付が属する週の月曜日 (YYYY-MM-DD) を返す
function getMondayDateKey(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const day = d.getDay(); // 0: Sun, 1: Mon, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayNum = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayNum}`;
}

function getSundayFromMondayKey(mondayKey: string): string {
  const d = parseLocalDate(mondayKey);
  d.setDate(d.getDate() + 6);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayNum = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayNum}`;
}

function formatShortMonthDay(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${m}/${d}`;
}

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

// デモ表示用のサンプルデータ生成（過去120日分、メモリ上のみでストレージやGASは一切汚さない）
function buildDemoMetrics(): BodyMetricLog[] {
  const today = new Date();
  const list: BodyMetricLog[] = [];
  for (let i = 120; i >= 0; i--) {
    // ほぼ毎日（まれに計測抜けがあるリアルな頻度）
    if (i % 7 === 3) continue;
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${day}`;

    const progress = (120 - i) / 120; // 0 -> 1
    // 緩やかな減量＋筋肉量維持・微増のリアルな推移に日次ノイズを加える
    const wave = Math.sin(i * 0.45) * 0.35 + Math.cos(i * 0.2) * 0.2;
    const weightKg = round1(69.4 - progress * 2.2 + wave);
    const bodyFatPct = round1(16.8 - progress * 2.4 + wave * 0.45);
    const muscleMassKg = round1(weightKg * (1 - bodyFatPct / 100));

    list.push({
      id: `demo-${dateKey}`,
      date: dateKey,
      weightKg,
      muscleMassKg,
      bodyFatPct,
      measuredAt: `${dateKey}T07:30:00.000+09:00`,
    });
  }
  return list;
}

interface SingleMetricChartProps {
  metric: MetricKey;
  buckets: AggregatedBucket[];
  aggregation: AggregationMode;
  showMovingAvg: boolean;
  selectedKey: string | null;
  onSelectKey: (key: string | null) => void;
  compact?: boolean;
}

const SingleMetricChart: React.FC<SingleMetricChartProps> = ({
  metric,
  buckets,
  aggregation,
  showMovingAvg,
  selectedKey,
  onSelectKey,
  compact = false,
}) => {
  const meta = METRIC_META[metric];

  // 該当メトリクスが存在するポイントのみ抽出
  const points = useMemo(() => {
    return buckets
      .map((b) => {
        const val =
          metric === 'weightKg'
            ? b.weightKg
            : metric === 'muscleMassKg'
            ? b.muscleMassKg
            : b.bodyFatPct;
        const minVal =
          metric === 'weightKg'
            ? b.weightMin
            : metric === 'muscleMassKg'
            ? b.muscleMin
            : b.bodyFatMin;
        const maxVal =
          metric === 'weightKg'
            ? b.weightMax
            : metric === 'muscleMassKg'
            ? b.muscleMax
            : b.bodyFatMax;
        return {
          bucket: b,
          value: val,
          min: minVal ?? val,
          max: maxVal ?? val,
        };
      })
      .filter((p): p is { bucket: AggregatedBucket; value: number; min: number; max: number } => p.value !== undefined && p.value > 0);
  }, [buckets, metric]);

  // 日別モード時の7点移動平均
  const movingAvgValues = useMemo(() => {
    if (aggregation !== 'daily' || !showMovingAvg || points.length < 2) return [];
    const windowSize = Math.min(7, points.length);
    return points.map((_, idx) => {
      const start = Math.max(0, idx - windowSize + 1);
      const slice = points.slice(start, idx + 1);
      const sum = slice.reduce((acc, cur) => acc + cur.value, 0);
      return round1(sum / slice.length);
    });
  }, [points, aggregation, showMovingAvg]);

  if (points.length === 0) {
    return (
      <div className="py-10 text-center text-xs text-slate-400 bg-dark-900/50 rounded-2xl border border-dark-800">
        この期間の{meta.shortLabel}データがありません
      </div>
    );
  }

  // 統計値
  const values = points.map((p) => p.value);
  const allMins = points.map((p) => p.min);
  const allMaxs = points.map((p) => p.max);
  const minVal = Math.min(...allMins);
  const maxVal = Math.max(...allMaxs);
  const avgVal = round1(values.reduce((a, b) => a + b, 0) / values.length);
  const firstVal = values[0];
  const lastVal = values[values.length - 1];
  const periodDiff = round1(lastVal - firstVal);

  // 選択中のポイント（未選択時は最新ポイント）
  const activeIdx = useMemo(() => {
    if (selectedKey) {
      const found = points.findIndex((p) => p.bucket.key === selectedKey);
      if (found >= 0) return found;
    }
    return points.length - 1;
  }, [points, selectedKey]);

  const activePoint = points[activeIdx];
  const prevPoint = activeIdx > 0 ? points[activeIdx - 1] : null;
  const activeDiff = prevPoint ? round1(activePoint.value - prevPoint.value) : null;

  // SVG座標計算
  const width = 360;
  const height = compact ? 145 : 195;
  const padLeft = 38;
  const padRight = 14;
  const padTop = 16;
  const padBottom = 26;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const spread = Math.max(0.8, maxVal - minVal);
  const yMin = Math.floor((minVal - spread * 0.18) * 2) / 2;
  const yMax = Math.ceil((maxVal + spread * 0.18) * 2) / 2;
  const yRange = Math.max(0.5, yMax - yMin);

  const getX = (idx: number) => {
    if (points.length === 1) return padLeft + plotW / 2;
    return padLeft + (idx / (points.length - 1)) * plotW;
  };

  const getY = (val: number) => {
    return padTop + plotH - ((val - yMin) / yRange) * plotH;
  };

  // 折れ線パス & エリアパス
  const coords = points.map((p, idx) => ({
    x: getX(idx),
    y: getY(p.value),
    yMinBand: getY(p.min),
    yMaxBand: getY(p.max),
  }));

  const linePath = coords
    .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : '';

  // 週平均・月平均時の最小〜最大レンジバンドパス
  const hasRangeBand =
    aggregation !== 'daily' &&
    coords.length > 1 &&
    points.some((p) => p.max > p.min);

  const bandPath = hasRangeBand
    ? [
        ...coords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.yMaxBand.toFixed(1)}`),
        ...[...coords]
          .reverse()
          .map((c) => `L ${c.x.toFixed(1)} ${c.yMinBand.toFixed(1)}`),
        'Z',
      ].join(' ')
    : '';

  // 7日移動平均線パス
  const maPath =
    movingAvgValues.length > 1
      ? movingAvgValues
          .map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getY(val).toFixed(1)}`)
          .join(' ')
      : '';

  // Y軸グリッド線 (3本)
  const yTicks = [yMin, round1((yMin + yMax) / 2), yMax];

  // X軸ラベルの間引き (最大5〜6個)
  const xLabelIndices = useMemo(() => {
    if (points.length <= 5) return points.map((_, i) => i);
    const count = 5;
    const indices = new Set<number>([0, points.length - 1]);
    for (let i = 1; i < count - 1; i++) {
      indices.add(Math.round((i / (count - 1)) * (points.length - 1)));
    }
    return Array.from(indices).sort((a, b) => a - b);
  }, [points.length]);

  const gradientId = `grad-${metric}-${compact ? 'sm' : 'lg'}`;

  // タッチ・クリック位置から最も近いデータポイントを選択
  const handlePointerSelect = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    if (clientX === undefined || rect.width <= 0) return;

    const relX = ((clientX - rect.left) / rect.width) * width;
    let closestIdx = 0;
    let minDist = Infinity;
    coords.forEach((c, idx) => {
      const dist = Math.abs(c.x - relX);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });
    onSelectKey(points[closestIdx].bucket.key);
  };

  const diffLabel =
    aggregation === 'weekly' ? '前週比' : aggregation === 'monthly' ? '前月比' : '前回比';

  return (
    <div className="space-y-2.5">
      {/* 選択中ポイントの詳細ヘッダー */}
      <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-dark-900/80 border border-dark-800">
        <div>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-extrabold ${meta.textClass}`}>{meta.shortLabel}</span>
            <span className="text-[11px] font-semibold text-slate-300">
              {activePoint.bucket.fullLabel}
            </span>
            {aggregation !== 'daily' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-800 text-slate-400 font-mono">
                {activePoint.bucket.sampleCount}日平均
              </span>
            )}
          </div>
          {aggregation !== 'daily' && activePoint.max > activePoint.min && (
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              範囲: {activePoint.min.toFixed(1)} 〜 {activePoint.max.toFixed(1)} {meta.unit}
            </div>
          )}
        </div>

        <div className="text-right">
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-lg font-black text-white font-mono">
              {activePoint.value.toFixed(1)}
            </span>
            <span className="text-[11px] text-slate-400 font-bold">{meta.unit}</span>
          </div>
          {activeDiff !== null && (
            <div
              className={`text-[10px] font-mono font-bold ${
                activeDiff > 0
                  ? 'text-rose-400'
                  : activeDiff < 0
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              {diffLabel} {activeDiff > 0 ? `+${activeDiff.toFixed(1)}` : activeDiff.toFixed(1)}
              {meta.unit}
            </div>
          )}
        </div>
      </div>

      {/* SVG グラフ本体 */}
      <div className="relative select-none touch-pan-y">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible cursor-pointer"
          onClick={handlePointerSelect}
          onTouchStart={handlePointerSelect}
          onTouchMove={handlePointerSelect}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={meta.colorHex} stopOpacity="0.32" />
              <stop offset="100%" stopColor={meta.colorHex} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Y軸グリッド線 & ラベル */}
          {yTicks.map((tick, i) => {
            const y = getY(tick);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray={i === 1 ? '3 3' : undefined}
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 6}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-500 text-[9px] font-mono"
                >
                  {tick.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* 週/月平均の最小〜最大レンジ帯 */}
          {bandPath && (
            <path d={bandPath} fill={meta.colorHex} fillOpacity="0.12" />
          )}

          {/* グラデーション塗りつぶし */}
          {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

          {/* メイン折れ線 */}
          {coords.length > 1 && (
            <path
              d={linePath}
              fill="none"
              stroke={meta.colorHex}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* 日別表示時の7日移動平均線 */}
          {maPath && (
            <path
              d={maPath}
              fill="none"
              stroke="#f8fafc"
              strokeOpacity="0.65"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              strokeLinecap="round"
            />
          )}

          {/* 選択中の縦ガイドライン */}
          {coords[activeIdx] && (
            <line
              x1={coords[activeIdx].x}
              y1={padTop}
              x2={coords[activeIdx].x}
              y2={padTop + plotH}
              stroke={meta.colorHex}
              strokeOpacity="0.45"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}

          {/* データポイントのドット */}
          {coords.map((c, idx) => {
            const isSelected = idx === activeIdx;
            const showDot = points.length <= 35 || isSelected || idx === 0 || idx === points.length - 1;
            if (!showDot) return null;
            return (
              <g key={points[idx].bucket.key}>
                {isSelected && (
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="6.5"
                    fill={meta.colorHex}
                    fillOpacity="0.25"
                  />
                )}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isSelected ? '4' : points.length > 20 ? '2.2' : '3'}
                  fill={isSelected ? '#0f172a' : meta.colorHex}
                  stroke={meta.colorHex}
                  strokeWidth={isSelected ? '2.5' : '1.5'}
                />
              </g>
            );
          })}

          {/* X軸ラベル */}
          {xLabelIndices.map((idx) => {
            const c = coords[idx];
            if (!c) return null;
            return (
              <text
                key={idx}
                x={c.x}
                y={height - 6}
                textAnchor={
                  idx === 0 && points.length > 1
                    ? 'start'
                    : idx === points.length - 1 && points.length > 1
                    ? 'end'
                    : 'middle'
                }
                className="fill-slate-400 text-[9px] font-mono"
              >
                {points[idx].bucket.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* 期間サマリーフッター (期間平均 / 最小〜最大 / 期間内変化) */}
      {!compact && (
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="bg-dark-900/60 border border-dark-800 rounded-xl px-2.5 py-1.5 text-center">
            <div className="text-[10px] text-slate-400">期間平均</div>
            <div className="text-xs font-extrabold text-white font-mono mt-0.5">
              {avgVal.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">{meta.unit}</span>
            </div>
          </div>
          <div className="bg-dark-900/60 border border-dark-800 rounded-xl px-2.5 py-1.5 text-center">
            <div className="text-[10px] text-slate-400">最小 〜 最大</div>
            <div className="text-xs font-bold text-slate-200 font-mono mt-0.5">
              {minVal.toFixed(1)} - {maxVal.toFixed(1)}
            </div>
          </div>
          <div className="bg-dark-900/60 border border-dark-800 rounded-xl px-2.5 py-1.5 text-center">
            <div className="text-[10px] text-slate-400">期間内変化</div>
            <div
              className={`text-xs font-extrabold font-mono mt-0.5 ${
                periodDiff > 0
                  ? 'text-rose-400'
                  : periodDiff < 0
                  ? 'text-emerald-400'
                  : 'text-slate-300'
              }`}
            >
              {periodDiff > 0 ? `+${periodDiff.toFixed(1)}` : periodDiff.toFixed(1)} {meta.unit}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const BodyMetricsPage: React.FC<BodyMetricsPageProps> = ({
  bodyMetrics,
  onDeleteMetric,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('weightKg');
  const [showAllThreeCharts, setShowAllThreeCharts] = useState<boolean>(false);
  const [aggregation, setAggregation] = useState<AggregationMode>('daily');
  const [period, setPeriod] = useState<PeriodRange>('3m');
  const [showMovingAvg, setShowMovingAvg] = useState<boolean>(true);
  const [selectedBucketKey, setSelectedBucketKey] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [copiedUrlTemplate, setCopiedUrlTemplate] = useState<boolean>(false);

  const demoMetrics = useMemo(() => buildDemoMetrics(), []);
  const activeMetrics = isDemoMode ? demoMetrics : bodyMetrics;

  // 古い順（昇順）にソートした配列
  const chronologicalLogs = useMemo(() => {
    return [...activeMetrics]
      .filter((m) => m && m.date)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [activeMetrics]);

  // 期間フィルタ適用
  const filteredDailyLogs = useMemo(() => {
    if (chronologicalLogs.length === 0) return [];
    if (period === 'all') return chronologicalLogs;

    const latestDateStr = chronologicalLogs[chronologicalLogs.length - 1].date;
    const latestDate = parseLocalDate(latestDateStr);
    const daysMap: Record<Exclude<PeriodRange, 'all'>, number> = {
      '1m': 31,
      '3m': 92,
      '6m': 183,
      '1y': 366,
    };
    const cutoff = new Date(
      latestDate.getFullYear(),
      latestDate.getMonth(),
      latestDate.getDate() - daysMap[period]
    );
    const y = cutoff.getFullYear();
    const m = String(cutoff.getMonth() + 1).padStart(2, '0');
    const d = String(cutoff.getDate()).padStart(2, '0');
    const cutoffKey = `${y}-${m}-${d}`;

    return chronologicalLogs.filter((l) => l.date >= cutoffKey);
  }, [chronologicalLogs, period]);

  // 集計単位（日別 / 週平均 / 月平均）ごとのバケット生成（昇順）
  const aggregatedBuckets = useMemo<AggregatedBucket[]>(() => {
    if (filteredDailyLogs.length === 0) return [];

    if (aggregation === 'daily') {
      return filteredDailyLogs.map((l) => {
        const [, m, d] = l.date.split('-').map(Number);
        const dt = parseLocalDate(l.date);
        const wd = dt.toLocaleDateString('ja-JP', { weekday: 'short' });
        return {
          key: l.date,
          label: `${m}/${d}`,
          fullLabel: `${m}月${d}日 (${wd})`,
          sortDate: l.date,
          sampleCount: 1,
          weightKg: l.weightKg,
          muscleMassKg: l.muscleMassKg,
          bodyFatPct: l.bodyFatPct,
        };
      });
    }

    const groupMap = new Map<string, BodyMetricLog[]>();
    filteredDailyLogs.forEach((l) => {
      const key =
        aggregation === 'weekly'
          ? getMondayDateKey(l.date)
          : l.date.slice(0, 7); // YYYY-MM
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(l);
    });

    const buckets: AggregatedBucket[] = [];
    Array.from(groupMap.keys())
      .sort((a, b) => a.localeCompare(b))
      .forEach((key) => {
        const items = groupMap.get(key)!;
        const weights = items.map((i) => i.weightKg).filter((v): v is number => v !== undefined && v > 0);
        const muscles = items.map((i) => i.muscleMassKg).filter((v): v is number => v !== undefined && v > 0);
        const fats = items.map((i) => i.bodyFatPct).filter((v): v is number => v !== undefined && v > 0);

        const avg = (arr: number[]) =>
          arr.length > 0 ? round1(arr.reduce((a, b) => a + b, 0) / arr.length) : undefined;

        if (aggregation === 'weekly') {
          const sunKey = getSundayFromMondayKey(key);
          const startShort = formatShortMonthDay(key);
          const endShort = formatShortMonthDay(sunKey);
          buckets.push({
            key,
            label: `${startShort}〜`,
            fullLabel: `${startShort} 〜 ${endShort} 週平均`,
            sortDate: key,
            sampleCount: items.length,
            weightKg: avg(weights),
            weightMin: weights.length > 0 ? Math.min(...weights) : undefined,
            weightMax: weights.length > 0 ? Math.max(...weights) : undefined,
            muscleMassKg: avg(muscles),
            muscleMin: muscles.length > 0 ? Math.min(...muscles) : undefined,
            muscleMax: muscles.length > 0 ? Math.max(...muscles) : undefined,
            bodyFatPct: avg(fats),
            bodyFatMin: fats.length > 0 ? Math.min(...fats) : undefined,
            bodyFatMax: fats.length > 0 ? Math.max(...fats) : undefined,
          });
        } else {
          // monthly: key is YYYY-MM
          const [y, m] = key.split('-').map(Number);
          buckets.push({
            key,
            label: `${m}月`,
            fullLabel: `${y}年${m}月 月平均`,
            sortDate: `${key}-01`,
            sampleCount: items.length,
            weightKg: avg(weights),
            weightMin: weights.length > 0 ? Math.min(...weights) : undefined,
            weightMax: weights.length > 0 ? Math.max(...weights) : undefined,
            muscleMassKg: avg(muscles),
            muscleMin: muscles.length > 0 ? Math.min(...muscles) : undefined,
            muscleMax: muscles.length > 0 ? Math.max(...muscles) : undefined,
            bodyFatPct: avg(fats),
            bodyFatMin: fats.length > 0 ? Math.min(...fats) : undefined,
            bodyFatMax: fats.length > 0 ? Math.max(...fats) : undefined,
          });
        }
      });

    return buckets;
  }, [filteredDailyLogs, aggregation]);

  // 最新値と前回比（集計モードに応じた直近比較）
  const latestSummary = useMemo(() => {
    const getLatestPair = (getter: (b: AggregatedBucket) => number | undefined) => {
      const valid = aggregatedBuckets.filter((b) => {
        const v = getter(b);
        return v !== undefined && v > 0;
      });
      if (valid.length === 0) return { current: undefined, diff: undefined, label: '' };
      const curr = valid[valid.length - 1];
      const prev = valid.length >= 2 ? valid[valid.length - 2] : undefined;
      const currVal = getter(curr)!;
      const prevVal = prev ? getter(prev) : undefined;
      return {
        current: currVal,
        diff: prevVal !== undefined ? round1(currVal - prevVal) : undefined,
        label: curr.label,
      };
    };

    return {
      weightKg: getLatestPair((b) => b.weightKg),
      muscleMassKg: getLatestPair((b) => b.muscleMassKg),
      bodyFatPct: getLatestPair((b) => b.bodyFatPct),
    };
  }, [aggregatedBuckets]);

  // Appleヘルスケア取得ショートカットの起動
  const handleFetchFromHealth = () => {
    const currentOrigin = window.location.origin + window.location.pathname;
    const shortcutName = 'GetWeightFromHealth';
    const targetUrl = `shortcuts://run-shortcut?name=${encodeURIComponent(shortcutName)}&input=text&text=${encodeURIComponent(currentOrigin)}`;
    window.location.href = targetUrl;
  };

  const handleAggregationChange = (nextMode: AggregationMode) => {
    setAggregation(nextMode);
    setSelectedBucketKey(null);
    // 月平均を選択した際に「1ヶ月」期間だと1点しか出ないため自動で「半年」へ広げる
    if (nextMode === 'monthly' && period === '1m') {
      setPeriod('6m');
    }
  };

  const diffPrefix =
    aggregation === 'weekly' ? '前週比' : aggregation === 'monthly' ? '前月比' : '前回比';

  // 新しい順（一覧表示用）
  const reversedBuckets = useMemo(() => [...aggregatedBuckets].reverse(), [aggregatedBuckets]);

  return (
    <div className="pb-28 px-4 pt-3 max-w-lg mx-auto space-y-4 animate-in fade-in duration-150">
      {/* 上部ヘッダー & ヘルスケア取得ボタン */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-base font-bold text-white tracking-tight leading-tight">
              体組成・推移
            </h2>
            <p className="text-[10px] text-slate-400">
              Appleヘルスケア共有データ (読み取り専用)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            className="p-2 rounded-xl bg-dark-850 hover:bg-dark-800 text-slate-300 border border-dark-750 active:scale-95 transition-all"
            title="iOSショートカット設定手順"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
          </button>
          <button
            type="button"
            onClick={handleFetchFromHealth}
            className="py-2 px-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-dark-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>ヘルスケアから取得</span>
          </button>
        </div>
      </div>

      {/* デモ表示切り替えバナー（データが0〜1件のとき、またはデモ表示中のとき） */}
      {(bodyMetrics.length < 2 || isDemoMode) && (
        <div className="bg-dark-850/90 border border-cyan-500/30 rounded-2xl p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="text-[11px] text-slate-300 leading-snug">
              {isDemoMode ? (
                <span className="text-cyan-300 font-bold">
                  サンプル推移プレビュー中（保存データには影響しません）
                </span>
              ) : (
                <span>
                  右上の「ヘルスケアから取得」で体重・筋肉量・体脂肪率を取り込めます
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsDemoMode(!isDemoMode);
              setSelectedBucketKey(null);
            }}
            className={`shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 active:scale-95 ${
              isDemoMode
                ? 'bg-cyan-400 text-dark-950'
                : 'bg-dark-800 text-cyan-300 border border-cyan-500/40'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>{isDemoMode ? '実データへ戻す' : 'サンプル表示'}</span>
          </button>
        </div>
      )}

      {/* 3項目サマリーカード (タップでグラフ切り替え) */}
      <div className="grid grid-cols-3 gap-2.5">
        {(['weightKg', 'muscleMassKg', 'bodyFatPct'] as MetricKey[]).map((key) => {
          const meta = METRIC_META[key];
          const stat = latestSummary[key];
          const isSelected = !showAllThreeCharts && selectedMetric === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setShowAllThreeCharts(false);
                setSelectedMetric(key);
              }}
              className={`text-left p-3 rounded-2xl border transition-all active:scale-98 ${
                isSelected
                  ? `${meta.borderActiveClass} shadow-lg ${meta.cardGlowClass}`
                  : 'bg-dark-850 border-dark-800 hover:border-dark-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-bold ${isSelected ? meta.textClass : 'text-slate-300'}`}>
                  {meta.shortLabel}
                </span>
                {stat.label && (
                  <span className="text-[9px] text-slate-500 font-mono">{stat.label}</span>
                )}
              </div>

              <div className="flex items-baseline gap-0.5">
                <span className="text-lg font-black text-white font-mono tracking-tight">
                  {stat.current !== undefined ? stat.current.toFixed(1) : '--'}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">{meta.unit}</span>
              </div>

              <div className="mt-1 flex items-center gap-1 text-[10px] font-mono">
                {stat.diff !== undefined ? (
                  <>
                    {stat.diff > 0 ? (
                      <TrendingUp className="w-3 h-3 text-rose-400 shrink-0" />
                    ) : stat.diff < 0 ? (
                      <TrendingDown className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : (
                      <Minus className="w-3 h-3 text-slate-400 shrink-0" />
                    )}
                    <span
                      className={
                        stat.diff > 0
                          ? 'text-rose-400 font-bold'
                          : stat.diff < 0
                          ? 'text-emerald-400 font-bold'
                          : 'text-slate-400'
                      }
                    >
                      {stat.diff > 0 ? `+${stat.diff.toFixed(1)}` : stat.diff.toFixed(1)}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-500">{diffPrefix} --</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* グラフカード（集計単位タブ ＆ 期間セレクター ＆ グラフ描画） */}
      <div className="bg-dark-850 border border-dark-800 rounded-3xl p-4 shadow-xl space-y-3.5">
        {/* 1. 集計単位切り替え (日別 / 週平均 / 月平均) + 3項目同時表示トグル */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex bg-dark-900 p-1 rounded-2xl border border-dark-800 flex-1">
            {(
              [
                { id: 'daily', label: '日別' },
                { id: 'weekly', label: '週平均' },
                { id: 'monthly', label: '月平均' },
              ] as { id: AggregationMode; label: string }[]
            ).map((tab) => {
              const active = aggregation === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleAggregationChange(tab.id)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? 'bg-cyan-400 text-dark-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowAllThreeCharts(!showAllThreeCharts)}
            className={`px-3 py-2 rounded-2xl text-[11px] font-bold border transition-all flex items-center gap-1 shrink-0 active:scale-95 ${
              showAllThreeCharts
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'bg-dark-900 border-dark-800 text-slate-400 hover:text-white'
            }`}
            title="3項目すべてを同時に縦並びで表示"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3項目同時</span>
          </button>
        </div>

        {/* 2. 期間セレクター (1ヶ月 / 3ヶ月 / 半年 / 1年 / 全期間) & 移動平均トグル */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1">
            {(
              [
                { id: '1m', label: '1ヶ月' },
                { id: '3m', label: '3ヶ月' },
                { id: '6m', label: '半年' },
                { id: '1y', label: '1年' },
                { id: 'all', label: '全期間' },
              ] as { id: PeriodRange; label: string }[]
            ).map((p) => {
              const active = period === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPeriod(p.id);
                    setSelectedBucketKey(null);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                    active
                      ? 'bg-dark-750 text-white border border-slate-600'
                      : 'text-slate-400 hover:text-slate-200 bg-dark-900/50 border border-transparent'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {aggregation === 'daily' && (
            <button
              type="button"
              onClick={() => setShowMovingAvg(!showMovingAvg)}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                showMovingAvg
                  ? 'border-slate-500 text-slate-200 bg-dark-800'
                  : 'border-dark-800 text-slate-500 bg-dark-900/40'
              }`}
            >
              --- 7日平均線
            </button>
          )}
        </div>

        {/* 3. グラフ本体 */}
        {aggregatedBuckets.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-3 bg-dark-900/50 rounded-2xl border border-dark-800">
            <Scale className="w-9 h-9 text-cyan-400/70 mx-auto" />
            <div>
              <div className="text-sm font-bold text-white">
                まだ体組成データがありません
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                右上の「ヘルスケアから取得」ボタンからiOSショートカットを実行すると、体重・筋肉量・体脂肪率の推移グラフが表示されます。
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-cyan-300 border border-cyan-500/30 text-xs font-bold"
              >
                ショートカット設定手順を見る
              </button>
              <button
                type="button"
                onClick={() => setIsDemoMode(true)}
                className="px-3.5 py-2 rounded-xl bg-cyan-400 text-dark-950 text-xs font-black"
              >
                サンプル推移を見る
              </button>
            </div>
          </div>
        ) : showAllThreeCharts ? (
          <div className="space-y-5 divide-y divide-dark-800">
            {(['weightKg', 'muscleMassKg', 'bodyFatPct'] as MetricKey[]).map((key, idx) => (
              <div key={key} className={idx > 0 ? 'pt-4' : ''}>
                <SingleMetricChart
                  metric={key}
                  buckets={aggregatedBuckets}
                  aggregation={aggregation}
                  showMovingAvg={showMovingAvg}
                  selectedKey={selectedBucketKey}
                  onSelectKey={setSelectedBucketKey}
                  compact={true}
                />
              </div>
            ))}
          </div>
        ) : (
          <SingleMetricChart
            metric={selectedMetric}
            buckets={aggregatedBuckets}
            aggregation={aggregation}
            showMovingAvg={showMovingAvg}
            selectedKey={selectedBucketKey}
            onSelectKey={setSelectedBucketKey}
            compact={false}
          />
        )}
      </div>

      {/* 集計データ一覧（日別 / 週平均 / 月平均） */}
      {reversedBuckets.length > 0 && (
        <div className="bg-dark-850 border border-dark-800 rounded-3xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                {aggregation === 'weekly'
                  ? '週平均の推移一覧'
                  : aggregation === 'monthly'
                  ? '月平均の推移一覧'
                  : '日別の記録一覧'}
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {reversedBuckets.length} {aggregation === 'weekly' ? '週' : aggregation === 'monthly' ? 'ヶ月' : '日'}分
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-0.5">
            {reversedBuckets.map((b, idx) => {
              // 1つ古いバケット（reversedBucketsでは idx + 1）と比較
              const older = reversedBuckets[idx + 1];
              const wDiff =
                b.weightKg !== undefined && older?.weightKg !== undefined
                  ? round1(b.weightKg - older.weightKg)
                  : undefined;
              const mDiff =
                b.muscleMassKg !== undefined && older?.muscleMassKg !== undefined
                  ? round1(b.muscleMassKg - older.muscleMassKg)
                  : undefined;
              const fDiff =
                b.bodyFatPct !== undefined && older?.bodyFatPct !== undefined
                  ? round1(b.bodyFatPct - older.bodyFatPct)
                  : undefined;

              const isSelected = selectedBucketKey === b.key;

              return (
                <div
                  key={b.key}
                  onClick={() => setSelectedBucketKey(b.key)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-dark-800 border-cyan-500/50'
                      : 'bg-dark-900/60 border-dark-800 hover:border-dark-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{b.fullLabel}</span>
                      {aggregation !== 'daily' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-dark-800 text-slate-400 font-mono">
                          {b.sampleCount}日計測
                        </span>
                      )}
                    </div>

                    {aggregation === 'daily' && !isDemoMode && onDeleteMetric && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`${b.fullLabel} の体組成記録を削除しますか？`)) {
                            onDeleteMetric(b.key);
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {/* 体重 */}
                    <div className="bg-dark-950/60 rounded-xl px-2.5 py-1.5 border border-dark-800/80">
                      <div className="text-[10px] text-slate-400">体重</div>
                      <div className="flex items-baseline justify-between mt-0.5">
                        <span className="font-bold text-cyan-300 font-mono">
                          {b.weightKg !== undefined ? `${b.weightKg.toFixed(1)}kg` : '--'}
                        </span>
                        {wDiff !== undefined && (
                          <span
                            className={`text-[9px] font-mono ${
                              wDiff > 0
                                ? 'text-rose-400'
                                : wDiff < 0
                                ? 'text-emerald-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {wDiff > 0 ? `+${wDiff.toFixed(1)}` : wDiff.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 筋肉量 */}
                    <div className="bg-dark-950/60 rounded-xl px-2.5 py-1.5 border border-dark-800/80">
                      <div className="text-[10px] text-slate-400">筋肉量</div>
                      <div className="flex items-baseline justify-between mt-0.5">
                        <span className="font-bold text-brand-neon font-mono">
                          {b.muscleMassKg !== undefined ? `${b.muscleMassKg.toFixed(1)}kg` : '--'}
                        </span>
                        {mDiff !== undefined && (
                          <span
                            className={`text-[9px] font-mono ${
                              mDiff > 0
                                ? 'text-emerald-400'
                                : mDiff < 0
                                ? 'text-rose-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {mDiff > 0 ? `+${mDiff.toFixed(1)}` : mDiff.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 体脂肪率 */}
                    <div className="bg-dark-950/60 rounded-xl px-2.5 py-1.5 border border-dark-800/80">
                      <div className="text-[10px] text-slate-400">体脂肪率</div>
                      <div className="flex items-baseline justify-between mt-0.5">
                        <span className="font-bold text-amber-300 font-mono">
                          {b.bodyFatPct !== undefined ? `${b.bodyFatPct.toFixed(1)}%` : '--'}
                        </span>
                        {fDiff !== undefined && (
                          <span
                            className={`text-[9px] font-mono ${
                              fDiff > 0
                                ? 'text-rose-400'
                                : fDiff < 0
                                ? 'text-emerald-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {fDiff > 0 ? `+${fDiff.toFixed(1)}` : fDiff.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* iOSショートカット設定ガイドモーダル */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-dark-850 w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-dark-700 shadow-2xl p-5 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-dark-750 shrink-0">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  Appleヘルスケア共有ショートカット設定手順
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="p-1.5 rounded-full hover:bg-dark-750 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-4 text-xs text-slate-300 leading-relaxed pr-1">
              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-[11px]">
                iOSの「ショートカット」アプリで <strong>GetWeightFromHealth</strong> を作成（または更新）すると、ワンタップでヘルスケアから<strong>体重・筋肉量（除脂肪体重）・体脂肪率</strong>を読み取ってグラフに反映できます。
              </div>

              <div className="space-y-2.5">
                <div className="font-bold text-white text-xs">作成・更新手順（最新 iOS 18以降 UI対応）</div>

                <div className="p-3 rounded-2xl bg-dark-900 border border-dark-800 space-y-1.5">
                  <div className="font-bold text-cyan-400">
                    1. 「ヘルスケアのサンプルを検索」を3つ追加
                  </div>
                  <p className="text-[11px] text-slate-300">
                    ショートカット名「<strong>GetWeightFromHealth</strong>」を作成し、「<strong>アクションを検索</strong>」から「<strong>ヘルスケアのサンプルを検索</strong>」を3つ順番に追加します。それぞれ「<strong>＋ フィルタを追加</strong>」をタップし、並び順: <code>開始日</code> ／ 順序: <code>最新が先頭</code> ／ 制限: <code>オン（1件）</code> に設定します。
                  </p>
                  <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-1 pt-1">
                    <li>① 1つ目: <code>種類</code> が <strong>体重</strong> である（単位: <code>kg</code>）</li>
                    <li>② 2つ目: <code>種類</code> が <strong>除脂肪体重</strong> である（※筋肉量として取得）</li>
                    <li>③ 3つ目: <code>種類</code> が <strong>体脂肪率</strong> である</li>
                  </ul>
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-200 mt-1">
                    ⚠️ <strong>iOS 18以降の注意点</strong>：2つ目・3つ目を追加した直後、1行目が「<code>[ヘルスケアのサンプル] から すべてのヘルスケアのサンプルを検索</code>」と自動接続されます。1行目の青文字「<strong>ヘルスケアのサンプル</strong>」をタップ ➔「<strong>消去</strong>」を選び、「<strong>すべてのヘルスケアのサンプルを検索</strong>」に戻してください。
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-dark-900 border border-dark-800 space-y-2">
                  <div className="font-bold text-cyan-400">
                    2. 「URL」アクションに変数を設定
                  </div>
                  <p className="text-[11px] text-slate-300">
                    「<strong>URL</strong>」アクションを追加し、「変数を選択（マジック変数）」から以下のように配置します：
                  </p>
                  <div className="p-2.5 rounded-xl bg-dark-950 border border-dark-750 font-mono text-[10px] text-cyan-300 break-all">
                    [ショートカットの入力]?weight=[①のサンプル]&amp;muscle=[②のサンプル]&amp;fat=[③のサンプル]
                  </div>
                  <div className="text-[10px] text-slate-300 space-y-1">
                    <p>
                      ⚠️ <strong>各バブルを「値」に変更（iOS 18以降）</strong>：
                    </p>
                    <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                      <li><code>weight</code> / <code>muscle</code> / <code>fat</code> の3つのバブルをそれぞれタップ ➔「<strong>値</strong>」を選択（単位・空白を除外）</li>
                      <li>※同じURL欄に <code>[①のサンプル]</code> を2回入れて片方を「開始日」にすると、iOSの仕様で <code>weight</code> 側も「開始日」に連動して変わってしまうため、通常取得では <code>&amp;date=</code> は不要です（自動で本日日付になります）。</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(
                        '?weight=&muscle=&fat='
                      );
                      setCopiedUrlTemplate(true);
                      setTimeout(() => setCopiedUrlTemplate(false), 2000);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-700 text-[11px] font-bold text-slate-200 flex items-center justify-center gap-1.5"
                  >
                    {copiedUrlTemplate ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-brand-neon" />
                        <span className="text-brand-neon">クエリ文字列をコピーしました</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-cyan-400" />
                        <span>?weight=&amp;muscle=&amp;fat= をコピー</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-dark-900 border border-dark-800 space-y-1">
                  <div className="font-bold text-cyan-400">
                    3. 「URLを開く」アクションを追加
                  </div>
                  <p className="text-[11px] text-slate-300">
                    最後に Safari の「<strong>URLを開く</strong>」アクションを追加して完了です。
                  </p>
                  <p className="text-[10px] text-slate-400 pt-1">
                    💡 過去の履歴（30〜90件）を一括インポートする場合は、「テキスト」アクションを<strong>①数値用（<code>weight=...&amp;muscle=...&amp;fat=...</code>）</strong>と<strong>②日付用（<code>[①のテキスト]&amp;date=...&amp;mdate=...&amp;fdate=...</code>）</strong>の2つに分けてから「URLをエンコード」に通すと、「値」と「開始日」が干渉せず全項目を正確な日付で取り込めます（詳細は <code>shortcuts/README.md</code> 参照）。
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-dark-750 shrink-0">
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="w-full py-3 rounded-2xl bg-cyan-400 text-dark-950 font-black text-xs"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
