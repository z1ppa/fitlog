"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  SARYCHEV_PROGRAM_NAME,
  isBaseExercise,
  prescriptionWeightLabel,
  saveWorkoutPrescription,
  exerciseRMKey,
} from "@/lib/sarychev";

interface ProgramExercise {
  id: string;
  order: number;
  sets: number;
  reps: string;
  weight: number | null;
  exercise: { id: string; name: string; muscleGroup: string; equipment: string };
}

interface ProgramDay {
  id: string;
  dayNumber: number;
  name: string | null;
  exercises: ProgramExercise[];
  completed: boolean;
}

interface Program {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  difficulty: string | null;
  weeks: number | null;
  userId: string | null;
  user: { name: string | null; email: string } | null;
  days: ProgramDay[];
}

export default function ProgramPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(0);
  const [starting, setStarting] = useState(false);

  // per-exercise 1RM: exerciseId → value
  const [exerciseRMs, setExerciseRMs] = useState<Record<string, number>>({});
  // which exercise is being edited
  const [editingRM, setEditingRM] = useState<string | null>(null);
  const [rmInputs, setRmInputs] = useState<Record<string, string>>({});
  const [savingRM, setSavingRM] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch(`/api/programs/${id}`)
        .then((r) => r.json())
        .then((data) => { setProgram(data); setLoading(false); });
    }
  }, [status, id]);

  // Load 1RMs for all base exercises across all days whenever program loads
  useEffect(() => {
    if (!program) return;
    const baseExIds = new Set<string>();
    for (const day of program.days) {
      for (const ex of day.exercises) {
        if (isBaseExercise(ex.reps)) baseExIds.add(ex.exercise.id);
      }
    }
    if (baseExIds.size === 0) return;
    const keys = [...baseExIds].map(exerciseRMKey).join(",");
    fetch(`/api/settings?keys=${keys}`)
      .then((r) => r.json())
      .then((map: Record<string, string>) => {
        const rms: Record<string, number> = {};
        const inputs: Record<string, string> = {};
        for (const exId of baseExIds) {
          const val = map[exerciseRMKey(exId)];
          if (val) { rms[exId] = parseFloat(val); inputs[exId] = val; }
        }
        setExerciseRMs(rms);
        setRmInputs((prev) => ({ ...prev, ...inputs }));
      });
  }, [program]);

  async function saveRM(exerciseId: string) {
    const val = parseFloat(rmInputs[exerciseId] ?? "");
    if (isNaN(val) || val < 0) return;
    setSavingRM(exerciseId);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: exerciseRMKey(exerciseId), value: val === 0 ? "" : val }),
    });
    setExerciseRMs((prev) => {
      const next = { ...prev };
      if (val <= 0) delete next[exerciseId]; else next[exerciseId] = val;
      return next;
    });
    setSavingRM(null);
    setEditingRM(null);
  }

  async function startDay(day: ProgramDay) {
    setStarting(true);
    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        programDayId: day.id,
        exercises: day.exercises.map((ex, i) => ({ exerciseId: ex.exercise.id, order: i })),
      }),
    });
    const workout = await res.json();

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

  if (!program) return null;

  const isSarychev = program.name === SARYCHEV_PROGRAM_NAME;
  const day = program.days[activeDay];

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6 pb-12">
      <header className="flex items-center justify-between mb-6">
        <Link href="/programs" className="text-zinc-400 hover:text-white transition text-sm">← Программы</Link>
        <div className="flex items-center gap-2">
          {program.userId === null && <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">публичная</span>}
          {program.userId !== null && (
            <Link href={`/programs/${program.id}/edit`} className="text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition">
              Редактировать
            </Link>
          )}
        </div>
      </header>

      <section className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{program.name}</h1>
        {program.description && <p className="text-zinc-400 text-sm mb-4">{program.description}</p>}
        <div className="flex flex-wrap gap-2 text-xs">
          {program.difficulty && <span className="text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full">{program.difficulty}</span>}
          {program.goal && <span className="text-zinc-400 bg-zinc-800 px-2 py-1 rounded-full">{program.goal}</span>}
          {program.weeks && <span className="text-zinc-400 bg-zinc-800 px-2 py-1 rounded-full">{program.weeks} недель</span>}
          <span className="text-zinc-400 bg-zinc-800 px-2 py-1 rounded-full">{program.days.length} дней</span>
        </div>
      </section>

      {program.days.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <p className="text-4xl mb-3">📋</p>
          <p>В программе нет дней</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {program.days.map((d, i) => (
              <button
                key={d.id}
                onClick={() => setActiveDay(i)}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-1.5 ${
                  activeDay === i
                    ? "bg-orange-500 text-white"
                    : d.completed
                    ? "bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20"
                    : "bg-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                {d.completed && activeDay !== i && <span className="text-xs">✓</span>}
                {d.name ?? `День ${d.dayNumber}`}
              </button>
            ))}
          </div>

          {day && (
            <div className="space-y-3 mb-6">
              {day.exercises.map((ex) => {
                const base = isBaseExercise(ex.reps);
                const myRM = exerciseRMs[ex.exercise.id] ?? null;
                const weightLabel = prescriptionWeightLabel(ex.reps, myRM);
                const isEditing = editingRM === ex.exercise.id;

                return (
                  <div
                    key={ex.id}
                    className={`border rounded-2xl p-4 ${base ? "bg-orange-500/5 border-orange-500/30" : "bg-zinc-900 border-zinc-800"}`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium">{ex.exercise.name}</p>
                      {base && <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full shrink-0 ml-2">базовое</span>}
                    </div>
                    <p className="text-zinc-500 text-xs mb-2">{ex.exercise.muscleGroup} · {ex.exercise.equipment}</p>

                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span className={`text-sm font-medium ${base ? "text-orange-400" : "text-zinc-300"}`}>
                        {ex.sets > 1 ? `${ex.sets} × ` : ""}{ex.reps}
                      </span>
                      {weightLabel && (
                        <span className="text-sm text-white bg-orange-500/20 border border-orange-500/30 px-2 py-0.5 rounded-lg font-medium">
                          = {weightLabel}
                        </span>
                      )}
                      {ex.weight && !weightLabel && (
                        <span className="text-zinc-400 text-sm">{ex.weight} кг</span>
                      )}
                    </div>

                    {/* Per-exercise 1RM input for base exercises */}
                    {isSarychev && base && (
                      <div className="mt-2 pt-2 border-t border-orange-500/10">
                        {myRM && !isEditing ? (
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-zinc-500">
                              Твой макс: <span className="text-orange-400 font-medium">{myRM} кг</span>
                            </p>
                            <button
                              onClick={() => setEditingRM(ex.exercise.id)}
                              className="text-xs text-zinc-600 hover:text-zinc-400 transition"
                            >
                              изменить
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 items-center">
                            <p className="text-xs text-zinc-500 shrink-0">Твой макс:</p>
                            <div className="relative flex-1">
                              <input
                                type="number"
                                placeholder="кг"
                                value={rmInputs[ex.exercise.id] ?? ""}
                                onChange={(e) => setRmInputs((prev) => ({ ...prev, [ex.exercise.id]: e.target.value }))}
                                onKeyDown={(e) => e.key === "Enter" && saveRM(ex.exercise.id)}
                                autoFocus={isEditing}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 text-sm pr-8"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">кг</span>
                            </div>
                            <button
                              onClick={() => saveRM(ex.exercise.id)}
                              disabled={savingRM === ex.exercise.id}
                              className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition active:scale-95 shrink-0"
                            >
                              {savingRM === ex.exercise.id ? "..." : "✓"}
                            </button>
                            {isEditing && (
                              <button onClick={() => setEditingRM(null)} className="text-zinc-600 text-xs">✕</button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-zinc-600 mt-1.5">
                      {base ? "Отдых 3–5 мин" : "Отдых 1–2 мин"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={() => day && startDay(day)}
            disabled={starting || !day || day.exercises.length === 0}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition active:scale-95"
          >
            {starting ? "Запускаем..." : `Начать ${day?.name ?? `День ${day?.dayNumber}`}`}
          </button>
        </>
      )}
    </div>
  );
}
