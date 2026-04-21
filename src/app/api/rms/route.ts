import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EXERCISE_1RM_PREFIX } from "@/lib/sarychev";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.userSetting.findMany({
    where: { userId: session.user.id, key: { startsWith: EXERCISE_1RM_PREFIX } },
  });

  const entries = settings.filter((s) => s.value && parseFloat(s.value) > 0);
  if (entries.length === 0) return NextResponse.json([]);

  const exerciseIds = entries.map((s) => s.key.slice(EXERCISE_1RM_PREFIX.length));
  const exercises = await prisma.exercise.findMany({
    where: { id: { in: exerciseIds } },
    select: { id: true, name: true, muscleGroup: true },
  });

  const exMap = Object.fromEntries(exercises.map((e) => [e.id, e]));

  const result = entries
    .map((s) => {
      const exId = s.key.slice(EXERCISE_1RM_PREFIX.length);
      const ex = exMap[exId];
      if (!ex) return null;
      return { exerciseId: exId, name: ex.name, muscleGroup: ex.muscleGroup, rm: parseFloat(s.value) };
    })
    .filter(Boolean);

  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { exerciseId, value } = await req.json();
  if (!exerciseId) return NextResponse.json({ error: "exerciseId required" }, { status: 400 });

  const key = `${EXERCISE_1RM_PREFIX}${exerciseId}`;
  const strVal = value > 0 ? String(value) : "";

  await prisma.userSetting.upsert({
    where: { userId_key: { userId: session.user.id, key } },
    update: { value: strVal },
    create: { userId: session.user.id, key, value: strVal },
  });

  return NextResponse.json({ ok: true });
}
