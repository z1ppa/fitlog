"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  description: string | null;
}

const MUSCLE_GROUPS = ["Все", "Грудь", "Спина", "Плечи", "Бицепс", "Трицепс", "Ноги", "Пресс", "Кардио"];

function ExerciseList() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromWorkout = searchParams.get("workoutId");

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("Все");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [adding, setAdding] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMuscle, setNewMuscle] = useState("");
  const [newEquip, setNewEquip] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (muscle !== "Все") params.set("muscleGroup", muscle);
    fetch(`/api/exercises?${params}`)
      .then((r) => r.json())
      .then((data) => { setExercises(data); setLoading(false); });
  }, [search, muscle, status]);

  async function createAndAdd() {
    if (!newName.trim() || !newMuscle || !newEquip) return;
    setCreating(true);
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, muscleGroup: newMuscle, equipment: newEquip }),
    });
    const exercise = await res.json();
    if (fromWorkout) {
      await fetch(`/api/workouts/${fromWorkout}/exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId: exercise.id }),
      });
      router.push(`/workout/${fromWorkout}`);
    } else {
      setExercises((prev) => [...prev, exercise].sort((a, b) => a.name.localeCompare(b.name, "ru")));
      setShowCreate(false);
      setNewName(""); setNewMuscle(""); setNewEquip("");
      setCreating(false);
    }
  }

  async function addToWorkout(exercise: Exercise) {
    if (!fromWorkout) return;
    setAdding(true);
    await fetch(`/api/workouts/${fromWorkout}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseId: exercise.id }),
    });
    router.push(`/workout/${fromWorkout}`);
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto px-4 py-6">
      <header className="flex items-center gap-3 mb-6">
        <Link href={fromWorkout ? `/workout/${fromWorkout}` : "/dashboard"} className="text-zinc-400 text-2xl">←</Link>
        <h1 className="text-xl font-bold flex-1">
          {fromWorkout ? "Выбери упражнение" : "Справочник упражнений"}
        </h1>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className={`w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition ${showCreate ? "bg-zinc-700 text-white" : "bg-orange-500 text-white hover:bg-orange-400"}`}
        >
          {showCreate ? "✕" : "+"}
        </button>
      </header>

      {showCreate && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 mb-4 space-y-3">
          <p className="text-sm font-semibold text-zinc-300">Новое упражнение</p>
          <input
            type="text"
            placeholder="Название *"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={newMuscle}
              onChange={(e) => setNewMuscle(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-orange-500 text-sm"
            >
              <option value="">Группа мышц *</option>
              {["Грудь","Спина","Плечи","Бицепс","Трицепс","Ноги","Пресс","Кардио","Другое"].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
            <select
              value={newEquip}
              onChange={(e) => setNewEquip(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-orange-500 text-sm"
            >
              <option value="">Инвентарь *</option>
              {["Штанга","Гантели","Тренажёр","Блок","Собственный вес","Гири","Резина","Без инвентаря"].map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </div>
          <button
            onClick={createAndAdd}
            disabled={creating || !newName.trim() || !newMuscle || !newEquip}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl transition text-sm"
          >
            {creating ? "Создаём..." : fromWorkout ? "Создать и добавить" : "Создать"}
          </button>
        </div>
      )}

      <input
        type="text"
        placeholder="Поиск..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-base outline-none focus:border-orange-500 transition mb-3"
      />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {MUSCLE_GROUPS.map((g) => (
          <button
            key={g}
            onClick={() => setMuscle(g)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition ${
              muscle === g
                ? "bg-orange-500 text-white"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : exercises.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <p>Ничего не найдено</p>
        </div>
      ) : (
        <div className="space-y-2">
          {exercises.map((ex) => (
            fromWorkout ? (
              <button
                key={ex.id}
                onClick={() => addToWorkout(ex)}
                disabled={adding}
                className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-600 transition active:scale-98 disabled:opacity-50"
              >
                <div className="flex justify-between items-start">
                  <p className="font-medium">{ex.name}</p>
                  <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{ex.equipment}</span>
                </div>
                <p className="text-orange-400 text-sm mt-0.5">{ex.muscleGroup}</p>
              </button>
            ) : (
              <Link
                key={ex.id}
                href={`/exercises/${ex.id}`}
                className="block bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-600 transition"
              >
                <div className="flex justify-between items-start">
                  <p className="font-medium">{ex.name}</p>
                  <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{ex.equipment}</span>
                </div>
                <p className="text-orange-400 text-sm mt-0.5">{ex.muscleGroup}</p>
              </Link>
            )
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExercisesPage() {
  return (
    <Suspense>
      <ExerciseList />
    </Suspense>
  );
}
