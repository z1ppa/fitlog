export interface WorkoutWithExercises {
  id: string;
  startedAt: Date;
  completedAt: Date | null;
  status: "ACTIVE" | "COMPLETED";
  exercises: WorkoutExerciseWithSets[];
}

export interface WorkoutExerciseWithSets {
  id: string;
  order: number;
  exercise: {
    id: string;
    name: string;
    muscleGroup: string;
    equipment: string;
  };
  sets: SetData[];
}

export interface SetData {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  completedAt: Date;
}

export interface ExerciseData {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  description: string | null;
}
