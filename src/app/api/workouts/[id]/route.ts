import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workout = await prisma.workout.findFirst({
    where: { id, userId: session.user.id },
    include: {
      exercises: {
        include: {
          exercise: true,
          sets: { orderBy: { setNumber: "asc" } },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Для каждого упражнения найти последний подход из предыдущей завершённой тренировки
  const exerciseIds = workout.exercises.map((we) => we.exerciseId);

  const prevSetsMap: Record<string, { sets: { weight: number | null; reps: number | null }[]; date: string }> = {};

  await Promise.all(
    exerciseIds.map(async (exerciseId) => {
      const prev = await prisma.workoutExercise.findFirst({
        where: {
          exerciseId,
          workout: {
            userId: session.user.id,
            status: "COMPLETED",
            id: { not: id },
          },
        },
        orderBy: { workout: { completedAt: "desc" } },
        include: { sets: { orderBy: { setNumber: "asc" } }, workout: true },
      });
      if (prev) {
        prevSetsMap[exerciseId] = {
          sets: prev.sets.map((s) => ({ weight: s.weight, reps: s.reps })),
          date: prev.workout.completedAt?.toISOString() ?? prev.workout.startedAt.toISOString(),
        };
      }
    })
  );

  return NextResponse.json({ ...workout, prevSetsMap });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workout = await prisma.workout.findFirst({ where: { id, userId: session.user.id } });
  if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.workout.update({
    where: { id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workout = await prisma.workout.findFirst({ where: { id, userId: session.user.id } });
  if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.workout.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
