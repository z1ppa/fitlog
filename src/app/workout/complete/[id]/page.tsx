"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface SetData { weight: number | null; reps: number | null }
interface WorkoutExercise {
  exercise: { name: string; muscleGroup: string };
  sets: SetData[];
}
interface Workout {
  id: string;
  startedAt: string;
  completedAt: string | null;
  exercises: WorkoutExercise[];
}

export default function CompletePage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [workout, setWorkout] = useState<Workout | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/workouts/${id}`)
      .then((r) => r.json())
      .then(setWorkout);
  }, [id, status]);

  if (!workout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const durationMs = workout.completedAt
    ? new Date(workout.completedAt).getTime() - new Date(workout.startedAt).getTime()
    : 0;
  const durationMin = Math.floor(durationMs / 60000);
  const durationStr = durationMin < 60
    ? `${durationMin} мин`
    : `${Math.floor(durationMin / 60)}ч ${durationMin % 60}мин`;

  let totalVolume = 0;
  let totalSets = 0;
  for (const ex of workout.exercises) {
    for (const s of ex.sets) {
      totalSets++;
      if (s.weight && s.reps) totalVolume += s.weight * s.reps;
    }
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6">
      <div className="text-center py-8">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-3xl font-bold mb-1">Отличная работа!</h1>
        <p className="text-zinc-400">
          {new Date(workout.startedAt).toLocaleDateString("ru-RU", {
            day: "numeric", month: "long", weekday: "long",
          })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-400">{durationStr}</p>
          <p className="text-zinc-500 text-xs mt-1">Длительность</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-400">{totalSets}</p>
          <p className="text-zinc-500 text-xs mt-1">Подходов</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-400">
            {totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}т` : "—"}
          </p>
          <p className="text-zinc-500 text-xs mt-1">Объём</p>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Упражнения</h2>
        <div className="space-y-3">
          {workout.exercises.map((we, i) => {
            const vol = we.sets.reduce((acc, s) => acc + (s.weight && s.reps ? s.weight * s.reps : 0), 0);
            return (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-medium">{we.exercise.name}</p>
                  <p className="text-zinc-500 text-sm">{we.sets.length} подх.</p>
                </div>
                <div className="space-y-1">
                  {we.sets.map((s, j) => (
                    <div key={j} className="flex gap-4 text-sm text-zinc-400">
                      <span className="text-zinc-600">#{j + 1}</span>
                      <span>{s.weight ?? "—"} кг</span>
                      <span>× {s.reps ?? "—"}</span>
                    </div>
                  ))}
                </div>
                {vol > 0 && (
                  <p className="text-orange-400 text-sm mt-2">{vol.toLocaleString()} кг</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <Link
        href="/dashboard"
        className="block w-full bg-orange-500 text-white text-center font-bold text-lg py-4 rounded-2xl active:scale-95 transition"
      >
        На главную
      </Link>
    </div>
  );
}
