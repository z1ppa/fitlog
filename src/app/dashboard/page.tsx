"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isBaseExercise, saveWorkoutPrescription, SARYCHEV_PROGRAM_NAME, ONE_RM_SETTING_KEY } from "@/lib/sarychev";

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

interface ProgramSummary {
  id: string;
  name: string;
  goal: string | null;
  difficulty: string | null;
  userId: string | null;
  _count: { days: number };
}

interface ProgramDay {
  id: string;
  dayNumber: number;
  name: string | null;
  exercises: {
    id: string;
    order: number;
    sets: number;
    reps: string;
    exercise: { id: string; name: string; muscleGroup: string };
  }[];
}

interface ProgramFull {
  id: string;
  name: string;
  days: ProgramDay[];
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

function WorkoutPicker({
  onClose,
  onStartFree,
  onStartDay,
}: {
  onClose: () => void;
  onStartFree: () => void;
  onStartDay: (program: ProgramFull, day: ProgramDay) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState<ProgramFull | null>(null);
  const [loadingProgram, setLoadingProgram] = useState(false);
  const [step, setStep] = useState<"programs" | "one-rm" | "days">("programs");
  const [oneRMInput, setOneRMInput] = useState("");
  const [savingRM, setSavingRM] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch("/api/programs")
      .then((r) => r.json())
      .then((data) => { setPrograms(data); setLoadingPrograms(false); });
  }, []);

