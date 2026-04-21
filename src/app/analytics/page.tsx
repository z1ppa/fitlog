"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Stats {
  totalWorkouts: number;
  totalVolumeKg: number;
  totalTimeMin: number;
  avgDurationMin: number;
  bestStreak: number;
  currentStreak: number;
  weeklyWorkouts: { week: string; count: number; volumeKg: number }[];
  muscleGroups: { name: string; count: number }[];
  topExercises: { name: string; volumeKg: number; sets: number }[];
  weightHistory: { date: string; weight: number }[];
}

function formatVolume(kg: number) {
  if (kg >= 1000000) return `${(kg / 1000000).toFixed(1)}M кг`;
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}т`;
  return `${kg} кг`;
}

function formatTime(min: number) {
  const h = Math.floor(min / 60);
  if (h >= 24) return `${Math.floor(h / 24)}д ${h % 24}ч`;
  return `${h}ч ${min % 60}мин`;
}

function streakLabel(n: number) {
  const m = n % 10, m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return `${n} дней`;
  if (m === 1) return `${n} день`;
  if (m >= 2 && m <= 4) return `${n} дня`;
  return `${n} дней`;
}

// Simple bar chart (SVG)
function BarChart({ data, color = "#f97316" }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const H = 80, W = 100;
  const barW = W / data.length - 2;

  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full">
      {data.map((d, i) => {
        const h = Math.max((d.value / max) * H, d.value > 0 ? 2 : 0);
        const x = i * (W / data.length) + 1;
        return (
          <g key={i}>
            <rect x={x} y={H - h} width={barW} height={h} fill={color} rx="1" opacity={d.value === 0 ? 0.15 : 0.9} />
            {data.length <= 8 && (
              <text x={x + barW / 2} y={H + 12} textAnchor="middle" fontSize="5" fill="#71717a">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// Line chart (SVG)
function LineChart({ data, color = "#f97316" }: { data: { x: number; y: number; label: string }[]; color?: string }) {
  if (data.length < 2) return <p className="text-zinc-500 text-sm text-center py-6">Нужно минимум 2 замера</p>;

  const W = 200, H = 80, PAD = 8;
  const ys = data.map((d) => d.y);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeY = maxY - minY || 1;

  const toX = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const toY = (y: number) => PAD + (1 - (y - minY) / rangeY) * (H - PAD * 2);

  const points = data.map((d, i) => `${toX(i)},${toY(d.y)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(d.y)} r="2" fill={color} />
          {(i === 0 || i === data.length - 1) && (
            <text x={toX(i)} y={toY(d.y) - 4} textAnchor={i === 0 ? "start" : "end"} fontSize="5.5" fill="#d4d4d8">
              {d.y} кг
            </text>
          )}
        </g>
      ))}
      {data.length <= 6 && data.map((d, i) => (
        <text key={i} x={toX(i)} y={H + 12} textAnchor="middle" fontSize="5" fill="#71717a">
          {d.label}
        </text>
      ))}
    </svg>
  );
}

