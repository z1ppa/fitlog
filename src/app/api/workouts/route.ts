import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workouts = await prisma.workout.findMany({
    where: { userId: session.user.id },
    orderBy: { startedAt: "desc" },

    include: {
      programDay: { include: { program: { select: { name: true } } } },
      exercises: {
        include: {
          exercise: true,
          sets: { orderBy: { setNumber: "asc" } },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  return NextResponse.json(workouts);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let programDayId: string | null = null;
  let exercises: { exerciseId: string; order: number }[] = [];
  try {
    const body = await req.json();
    programDayId = body?.programDayId ?? null;
    exercises = body?.exercises ?? [];
  } catch { /* no body */ }

  const workout = await prisma.workout.create({
    data: {
      userId: session.user.id,
      programDayId,
      exercises: exercises.length > 0 ? {
        create: exercises.map((e) => ({ exerciseId: e.exerciseId, order: e.order })),
      } : undefined,
    },
    include: { exercises: true },
  });

  return NextResponse.json(workout, { status: 201 });
}
