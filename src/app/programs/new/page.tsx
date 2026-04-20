"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface ExerciseData {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
}

interface ProgramExerciseRow {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: string;
  weight: string;
  order: number;
}

interface DayRow {
  dayNumber: number;
  name: string;
  exercises: ProgramExerciseRow[];
}

export default function NewProgramPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [weeks, setWeeks] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [days, setDays] = useState<DayRow[]>([{ dayNumber: 1, name: "", exercises: [] }]);
  const [saving, setSaving] = useState(false);

  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [search, setSearch] = useState("");
  const [pickingFor, setPickingFor] = useState<{ dayIdx: number } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then(setExercises);
  }, []);

  function addDay() {
    setDays((prev) => [...prev, { dayNumber: prev.length + 1, name: "", exercises: [] }]);
  }

  function removeDay(idx: number) {
    setDays((prev) => prev.filter((_, i) => i !== idx).map((d, i) => ({ ...d, dayNumber: i + 1 })));
  }

  function updateDayName(idx: number, val: string) {
    setDays((prev) => prev.map((d, i) => i === idx ? { ...d, name: val } : d));
  }

  function addExerciseToDay(dayIdx: number, ex: ExerciseData) {
    setDays((prev) => prev.map((d, i) => {
      if (i !== dayIdx) return d;
      return {
        ...d,
        exercises: [...d.exercises, {
          exerciseId: ex.id,
          exerciseName: ex.name,
          sets: 3,
          reps: "8-12",
          weight: "",
          order: d.exercises.length,
        }],
      };
    }));
    setPickingFor(null);
    setSearch("");
  }

  function removeExercise(dayIdx: number, exIdx: number) {
    setDays((prev) => prev.map((d, i) => {
      if (i !== dayIdx) return d;
      return { ...d, exercises: d.exercises.filter((_, j) => j !== exIdx).map((e, j) => ({ ...e, order: j })) };
    }));
  }

  function updateExercise(dayIdx: number, exIdx: number, field: keyof ProgramExerciseRow, val: string | number) {
    setDays((prev) => prev.map((d, i) => {
      if (i !== dayIdx) return d;
      return {
        ...d,
        exercises: d.exercises.map((e, j) => j === exIdx ? { ...e, [field]: val } : e),
      };
    }));
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, description, goal, difficulty,
        weeks: weeks || null,
        isPublic: isPublic && session?.user.role === "ADMIN",
        days: days.map((d) => ({
          dayNumber: d.dayNumber,
          name: d.name || null,
          exercises: d.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            order: e.order,
            sets: e.sets,
            reps: e.reps,
            weight: e.weight ? parseFloat(e.weight) : null,
          })),
        })),
      }),
    });
    const program = await res.json();
    router.push(`/programs/${program.id}`);
  }

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.muscleGroup.toLowerCase().includes(search.toLowerCase())
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6 pb-16">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Новая программа</h1>
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-white transition text-sm">✕</button>
      </header>

      {/* Основная инфо */}
      <section className="space-y-3 mb-6">
        <input
          type="text"
          placeholder="Название программы *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
        />
        <textarea
          placeholder="Описание (необязательно)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500"
          >
            <option value="">Цель...</option>
            <option>Набор массы</option>
            <option>Похудение</option>
            <option>Сила</option>
            <option>Выносливость</option>
            <option>Общая форма</option>
          </select>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500"
          >
            <option value="">Уровень...</option>
            <option>Начинающий</option>
            <option>Средний</option>
            <option>Продвинутый</option>
          </select>
        </div>
        <input
          type="number"
          placeholder="Длительность (недель)"
          value={weeks}
          onChange={(e) => setWeeks(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
        />
        {session?.user.role === "ADMIN" && (
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setIsPublic((v) => !v)}
              className={`w-10 h-6 rounded-full transition ${isPublic ? "bg-orange-500" : "bg-zinc-700"} relative`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isPublic ? "left-5" : "left-1"}`} />
            </div>
            <span className="text-sm text-zinc-300">Публичная программа (для всех)</span>
          </label>
        )}
      </section>

      {/* Дни */}
      <section className="space-y-4 mb-6">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Дни тренировок</h2>

        {days.map((day, dayIdx) => (
          <div key={dayIdx} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-orange-400 font-bold text-sm shrink-0">День {day.dayNumber}</span>
              <input
                type="text"
                placeholder="Название дня (необязательно)"
                value={day.name}
                onChange={(e) => updateDayName(dayIdx, e.target.value)}
                className="flex-1 bg-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              {days.length > 1 && (
                <button onClick={() => removeDay(dayIdx)} className="text-zinc-600 hover:text-red-400 transition text-sm">✕</button>
              )}
            </div>

            <div className="space-y-2 mb-3">
              {day.exercises.map((ex, exIdx) => (
                <div key={exIdx} className="bg-zinc-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium truncate pr-2">{ex.exerciseName}</p>
                    <button onClick={() => removeExercise(dayIdx, exIdx)} className="text-zinc-600 hover:text-red-400 transition shrink-0">✕</button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex flex-col flex-1">
                      <label className="text-zinc-500 text-xs mb-1">Подходы</label>
                      <input
                        type="number"
                        value={ex.sets}
                        onChange={(e) => updateExercise(dayIdx, exIdx, "sets", parseInt(e.target.value) || 1)}
                        className="bg-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div className="flex flex-col flex-1">
                      <label className="text-zinc-500 text-xs mb-1">Повторения</label>
                      <input
                        type="text"
                        value={ex.reps}
                        onChange={(e) => updateExercise(dayIdx, exIdx, "reps", e.target.value)}
                        placeholder="8-12"
                        className="bg-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div className="flex flex-col flex-1">
                      <label className="text-zinc-500 text-xs mb-1">Вес (кг)</label>
                      <input
                        type="number"
                        value={ex.weight}
                        onChange={(e) => updateExercise(dayIdx, exIdx, "weight", e.target.value)}
                        placeholder="—"
                        className="bg-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {pickingFor?.dayIdx === dayIdx ? (
              <div className="bg-zinc-800 rounded-xl p-3">
                <input
                  type="text"
                  placeholder="Поиск упражнения..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  className="w-full bg-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none mb-2"
                />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filtered.slice(0, 20).map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => addExerciseToDay(dayIdx, ex)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-600 transition text-sm"
                    >
                      <span className="text-white">{ex.name}</span>
                      <span className="text-zinc-500 text-xs ml-2">{ex.muscleGroup}</span>
                    </button>
                  ))}
                  {filtered.length === 0 && <p className="text-zinc-500 text-sm text-center py-2">Не найдено</p>}
                </div>
                <button onClick={() => { setPickingFor(null); setSearch(""); }} className="text-zinc-500 text-xs mt-2">Отмена</button>
              </div>
            ) : (
              <button
                onClick={() => setPickingFor({ dayIdx })}
                className="w-full text-sm text-zinc-400 hover:text-orange-400 transition py-2 border border-dashed border-zinc-700 hover:border-orange-500 rounded-xl"
              >
                + Добавить упражнение
              </button>
            )}
          </div>
        ))}

        <button
          onClick={addDay}
          className="w-full py-3 text-sm text-zinc-400 hover:text-white border border-dashed border-zinc-700 hover:border-zinc-500 rounded-2xl transition"
        >
          + Добавить день
        </button>
      </section>

      <button
        onClick={save}
        disabled={saving || !name.trim()}
        className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition active:scale-95"
      >
        {saving ? "Сохраняем..." : "Сохранить программу"}
      </button>
    </div>
  );
}
