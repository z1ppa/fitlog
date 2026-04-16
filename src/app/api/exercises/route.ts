import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function wordVariants(word: string): string[] {
  const withYo = word.replace(/е/gi, "ё");
  const withYe = word.replace(/ё/gi, "е");
  return [...new Set([word, withYo, withYe])];
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const muscleGroup = searchParams.get("muscleGroup") || "";

  const words = search.split(/\s+/).filter(Boolean);

  const nameFilter =
    words.length > 0
      ? {
          AND: words.map((word) => ({
            OR: wordVariants(word).map((v) => ({
              name: { contains: v, mode: "insensitive" as const },
            })),
          })),
        }
      : undefined;

  const exercises = await prisma.exercise.findMany({
    where: {
      ...nameFilter,
      muscleGroup: muscleGroup ? { equals: muscleGroup, mode: "insensitive" } : undefined,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(exercises);
}
