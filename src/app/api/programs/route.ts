import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const programs = await prisma.program.findMany({
    where: {
      OR: [
        { userId: null },
        { userId: session.user.id },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { days: true } },
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(programs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, goal, difficulty, weeks, days, isPublic } = await req.json();

  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const isAdmin = session.user.role === "ADMIN";
  const userId = isPublic && isAdmin ? null : session.user.id;

  const program = await prisma.program.create({
    data: {
      name,
      description: description || null,
      goal: goal || null,
      difficulty: difficulty || null,
      weeks: weeks ? parseInt(weeks) : null,
      userId,
      days: {
        create: (days ?? []).map((day: { name?: string; dayNumber: number; exercises: { exerciseId: string; order: number; sets: number; reps: string; weight?: number }[] }) => ({
          dayNumber: day.dayNumber,
          name: day.name || null,
          exercises: {
            create: (day.exercises ?? []).map((ex) => ({
              exerciseId: ex.exerciseId,
              order: ex.order,
              sets: ex.sets,
              reps: ex.reps,
              weight: ex.weight ?? null,
            })),
          },
        })),
      },
    },
    include: {
      days: { include: { exercises: { include: { exercise: true } } } },
    },
  });

  return NextResponse.json(program, { status: 201 });
}
