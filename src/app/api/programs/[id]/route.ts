import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const program = await prisma.program.findFirst({
    where: {
      id,
      OR: [{ userId: null }, { userId: session.user.id }],
    },
    include: {
      user: { select: { name: true, email: true } },
      days: {
        orderBy: { dayNumber: "asc" },
        include: {
          exercises: {
            orderBy: { order: "asc" },
            include: { exercise: true },
          },
        },
      },
    },
  });

  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // новые тренировки — по programDayId
  const linkedWorkouts = await prisma.workout.findMany({
    where: {
      userId: session.user.id,
      status: "COMPLETED",
      programDayId: { in: program.days.map((d) => d.id) },
    },
    select: { programDayId: true },
  });
  const completedDayIds = new Set(linkedWorkouts.map((w) => w.programDayId));

  // старые тренировки — по совпадению набора упражнений
  const unlinked = await prisma.workout.findMany({
    where: { userId: session.user.id, status: "COMPLETED", programDayId: null },
    include: { exercises: { select: { exerciseId: true } } },
  });

  for (const day of program.days) {
    if (completedDayIds.has(day.id)) continue;
    const dayExIds = new Set(day.exercises.map((e) => e.exerciseId));
    const matched = unlinked.some((w) => {
      const wExIds = new Set(w.exercises.map((e) => e.exerciseId));
      return dayExIds.size > 0 && dayExIds.size === wExIds.size &&
        [...dayExIds].every((id) => wExIds.has(id));
    });
    if (matched) completedDayIds.add(day.id);
  }

  return NextResponse.json({
    ...program,
    days: program.days.map((d) => ({ ...d, completed: completedDayIds.has(d.id) })),
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const program = await prisma.program.findUnique({ where: { id } });
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN";
  const isOwner = program.userId === session.user.id;

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.program.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
