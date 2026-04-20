import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type ExDef = { name: string; muscleGroup: string; equipment: string };
type DayEx = { ex: ExDef; sets: number; reps: string };
type DayData = { name: string; exercises: DayEx[] };

const E: Record<string, ExDef> = {
  BENCH:          { name: "Жим штанги лёжа",                    muscleGroup: "Грудь",       equipment: "Штанга" },
  BENCH_CLOSE:    { name: "Жим штанги узким хватом",             muscleGroup: "Трицепс",     equipment: "Штанга" },
  BENCH_WIDE:     { name: "Жим штанги лёжа широким хватом",      muscleGroup: "Грудь",       equipment: "Штанга" },
  BENCH_MEDIUM:   { name: "Жим штанги лёжа средним хватом",      muscleGroup: "Грудь",       equipment: "Штанга" },
  BENCH_INCLINE:  { name: "Жим штанги лёжа 30°",                 muscleGroup: "Грудь",       equipment: "Штанга" },
  BENCH_BLOCK:    { name: "Жим штанги лёжа с бруском",           muscleGroup: "Грудь",       equipment: "Штанга" },
  DB_BENCH:       { name: "Жим гантелей лёжа",                   muscleGroup: "Грудь",       equipment: "Гантели" },
  DB_BENCH_30:    { name: "Жим гантелей лёжа 30°",               muscleGroup: "Грудь",       equipment: "Гантели" },
  FLY:            { name: "Разводка гантелей лёжа",              muscleGroup: "Грудь",       equipment: "Гантели" },
  FLY_INCLINE:    { name: "Разводка гантелей лёжа 30°",          muscleGroup: "Грудь",       equipment: "Гантели" },
  DIPS:           { name: "Отжимания на брусьях",                muscleGroup: "Грудь",       equipment: "Брусья" },
  OHP_BARBELL:    { name: "Жим штанги стоя",                     muscleGroup: "Плечи",       equipment: "Штанга" },
  OHP_SEATED:     { name: "Жим штанги сидя",                     muscleGroup: "Плечи",       equipment: "Штанга" },
  OHP_DB:         { name: "Жим гантелей сидя",                   muscleGroup: "Плечи",       equipment: "Гантели" },
  LATERAL_RAISE:  { name: "Махи гантелей в сторону",             muscleGroup: "Плечи",       equipment: "Гантели" },
  CURL_BARBELL:   { name: "Сгибание штанги на бицепс",           muscleGroup: "Бицепс",      equipment: "Штанга" },
  CURL_REVERSE:   { name: "Сгибание на бицепс обратным хватом",  muscleGroup: "Бицепс",      equipment: "Штанга" },
  CURL_DB:        { name: "Сгибание на бицепс с гантелями",      muscleGroup: "Бицепс",      equipment: "Гантели" },
  WRIST_CURL:     { name: "Сгибание кисти",                      muscleGroup: "Предплечья",  equipment: "Штанга" },
  TRICEP_PD:      { name: "Разгибания на трицепс в блоке",        muscleGroup: "Трицепс",     equipment: "Тренажёр" },
  CLOSE_PUSHUP:   { name: "Отжимания узким хватом",              muscleGroup: "Трицепс",     equipment: "Без оборудования" },
  LAT_PULLDOWN:   { name: "Тяга верхнего блока к груди",         muscleGroup: "Спина",       equipment: "Тренажёр" },
  CABLE_ROW:      { name: "Горизонтальная тяга блока к поясу",   muscleGroup: "Спина",       equipment: "Тренажёр" },
  PULLUP:         { name: "Подтягивания",                        muscleGroup: "Спина",       equipment: "Турник" },
  HYPEREXT:       { name: "Гиперэкстензия",                      muscleGroup: "Спина",       equipment: "Тренажёр" },
  HIP_EXT:        { name: "Разгибание бедра в тренажёре",        muscleGroup: "Ягодицы",     equipment: "Тренажёр" },
  GOBLET_SQUAT:   { name: "Приседания с гирей",                  muscleGroup: "Ноги",        equipment: "Гиря" },
  SQUAT_BW:       { name: "Приседания без веса",                 muscleGroup: "Ноги",        equipment: "Без оборудования" },
  SQUAT_BW_BENCH: { name: "Приседания без веса на лавку",        muscleGroup: "Ноги",        equipment: "Без оборудования" },
  ABS:            { name: "Пресс",                               muscleGroup: "Пресс",       equipment: "Без оборудования" },
};

