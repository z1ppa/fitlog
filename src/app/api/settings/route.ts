import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const setting = await prisma.userSetting.findUnique({
    where: { userId_key: { userId: session.user.id, key } },
  });

  return NextResponse.json({ value: setting?.value ?? null });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { key, value } = await req.json();
  if (!key || value === undefined) return NextResponse.json({ error: "key and value required" }, { status: 400 });

  const setting = await prisma.userSetting.upsert({
    where: { userId_key: { userId: session.user.id, key } },
    update: { value: String(value) },
    create: { userId: session.user.id, key, value: String(value) },
  });

  return NextResponse.json({ value: setting.value });
}
