"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface RMEntry {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  rm: number;
}

export default function RMsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<RMEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/rms")
      .then((r) => r.json())
      .then((data) => {
        setEntries(data);
        const init: Record<string, string> = {};
        for (const e of data) init[e.exerciseId] = String(e.rm);
        setInputs(init);
        setLoading(false);
      });
  }, [status]);

  async function save(exerciseId: string) {
    const val = parseFloat(inputs[exerciseId] ?? "");
    if (isNaN(val) || val < 0) return;
    setSaving(exerciseId);
    await fetch("/api/rms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseId, value: val }),
    });
    setSaving(null);
    setEditing(null);
    if (val <= 0) {
      setEntries((prev) => prev.filter((e) => e.exerciseId !== exerciseId));
    } else {
      setEntries((prev) => prev.map((e) => e.exerciseId === exerciseId ? { ...e, rm: val } : e));
    }
  }

  const byMuscle = entries.reduce<Record<string, RMEntry[]>>((acc, e) => {
    if (!acc[e.muscleGroup]) acc[e.muscleGroup] = [];
    acc[e.muscleGroup].push(e);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6 pb-12">
      <header className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="text-zinc-400 text-2xl">←</Link>
        <div>
          <h1 className="text-xl font-bold">Мои максимумы</h1>
          <p className="text-zinc-500 text-xs">1RM — максимальный вес на 1 повторение</p>
        </div>
      </header>

      {entries.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-4xl mb-3">🏋️</p>
          <p>Нет сохранённых максимумов</p>
          <p className="text-sm mt-1 text-zinc-600">Укажи 1RM в программе Сарычева или во время тренировки</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byMuscle).map(([group, exs]) => (
            <div key={group}>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2 px-1">{group}</p>
              <div className="space-y-2">
                {exs.map((e) => {
                  const isEditing = editing === e.exerciseId;
                  return (
                    <div key={e.exerciseId} className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3">
                      {isEditing ? (
                        <div className="flex gap-2 items-center">
                          <p className="text-sm font-medium flex-1 truncate">{e.name}</p>
                          <div className="relative w-28 shrink-0">
                            <input
                              type="number"
                              value={inputs[e.exerciseId] ?? ""}
                              onChange={(ev) => setInputs((p) => ({ ...p, [e.exerciseId]: ev.target.value }))}
                              onKeyDown={(ev) => ev.key === "Enter" && save(e.exerciseId)}
                              autoFocus
                              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-orange-500 text-sm pr-8"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">кг</span>
                          </div>
                          <button
                            onClick={() => save(e.exerciseId)}
                            disabled={saving === e.exerciseId}
                            className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition active:scale-95 shrink-0"
                          >{saving === e.exerciseId ? "..." : "✓"}</button>
                          <button onClick={() => setEditing(null)} className="text-zinc-600 text-xs shrink-0">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{e.name}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-orange-400 font-bold">{e.rm} кг</p>
                            <button
                              onClick={() => { setInputs((p) => ({ ...p, [e.exerciseId]: String(e.rm) })); setEditing(e.exerciseId); }}
                              className="text-zinc-600 hover:text-zinc-400 transition text-xs"
                            >изменить</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
