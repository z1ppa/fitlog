"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface SetRow {
  setNumber: number;
  weight: number | null;
  reps: number | null;
}

interface WorkoutEntry {
  workoutId: string;
  date: string;
  sets: SetRow[];
  volume: number;
  bestWeight: number | null;
  bestReps: number | null;
}

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  description: string | null;
}

export default function ExerciseHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/exercises/${id}/history`)
      .then((r) => r.json())
      .then((data) => {
        setExercise(data.exercise ?? null);
        setHistory(data.history ?? []);
        setLoading(false);
      });
  }, [status, id]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const allWeights = history.flatMap((e) => e.sets.map((s) => s.weight)).filter(Boolean) as number[];
  const maxEver = allWeights.length > 0 ? Math.max(...allWeights) : null;

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6 pb-12">
      <header className="flex items-center gap-3 mb-6">
        <Link href="/exercises" className="text-zinc-400 text-2xl">←</Link>
        <div>
          <h1 className="text-xl font-bold">{exercise?.name ?? "Упражнение"}</h1>
          {exercise && (
            <p className="text-orange-400 text-sm">{exercise.muscleGroup} · {exercise.equipment}</p>
          )}
        </div>
      </header>

      {maxEver !== null && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 mb-6 flex items-center gap-4">
          <div>
            <p className="text-xs text-zinc-400 mb-0.5">Личный рекорд</p>
            <p className="text-3xl font-bold text-orange-400">{maxEver} <span className="text-lg">кг</span></p>
          </div>
          <div className="h-12 w-px bg-zinc-700" />
          <div>
            <p className="text-xs text-zinc-400 mb-0.5">Тренировок</p>
            <p className="text-3xl font-bold">{history.length}</p>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <p className="text-4xl mb-3">📊</p>
          <p>История пуста</p>
          <p className="text-sm mt-1">Начни тренироваться чтобы видеть прогресс</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => (
            <Link
              key={entry.workoutId}
              href={`/workout/complete/${entry.workoutId}`}
              className="block bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-600 transition"
            >
              <div className="flex justify-between items-start mb-3">
                <p className="font-medium">
                  {new Date(entry.date).toLocaleDateString("ru-RU", {
                    day: "numeric", month: "long", year: "numeric", weekday: "short",
                  })}
                </p>
                {entry.bestWeight && (
                  <span className="text-orange-400 font-bold text-sm">{entry.bestWeight} кг</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {entry.sets.map((s) => (
                  <span
                    key={s.setNumber}
                    className="bg-zinc-800 text-zinc-300 text-sm px-2.5 py-1 rounded-lg"
                  >
                    {s.weight ?? "—"} × {s.reps ?? "—"}
                  </span>
                ))}
              </div>

              {entry.volume > 0 && (
                <p className="text-zinc-500 text-xs">{entry.volume.toLocaleString()} кг объём</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