const days: DayData[] = [
  // ── НЕДЕЛЯ 1 ──
  { name: "Неделя 1 — Пн", exercises: [
    { ex: E.BENCH,        sets: 5, reps: "5 (75%)" },
    { ex: E.FLY,          sets: 4, reps: "10" },
    { ex: E.BENCH_CLOSE,  sets: 4, reps: "6 (65%)" },
    { ex: E.CURL_BARBELL, sets: 5, reps: "12" },
    { ex: E.ABS,          sets: 3, reps: "30" },
  ]},
  { name: "Неделя 1 — Ср", exercises: [
    { ex: E.BENCH_INCLINE, sets: 5, reps: "6 (55%)" },
    { ex: E.DIPS,          sets: 4, reps: "15" },
    { ex: E.LAT_PULLDOWN,  sets: 4, reps: "15" },
    { ex: E.HIP_EXT,       sets: 4, reps: "30" },
    { ex: E.HYPEREXT,      sets: 4, reps: "20" },
    { ex: E.PULLUP,        sets: 1, reps: "50 (любое кол-во подходов)" },
    { ex: E.ABS,           sets: 3, reps: "30" },
  ]},
  { name: "Неделя 1 — Пт", exercises: [
    { ex: E.BENCH,        sets: 5, reps: "6 (75%)" },
    { ex: E.OHP_SEATED,   sets: 4, reps: "15 (40%)" },
    { ex: E.FLY_INCLINE,  sets: 4, reps: "15 (65%)" },
    { ex: E.CURL_REVERSE, sets: 4, reps: "30" },
    { ex: E.ABS,          sets: 4, reps: "20" },
  ]},

  // ── НЕДЕЛЯ 2 ──
  { name: "Неделя 2 — Пн", exercises: [
    { ex: E.BENCH,        sets: 4, reps: "6 (70%)" },
    { ex: E.FLY,          sets: 5, reps: "8" },
    { ex: E.OHP_DB,       sets: 4, reps: "8" },
    { ex: E.CURL_BARBELL, sets: 5, reps: "10" },
    { ex: E.ABS,          sets: 3, reps: "30" },
  ]},
  { name: "Неделя 2 — Ср", exercises: [
    { ex: E.OHP_BARBELL, sets: 5, reps: "6 (55%)" },
    { ex: E.TRICEP_PD,   sets: 5, reps: "10" },
    { ex: E.CABLE_ROW,   sets: 5, reps: "12" },
    { ex: E.GOBLET_SQUAT,sets: 5, reps: "10" },
    { ex: E.HYPEREXT,    sets: 4, reps: "20" },
    { ex: E.PULLUP,      sets: 1, reps: "50 (любое кол-во подходов)" },
    { ex: E.ABS,         sets: 3, reps: "30" },
  ]},
  { name: "Неделя 2 — Пт", exercises: [
    { ex: E.BENCH,        sets: 1, reps: "4×2 (70%), 5×3 (80%)" },
    { ex: E.FLY_INCLINE,  sets: 5, reps: "8" },
    { ex: E.BENCH_WIDE,   sets: 4, reps: "5 (70%)" },
    { ex: E.CURL_REVERSE, sets: 5, reps: "8" },
    { ex: E.WRIST_CURL,   sets: 5, reps: "15" },
    { ex: E.ABS,          sets: 3, reps: "30" },
  ]},

  // ── НЕДЕЛЯ 3 ──
  { name: "Неделя 3 — Пн", exercises: [
    { ex: E.BENCH,         sets: 1, reps: "6×2 (60%), 5×2 (70%), 5×4 (80%)" },
    { ex: E.FLY,           sets: 5, reps: "8" },
    { ex: E.BENCH_MEDIUM,  sets: 5, reps: "6 (65%)" },
    { ex: E.CURL_BARBELL,  sets: 6, reps: "8" },
    { ex: E.WRIST_CURL,    sets: 4, reps: "15" },
  ]},
  { name: "Неделя 3 — Ср", exercises: [
    { ex: E.BENCH_INCLINE, sets: 5, reps: "6 (60%)" },
    { ex: E.OHP_DB,        sets: 4, reps: "10" },
    { ex: E.LAT_PULLDOWN,  sets: 4, reps: "10" },
    { ex: E.CABLE_ROW,     sets: 4, reps: "10" },
    { ex: E.HIP_EXT,       sets: 4, reps: "20" },
    { ex: E.SQUAT_BW,      sets: 4, reps: "20" },
    { ex: E.HYPEREXT,      sets: 5, reps: "10" },
    { ex: E.ABS,           sets: 3, reps: "30" },
  ]},
  { name: "Неделя 3 — Пт", exercises: [
    { ex: E.BENCH,        sets: 2, reps: "8 (75%)" },
    { ex: E.DIPS,         sets: 5, reps: "8" },
    { ex: E.CURL_REVERSE, sets: 6, reps: "8" },
    { ex: E.WRIST_CURL,   sets: 5, reps: "10" },
    { ex: E.ABS,          sets: 3, reps: "30" },
  ]},

  // ── НЕДЕЛЯ 4 ──
  { name: "Неделя 4 — Пн", exercises: [
    { ex: E.BENCH,       sets: 1, reps: "5×2 (60%), 4×2 (70%), 3×2 (80%), 2×5 (85%)" },
    { ex: E.FLY,         sets: 5, reps: "8" },
    { ex: E.DB_BENCH,    sets: 5, reps: "5 (77%)" },
    { ex: E.CURL_DB,     sets: 5, reps: "10" },
    { ex: E.ABS,         sets: 3, reps: "30" },
  ]},
  { name: "Неделя 4 — Ср", exercises: [
    { ex: E.OHP_SEATED,   sets: 5, reps: "6 (50%)" },
    { ex: E.LATERAL_RAISE,sets: 5, reps: "10" },
    { ex: E.LAT_PULLDOWN, sets: 5, reps: "10" },
    { ex: E.HIP_EXT,      sets: 5, reps: "15" },
    { ex: E.HYPEREXT,     sets: 4, reps: "15" },
    { ex: E.ABS,          sets: 3, reps: "30" },
  ]},
  { name: "Неделя 4 — Пт", exercises: [
    { ex: E.BENCH,       sets: 1, reps: "9×1(60%), 8×1(65%), 6×1(70%), 5×1(75%), 4×1(80%), 4×1(85%), 2×1(90%), 3×1(85%), 3×1(80%), 5×1(70%), 8×1(60%)" },
    { ex: E.FLY_INCLINE, sets: 6, reps: "8" },
    { ex: E.CURL_REVERSE,sets: 5, reps: "10" },
    { ex: E.WRIST_CURL,  sets: 5, reps: "15" },
    { ex: E.ABS,         sets: 3, reps: "30" },
  ]},

  // ── НЕДЕЛЯ 5 ──
  { name: "Неделя 5 — Пн", exercises: [
    { ex: E.BENCH,        sets: 1, reps: "4×2(70%), 3×2(80%), 3×2(85%), 2×5(90%)" },
    { ex: E.BENCH_BLOCK,  sets: 1, reps: "3×1(90%), 2×1(95%), 2×1(100%)" },
    { ex: E.CLOSE_PUSHUP, sets: 4, reps: "20" },
    { ex: E.CURL_BARBELL, sets: 5, reps: "10" },
    { ex: E.WRIST_CURL,   sets: 4, reps: "20" },
    { ex: E.ABS,          sets: 3, reps: "30" },
  ]},
  { name: "Неделя 5 — Ср", exercises: [
    { ex: E.HIP_EXT,       sets: 4, reps: "20" },
    { ex: E.SQUAT_BW_BENCH,sets: 4, reps: "15" },
    { ex: E.DB_BENCH_30,   sets: 5, reps: "6 (60%)" },
    { ex: E.OHP_BARBELL,   sets: 4, reps: "8" },
    { ex: E.LATERAL_RAISE, sets: 4, reps: "8" },
    { ex: E.LAT_PULLDOWN,  sets: 5, reps: "20" },
    { ex: E.HYPEREXT,      sets: 5, reps: "10" },
  ]},
  { name: "Неделя 5 — Пт", exercises: [
    { ex: E.BENCH,        sets: 1, reps: "4×2(80%), 5×3(85%)" },
    { ex: E.FLY,          sets: 5, reps: "6" },
    { ex: E.BENCH_CLOSE,  sets: 5, reps: "5 (65%)" },
    { ex: E.CURL_REVERSE, sets: 5, reps: "8" },
    { ex: E.WRIST_CURL,   sets: 5, reps: "10" },
    { ex: E.ABS,          sets: 3, reps: "30" },
  ]},

  // ── НЕДЕЛЯ 6 ──
  { name: "Неделя 6 — Пн", exercises: [
    { ex: E.BENCH,        sets: 1, reps: "4×2(75%), 2×8(85%)" },
    { ex: E.FLY,          sets: 5, reps: "6" },
    { ex: E.DB_BENCH,     sets: 5, reps: "5" },
    { ex: E.CURL_BARBELL, sets: 4, reps: "8 (+2 негативных)" },
    { ex: E.WRIST_CURL,   sets: 4, reps: "20" },
    { ex: E.ABS,          sets: 3, reps: "30" },
  ]},
  { name: "Неделя 6 — Ср", exercises: [
    { ex: E.HIP_EXT,       sets: 5, reps: "10" },
    { ex: E.SQUAT_BW_BENCH,sets: 5, reps: "30" },
    { ex: E.OHP_DB,        sets: 5, reps: "10" },
    { ex: E.LATERAL_RAISE, sets: 4, reps: "10" },
    { ex: E.LAT_PULLDOWN,  sets: 5, reps: "10" },
    { ex: E.HYPEREXT,      sets: 4, reps: "15" },
    { ex: E.ABS,           sets: 3, reps: "30" },
  ]},
  { name: "Неделя 6 — Пт", exercises: [
    { ex: E.BENCH,        sets: 1, reps: "6×2(70%), 3×4(80%), 2×3(90%), 3×3(85%)" },
    { ex: E.FLY_INCLINE,  sets: 6, reps: "8" },
    { ex: E.CURL_REVERSE, sets: 5, reps: "10" },
    { ex: E.ABS,          sets: 3, reps: "30" },
  ]},

  // ── НЕДЕЛЯ 7 ──
  { name: "Неделя 7 — Пн", exercises: [
    { ex: E.BENCH,       sets: 1, reps: "4×2(70%), 3×2(80%), 2×2(90%), 1×2(95%)" },
    { ex: E.BENCH_BLOCK, sets: 2, reps: "1 (100%)" },
    { ex: E.DB_BENCH_30, sets: 4, reps: "8" },
    { ex: E.TRICEP_PD,   sets: 5, reps: "8" },
    { ex: E.CURL_BARBELL,sets: 5, reps: "10" },
    { ex: E.WRIST_CURL,  sets: 4, reps: "30" },
    { ex: E.ABS,         sets: 3, reps: "30" },
  ]},
  { name: "Неделя 7 — Ср", exercises: [
    { ex: E.GOBLET_SQUAT, sets: 5, reps: "10" },
    { ex: E.HIP_EXT,      sets: 3, reps: "5" },
    { ex: E.LATERAL_RAISE,sets: 5, reps: "10" },
    { ex: E.LAT_PULLDOWN, sets: 5, reps: "10" },
    { ex: E.CABLE_ROW,    sets: 5, reps: "10" },
    { ex: E.HYPEREXT,     sets: 4, reps: "30" },
  ]},
  { name: "Неделя 7 — Пт", exercises: [
    { ex: E.BENCH,        sets: 1, reps: "2×4(75%), 4×4(85%)" },
    { ex: E.FLY,          sets: 5, reps: "8" },
    { ex: E.BENCH_CLOSE,  sets: 4, reps: "6 (65%)" },
    { ex: E.CURL_REVERSE, sets: 5, reps: "8" },
    { ex: E.WRIST_CURL,   sets: 3, reps: "30" },
  ]},

  // ── НЕДЕЛЯ 8 ──
  { name: "Неделя 8 — Пн", exercises: [
    { ex: E.BENCH,        sets: 4, reps: "5 (80%) + суперсет" },
    { ex: E.CURL_REVERSE, sets: 4, reps: "5" },
    { ex: E.FLY_INCLINE,  sets: 5, reps: "8" },
    { ex: E.TRICEP_PD,    sets: 4, reps: "10 + суперсет" },
    { ex: E.CURL_BARBELL, sets: 4, reps: "10" },
    { ex: E.WRIST_CURL,   sets: 4, reps: "30" },
    { ex: E.ABS,          sets: 3, reps: "30" },
  ]},
  { name: "Неделя 8 — Ср", exercises: [
    { ex: E.GOBLET_SQUAT, sets: 4, reps: "15" },
    { ex: E.HIP_EXT,      sets: 3, reps: "15" },
    { ex: E.LATERAL_RAISE,sets: 5, reps: "10" },
    { ex: E.LAT_PULLDOWN, sets: 5, reps: "8 + суперсет" },
    { ex: E.CABLE_ROW,    sets: 5, reps: "8" },
    { ex: E.HYPEREXT,     sets: 4, reps: "10" },
    { ex: E.ABS,          sets: 5, reps: "10" },
  ]},
  { name: "Неделя 8 — Пт", exercises: [
    { ex: E.BENCH, sets: 4, reps: "4 (70%)" },
    { ex: E.ABS,   sets: 2, reps: "8" },
  ]},

  // ── НЕДЕЛЯ 9 — ФИНАЛ ──
  { name: "Неделя 9 — Пн (КЛУБ 100)", exercises: [
    { ex: E.BENCH, sets: 1, reps: "5×1(60%), 3×1(70%), 2×1(80%), 1×1(90%), 1×1(100%)" },
  ]},
];

