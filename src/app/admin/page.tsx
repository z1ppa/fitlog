"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  weight: number | null;
  height: number | null;
  age: number | null;
  createdAt: string;
  _count: { workouts: number; measurements: number };
  workouts: { startedAt: string; status: string }[];
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session.user.role !== "ADMIN") router.push("/dashboard");
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user.role === "ADMIN") {
      fetch("/api/admin/users")
        .then((r) => r.json())
        .then((data) => { setUsers(data); setLoading(false); });
    }
  }, [status, session]);

  async function deleteUser(id: string, email: string) {
    if (!confirm(`Удалить пользователя ${email}? Все его данные будут удалены.`)) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  async function toggleRole(id: string, currentRole: string) {
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    const updated = await res.json();
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role: updated.role } : u));
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-6">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Админ-панель</h1>
          <p className="text-zinc-400 text-sm">{users.length} пользователей</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/analytics" className="text-orange-400 hover:text-orange-300 transition text-sm font-medium">
            📊 Аналитика
          </Link>
          <Link href="/dashboard" className="text-zinc-400 hover:text-white transition text-sm">
            ← Назад
          </Link>
        </div>
      </header>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Поиск по email или имени..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((user) => (
          <div
            key={user.id}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <Link href={`/admin/users/${user.id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium truncate">{user.email}</p>
                  {user.role === "ADMIN" && (
                    <span className="shrink-0 text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                      admin
                    </span>
                  )}
                </div>
                {user.name && <p className="text-zinc-400 text-sm">{user.name}</p>}
                <div className="flex gap-4 mt-2 text-xs text-zinc-500">
                  <span>Тренировок: {user._count.workouts}</span>
                  <span>Замеров: {user._count.measurements}</span>
                  <span>С {formatDate(user.createdAt)}</span>
                </div>
                {user.workouts[0] && (
                  <p className="text-xs text-zinc-600 mt-1">
                    Последняя активность: {formatDate(user.workouts[0].startedAt)}
                  </p>
                )}
              </Link>

              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => toggleRole(user.id, user.role)}
                  disabled={user.id === session?.user.id}
                  className="text-xs text-zinc-400 hover:text-orange-400 transition disabled:opacity-30"
                  title={user.role === "ADMIN" ? "Снять права админа" : "Сделать админом"}
                >
                  {user.role === "ADMIN" ? "↓ USER" : "↑ ADMIN"}
                </button>
                <button
                  onClick={() => deleteUser(user.id, user.email)}
                  disabled={user.id === session?.user.id}
                  className="text-xs text-zinc-600 hover:text-red-400 transition disabled:opacity-30"
                  title="Удалить пользователя"
                >
                  🗑
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <p className="text-4xl mb-3">🔍</p>
            <p>Пользователи не найдены</p>
          </div>
        )}
      </div>
    </div>
  );
}
