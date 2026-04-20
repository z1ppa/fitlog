"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  weight: number | null;
  height: number | null;
  age: number | null;
  createdAt: string;
  measurements: {
    id: string;
    date: string;
    weight: number | null;
    chest: number | null;
    waist: number | null;
    hips: number | null;
    bodyFat: number | null;
  }[];
  workouts: {
    id: string;
    startedAt: string;
    completedAt: string | null;
    status: "ACTIVE" | "COMPLETED";
    exercises: {
      exercise: { name: string; muscleGroup: string };
      sets: { weight: number | null; reps: number | null }[];
    }[];
  }[];
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDuration(start: string, end: string | null) {
  if (!end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const min = Math.floor(ms / 60000);
  return min < 60 ? `${min} мин` : `${Math.floor(min / 60)}ч ${min % 60}мин`;
}

function totalVolume(workout: UserDetail["workouts"][0]) {
  let kg = 0;
  for (const ex of workout.exercises) {
    for (const s of ex.sets) {
      if (s.weight && s.reps) kg += s.weight * s.reps;
    }
  }
  return kg;
}

export default function AdminUserPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"workouts" | "measurements">("workouts");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session.user.role !== "ADMIN") router.push("/dashboard");
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user.role === "ADMIN") {
      fetch(`/api/admin/users/${id}`)
        .then((r) => r.json())
        .then((data) => { setUser(data); setLoading(false); });
    }
  }, [status, session, id]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const completed = user.workouts.filter((w) => w.status === "COMPLETED");
  const totalVol = completed.reduce((sum, w) => sum + totalVolume(w), 0);

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <Link href="/admin" className="text-zinc-400 hover:text-white transition text-sm">
          ← Все пользователи
        </Link>
        {user.role === "ADMIN" && (
          <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
            admin
          </span>
        )}
      </header>

      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
        <h1 className="text-xl font-bold mb-1">{user.name ?? "Без имени"}</h1>
        <p className="text-zinc-400 text-sm mb-4">{user.email}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {user.age && <div><span className="text-zinc-500">Возраст: </span>{user.age} лет</div>}
          {user.weight && <div><span className="text-zinc-500">Вес: </span>{user.weight} кг</div>}
          {user.height && <div><span className="text-zinc-500">Рост: </span>{user.height} см</div>}
          <div><span className="text-zinc-500">Регистрация: </span>{formatDate(user.createdAt)}</div>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-400">{user.workouts.length}</p>
          <p className="text-zinc-500 text-xs mt-1">тренировок</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-400">{user.measurements.length}</p>
          <p className="text-zinc-500 text-xs mt-1">замеров</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-400">
            {totalVol > 0 ? `${Math.round(totalVol / 1000)}т` : "—"}
          </p>
          <p className="text-zinc-500 text-xs mt-1">объём</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("workouts")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
            tab === "workouts"
              ? "bg-orange-500 text-white"
              : "bg-zinc-900 text-zinc-400 hover:text-white"
          }`}
        >
          Тренировки ({user.workouts.length})
        </button>
        <button
          onClick={() => setTab("measurements")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
            tab === "measurements"
              ? "bg-orange-500 text-white"
              : "bg-zinc-900 text-zinc-400 hover:text-white"
          }`}
        >
          Замеры ({user.measurements.length})
        </button>
      </div>

      {tab === "workouts" && (
        <div className="space-y-3">
          {user.workouts.length === 0 && (
            <p className="text-center text-zinc-500 py-8">Тренировок нет</p>
          )}
          {user.workouts.map((w) => {
            const vol = totalVolume(w);
            const dur = formatDuration(w.startedAt, w.completedAt);
            return (
              <div key={w.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium">{formatDate(w.startedAt)}</p>
                  <div className="flex items-center gap-2">
                    {dur && <p className="text-zinc-400 text-sm">{dur}</p>}
                    {w.status === "ACTIVE" && (
                      <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
                        активна
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-zinc-400 text-sm mb-2">
                  {w.exercises.map((e) => e.exercise.name).join(" · ")}
                </p>
                {vol > 0 && (
                  <p className="text-orange-400 text-sm font-medium">
                    {vol.toLocaleString()} кг объём
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "measurements" && (
        <div className="space-y-3">
          {user.measurements.length === 0 && (
            <p className="text-center text-zinc-500 py-8">Замеров нет</p>
          )}
          {user.measurements.map((m) => (
            <div key={m.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <p className="font-medium mb-3">{formatDate(m.date)}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {m.weight && <div><span className="text-zinc-500">Вес: </span>{m.weight} кг</div>}
                {m.chest && <div><span className="text-zinc-500">Грудь: </span>{m.chest} см</div>}
                {m.waist && <div><span className="text-zinc-500">Талия: </span>{m.waist} см</div>}
                {m.hips && <div><span className="text-zinc-500">Бёдра: </span>{m.hips} см</div>}
                {m.bodyFat && <div><span className="text-zinc-500">Жир: </span>{m.bodyFat}%</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
