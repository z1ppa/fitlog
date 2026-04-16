"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Measurement {
  id: string;
  date: string;
  weight: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  neck: number | null;
  shoulders: number | null;
  bicep: number | null;
  forearm: number | null;
  thigh: number | null;
  calf: number | null;
  bodyFat: number | null;
}

const FIELDS: { key: keyof Omit<Measurement, "id" | "date">; label: string; unit: string }[] = [
  { key: "weight",    label: "Вес",       unit: "кг" },
  { key: "bodyFat",   label: "% жира",    unit: "%" },
  { key: "chest",     label: "Грудь",     unit: "см" },
  { key: "shoulders", label: "Плечи",     unit: "см" },
  { key: "waist",     label: "Талия",     unit: "см" },
  { key: "hips",      label: "Бёдра",     unit: "см" },
  { key: "bicep",     label: "Бицепс",    unit: "см" },
  { key: "forearm",   label: "Предплечье",unit: "см" },
  { key: "thigh",     label: "Бедро",     unit: "см" },
  { key: "calf",      label: "Икра",      unit: "см" },
  { key: "neck",      label: "Шея",       unit: "см" },
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function Delta({ cur, prev }: { cur: number | null; prev: number | null }) {
  if (cur === null || prev === null) return null;
  const diff = +(cur - prev).toFixed(1);
  if (diff === 0) return null;
  return (
    <span className={`text-xs ml-1 ${diff > 0 ? "text-green-400" : "text-red-400"}`}>
      {diff > 0 ? "+" : ""}{diff}
    </span>
  );
}

export default function MeasurementsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState<Record<string, string>>({ date: today });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/measurements")
      .then((r) => r.json())
      .then((data) => { setMeasurements(Array.isArray(data) ? data : []); setLoading(false); });
  }, [status]);

  function setField(key: string, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/measurements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const m = await res.json();
    setMeasurements((prev) => [m, ...prev]);
    setShowForm(false);
    setForm({ date: today });
    setSaving(false);
  }

  async function deleteMeasurement(id: string) {
    await fetch(`/api/measurements/${id}`, { method: "DELETE" });
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const latest = measurements[0] ?? null;
  const previous = measurements[1] ?? null;

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6 pb-10">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="text-zinc-400 text-2xl">←</Link>
          <h1 className="text-xl font-bold">Замеры тела</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-500 hover:bg-orange-400 text-white font-bold px-4 py-2 rounded-xl text-sm transition active:scale-95"
        >
          + Добавить
        </button>
      </header>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 mb-6">
          <h2 className="font-bold mb-4">Новый замер</h2>
          <div className="mb-4">
            <label className="text-zinc-400 text-sm mb-1 block">Дата</label>
            <input
              type="date"
              value={form.date ?? today}
              onChange={(e) => setField("date", e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition text-white [color-scheme:dark]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(({ key, label, unit }) => (
              <div key={key}>
                <label className="text-zinc-400 text-xs mb-1 block">{label} ({unit})</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="—"
                  value={form[key] ?? ""}
                  onChange={(e) => setField(key, e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-center outline-none focus:border-orange-500 transition"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 bg-zinc-800 py-3 rounded-xl font-medium text-zinc-300"
            >Отмена</button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold disabled:opacity-50"
            >{saving ? "Сохраняем..." : "Сохранить"}</button>
          </div>
        </form>
      )}

      {/* Latest snapshot */}
      {latest && !showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
          <p className="text-zinc-500 text-xs mb-3">Последний замер — {formatDate(latest.date)}</p>
          <div className="grid grid-cols-3 gap-2">
            {FIELDS.filter((f) => latest[f.key] !== null).map(({ key, label, unit }) => (
              <div key={key} className="bg-zinc-800 rounded-xl p-3 text-center">
                <p className="text-lg font-bold">
                  {latest[key]}
                  <Delta cur={latest[key]} prev={previous?.[key] ?? null} />
                </p>
                <p className="text-zinc-500 text-xs">{label}</p>
                <p className="text-zinc-600 text-xs">{unit}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {measurements.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <p className="text-4xl mb-3">📏</p>
          <p>Замеров пока нет</p>
          <p className="text-sm mt-1">Нажми "+ Добавить" чтобы начать</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-400 mb-2">История</h2>
          {measurements.map((m, i) => {
            const prev = measurements[i + 1] ?? null;
            const isExpanded = expandedId === m.id;
            const filled = FIELDS.filter((f) => m[f.key] !== null);
            return (
              <div key={m.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  className="w-full flex items-center justify-between px-4 py-3"
                >
                  <div className="text-left">
                    <p className="font-medium">{formatDate(m.date)}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      {filled.map((f) => `${f.label}: ${m[f.key]}${f.unit}`).join(" · ")}
                    </p>
                  </div>
                  <span className="text-zinc-500 text-sm">{isExpanded ? "▲" : "▼"}</span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {filled.map(({ key, label, unit }) => (
                        <div key={key} className="bg-zinc-800 rounded-xl p-3 text-center">
                          <p className="text-base font-bold">
                            {m[key]}
                            <Delta cur={m[key]} prev={prev?.[key] ?? null} />
                          </p>
                          <p className="text-zinc-500 text-xs">{label}</p>
                          <p className="text-zinc-600 text-xs">{unit}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => deleteMeasurement(m.id)}
                      className="w-full text-red-400 text-sm py-2 rounded-xl hover:bg-red-400/10 transition"
                    >
                      Удалить замер
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
