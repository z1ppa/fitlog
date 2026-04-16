import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workoutExerciseId, weight, reps } = await req.json();

  const we = await prisma.workoutExercise.findFirst({
    where: { id: workoutExerciseId },
    include: { workout: true },
  });
  if (!we || we.workout.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const count = await prisma.set.count({ where: { workoutExerciseId } });

  const set = await prisma.set.create({
    data: {
      workoutExerciseId,
      setNumber: count + 1,
      weight: weight ? parseFloat(weight) : null,
      reps: reps ? parseInt(reps) : null,
    },
  });

  return NextResponse.json(set, { status: 201 });
}
