"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Program {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  difficulty: string | null;
  weeks: number | null;
  userId: string | null;
  _count: { days: number };
  user: { name: string | null; email: string } | null;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  "Начинающий": "text-green-400 bg-green-500/10",
  "Средний": "text-yellow-400 bg-yellow-500/10",
  "Продвинутый": "text-red-400 bg-red-500/10",
};

export default function ProgramsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "mine">("all");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/programs")
        .then((r) => r.json())
        .then((data) => { setPrograms(data); setLoading(false); });
    }
  }, [status]);

  async function deleteProgram(id: string) {
    if (!confirm("Удалить программу?")) return;
    await fetch(`/api/programs/${id}`, { method: "DELETE" });
    setPrograms((prev) => prev.filter((p) => p.id !== id));
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const public_ = programs.filter((p) => p.userId === null);
  const mine = programs.filter((p) => p.userId !== null);
  const displayed = tab === "all" ? public_ : mine;

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Программы</h1>
          <p className="text-zinc-400 text-sm">{public_.length} публичных · {mine.length} личных</p>
        </div>
        <Link href="/dashboard" className="text-zinc-400 hover:text-white transition text-sm">← Назад</Link>
      </header>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("all")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${tab === "all" ? "bg-orange-500 text-white" : "bg-zinc-900 text-zinc-400 hover:text-white"}`}
        >
          Публичные ({public_.length})
        </button>
        <button
          onClick={() => setTab("mine")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${tab === "mine" ? "bg-orange-500 text-white" : "bg-zinc-900 text-zinc-400 hover:text-white"}`}
        >
          Мои ({mine.length})
        </button>
      </div>

      <Link
        href="/programs/new"
        className="flex items-center justify-center gap-2 w-full bg-zinc-900 border border-dashed border-zinc-700 hover:border-orange-500 rounded-2xl py-4 text-zinc-400 hover:text-orange-400 transition mb-4 text-sm font-medium"
      >
        + Создать программу
      </Link>

      <div className="space-y-3">
        {displayed.map((p) => (
          <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/programs/${p.id}`} className="flex-1 min-w-0">
                <p className="font-semibold mb-1">{p.name}</p>
                {p.description && <p className="text-zinc-400 text-sm mb-2 line-clamp-2">{p.description}</p>}
                <div className="flex flex-wrap gap-2 text-xs">
                  {p.difficulty && (
                    <span className={`px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[p.difficulty] ?? "text-zinc-400 bg-zinc-800"}`}>
                      {p.difficulty}
                    </span>
                  )}
                  {p.goal && <span className="text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{p.goal}</span>}
                  {p.weeks && <span className="text-zinc-500">{p.weeks} нед.</span>}
                  <span className="text-zinc-500">{p._count.days} дней</span>
                </div>
                {p.userId === null && (
                  <p className="text-zinc-600 text-xs mt-2">от admin</p>
                )}
              </Link>
              {(p.userId === session?.user.id || session?.user.role === "ADMIN") && (
                <button
                  onClick={() => deleteProgram(p.id)}
                  className="text-zinc-600 hover:text-red-400 transition shrink-0"
                >
                  🗑
                </button>
              )}
            </div>
          </div>
        ))}

        {displayed.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <p className="text-4xl mb-3">📋</p>
            <p>{tab === "all" ? "Публичных программ пока нет" : "У тебя нет личных программ"}</p>
            {tab === "mine" && (
              <Link href="/programs/new" className="text-orange-400 text-sm mt-2 block">Создать первую →</Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
