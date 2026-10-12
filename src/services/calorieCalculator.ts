export interface CalorieCalcParams {
  cardioTypeName: string;
  defaultMets: number;
  distanceKm: number;
  durationMinutes: number;
  weightKg: number;
  heightCm: number;
}

export function calculateCardioCalories(params: CalorieCalcParams): number {
  const { cardioTypeName, defaultMets, distanceKm, durationMinutes, weightKg } = params;

  if (!durationMinutes || durationMinutes <= 0 || !weightKg || weightKg <= 0) {
    return 0;
  }

  const hours = durationMinutes / 60;
  let effectiveMets = defaultMets || 6.0;

  // 距離と時間から時速 (km/h) が算出できる場合は、速度に応じた動的METs補正を行う
  if (distanceKm > 0 && hours > 0) {
    const speedKmH = distanceKm / hours;

    if (cardioTypeName.includes('ランニング') || cardioTypeName.toLowerCase().includes('run')) {
      if (speedKmH < 7) effectiveMets = 6.0;
      else if (speedKmH < 9) effectiveMets = 8.3;
      else if (speedKmH < 11) effectiveMets = 9.8;
      else if (speedKmH < 13) effectiveMets = 11.5;
      else effectiveMets = 12.8;
    } else if (cardioTypeName.includes('ウォーキング') || cardioTypeName.toLowerCase().includes('walk')) {
      if (speedKmH < 4.0) effectiveMets = 3.0;
      else if (speedKmH < 5.0) effectiveMets = 3.8;
      else if (speedKmH < 6.5) effectiveMets = 4.8;
      else effectiveMets = 5.5;
    } else if (cardioTypeName.includes('サイクリング') || cardioTypeName.toLowerCase().includes('cycl') || cardioTypeName.includes('バイク')) {
      if (speedKmH < 16) effectiveMets = 5.8;
      else if (speedKmH < 20) effectiveMets = 6.8;
      else if (speedKmH < 25) effectiveMets = 8.0;
      else effectiveMets = 10.0;
    }
  }

  // 厚生労働省基準公式: 消費カロリー (kcal) = 1.05 × METs × 体重(kg) × 時間(h)
  const calories = 1.05 * effectiveMets * weightKg * hours;
  return Math.round(calories);
}
