"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Analytics {
  overview: {
    totalUsers: number;
    newUsersWeek: number;
    newUsersMonth: number;
    totalWorkoutsCompleted: number;
    totalWorkoutsActive: number;
    totalSets: number;
    activeUsersWeek: number;
    activeUsersMonth: number;
    avgWorkoutsPerActiveUser: string;
    volumeLast30Days: number;
  };
  topExercises: { name: string; muscleGroup: string; count: number }[];
  engagementBuckets: { label: string; count: number }[];
  dailySignups: { day: string; count: number }[];
  dailyActiveUsers: { day: string; count: number }[];
  dailyWorkouts: { day: string; count: number }[];
  dailyVolume: { day: string; value: number }[];
}

function BarChart({
  data,
  valueKey,
  color = "bg-orange-500",
  height = 80,
  labelEvery = 7,
}: {
  data: { day: string; [key: string]: number | string }[];
  valueKey: string;
  color?: string;
  height?: number;
  labelEvery?: number;
}) {
  const values = data.map((d) => d[valueKey] as number);
  const max = Math.max(...values, 1);
  return (
    <div className="w-full">
      <div className="flex items-end gap-0.5" style={{ height }}>
        {data.map((d, i) => {
          const val = d[valueKey] as number;
          const pct = (val / max) * 100;
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center justify-end group relative">
              <div
                className={`w-full rounded-t ${color} opacity-80 group-hover:opacity-100 transition`}
                style={{ height: `${Math.max(pct, val > 0 ? 4 : 0)}%` }}
              />
              {val > 0 && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 pointer-events-none">
                  {val.toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-zinc-600 text-xs">
        {data.map((d, i) => {
          if (i % labelEvery !== 0 && i !== data.length - 1) return <span key={d.day} className="flex-1" />;
          const parts = d.day.split("-");
          return (
            <span key={d.day} className="flex-1 text-center">
              {`${parts[2]}.${parts[1]}`}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <p className="text-zinc-500 text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? "text-orange-400" : "text-white"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-zinc-600 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session.user.role !== "ADMIN") router.push("/dashboard");
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user.role === "ADMIN") {
      fetch("/api/admin/analytics")
        .then((r) => r.json())
        .then((d) => { setData(d); setLoading(false); });
    }
  }, [status, session]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { overview, topExercises, engagementBuckets, dailySignups, dailyActiveUsers, dailyWorkouts, dailyVolume } = data;

  const maxBucket = Math.max(...engagementBuckets.map((b) => b.count), 1);
  const maxExercise = Math.max(...topExercises.map((e) => e.count), 1);

  const retentionRate = overview.totalUsers > 0
    ? Math.round((overview.activeUsersMonth / overview.totalUsers) * 100)
    : 0;

  const completionRate = (overview.totalWorkoutsCompleted + overview.totalWorkoutsActive) > 0
    ? Math.round((overview.totalWorkoutsCompleted / (overview.totalWorkoutsCompleted + overview.totalWorkoutsActive)) * 100)
    : 0;

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-6 pb-12">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Аналитика</h1>
          <p className="text-zinc-400 text-sm">Данные за всё время · последние 30 дней на графиках</p>
        </div>
        <Link href="/admin" className="text-zinc-400 hover:text-white transition text-sm">
          ← Пользователи
        </Link>
      </header>

      {/* Overview */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Обзор</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Всего юзеров" value={overview.totalUsers} sub={`+${overview.newUsersWeek} за нед.`} />
          <StatCard label="Активны за 30д" value={overview.activeUsersMonth} sub={`${retentionRate}% от всех`} accent />
          <StatCard label="Тренировок" value={overview.totalWorkoutsCompleted} sub={`${completionRate}% завершено`} />
          <StatCard label="Подходов" value={overview.totalSets} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <StatCard label="Новых за 7 дней" value={overview.newUsersWeek} />
          <StatCard label="Новых за 30 дней" value={overview.newUsersMonth} />
          <StatCard label="Ср. тренировок / юзер" value={overview.avgWorkoutsPerActiveUser} sub="у активных за 30д" accent />
          <StatCard
            label="Объём за 30д"
            value={overview.volumeLast30Days >= 1000 ? `${Math.round(overview.volumeLast30Days / 1000)} т` : `${overview.volumeLast30Days} кг`}
            sub="сумма (вес × повторы)"
          />
        </div>
      </section>

      {/* DAU chart */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Активные пользователи в день (DAU)
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <BarChart data={dailyActiveUsers} valueKey="count" color="bg-orange-500" height={100} labelEvery={5} />
        </div>
      </section>

      {/* Daily workouts chart */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Тренировок завершено в день
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <BarChart data={dailyWorkouts} valueKey="count" color="bg-blue-500" height={100} labelEvery={5} />
        </div>
      </section>

      {/* Daily volume chart */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Объём нагрузки в день (кг)
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <BarChart data={dailyVolume} valueKey="value" color="bg-emerald-500" height={100} labelEvery={5} />
        </div>
      </section>

      {/* New signups chart */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Новые регистрации в день
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <BarChart data={dailySignups} valueKey="count" color="bg-violet-500" height={80} labelEvery={5} />
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Engagement distribution */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Активность юзеров (тренировок)
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
            {engagementBuckets.map((b) => (
              <div key={b.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-300">{b.label} трен.</span>
                  <span className="text-zinc-400">{b.count} чел.</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all"
                    style={{ width: `${(b.count / maxBucket) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Top exercises */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Топ упражнений
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
            {topExercises.slice(0, 8).map((ex) => (
              <div key={ex.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-300 truncate pr-2">{ex.name}</span>
                  <span className="text-zinc-400 shrink-0">{ex.count}×</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${(ex.count / maxExercise) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {topExercises.length === 0 && (
              <p className="text-zinc-500 text-sm text-center py-4">Нет данных</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
