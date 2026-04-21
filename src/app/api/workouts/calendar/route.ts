import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workouts = await prisma.workout.findMany({
    where: { userId: session.user.id, status: "COMPLETED" },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      startedAt: true,
      completedAt: true,
      exercises: {
        orderBy: { order: "asc" },
        select: { exercise: { select: { name: true } } },
      },
    },
  });

  return NextResponse.json(workouts);
}
