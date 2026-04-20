"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

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
              {day.exercises.map((ex) => (
                <div key={ex.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <p className="font-medium mb-1">{ex.exercise.name}</p>
                  <p className="text-zinc-500 text-xs mb-2">{ex.exercise.muscleGroup} · {ex.exercise.equipment}</p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-orange-400 font-medium">{ex.sets} × {ex.reps}</span>
                    {ex.weight && <span className="text-zinc-400">{ex.weight} кг</span>}
                  </div>
                </div>
              ))}
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
