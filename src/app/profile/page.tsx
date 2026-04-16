"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Profile {
  id: string;
  email: string;
  name: string | null;
  weight: number | null;
  height: number | null;
  age: number | null;
  createdAt: string;
}

function bmi(weight: number | null, height: number | null): string | null {
  if (!weight || !height) return null;
  const h = height / 100;
  const val = weight / (h * h);
  return val.toFixed(1);
}

function bmiLabel(bmiVal: string): { label: string; color: string } {
  const v = parseFloat(bmiVal);
  if (v < 18.5) return { label: "Недовес", color: "text-blue-400" };
  if (v < 25) return { label: "Норма", color: "text-green-400" };
  if (v < 30) return { label: "Избыток", color: "text-yellow-400" };
  return { label: "Ожирение", color: "text-red-400" };
}

export default function ProfilePage() {
  const { status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);

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
        setWeight(data.weight?.toString() ?? "");
        setHeight(data.height?.toString() ?? "");
        setAge(data.age?.toString() ?? "");
        setEditing(!data.name && !data.weight && !data.height && !data.age);
      });
  }, [status]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, weight, height, age }),
    });
    const updated = await res.json();
    setProfile((prev) => prev ? { ...prev, ...updated } : updated);
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const bmiVal = bmi(profile.weight, profile.height);
  const bmiInfo = bmiVal ? bmiLabel(bmiVal) : null;

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6">
      <header className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="text-zinc-400 text-2xl">←</Link>
        <h1 className="text-xl font-bold">Профиль</h1>
      </header>

      {/* Stats block */}
      {(profile.weight || profile.height || profile.age) && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {profile.weight && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-orange-400">{profile.weight}</p>
              <p className="text-zinc-500 text-xs mt-1">кг</p>
            </div>
          )}
          {profile.height && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-orange-400">{profile.height}</p>
              <p className="text-zinc-500 text-xs mt-1">см</p>
            </div>
          )}
          {profile.age && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-orange-400">{profile.age}</p>
              <p className="text-zinc-500 text-xs mt-1">лет</p>
            </div>
          )}
        </div>
      )}

      {/* BMI */}
      {bmiVal && bmiInfo && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-8 flex justify-between items-center">
          <div>
            <p className="text-zinc-400 text-sm">Индекс массы тела (ИМТ)</p>
            <p className={`text-lg font-bold mt-0.5 ${bmiInfo.color}`}>{bmiInfo.label}</p>
          </div>
          <p className="text-3xl font-bold">{bmiVal}</p>
        </div>
      )}

      {/* Edit button when not editing */}
      {!editing && (
        <button
          onClick={() => setEditing(true)}
          className="w-full bg-zinc-900 border border-zinc-700 text-zinc-300 font-medium py-3.5 rounded-xl hover:border-zinc-500 transition mb-6"
        >
          Редактировать
        </button>
      )}

      {/* Form */}
      {editing && <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="text-zinc-400 text-sm mb-1.5 block">Имя</label>
          <input
            type="text"
            placeholder="Твоё имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3.5 text-base outline-none focus:border-orange-500 transition"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-zinc-400 text-sm mb-1.5 block">Вес (кг)</label>
            <input
              type="number"
              placeholder="75"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3.5 text-base text-center outline-none focus:border-orange-500 transition"
            />
          </div>
          <div>
            <label className="text-zinc-400 text-sm mb-1.5 block">Рост (см)</label>
            <input
              type="number"
              placeholder="180"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3.5 text-base text-center outline-none focus:border-orange-500 transition"
            />
          </div>
          <div>
            <label className="text-zinc-400 text-sm mb-1.5 block">Возраст</label>
            <input
              type="number"
              placeholder="25"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3.5 text-base text-center outline-none focus:border-orange-500 transition"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex-1 bg-zinc-800 text-zinc-300 font-medium py-4 rounded-xl hover:bg-zinc-700 transition"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold text-lg py-4 rounded-xl transition active:scale-95"
          >
            {saved ? "✓" : saving ? "..." : "Сохранить"}
          </button>
        </div>
      </form>}

      <Link
        href="/measurements"
        className="mt-6 flex items-center justify-between w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 hover:border-zinc-600 transition"
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

      <div className="mt-6 pt-6 border-t border-zinc-800">
        <p className="text-zinc-500 text-sm mb-1">{profile.email}</p>
        <p className="text-zinc-600 text-xs mb-6">
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
