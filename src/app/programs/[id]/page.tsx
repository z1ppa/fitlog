"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  SARYCHEV_PROGRAM_NAME,
  ONE_RM_KEY,
  isBaseExercise,
  prescriptionWeightLabel,
  saveWorkoutPrescription,
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

  const [oneRMInput, setOneRMInput] = useState("");
  const [oneRM, setOneRM] = useState<number | null>(null);
  const [rmSaved, setRmSaved] = useState(false);

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

  useEffect(() => {
    const stored = localStorage.getItem(ONE_RM_KEY);
    if (stored) {
      setOneRMInput(stored);
      setOneRM(parseFloat(stored));
    }
  }, []);

  function saveOneRM() {
    const val = parseFloat(oneRMInput);
    if (!val || val <= 0) return;
    localStorage.setItem(ONE_RM_KEY, String(val));
    setOneRM(val);
    setRmSaved(true);
    setTimeout(() => setRmSaved(false), 2000);
  }

  async function startDay(day: ProgramDay) {
    setStarting(true);
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

  if (!program) return null;

  const isSarychev = program.name === SARYCHEV_PROGRAM_NAME;
  const day = program.days[activeDay];

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6 pb-12">
      <header className="flex items-center justify-between mb-6">
        <Link href="/programs" className="text-zinc-400 hover:text-white transition text-sm">← Программы</Link>
        {program.userId === null && <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">публичная</span>}
      </header>

      <section className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{program.name}</h1>
        {program.description && <p className="text-zinc-400 text-sm mb-4">{program.description}</p>}
        <div className="flex flex-wrap gap-2 text-xs">
          {program.difficulty && (
            <span className="text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full">{program.difficulty}</span>
          )}
          {program.goal && (
            <span className="text-zinc-400 bg-zinc-800 px-2 py-1 rounded-full">{program.goal}</span>
          )}
          {program.weeks && (
            <span className="text-zinc-400 bg-zinc-800 px-2 py-1 rounded-full">{program.weeks} недель</span>
          )}
          <span className="text-zinc-400 bg-zinc-800 px-2 py-1 rounded-full">{program.days.length} дней</span>
        </div>
      </section>

      {isSarychev && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 mb-6">
          <p className="text-sm font-medium text-zinc-300 mb-1">Твой максимум в жиме лёжа</p>
          <p className="text-zinc-500 text-xs mb-3">Укажи 1RM — приложение рассчитает рабочие веса для каждого подхода</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                placeholder="Например: 80"
                value={oneRMInput}
                onChange={(e) => setOneRMInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveOneRM()}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">кг</span>
            </div>
            <button
              onClick={saveOneRM}
              className="bg-orange-500 hover:bg-orange-400 text-white font-bold px-4 rounded-xl transition active:scale-95"
            >
              {rmSaved ? "✓" : "Сохранить"}
            </button>
          </div>
          {oneRM && (
            <p className="text-xs text-zinc-500 mt-2">
              Сохранено: <span className="text-orange-400 font-medium">{oneRM} кг</span>
            </p>
          )}
        </div>
      )}

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
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition ${
                  activeDay === i ? "bg-orange-500 text-white" : "bg-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                {d.name ?? `День ${d.dayNumber}`}
              </button>
            ))}
          </div>

          {day && (
            <div className="space-y-3 mb-6">
              {day.exercises.map((ex) => {
                const base = isBaseExercise(ex.reps);
                const weightLabel = prescriptionWeightLabel(ex.reps, oneRM);
                return (
                  <div
                    key={ex.id}
                    className={`border rounded-2xl p-4 ${
                      base
                        ? "bg-orange-500/5 border-orange-500/30"
                        : "bg-zinc-900 border-zinc-800"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium">{ex.exercise.name}</p>
                      {base && (
                        <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full shrink-0 ml-2">
                          базовое
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-500 text-xs mb-2">{ex.exercise.muscleGroup} · {ex.exercise.equipment}</p>
                    <div className="flex items-center gap-3 flex-wrap">
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
