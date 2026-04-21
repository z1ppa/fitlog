"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CalendarWorkout {
  id: string;
  startedAt: string;
  completedAt: string | null;
  exercises: { exercise: { name: string } }[];
}

function WorkoutCalendar() {
  const [workouts, setWorkouts] = useState<CalendarWorkout[]>([]);
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/workouts/calendar")
      .then((r) => r.json())
      .then(setWorkouts);
  }, []);

  const year = month.getFullYear();
  const monthIdx = month.getMonth();

  const workoutsByDay = new Map<string, CalendarWorkout[]>();
  for (const w of workouts) {
    const d = new Date(w.startedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!workoutsByDay.has(key)) workoutsByDay.set(key, []);
    workoutsByDay.get(key)!.push(w);
  }

  const firstDow = new Date(year, monthIdx, 1).getDay();
  const startDow = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const today = new Date();

  const dayKey = (d: number) => `${year}-${monthIdx}-${d}`;
  const hasWorkout = (d: number) => workoutsByDay.has(dayKey(d));
  const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === monthIdx && today.getDate() === d;
  const isSelected = (d: number) => selectedKey === dayKey(d);

  function toggleDay(day: number) {
    if (!hasWorkout(day)) return;
    const k = dayKey(day);
    setSelectedKey((prev) => prev === k ? null : k);
  }

  // streak
  const allDateSet = new Set(workouts.map((w) => {
    const d = new Date(w.startedAt);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }));
  let streak = 0;
  const check = new Date(); check.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const k = `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`;
    if (allDateSet.has(k)) { streak++; check.setDate(check.getDate() - 1); }
    else if (i === 0) { check.setDate(check.getDate() - 1); }
    else break;
  }

  const selectedWorkouts = selectedKey ? (workoutsByDay.get(selectedKey) ?? []) : [];

  function formatDur(w: CalendarWorkout) {
    if (!w.completedAt) return null;
    const min = Math.floor((new Date(w.completedAt).getTime() - new Date(w.startedAt).getTime()) / 60000);
    return min < 60 ? `${min} мин` : `${Math.floor(min / 60)}ч ${min % 60}мин`;
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => { setMonth(new Date(year, monthIdx - 1)); setSelectedKey(null); }}
          className="text-zinc-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition"
        >‹</button>
        <div className="text-center">
          <p className="font-semibold capitalize">{month.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}</p>
          {streak > 0 && <p className="text-orange-400 text-xs">{streak} {streak === 1 ? "день" : streak < 5 ? "дня" : "дней"} подряд 🔥</p>}
        </div>
        <button
          onClick={() => { setMonth(new Date(year, monthIdx + 1)); setSelectedKey(null); }}
          className="text-zinc-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition"
        >›</button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map((d) => (
          <div key={d} className="text-zinc-600 text-xs py-1">{d}</div>
        ))}
        {cells.map((day, i) => (
          <button
            key={i}
            disabled={!day || !hasWorkout(day)}
            onClick={() => day && toggleDay(day)}
            className={`relative py-1.5 rounded-lg text-sm transition
              ${!day ? "cursor-default" : ""}
              ${day && isToday(day) ? "bg-zinc-800" : ""}
              ${day && isSelected(day) ? "bg-orange-500 text-white" : ""}
              ${day && hasWorkout(day) && !isSelected(day) ? "hover:bg-zinc-700 cursor-pointer" : ""}
            `}
          >
            {day && (
              <>
                <span className={
                  isSelected(day) ? "text-white font-bold" :
                  hasWorkout(day) ? "text-white font-medium" : "text-zinc-500"
                }>{day}</span>
                {hasWorkout(day) && !isSelected(day) && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-orange-500 rounded-full" />
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {selectedWorkouts.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-zinc-800 pt-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
            {new Date(selectedWorkouts[0].startedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
          </p>
          {selectedWorkouts.map((w) => (
            <Link
              key={w.id}
              href={`/workout/complete/${w.id}`}
              className="block bg-zinc-800 hover:bg-zinc-700 rounded-xl p-3 transition active:scale-95"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-white">
                  {new Date(w.startedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </p>
                {formatDur(w) && <p className="text-zinc-500 text-xs">{formatDur(w)}</p>}
              </div>
              <p className="text-zinc-400 text-xs truncate">
                {w.exercises.map((e) => e.exercise.name).join(" · ") || "Нет упражнений"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

interface Profile {
  id: string;
  email: string;
  name: string | null;
  birthDate: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const { status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editingBirth, setEditingBirth] = useState(false);
  const [birthInput, setBirthInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data: Profile) => {
        setProfile(data);
        setName(data.name ?? "");
        setBirthInput(data.birthDate ? data.birthDate.split("T")[0] : "");
      });
  }, [status]);

  async function saveName() {
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const updated = await res.json();
    setProfile((prev) => prev ? { ...prev, ...updated } : updated);
    setSaving(false);
    setEditingName(false);
  }

  async function saveBirth() {
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthDate: birthInput || null }),
    });
    const updated = await res.json();
    setProfile((prev) => prev ? { ...prev, ...updated } : updated);
    setSaving(false);
    setEditingBirth(false);
  }

  function calcAge(birthDate: string) {
    const diff = Date.now() - new Date(birthDate).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6">
      <header className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-zinc-400 text-2xl">←</Link>
        <h1 className="text-xl font-bold">Профиль</h1>
      </header>

      {/* Avatar + name */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-2xl font-bold text-orange-400 shrink-0">
          {profile.name?.[0]?.toUpperCase() ?? profile.email[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                autoFocus
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-orange-500 text-sm"
              />
              <button onClick={saveName} disabled={saving}
                className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold disabled:opacity-50">
                {saving ? "..." : "✓"}
              </button>
              <button onClick={() => setEditingName(false)} className="text-zinc-500 px-2 py-1.5 text-sm">✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="font-bold text-lg truncate">{profile.name ?? "Без имени"}</p>
              <button onClick={() => setEditingName(true)} className="text-zinc-600 hover:text-zinc-400 transition text-xs shrink-0">✎</button>
            </div>
          )}
          <p className="text-zinc-500 text-sm truncate">{profile.email}</p>
          {editingBirth ? (
            <div className="flex gap-2 mt-1">
              <input
                type="date"
                value={birthInput}
                onChange={(e) => setBirthInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveBirth(); if (e.key === "Escape") setEditingBirth(false); }}
                autoFocus
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-orange-500 text-sm [color-scheme:dark]"
              />
              <button onClick={saveBirth} disabled={saving} className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold disabled:opacity-50">{saving ? "..." : "✓"}</button>
              <button onClick={() => setEditingBirth(false)} className="text-zinc-500 px-2 py-1.5 text-sm">✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-zinc-500 text-xs">
                {profile.birthDate
                  ? `${new Date(profile.birthDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })} · ${calcAge(profile.birthDate)} лет`
                  : "Дата рождения не указана"}
              </p>
              <button onClick={() => setEditingBirth(true)} className="text-zinc-600 hover:text-zinc-400 transition text-xs">✎</button>
            </div>
          )}
        </div>
      </div>

      <WorkoutCalendar />

      <div className="space-y-3">
        <Link
          href="/exercises"
          className="flex items-center justify-between w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 hover:border-zinc-600 transition"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">💪</span>
            <div>
              <p className="font-medium">История упражнений</p>
              <p className="text-zinc-500 text-xs">Личные рекорды и прогресс по каждому упражнению</p>
            </div>
          </div>
          <span className="text-zinc-500">→</span>
        </Link>

        <Link
          href="/measurements"
          className="flex items-center justify-between w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 hover:border-zinc-600 transition"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">📏</span>
            <div>
              <p className="font-medium">Замеры тела</p>
              <p className="text-zinc-500 text-xs">Отслеживай прогресс по замерам</p>
            </div>
          </div>
          <span className="text-zinc-500">→</span>
        </Link>
      </div>

      <div className="mt-6 pt-6 border-t border-zinc-800">
        <p className="text-zinc-600 text-xs mb-4">
          В приложении с {new Date(profile.createdAt).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full bg-zinc-900 border border-zinc-800 text-zinc-400 py-3.5 rounded-xl hover:border-red-900 hover:text-red-400 transition"
        >
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}
