import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workouts = await prisma.workout.findMany({
    where: { userId: session.user.id, status: "COMPLETED" },
    select: { startedAt: true },
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json(workouts.map((w) => w.startedAt));
}
