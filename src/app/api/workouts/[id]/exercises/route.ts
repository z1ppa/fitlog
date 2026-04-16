import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { exerciseId } = await req.json();

  const workout = await prisma.workout.findFirst({ where: { id, userId: session.user.id } });
  if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const count = await prisma.workoutExercise.count({ where: { workoutId: id } });

  const we = await prisma.workoutExercise.create({
    data: { workoutId: id, exerciseId, order: count + 1 },
    include: { exercise: true, sets: true },
  });

  return NextResponse.json(we, { status: 201 });
}
