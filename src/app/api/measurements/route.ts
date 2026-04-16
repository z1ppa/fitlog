import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const measurements = await prisma.bodyMeasurement.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(measurements);
  } catch (e) {
    console.error("GET /api/measurements error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const f = (v: unknown) => (v !== "" && v !== null && v !== undefined ? parseFloat(String(v)) : null);

    const measurement = await prisma.bodyMeasurement.create({
      data: {
        userId: session.user.id,
        date: body.date ? new Date(body.date) : new Date(),
        weight:    f(body.weight),
        chest:     f(body.chest),
        waist:     f(body.waist),
        hips:      f(body.hips),
        neck:      f(body.neck),
        shoulders: f(body.shoulders),
        bicep:     f(body.bicep),
        forearm:   f(body.forearm),
        thigh:     f(body.thigh),
        calf:      f(body.calf),
        bodyFat:   f(body.bodyFat),
      },
    });

    return NextResponse.json(measurement, { status: 201 });
  } catch (e) {
    console.error("POST /api/measurements error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
