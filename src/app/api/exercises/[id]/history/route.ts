import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const exercise = await prisma.exercise.findUnique({ where: { id } });
  if (!exercise) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await prisma.workoutExercise.findMany({
    where: {
      exerciseId: id,
      workout: { userId: session.user.id, status: "COMPLETED" },
    },
    include: {
      sets: { orderBy: { setNumber: "asc" } },
      workout: { select: { id: true, startedAt: true } },
    },
    orderBy: { workout: { startedAt: "desc" } },
  });

  const history = rows.map((we) => {
    const sets = we.sets;
    const volume = sets.reduce((acc, s) => acc + (s.weight ?? 0) * (s.reps ?? 0), 0);
    const best = sets.reduce<typeof sets[0] | null>((b, s) => {
      if (!b) return s;
      return (s.weight ?? 0) > (b.weight ?? 0) ? s : b;
    }, null);
    return {
      workoutId: we.workout.id,
      date: we.workout.startedAt,
      sets: sets.map((s) => ({ setNumber: s.setNumber, weight: s.weight, reps: s.reps })),
      volume,
      bestWeight: best?.weight ?? null,
      bestReps: best?.reps ?? null,
    };
  });

  return NextResponse.json({ exercise, history });
}
