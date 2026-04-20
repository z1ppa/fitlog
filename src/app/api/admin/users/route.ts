import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      weight: true,
      height: true,
      age: true,
      createdAt: true,
      _count: { select: { workouts: true, measurements: true } },
      workouts: {
        orderBy: { startedAt: "desc" },
        take: 1,
        select: { startedAt: true, status: true },
      },
    },
  });

  return NextResponse.json(users);
}
