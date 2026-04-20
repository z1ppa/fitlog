export const SARYCHEV_PROGRAM_NAME = "Клуб 100 — Сарычев";
export const ONE_RM_KEY = "fitlog_sarychev_1rm";
export const BASE_REST_SECONDS = 240;
export const ACCESSORY_REST_SECONDS = 90;

export function isBaseExercise(reps: string): boolean {
  return /\d+%/.test(reps);
}

export function extractPercentages(reps: string): number[] {
  const matches = reps.match(/(\d+)%/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => parseInt(m)))];
}

export function calcWeight(pct: number, oneRM: number): number {
  return Math.round((oneRM * pct) / 100 / 2.5) * 2.5;
}

export function prescriptionWeightLabel(reps: string, oneRM: number | null): string | null {
  if (!oneRM) return null;
  const pcts = extractPercentages(reps);
  if (pcts.length === 0) return null;
  const weights = pcts.map((p) => calcWeight(p, oneRM)).sort((a, b) => a - b);
  const unique = [...new Set(weights)];
  if (unique.length === 1) return `${unique[0]} кг`;
  return `${unique[0]}–${unique[unique.length - 1]} кг`;
}

export interface WorkoutPrescriptionItem {
  exerciseId: string;
  sets: number;
  reps: string;
  isBase: boolean;
}

export function getWorkoutPrescription(workoutId: string): Record<string, WorkoutPrescriptionItem> {
  try {
    const raw = localStorage.getItem(`fitlog_workout_program_${workoutId}`);
    if (!raw) return {};
    const arr: WorkoutPrescriptionItem[] = JSON.parse(raw);
    return Object.fromEntries(arr.map((item) => [item.exerciseId, item]));
  } catch {
    return {};
  }
}

export function saveWorkoutPrescription(workoutId: string, items: WorkoutPrescriptionItem[]) {
  localStorage.setItem(`fitlog_workout_program_${workoutId}`, JSON.stringify(items));
}

export function getOneRM(): number | null {
  try {
    const v = localStorage.getItem(ONE_RM_KEY);
    return v ? parseFloat(v) : null;
  } catch {
    return null;
  }
}