// Horizontal bars
function HorizontalBars({ data, color = "#f97316" }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <p className="text-zinc-400 text-xs w-20 shrink-0 truncate">{d.label}</p>
          <div className="flex-1 bg-zinc-800 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: color }}
            />
          </div>
          <p className="text-zinc-400 text-xs w-8 text-right shrink-0">{d.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/stats").then((r) => r.json()).then((d) => { setStats(d); setLoading(false); });
  }, [status]);

  if (loading || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (stats.totalWorkouts === 0) {
    return (
      <div className="min-h-screen max-w-lg mx-auto px-4 py-6">
        <header className="flex items-center gap-3 mb-8">
          <Link href="/profile" className="text-zinc-400 text-2xl">←</Link>
          <h1 className="text-xl font-bold">Аналитика</h1>
        </header>
        <div className="text-center py-20 text-zinc-500">
          <p className="text-4xl mb-3">📊</p>
          <p>Нет данных для анализа</p>
          <p className="text-sm mt-1">Проведи первую тренировку</p>
        </div>
      </div>
    );
  }

  // Weekly chart data — last 12 weeks
  const weeklyData = stats.weeklyWorkouts.slice(-12).map((w) => {
    const d = new Date(w.week);
    const label = `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { label, value: w.count };
  });

  // Weight chart
  const weightData = stats.weightHistory.map((w, i) => {
    const d = new Date(w.date);
    const label = `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { x: i, y: w.weight, label };
  });

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6 pb-10">
      <header className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="text-zinc-400 text-2xl">←</Link>
        <h1 className="text-xl font-bold">Аналитика</h1>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-2xl font-bold text-orange-400">{stats.totalWorkouts}</p>
          <p className="text-zinc-500 text-xs mt-1">тренировок всего</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-2xl font-bold text-orange-400">{formatVolume(stats.totalVolumeKg)}</p>
          <p className="text-zinc-500 text-xs mt-1">суммарный объём</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-2xl font-bold text-orange-400">{formatTime(stats.totalTimeMin)}</p>
          <p className="text-zinc-500 text-xs mt-1">в зале суммарно</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-2xl font-bold text-orange-400">{stats.avgDurationMin} мин</p>
          <p className="text-zinc-500 text-xs mt-1">средняя тренировка</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-2xl font-bold text-orange-400">🔥 {streakLabel(stats.currentStreak)}</p>
          <p className="text-zinc-500 text-xs mt-1">текущая серия</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-2xl font-bold text-orange-400">{streakLabel(stats.bestStreak)}</p>
          <p className="text-zinc-500 text-xs mt-1">лучшая серия</p>
        </div>
      </div>

      {/* Weekly activity */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <p className="font-semibold mb-1">Активность по неделям</p>
        <p className="text-zinc-500 text-xs mb-4">тренировок за последние 12 недель</p>
        <BarChart data={weeklyData} />
      </div>

      {/* Muscle groups */}
      {stats.muscleGroups.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
          <p className="font-semibold mb-1">Мышечные группы</p>
          <p className="text-zinc-500 text-xs mb-4">сколько тренировок затронули группу</p>
          <HorizontalBars data={stats.muscleGroups.map((m) => ({ label: m.name, value: m.count }))} />
        </div>
      )}

      {/* Top exercises */}
      {stats.topExercises.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
          <p className="font-semibold mb-1">Топ упражнений по объёму</p>
          <p className="text-zinc-500 text-xs mb-4">суммарно поднято</p>
          <HorizontalBars
            data={stats.topExercises.map((e) => ({ label: e.name, value: Math.round(e.volumeKg / 1000) || 1 }))}
          />
          <div className="mt-3 space-y-1.5">
            {stats.topExercises.map((e, i) => (
              <div key={i} className="flex justify-between text-xs text-zinc-500">
                <span className="truncate pr-4">{e.name}</span>
                <span className="shrink-0">{formatVolume(e.volumeKg)} · {e.sets} подх.</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weight chart */}
      {weightData.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
          <p className="font-semibold mb-1">Вес тела</p>
          <p className="text-zinc-500 text-xs mb-4">из замеров тела</p>
          {weightData.length < 2 ? (
            <p className="text-zinc-500 text-sm text-center py-4">Нужно минимум 2 замера</p>
          ) : (
            <>
              <LineChart data={weightData} />
              <div className="flex justify-between text-xs text-zinc-500 mt-2">
                <span>мин: {Math.min(...weightData.map((d) => d.y))} кг</span>
                <span>макс: {Math.max(...weightData.map((d) => d.y))} кг</span>
                {weightData.length >= 2 && (() => {
                  const diff = +(weightData[weightData.length - 1].y - weightData[0].y).toFixed(1);
                  return <span className={diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : ""}>{diff > 0 ? "+" : ""}{diff} кг</span>;
                })()}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
