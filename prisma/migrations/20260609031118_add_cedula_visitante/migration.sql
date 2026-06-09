/*
  Warnings:

  - Added the required column `cedula_visitante` to the `VISITANTES` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VISITANTES" ADD COLUMN "cedula_visitante" VARCHAR(20) NOT NULL DEFAULT '0000000000';
ALTER TABLE "VISITANTES" ALTER COLUMN "cedula_visitante" DROP DEFAULT;