import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [workouts, measurements] = await Promise.all([
    prisma.workout.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { startedAt: "asc" },
      include: {
        exercises: {
          include: {
            sets: true,
            exercise: { select: { name: true, muscleGroup: true } },
          },
        },
      },
    }),
    prisma.bodyMeasurement.findMany({
      where: { userId, weight: { not: null } },
      select: { date: true, weight: true },
      orderBy: { date: "asc" },
    }),
  ]);

  // --- Summary ---
  let totalVolumeKg = 0;
  let totalTimeMin = 0;
  for (const w of workouts) {
    if (w.completedAt) totalTimeMin += (w.completedAt.getTime() - w.startedAt.getTime()) / 60000;
    for (const we of w.exercises)
      for (const s of we.sets)
        if (s.weight && s.reps) totalVolumeKg += s.weight * s.reps;
  }
  const avgDurationMin = workouts.length > 0 ? Math.round(totalTimeMin / workouts.length) : 0;

  // --- Streaks ---
  const workoutDays = new Set(
    workouts.map((w) => {
      const d = new Date(w.startedAt);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );
  let bestStreak = 0, currentStreak = 0, streak = 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const check = new Date(today);
  for (let i = 0; i < 730; i++) {
    const key = `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`;
    if (workoutDays.has(key)) {
      streak++;
      if (streak > bestStreak) bestStreak = streak;
      if (i === 0 || currentStreak > 0) currentStreak = streak;
    } else {
      if (i > 0) { if (currentStreak === 0) currentStreak = 0; streak = 0; }
    }
    check.setDate(check.getDate() - 1);
  }

  // --- Weekly workouts (last 16 weeks) ---
  const weeklyMap = new Map<string, { count: number; volumeKg: number }>();
  const now = new Date();
  for (let i = 15; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const mon = new Date(d);
    mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
    mon.setHours(0, 0, 0, 0);
    const key = mon.toISOString().split("T")[0];
    if (!weeklyMap.has(key)) weeklyMap.set(key, { count: 0, volumeKg: 0 });
  }
  for (const w of workouts) {
    const d = new Date(w.startedAt);
    const mon = new Date(d);
    mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
    mon.setHours(0, 0, 0, 0);
    const key = mon.toISOString().split("T")[0];
    if (weeklyMap.has(key)) {
      const entry = weeklyMap.get(key)!;
      entry.count++;
      for (const we of w.exercises)
        for (const s of we.sets)
          if (s.weight && s.reps) entry.volumeKg += s.weight * s.reps;
    }
  }
  const weeklyWorkouts = [...weeklyMap.entries()].map(([week, v]) => ({ week, ...v }));

  // --- Muscle groups ---
  const muscleMap = new Map<string, number>();
  for (const w of workouts) {
    const seen = new Set<string>();
    for (const we of w.exercises) {
      if (!seen.has(we.exercise.muscleGroup)) {
        seen.add(we.exercise.muscleGroup);
        muscleMap.set(we.exercise.muscleGroup, (muscleMap.get(we.exercise.muscleGroup) ?? 0) + 1);
      }
    }
  }
  const muscleGroups = [...muscleMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // --- Top exercises by volume ---
  const exMap = new Map<string, { name: string; volumeKg: number; sets: number }>();
  for (const w of workouts) {
    for (const we of w.exercises) {
      if (!exMap.has(we.exercise.name)) exMap.set(we.exercise.name, { name: we.exercise.name, volumeKg: 0, sets: 0 });
      const e = exMap.get(we.exercise.name)!;
      e.sets += we.sets.length;
      for (const s of we.sets) if (s.weight && s.reps) e.volumeKg += s.weight * s.reps;
    }
  }
  const topExercises = [...exMap.values()]
    .filter((e) => e.volumeKg > 0)
    .sort((a, b) => b.volumeKg - a.volumeKg)
    .slice(0, 6);

  // --- Weight history ---
  const weightHistory = measurements
    .filter((m) => m.weight !== null)
    .map((m) => ({ date: m.date.toISOString().split("T")[0], weight: m.weight as number }));

  return NextResponse.json({
    totalWorkouts: workouts.length,
    totalVolumeKg: Math.round(totalVolumeKg),
    totalTimeMin: Math.round(totalTimeMin),
    avgDurationMin,
    bestStreak,
    currentStreak,
    weeklyWorkouts,
    muscleGroups,
    topExercises,
    weightHistory,
  });
}
