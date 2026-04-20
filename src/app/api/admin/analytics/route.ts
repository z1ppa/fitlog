import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(date: Date | string) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const day7 = daysAgo(7);
  const day30 = daysAgo(30);

  const [
    totalUsers,
    newUsersWeek,
    newUsersMonth,
    totalWorkoutsCompleted,
    totalWorkoutsActive,
    allSets,
    activeUsersWeek,
    activeUsersMonth,
    recentUsers,
    recentWorkouts,
    topExercisesRaw,
    userWorkoutCounts,
    workoutsLast30,
    setsLast30,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: day7 } } }),
    prisma.user.count({ where: { createdAt: { gte: day30 } } }),
    prisma.workout.count({ where: { status: "COMPLETED" } }),
    prisma.workout.count({ where: { status: "ACTIVE" } }),
    prisma.set.aggregate({ _sum: { weight: true }, _count: true }),
    prisma.workout.findMany({
      where: { startedAt: { gte: day7 } },
      select: { userId: true, startedAt: true },
      distinct: ["userId"],
    }),
    prisma.workout.findMany({
      where: { startedAt: { gte: day30 } },
      select: { userId: true, startedAt: true },
      distinct: ["userId"],
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: day30 } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.workout.findMany({
      where: { startedAt: { gte: day30 } },
      select: { userId: true, startedAt: true, status: true },
      orderBy: { startedAt: "asc" },
    }),
    prisma.workoutExercise.groupBy({
      by: ["exerciseId"],
      _count: { exerciseId: true },
      orderBy: { _count: { exerciseId: "desc" } },
      take: 10,
    }),
    prisma.workout.groupBy({
      by: ["userId"],
      _count: { id: true },
      where: { status: "COMPLETED" },
    }),
    prisma.workout.findMany({
      where: { startedAt: { gte: day30 }, status: "COMPLETED" },
      select: { startedAt: true },
    }),
    prisma.set.findMany({
      where: { completedAt: { gte: day30 } },
      select: { completedAt: true, weight: true, reps: true },
    }),
  ]);

  // Resolve exercise names for top exercises
  const exerciseIds = topExercisesRaw.map((e) => e.exerciseId);
  const exercises = await prisma.exercise.findMany({
    where: { id: { in: exerciseIds } },
    select: { id: true, name: true, muscleGroup: true },
  });
  const exerciseMap = new Map(exercises.map((e) => [e.id, e]));
  const topExercises = topExercisesRaw.map((e) => ({
    name: exerciseMap.get(e.exerciseId)?.name ?? "Unknown",
    muscleGroup: exerciseMap.get(e.exerciseId)?.muscleGroup ?? "",
    count: e._count.exerciseId,
  }));

  // Build last 30 days date range
  const last30Days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    last30Days.push(dateKey(daysAgo(i)));
  }

  // Daily new signups (last 30 days)
  const signupsByDay = new Map<string, number>();
  for (const u of recentUsers) signupsByDay.set(dateKey(u.createdAt), (signupsByDay.get(dateKey(u.createdAt)) ?? 0) + 1);
  const dailySignups = last30Days.map((day) => ({ day, count: signupsByDay.get(day) ?? 0 }));

  // Daily active users = unique users with a workout started that day
  const dauByDay = new Map<string, Set<string>>();
  for (const w of recentWorkouts) {
    const key = dateKey(w.startedAt);
    if (!dauByDay.has(key)) dauByDay.set(key, new Set());
    dauByDay.get(key)!.add(w.userId);
  }
  const dailyActiveUsers = last30Days.map((day) => ({ day, count: dauByDay.get(day)?.size ?? 0 }));

  // Daily workouts completed (last 30 days)
  const workoutsByDay = new Map<string, number>();
  for (const w of workoutsLast30) workoutsByDay.set(dateKey(w.startedAt), (workoutsByDay.get(dateKey(w.startedAt)) ?? 0) + 1);
  const dailyWorkouts = last30Days.map((day) => ({ day, count: workoutsByDay.get(day) ?? 0 }));

  // Daily volume (last 30 days)
  const volumeByDay = new Map<string, number>();
  for (const s of setsLast30) {
    if (s.weight && s.reps) {
      const key = dateKey(s.completedAt);
      volumeByDay.set(key, (volumeByDay.get(key) ?? 0) + s.weight * s.reps);
    }
  }
  const dailyVolume = last30Days.map((day) => ({ day, value: Math.round(volumeByDay.get(day) ?? 0) }));

  // User engagement distribution
  const buckets = { "0": 0, "1-2": 0, "3-5": 0, "6-10": 0, "11+": 0 };
  for (const u of userWorkoutCounts) {
    const c = u._count.id;
    if (c === 0) buckets["0"]++;
    else if (c <= 2) buckets["1-2"]++;
    else if (c <= 5) buckets["3-5"]++;
    else if (c <= 10) buckets["6-10"]++;
    else buckets["11+"]++;
  }
  // Users with 0 completed workouts
  const usersWithWorkouts = new Set(userWorkoutCounts.map((u) => u.userId)).size;
  buckets["0"] = totalUsers - usersWithWorkouts;

  // Total volume
  let totalVolume = 0;
  for (const s of setsLast30) {
    if (s.weight && s.reps) totalVolume += s.weight * s.reps;
  }

  // Avg workouts per active user (last 30 days)
  const workoutsPerUser = activeUsersMonth.length > 0
    ? (workoutsLast30.length / activeUsersMonth.length).toFixed(1)
    : "0";

  return NextResponse.json({
    overview: {
      totalUsers,
      newUsersWeek,
      newUsersMonth,
      totalWorkoutsCompleted,
      totalWorkoutsActive,
      totalSets: allSets._count,
      activeUsersWeek: activeUsersWeek.length,
      activeUsersMonth: activeUsersMonth.length,
      avgWorkoutsPerActiveUser: workoutsPerUser,
      volumeLast30Days: Math.round(totalVolume),
    },
    topExercises,
    engagementBuckets: Object.entries(buckets).map(([label, count]) => ({ label, count })),
    dailySignups,
    dailyActiveUsers,
    dailyWorkouts,
    dailyVolume,
  });
}
