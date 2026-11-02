export interface CalorieCalcParams {
  cardioTypeId?: string;
  cardioTypeName: string;
  defaultMets: number;
  isCustom?: boolean;
  distanceKm: number;
  durationMinutes: number;
  weightKg: number;
  heightCm?: number;
}

export interface CalorieCalcResult {
  /** アクティブ消費カロリー (kcal: 運動による純増消費分、Appleヘルスケア互換) */
  calories: number;
  /** 総消費カロリー (kcal: 安静時代謝 1.0 MET を含む) */
  grossCalories: number;
  /** 計算に適用された実効 METs */
  effectiveMets: number;
  /** 距離と時間から算出された時速 (km/h)。距離未入力時は null */
  speedKmH: number | null;
  /** 速度連動の動的 METs 補正が適用されたか */
  usedDynamicSpeed: boolean;
  /** 距離入力に対して算出速度が現実的な範囲外のため基準METsにフォールバックしたか */
  isSpeedOutOfRange: boolean;
}

type StandardCardioCategory = 'run' | 'walk' | 'cycle';

interface SpeedMetsSpec {
  minSpeedKmH: number;
  maxSpeedKmH: number;
  /** [speedKmH, mets] の昇順アンカーポイント (Compendium of Physical Activities / ACSM 準拠) */
  points: readonly (readonly [number, number])[];
}

const SPEED_METS_SPECS: Record<StandardCardioCategory, SpeedMetsSpec> = {
  run: {
    minSpeedKmH: 3.0,
    maxSpeedKmH: 25.0,
    points: [
      [5.0, 5.3],
      [6.4, 6.6],
      [8.0, 8.3],
      [9.7, 9.9],
      [11.3, 11.4],
      [12.9, 12.9],
      [14.5, 14.4],
      [16.1, 16.0],
      [19.3, 19.0],
    ],
  },
  walk: {
    minSpeedKmH: 1.5,
    maxSpeedKmH: 10.0,
    points: [
      [2.5, 2.3],
      [4.0, 3.1],
      [4.8, 3.6],
      [5.6, 4.3],
      [6.4, 5.0],
      [7.2, 7.0],
      [8.0, 8.3],
    ],
  },
  cycle: {
    minSpeedKmH: 5.0,
    maxSpeedKmH: 50.0,
    points: [
      [10.0, 3.8],
      [15.1, 5.8],
      [17.7, 6.8],
      [20.9, 8.0],
      [24.1, 10.0],
      [28.2, 12.0],
      [33.0, 15.8],
    ],
  },
};

/**
 * 標準プリセット3種目（ランニング・ウォーキング・サイクリング）のみ動的速度補正の対象とし、
 * ユーザーが追加したカスタム種別は設定された defaultMets を尊重する。
 */
function detectStandardCardioCategory(params: {
  cardioTypeId?: string;
  cardioTypeName: string;
  isCustom?: boolean;
}): StandardCardioCategory | null {
  const { cardioTypeId, cardioTypeName, isCustom } = params;

  if (isCustom) return null;

  if (cardioTypeId) {
    if (cardioTypeId === 'cardio-run') return 'run';
    if (cardioTypeId === 'cardio-walk') return 'walk';
    if (cardioTypeId === 'cardio-cycle') return 'cycle';
    if (cardioTypeId.startsWith('cardio-custom')) return null;
  }

  const name = (cardioTypeName || '').trim();
  const nameLower = name.toLowerCase();

  if (name === 'ランニング' || name === 'ジョギング' || nameLower === 'running' || nameLower === 'run') {
    return 'run';
  }
  if (name === 'ウォーキング' || name === '散歩' || name === '歩行' || nameLower === 'walking' || nameLower === 'walk') {
    return 'walk';
  }
  if (name === 'サイクリング' || name === '自転車' || nameLower === 'cycling' || nameLower === 'cycle' || nameLower === 'bike') {
    return 'cycle';
  }

  return null;
}

/**
 * 速度アンカーポイント間の連続線形補間。
 * すべての区間で (METs - 1.0) / speedKmH が単調非減少となるため、
 * 同一距離をより速く移動した際に消費カロリーが減る逆転現象が発生しない。
 */
function interpolateMets(speedKmH: number, points: readonly (readonly [number, number])[]): number {
  const first = points[0];
  if (speedKmH <= first[0]) {
    const netPerKmH = (first[1] - 1.0) / first[0];
    return 1.0 + netPerKmH * speedKmH;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const [v0, m0] = points[i];
    const [v1, m1] = points[i + 1];
    if (speedKmH <= v1) {
      const ratio = (speedKmH - v0) / (v1 - v0);
      return m0 + ratio * (m1 - m0);
    }
  }

  const last = points[points.length - 1];
  const netPerKmH = (last[1] - 1.0) / last[0];
  return 1.0 + netPerKmH * speedKmH;
}

export function calculateCardioCaloriesDetails(params: CalorieCalcParams): CalorieCalcResult {
  const { cardioTypeId, cardioTypeName, defaultMets, isCustom, distanceKm, durationMinutes, weightKg } = params;
  const baseMets = Number.isFinite(defaultMets) && defaultMets > 0 ? defaultMets : 6.0;

  if (
    !Number.isFinite(durationMinutes) ||
    durationMinutes <= 0 ||
    !Number.isFinite(weightKg) ||
    weightKg <= 0
  ) {
    return {
      calories: 0,
      grossCalories: 0,
      effectiveMets: baseMets,
      speedKmH: null,
      usedDynamicSpeed: false,
      isSpeedOutOfRange: false,
    };
  }

  const hours = durationMinutes / 60;
  let effectiveMets = baseMets;
  let speedKmH: number | null = null;
  let usedDynamicSpeed = false;
  let isSpeedOutOfRange = false;

  if (Number.isFinite(distanceKm) && distanceKm > 0 && hours > 0) {
    speedKmH = distanceKm / hours;
    const category = detectStandardCardioCategory({ cardioTypeId, cardioTypeName, isCustom });

    if (category) {
      const spec = SPEED_METS_SPECS[category];
      if (speedKmH >= spec.minSpeedKmH && speedKmH <= spec.maxSpeedKmH) {
        effectiveMets = interpolateMets(speedKmH, spec.points);
        usedDynamicSpeed = true;
      } else {
        isSpeedOutOfRange = true;
      }
    }
  }

  // 厚生労働省基準公式:
  // 総消費カロリー (Gross) = 1.05 × METs × 体重(kg) × 時間(h)
  // アクティブ消費カロリー (Net: 安静時代謝 1.0 MET を控除) = 1.05 × max(0, METs - 1.0) × 体重(kg) × 時間(h)
  const netMets = Math.max(0, effectiveMets - 1.0);
  const activeCalories = 1.05 * netMets * weightKg * hours;
  const grossCalories = 1.05 * effectiveMets * weightKg * hours;

  return {
    calories: Math.round(activeCalories),
    grossCalories: Math.round(grossCalories),
    effectiveMets,
    speedKmH,
    usedDynamicSpeed,
    isSpeedOutOfRange,
  };
}

export function calculateCardioCalories(params: CalorieCalcParams): number {
  return calculateCardioCaloriesDetails(params).calories;
}
