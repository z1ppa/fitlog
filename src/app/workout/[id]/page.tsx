"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  getWorkoutPrescription,
  prescriptionWeightLabel,
  getWeightForSet,
  WorkoutPrescriptionItem,
  BASE_REST_SECONDS,
  ACCESSORY_REST_SECONDS,
  ONE_RM_SETTING_KEY,
} from "@/lib/sarychev";

interface SetData {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
}

interface WorkoutExercise {
  id: string;
  order: number;
  exercise: { id: string; name: string; muscleGroup: string };
  sets: SetData[];
}

interface PrevSet {
  weight: number | null;
  reps: number | null;
}

interface PrevData {
  sets: PrevSet[];
  date: string;
}

interface Workout {
  id: string;
  startedAt: string;
  status: "ACTIVE" | "COMPLETED";
  exercises: WorkoutExercise[];
  prevSetsMap: Record<string, PrevData>;
}

function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [left, setLeft] = useState(seconds);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const endTimeRef = useRef(Date.now() + seconds * 1000);
  const notifTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleNotification(msLeft: number) {
    if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
    if (Notification.permission === "granted" && msLeft > 0) {
      notifTimeoutRef.current = setTimeout(() => {
        new Notification("Отдых закончен!", { body: "Можно делать следующий подход 💪", silent: false });
      }, msLeft);
    }
  }

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      const msLeft = endTimeRef.current - Date.now();
      const sLeft = Math.max(0, Math.ceil(msLeft / 1000));
      setLeft(sLeft);
      if (sLeft <= 0) { clearInterval(interval); onDoneRef.current(); }
    }, 500);

    function onVisibilityChange() {
      if (document.hidden) {
        scheduleNotification(endTimeRef.current - Date.now());
      } else {
        if (notifTimeoutRef.current) { clearTimeout(notifTimeoutRef.current); notifTimeoutRef.current = null; }
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = ((seconds - left) / seconds) * 100;

  return (
    <div className="fixed inset-0 bg-zinc-950/90 flex items-center justify-center z-50" onClick={onDone}>
      <div className="text-center">
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="#27272a" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="54" fill="none" stroke="#f97316" strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (1 - pct / 100)}`}
              className="transition-all duration-1000"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold">{left}</span>
        </div>
        <p className="text-zinc-400">Отдых</p>
        <p className="text-zinc-500 text-sm mt-2">Нажми, чтобы пропустить</p>
      </div>
    </div>
  );
}

function ExerciseCard({
  we,
  onSetAdded,
  onSetDeleted,
  onRestStart,
  done,
  onDone,
  prevData,
  prescription,
  oneRM,
}: {
  we: WorkoutExercise;
  onSetAdded: (weId: string, set: SetData) => void;
  onSetDeleted: (weId: string, setId: string) => void;
  onRestStart: (seconds: number) => void;
  done: boolean;
  onDone: (weId: string, done: boolean) => void;
  prevData: PrevData | null;
  prescription: WorkoutPrescriptionItem | null;
  oneRM: number | null;
}) {
  const suggestWeight = (setIndex: number) => {
    const w = getWeightForSet(prescription?.reps ?? "", setIndex, oneRM);
    return w !== null ? String(w) : "";
  };
  const [weight, setWeight] = useState(() => suggestWeight(0));
  const [reps, setReps] = useState("");

  useEffect(() => {
    setWeight(suggestWeight(we.sets.length));
  }, [we.sets.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const [saving, setSaving] = useState(false);
  const [confirmDone, setConfirmDone] = useState(false);

  const isBase = prescription?.isBase ?? false;
  const weightLabel = prescription ? prescriptionWeightLabel(prescription.reps, oneRM) : null;

  async function addSet() {
    if (!weight && !reps) return;
    setSaving(true);
    const res = await fetch("/api/sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workoutExerciseId: we.id, weight, reps }),
    });
    const set = await res.json();
    setSaving(false);
    setReps("");
    onSetAdded(we.id, set);
    onRestStart(isBase ? BASE_REST_SECONDS : ACCESSORY_REST_SECONDS);
  }

  async function deleteSet(setId: string) {
    await fetch(`/api/sets/${setId}`, { method: "DELETE" });
    onSetDeleted(we.id, setId);
  }

  if (done) {
    const totalVol = we.sets.reduce((acc, s) => acc + (s.weight && s.reps ? s.weight * s.reps : 0), 0);
    const bestSet = we.sets.reduce<SetData | null>((best, s) => {
      if (!best) return s;
      const bScore = (best.weight ?? 0) * (best.reps ?? 0);
      const sScore = (s.weight ?? 0) * (s.reps ?? 0);
      return sScore > bScore ? s : best;
    }, null);

    return (
      <div className={`border rounded-2xl p-4 ${isBase ? "bg-orange-500/5 border-green-900/40" : "bg-zinc-900 border-green-900/40"}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-green-400 text-lg">✓</span>
            <div>
              <h3 className="font-bold">{we.exercise.name}</h3>
              <p className="text-orange-400 text-xs">{we.exercise.muscleGroup}</p>
            </div>
          </div>
          <button onClick={() => onDone(we.id, false)} className="text-zinc-600 text-xs hover:text-zinc-400 transition">
            изменить
          </button>
        </div>

        <div className="flex gap-3 text-sm">
          <div className="bg-zinc-800 rounded-xl px-3 py-2 text-center">
            <p className="font-bold text-white">{we.sets.length}</p>
            <p className="text-zinc-500 text-xs">подходов</p>
          </div>
          {we.sets.some((s) => s.reps) && (
            <div className="bg-zinc-800 rounded-xl px-3 py-2 text-center">
              <p className="font-bold text-white">{we.sets.reduce((acc, s) => acc + (s.reps ?? 0), 0)}</p>
              <p className="text-zinc-500 text-xs">повторений</p>
            </div>
          )}
          {totalVol > 0 && (
            <div className="bg-zinc-800 rounded-xl px-3 py-2 text-center">
              <p className="font-bold text-white">{totalVol.toLocaleString()} кг</p>
              <p className="text-zinc-500 text-xs">объём</p>
            </div>
          )}
          {bestSet && bestSet.weight && bestSet.reps && (
            <div className="bg-zinc-800 rounded-xl px-3 py-2 text-center">
              <p className="font-bold text-white">{bestSet.weight}×{bestSet.reps}</p>
              <p className="text-zinc-500 text-xs">лучший подход</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-2xl p-4 ${isBase ? "bg-orange-500/5 border-orange-500/30" : "bg-zinc-900 border-zinc-800"}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-lg">{we.exercise.name}</h3>
            {isBase && (
              <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full shrink-0">
                базовое
              </span>
            )}
          </div>
          <p className="text-orange-400 text-sm">{we.exercise.muscleGroup}</p>
        </div>
        <span className="text-zinc-500 text-sm shrink-0 ml-2">#{we.order}</span>
      </div>

      {prescription && (
        <div className={`mb-3 rounded-xl px-3 py-2.5 ${
          isBase
            ? "bg-orange-500/10 border border-orange-500/20"
            : "bg-zinc-800/50 border border-zinc-700/30"
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={`text-xs font-medium mb-0.5 ${isBase ? "text-orange-400" : "text-zinc-500"}`}>
                {isBase ? "Базовое упражнение" : "Вспомогательное"}
              </p>
              <p className="text-sm text-zinc-300">
                {prescription.sets > 1 ? `${prescription.sets} × ` : ""}{prescription.reps}
                {weightLabel && (
                  <span className="text-orange-300 font-medium ml-1">= {weightLabel}</span>
                )}
              </p>
            </div>
            <p className={`text-xs shrink-0 mt-0.5 ${isBase ? "text-orange-500/70" : "text-zinc-600"}`}>
              {isBase ? "отдых 3–5 мин" : "отдых 1–2 мин"}
            </p>
          </div>
        </div>
      )}

      {we.sets.length > 0 && (
        <div className="mb-3 space-y-1">
          <div className="grid grid-cols-4 text-zinc-500 text-xs px-1 mb-1">
            <span>Подход</span><span className="text-center">Вес</span><span className="text-center">Повт.</span><span />
          </div>
          {we.sets.map((s) => (
            <div key={s.id} className="grid grid-cols-4 items-center bg-zinc-800 rounded-xl px-3 py-2">
              <span className="text-zinc-400 text-sm">#{s.setNumber}</span>
              <span className="text-center font-medium">{s.weight ?? "—"}</span>
              <span className="text-center font-medium">{s.reps ?? "—"}</span>
              <button
                onClick={() => deleteSet(s.id)}
                className="text-zinc-600 hover:text-red-400 text-right transition text-sm"
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {prevData && prevData.sets.length > 0 && (
        <div className="mb-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2">
          <p className="text-zinc-500 text-xs mb-1.5">
            Прошлая тренировка —{" "}
            <span className="text-zinc-400">
              {new Date(prevData.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "2-digit" })}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {prevData.sets.map((s, i) => (
              <span key={i} className="text-zinc-300 text-sm">
                <span className="text-zinc-600 text-xs mr-1">#{i + 1}</span>
                {s.weight ?? "—"} кг × {s.reps ?? "—"}
              </span>
            ))}
          </div>
        </div>
      )}

      {!done && <div className="flex gap-2 items-center">
        <input
          type="number"
          placeholder="Вес"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="w-0 flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-xl px-2 py-3 text-center text-base outline-none focus:border-orange-500 transition"
        />
        <span className="text-zinc-600 shrink-0">×</span>
        <input
          type="number"
          placeholder="Повт."
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          className="w-0 flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-xl px-2 py-3 text-center text-base outline-none focus:border-orange-500 transition"
        />
        <button
          onClick={addSet}
          disabled={saving || (!weight && !reps)}
          className="shrink-0 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-bold w-11 h-11 rounded-xl transition active:scale-95"
        >
          {saving ? "..." : "✓"}
        </button>
      </div>}

      {!done && !confirmDone && (
        <button
          onClick={() => setConfirmDone(true)}
          className="mt-3 w-full text-zinc-500 text-sm py-2 rounded-xl hover:text-zinc-300 hover:bg-zinc-800 transition"
        >
          Завершить упражнение
        </button>
      )}

      {confirmDone && (
        <div className="mt-3 bg-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-300">Точно завершить?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDone(false)}
              className="text-zinc-400 text-sm px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition"
            >Нет</button>
            <button
              onClick={() => { onDone(we.id, true); setConfirmDone(false); }}
              className="bg-orange-500 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-orange-400 transition"
            >Да</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkoutPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [showRest, setShowRest] = useState(false);
  const [restDuration, setRestDuration] = useState(ACCESSORY_REST_SECONDS);
  const [finishing, setFinishing] = useState(false);
  const [doneExercises, setDoneExercises] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem(`done_exercises_${id}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [prescriptionMap, setPrescriptionMap] = useState<Record<string, WorkoutPrescriptionItem>>({});
  const [oneRM, setOneRM] = useState<number | null>(null);

  const handleExerciseDone = useCallback((weId: string, isDone: boolean) => {
    setDoneExercises((prev) => {
      const next = new Set(prev);
      isDone ? next.add(weId) : next.delete(weId);
      try { localStorage.setItem(`done_exercises_${id}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  }, [id]);
  const [confirmFinish, setConfirmFinish] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/workouts/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "COMPLETED") { router.push(`/workout/complete/${id}`); return; }
        setWorkout(data);
        setLoading(false);
      });
  }, [id, status, router]);

  useEffect(() => {
    if (!id) return;
    setPrescriptionMap(getWorkoutPrescription(id));
    fetch(`/api/settings?key=${ONE_RM_SETTING_KEY}`)
      .then((r) => r.json())
      .then((data) => { if (data.value) setOneRM(parseFloat(data.value)); });
  }, [id]);

  useEffect(() => {
    if (!workout) return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(workout.startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [workout]);

  const handleSetAdded = useCallback((weId: string, set: SetData) => {
    setWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((we) =>
          we.id === weId ? { ...we, sets: [...we.sets, set] } : we
        ),
      };
    });
  }, []);

  const handleSetDeleted = useCallback((weId: string, setId: string) => {
    setWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((we) =>
          we.id === weId ? { ...we, sets: we.sets.filter((s) => s.id !== setId) } : we
        ),
      };
    });
  }, []);

  const handleRestStart = useCallback((seconds: number) => {
    setRestDuration(seconds);
    setShowRest(true);
  }, []);

  async function finishWorkout() {
    setFinishing(true);
    await fetch(`/api/workouts/${id}`, { method: "PATCH" });
    try { localStorage.removeItem(`done_exercises_${id}`); } catch {}
    router.push(`/workout/complete/${id}`);
  }

  function formatElapsed(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!workout) return null;

  return (
    <div className="min-h-screen w-full max-w-lg mx-auto px-4 py-6 pb-10">
      {showRest && (
        <RestTimer seconds={restDuration} onDone={() => setShowRest(false)} />
      )}

      <header className="flex items-center justify-between mb-6">
        <Link href="/dashboard" className="text-zinc-400 text-2xl">←</Link>
        <div className="text-center">
          <p className="text-orange-500 font-mono text-2xl font-bold">{formatElapsed(elapsed)}</p>
          <p className="text-zinc-500 text-xs">время тренировки</p>
        </div>
        <button
          onClick={() => setConfirmFinish(true)}
          className="bg-zinc-800 text-zinc-200 px-4 py-2 rounded-xl font-medium text-sm hover:bg-zinc-700 transition"
        >
          Завершить
        </button>
      </header>

      {confirmFinish && (
        <div className="fixed inset-0 bg-zinc-950/90 flex items-end justify-center z-50 px-4 pb-8">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-2">Завершить тренировку?</h3>
            <p className="text-zinc-400 mb-6">Это действие нельзя отменить</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmFinish(false)}
                className="flex-1 bg-zinc-800 py-3 rounded-xl font-medium"
              >Отмена</button>
              <button
                onClick={finishWorkout}
                disabled={finishing}
                className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold disabled:opacity-50"
              >{finishing ? "..." : "Завершить"}</button>
            </div>
          </div>
        </div>
      )}

      {workout.exercises.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">🏋️</p>
          <p className="text-zinc-400 mb-2">Добавь первое упражнение</p>
        </div>
      ) : (
        <div className="space-y-4">
          {workout.exercises.map((we) => (
            <ExerciseCard
              key={we.id}
              we={we}
              onSetAdded={handleSetAdded}
              onSetDeleted={handleSetDeleted}
              onRestStart={handleRestStart}
              done={doneExercises.has(we.id)}
              onDone={handleExerciseDone}
              prevData={workout.prevSetsMap?.[we.exercise.id] ?? null}
              prescription={prescriptionMap[we.exercise.id] ?? null}
              oneRM={oneRM}
            />
          ))}
        </div>
      )}

      <Link
        href={`/exercises?workoutId=${id}`}
        className="mt-4 block w-full bg-zinc-900 border border-zinc-700 text-center font-bold text-lg py-4 rounded-2xl hover:border-orange-500 transition active:scale-95"
      >
        + Добавить упражнение
      </Link>
    </div>
  );
}
