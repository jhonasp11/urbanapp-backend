/*
  Warnings:

  - You are about to drop the column `fecha_expiracion` on the `CODIGOS_QR` table. All the data in the column will be lost.
  - You are about to drop the column `alicuota_id` on the `PAGOS` table. All the data in the column will be lost.
  - Added the required column `fecha_fin` to the `CODIGOS_QR` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fecha_inicio` to the `CODIGOS_QR` table without a default value. This is not possible if the table is not empty.
  - Added the required column `monto_pagado` to the `PAGOS` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "INGRESOS" DROP CONSTRAINT "INGRESOS_codigo_qr_id_fkey";

-- DropForeignKey
ALTER TABLE "INGRESOS" DROP CONSTRAINT "INGRESOS_visitante_id_fkey";

-- DropForeignKey
ALTER TABLE "PAGOS" DROP CONSTRAINT "PAGOS_alicuota_id_fkey";

-- AlterTable
ALTER TABLE "CODIGOS_QR" DROP COLUMN "fecha_expiracion",
ADD COLUMN     "fecha_fin" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "fecha_inicio" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "INGRESOS" ADD COLUMN     "cedula_visitante" VARCHAR(20),
ADD COLUMN     "placa_vehiculo" VARCHAR(10),
ADD COLUMN     "tipo_ingreso" VARCHAR(20) NOT NULL DEFAULT 'automatico',
ALTER COLUMN "codigo_qr_id" DROP NOT NULL,
ALTER COLUMN "visitante_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PAGOS" DROP COLUMN "alicuota_id",
ADD COLUMN     "cantidad_meses" INTEGER,
ADD COLUMN     "monto_pagado" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "VISITANTES" ADD COLUMN     "placa_vehiculo" VARCHAR(10);

-- CreateTable
CREATE TABLE "PAGOS_ALICUOTAS" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pago_id" UUID NOT NULL,
    "alicuota_id" UUID NOT NULL,

    CONSTRAINT "PAGOS_ALICUOTAS_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PAGOS_ALICUOTAS_pago_id_alicuota_id_key" ON "PAGOS_ALICUOTAS"("pago_id", "alicuota_id");

-- AddForeignKey
ALTER TABLE "INGRESOS" ADD CONSTRAINT "INGRESOS_codigo_qr_id_fkey" FOREIGN KEY ("codigo_qr_id") REFERENCES "CODIGOS_QR"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "INGRESOS" ADD CONSTRAINT "INGRESOS_visitante_id_fkey" FOREIGN KEY ("visitante_id") REFERENCES "VISITANTES"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PAGOS_ALICUOTAS" ADD CONSTRAINT "PAGOS_ALICUOTAS_pago_id_fkey" FOREIGN KEY ("pago_id") REFERENCES "PAGOS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PAGOS_ALICUOTAS" ADD CONSTRAINT "PAGOS_ALICUOTAS_alicuota_id_fkey" FOREIGN KEY ("alicuota_id") REFERENCES "ALICUOTAS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