async function getOrCreate(e: ExDef): Promise<string> {
  const found = await prisma.exercise.findFirst({ where: { name: e.name } });
  if (found) return found.id;
  const created = await prisma.exercise.create({ data: e });
  return created.id;
}

async function main() {
  console.log("Создаём программу 'Клуб 100 — Сарычев'...");

  // Удаляем если уже есть
  await prisma.program.deleteMany({ where: { name: "Клуб 100 — Сарычев" } });

  // Создаём все упражнения заранее
  const exIds: Record<string, string> = {};
  for (const [key, def] of Object.entries(E)) {
    exIds[key] = await getOrCreate(def);
  }

  const program = await prisma.program.create({
    data: {
      name: "Клуб 100 — Сарычев",
      description: "Авторская программа Михаила Сарычева для достижения жима штанги лёжа 100 кг. 9 недель, 3 тренировки в неделю (Пн/Ср/Пт). Базовые упражнения: % от максимума × повторения × подходы.",
      goal: "Сила",
      difficulty: "Продвинутый",
      weeks: 9,
      userId: null,
      days: {
        create: days.map((day, dayIdx) => ({
          dayNumber: dayIdx + 1,
          name: day.name,
          exercises: {
            create: day.exercises.map((e, exIdx) => ({
              exerciseId: exIds[Object.keys(E).find(k => E[k] === e.ex)!],
              order: exIdx,
              sets: e.sets,
              reps: e.reps,
            })),
          },
        })),
      },
    },
  });

  console.log(`✓ Программа создана: ${program.name} (${days.length} дней)`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
