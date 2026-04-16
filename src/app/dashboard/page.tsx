"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Workout {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: "ACTIVE" | "COMPLETED";
  exercises: {
    id: string;
    exercise: { name: string };
    sets: { weight: number | null; reps: number | null }[];
  }[];
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "short",
  });
}

function formatDuration(start: string, end: string | null) {
  if (!end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const min = Math.floor(ms / 60000);
  return min < 60 ? `${min} мин` : `${Math.floor(min / 60)}ч ${min % 60}мин`;
}

function totalVolume(workout: Workout) {
  let kg = 0;
  for (const ex of workout.exercises) {
    for (const s of ex.sets) {
      if (s.weight && s.reps) kg += s.weight * s.reps;
    }
  }
  return kg;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/workouts")
        .then((r) => r.json())
        .then((data) => { setWorkouts(data); setLoading(false); });
    }
  }, [status]);

  async function deleteWorkout(id: string) {
    await fetch(`/api/workouts/${id}`, { method: "DELETE" });
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  }

  async function startWorkout() {
    setStarting(true);
    const res = await fetch("/api/workouts", { method: "POST" });
    const workout = await res.json();
    router.push(`/workout/${workout.id}`);
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeWorkout = workouts.find((w) => w.status === "ACTIVE");
  const completed = workouts.filter((w) => w.status === "COMPLETED");

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto px-4 py-6">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">FitLog</h1>
          <p className="text-zinc-400 text-sm">
            {session?.user?.name ? `Привет, ${session.user.name}` : session?.user?.email}
          </p>
        </div>
        <Link href="/profile" className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 hover:bg-zinc-700 transition font-medium text-sm">
          {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
        </Link>
      </header>

      {activeWorkout && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 mb-6">
          <p className="text-orange-400 text-sm font-medium mb-1">Активная тренировка</p>
          <p className="text-zinc-300 text-sm mb-3">
            Начата в {new Date(activeWorkout.startedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <Link
            href={`/workout/${activeWorkout.id}`}
            className="block w-full bg-orange-500 text-white text-center font-bold py-3 rounded-xl active:scale-95 transition"
          >
            Продолжить
          </Link>
        </div>
      )}

      <button
        onClick={startWorkout}
        disabled={starting}
        className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold text-xl py-6 rounded-2xl transition active:scale-95 mb-8 shadow-lg shadow-orange-500/20"
      >
        {starting ? "Запускаем..." : "Начать тренировку"}
      </button>

      <div className="flex gap-3 mb-6">
        <Link
          href="/exercises"
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-2xl py-4 text-center font-medium hover:border-zinc-500 transition"
        >
          💪 Упражнения
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">Последние тренировки</h2>
        {completed.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <p className="text-4xl mb-3">🏋️</p>
            <p>Тренировок пока нет</p>
            <p className="text-sm mt-1">Нажми кнопку выше, чтобы начать</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completed.map((w) => {
              const vol = totalVolume(w);
              const dur = formatDuration(w.startedAt, w.completedAt);
              return (
                <div key={w.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Link href={`/workout/complete/${w.id}`} className="flex-1 min-w-0">
                      <p className="font-medium">{formatDate(w.startedAt)}</p>
                    </Link>
                    <div className="flex flex-col items-end ml-2 shrink-0 gap-1">
                      {dur && <p className="text-zinc-400 text-sm">{dur}</p>}
                      <button
                        onClick={() => deleteWorkout(w.id)}
                        className="text-zinc-600 hover:text-red-400 transition"
                        title="Удалить"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                  <Link href={`/workout/complete/${w.id}`} className="block">
                    <p className="text-zinc-400 text-sm mb-2">
                      {w.exercises.map((e) => e.exercise.name).join(" · ")}
                    </p>
                    {vol > 0 && (
                      <p className="text-orange-400 text-sm font-medium">{vol.toLocaleString()} кг суммарный объём</p>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