  function selectProgram(program: ProgramSummary) {
    setLoadingProgram(true);
    fetch(`/api/programs/${program.id}`)
      .then((r) => r.json())
      .then((data) => { setSelectedProgram(data); setLoadingProgram(false); });

    if (program.name === SARYCHEV_PROGRAM_NAME) {
      fetch(`/api/settings?key=${ONE_RM_SETTING_KEY}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.value) {
            setOneRMInput(data.value);
            setStep("days");
          } else {
            setStep("one-rm");
          }
        });
    } else {
      setStep("days");
    }
  }

  async function saveRMAndContinue() {
    const val = parseFloat(oneRMInput);
    if (val > 0) {
      setSavingRM(true);
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: ONE_RM_SETTING_KEY, value: val }),
      });
      setSavingRM(false);
    }
    setStep("days");
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-zinc-950/95" />
      <div
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-3xl px-4 pt-5 pb-6 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          {step !== "programs" ? (
            <button
              onClick={() => setStep(step === "days" && selectedProgram?.name === SARYCHEV_PROGRAM_NAME ? "one-rm" : "programs")}
              className="text-zinc-400 hover:text-white transition text-sm"
            >
              ← Назад
            </button>
          ) : (
            <h2 className="text-lg font-bold">Начать тренировку</h2>
          )}
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition">✕</button>
        </div>

        {step === "programs" && (
          <div className="overflow-y-auto flex-1 space-y-2">
            <button
              onClick={onStartFree}
              className="w-full text-left bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-2xl p-4 transition active:scale-95"
            >
              <p className="font-bold text-white">Свободная тренировка</p>
              <p className="text-zinc-400 text-sm mt-0.5">Без программы, сам выбираю упражнения</p>
            </button>

            <div className="pt-2 pb-1">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">По программе</p>
            </div>

            {loadingPrograms ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : programs.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-6">Программ пока нет</p>
            ) : (
              programs.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectProgram(p)}
                  className="w-full text-left bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-2xl p-4 transition active:scale-95"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-white">{p.name}</p>
                    {p.userId === null && (
                      <span className="text-xs text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-full shrink-0">публичная</span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {p.goal && <span className="text-zinc-500 text-xs">{p.goal}</span>}
                    {p.difficulty && <span className="text-zinc-500 text-xs">· {p.difficulty}</span>}
                    <span className="text-zinc-500 text-xs">· {p._count.days} дней</span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {step === "one-rm" && (
          <div className="flex-1 flex flex-col justify-center py-4">
            <p className="text-2xl mb-1">🏋️</p>
            <h3 className="text-lg font-bold mb-1">Твой максимум в жиме</h3>
            <p className="text-zinc-400 text-sm mb-6">
              Укажи 1RM — приложение рассчитает рабочие веса для каждого подхода программы
            </p>
            <div className="relative mb-3">
              <input
                type="number"
                placeholder="Например: 80"
                value={oneRMInput}
                onChange={(e) => setOneRMInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveRMAndContinue()}
                autoFocus
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 pr-12 text-lg"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">кг</span>
            </div>
            <button
              onClick={saveRMAndContinue}
              disabled={savingRM}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition active:scale-95 mb-2"
            >
              {savingRM ? "Сохраняем..." : "Сохранить и выбрать день"}
            </button>
            <button
              onClick={() => setStep("days")}
              className="w-full text-zinc-500 hover:text-zinc-300 text-sm py-2 transition"
            >
              Пропустить
            </button>
          </div>
        )}

        {step === "days" && (
          loadingProgram ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : selectedProgram ? (
            <div className="overflow-y-auto flex-1">
              <p className="text-zinc-400 text-sm mb-3">{selectedProgram.name} — выбери день</p>
              <div className="space-y-2">
                {selectedProgram.days.map((day) => (
                  <button
                    key={day.id}
                    onClick={() => onStartDay(selectedProgram, day)}
                    disabled={day.exercises.length === 0}
                    className="w-full text-left bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 border border-zinc-700 rounded-2xl p-4 transition active:scale-95"
                  >
                    <p className="font-medium text-white">{day.name ?? `День ${day.dayNumber}`}</p>
                    <p className="text-zinc-500 text-sm mt-0.5">
                      {day.exercises.map((e) => e.exercise.name).join(" · ")}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>,
    document.body
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (showPicker) {
      window.scrollTo({ top: 0 });
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showPicker]);

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

  async function startFreeWorkout() {
    setStarting(true);
    setShowPicker(false);
    const res = await fetch("/api/workouts", { method: "POST" });
    const workout = await res.json();
    router.push(`/workout/${workout.id}`);
  }

  async function startProgramDay(program: { id: string; name: string }, day: {
    id: string; dayNumber: number; name: string | null;
    exercises: { id: string; order: number; sets: number; reps: string; exercise: { id: string; name: string; muscleGroup: string } }[]
  }) {
    setStarting(true);
    setShowPicker(false);
    const res = await fetch("/api/workouts", { method: "POST" });
    const workout = await res.json();

    for (let i = 0; i < day.exercises.length; i++) {
      await fetch(`/api/workouts/${workout.id}/exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId: day.exercises[i].exercise.id, order: i }),
      });
    }

    saveWorkoutPrescription(
      workout.id,
      day.exercises.map((ex) => ({
        exerciseId: ex.exercise.id,
        sets: ex.sets,
        reps: ex.reps,
        isBase: isBaseExercise(ex.reps),
      }))
    );

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
      {showPicker && (
        <WorkoutPicker
          onClose={() => setShowPicker(false)}
          onStartFree={startFreeWorkout}
          onStartDay={startProgramDay}
        />
      )}

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
        onClick={() => setShowPicker(true)}
        disabled={starting}
        className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold text-xl py-6 rounded-2xl transition active:scale-95 mb-8 shadow-lg shadow-orange-500/20"
      >
        {starting ? "Запускаем..." : "Начать тренировку"}
      </button>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          href="/exercises"
          className="bg-zinc-900 border border-zinc-700 rounded-2xl py-4 text-center font-medium hover:border-zinc-500 transition"
        >
          💪 Упражнения
        </Link>
        <Link
          href="/programs"
          className="bg-zinc-900 border border-zinc-700 rounded-2xl py-4 text-center font-medium hover:border-zinc-500 transition"
        >
          📋 Программы
        </Link>
        {session?.user?.role === "ADMIN" && (
          <Link
            href="/admin"
            className="col-span-2 bg-zinc-900 border border-zinc-700 rounded-2xl py-4 text-center font-medium hover:border-zinc-500 transition"
          >
            ⚙️ Админка
          </Link>
        )}
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
