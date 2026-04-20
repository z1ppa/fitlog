-- AlterTable
ALTER TABLE "Workout" ADD COLUMN     "programDayId" TEXT;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_programDayId_fkey" FOREIGN KEY ("programDayId") REFERENCES "ProgramDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;
