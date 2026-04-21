import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, birthDate: true, createdAt: true },
  });

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, birthDate } = await req.json();

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name !== undefined ? name || null : undefined,
      birthDate: birthDate !== undefined ? (birthDate ? new Date(birthDate) : null) : undefined,
    },
    select: { id: true, email: true, name: true, birthDate: true },
  });

  return NextResponse.json(user);
}
