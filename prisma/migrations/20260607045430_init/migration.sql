-- CreateTable
CREATE TABLE "USUARIOS" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cedula" VARCHAR(20) NOT NULL,
    "nombres" VARCHAR(100) NOT NULL,
    "apellidos" VARCHAR(100) NOT NULL,
    "correo" VARCHAR(150) NOT NULL,
    "telefono" VARCHAR(20),
    "usuario" VARCHAR(50) NOT NULL,
    "contrasena_hash" VARCHAR(255) NOT NULL,
    "rol" VARCHAR(20) NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_por" UUID,

    CONSTRAINT "USUARIOS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RESIDENTES" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "manzana" VARCHAR(10) NOT NULL,
    "villa" VARCHAR(10) NOT NULL,
    "foto_url" VARCHAR(255),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RESIDENTES_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ADMINISTRADORES" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "id_administrador" VARCHAR(30) NOT NULL,
    "foto_url" VARCHAR(255),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ADMINISTRADORES_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TURNOS" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" VARCHAR(20) NOT NULL,
    "hora_inicio" TIME NOT NULL,
    "hora_fin" TIME NOT NULL,
    "descripcion" VARCHAR(100),

    CONSTRAINT "TURNOS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GUARDIAS" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "id_guardia" VARCHAR(30) NOT NULL,
    "turno_id" UUID NOT NULL,
    "foto_url" VARCHAR(255),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GUARDIAS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DOCUMENTOS" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "titulo" VARCHAR(200) NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "archivo_url" VARCHAR(255) NOT NULL,
    "version" VARCHAR(20) NOT NULL,
    "visible_para" VARCHAR(20) NOT NULL,
    "subido_por" UUID NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DOCUMENTOS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ACEPTACION_TERMINOS" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "documento_id" UUID NOT NULL,
    "version_documento" VARCHAR(20) NOT NULL,
    "fecha_aceptacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_dispositivo" VARCHAR(45),

    CONSTRAINT "ACEPTACION_TERMINOS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ALICUOTAS" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "residente_id" UUID NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "fecha_vencimiento" DATE NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ALICUOTAS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PAGOS" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "residente_id" UUID NOT NULL,
    "alicuota_id" UUID,
    "reserva_id" UUID,
    "tipo_pago" VARCHAR(20) NOT NULL,
    "mes_pago" INTEGER NOT NULL,
    "anio_pago" INTEGER NOT NULL,
    "metodo_pago" VARCHAR(30) NOT NULL,
    "banco" VARCHAR(100) NOT NULL,
    "comprobante_url" VARCHAR(255) NOT NULL,
    "formato_archivo" VARCHAR(5) NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "observacion_residente" TEXT,
    "observacion_admin" TEXT,
    "validado_por" UUID,
    "fecha_envio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_validacion" TIMESTAMP(3),

    CONSTRAINT "PAGOS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NOTIFICACIONES" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NOTIFICACIONES_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VISITANTES" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "residente_id" UUID NOT NULL,
    "nombre_visitante" VARCHAR(150) NOT NULL,
    "fecha_visita" DATE NOT NULL,
    "hora_estimada_ingreso" TIME NOT NULL,
    "observacion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VISITANTES_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CODIGOS_QR" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "visitante_id" UUID NOT NULL,
    "residente_id" UUID NOT NULL,
    "codigo_hash" VARCHAR(255) NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'activo',
    "fecha_expiracion" TIMESTAMP(3) NOT NULL,
    "intentos_fallidos" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CODIGOS_QR_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BITACORA_TURNOS" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "guardia_id" UUID NOT NULL,
    "turno_id" UUID NOT NULL,
    "fecha_turno" DATE NOT NULL,
    "hora_apertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hora_cierre" TIMESTAMP(3),
    "total_ingresos" INTEGER NOT NULL DEFAULT 0,
    "total_incidencias" INTEGER NOT NULL DEFAULT 0,
    "reporte_pdf_url" VARCHAR(255),
    "estado" VARCHAR(20) NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BITACORA_TURNOS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "INGRESOS" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "codigo_qr_id" UUID NOT NULL,
    "visitante_id" UUID NOT NULL,
    "residente_id" UUID NOT NULL,
    "guardia_id" UUID NOT NULL,
    "bitacora_id" UUID NOT NULL,
    "nombre_visitante" VARCHAR(150) NOT NULL,
    "manzana_destino" VARCHAR(10) NOT NULL,
    "villa_destino" VARCHAR(10) NOT NULL,
    "hora_ingreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" VARCHAR(20) NOT NULL,
    "observacion_incidencia" TEXT,

    CONSTRAINT "INGRESOS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AREAS_SOCIALES" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "imagen_url" VARCHAR(255),
    "capacidad_max" INTEGER NOT NULL,
    "tarifa_reserva" DECIMAL(10,2) NOT NULL,
    "anticipacion_min_dias" INTEGER NOT NULL DEFAULT 1,
    "cancelacion_max_horas" INTEGER NOT NULL DEFAULT 24,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AREAS_SOCIALES_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HORARIOS_AREA" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "area_id" UUID NOT NULL,
    "hora_inicio" TIME NOT NULL,
    "hora_fin" TIME NOT NULL,
    "dias_disponibles" VARCHAR(50),

    CONSTRAINT "HORARIOS_AREA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RESERVAS" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "residente_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "fecha_reserva" DATE NOT NULL,
    "hora_inicio" TIME NOT NULL,
    "hora_fin" TIME NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "bloqueo_temporal" BOOLEAN NOT NULL DEFAULT false,
    "bloqueo_hasta" TIMESTAMP(3),
    "observacion_admin" TEXT,
    "validado_por" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RESERVAS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "REPORTES" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "administrador_id" UUID NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "mes" INTEGER,
    "anio" INTEGER,
    "fecha_desde" DATE,
    "fecha_hasta" DATE,
    "total_registros" INTEGER,
    "archivo_pdf_url" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "REPORTES_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GESTION_USUARIOS_LOG" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "administrador_id" UUID NOT NULL,
    "usuario_afectado_id" UUID NOT NULL,
    "accion" VARCHAR(30) NOT NULL,
    "detalle" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GESTION_USUARIOS_LOG_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "USUARIOS_cedula_key" ON "USUARIOS"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "USUARIOS_correo_key" ON "USUARIOS"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "USUARIOS_usuario_key" ON "USUARIOS"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "RESIDENTES_usuario_id_key" ON "RESIDENTES"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "ADMINISTRADORES_usuario_id_key" ON "ADMINISTRADORES"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "ADMINISTRADORES_id_administrador_key" ON "ADMINISTRADORES"("id_administrador");

-- CreateIndex
CREATE UNIQUE INDEX "TURNOS_nombre_key" ON "TURNOS"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "GUARDIAS_usuario_id_key" ON "GUARDIAS"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "GUARDIAS_id_guardia_key" ON "GUARDIAS"("id_guardia");

-- CreateIndex
CREATE UNIQUE INDEX "ACEPTACION_TERMINOS_usuario_id_documento_id_key" ON "ACEPTACION_TERMINOS"("usuario_id", "documento_id");

-- CreateIndex
CREATE UNIQUE INDEX "ALICUOTAS_residente_id_mes_anio_key" ON "ALICUOTAS"("residente_id", "mes", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "CODIGOS_QR_codigo_hash_key" ON "CODIGOS_QR"("codigo_hash");

-- CreateIndex
CREATE UNIQUE INDEX "BITACORA_TURNOS_guardia_id_fecha_turno_turno_id_key" ON "BITACORA_TURNOS"("guardia_id", "fecha_turno", "turno_id");

-- CreateIndex
CREATE UNIQUE INDEX "HORARIOS_AREA_area_id_hora_inicio_hora_fin_key" ON "HORARIOS_AREA"("area_id", "hora_inicio", "hora_fin");

-- CreateIndex
CREATE UNIQUE INDEX "RESERVAS_area_id_fecha_reserva_hora_inicio_key" ON "RESERVAS"("area_id", "fecha_reserva", "hora_inicio");

-- AddForeignKey
ALTER TABLE "USUARIOS" ADD CONSTRAINT "USUARIOS_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "USUARIOS"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RESIDENTES" ADD CONSTRAINT "RESIDENTES_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "USUARIOS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ADMINISTRADORES" ADD CONSTRAINT "ADMINISTRADORES_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "USUARIOS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GUARDIAS" ADD CONSTRAINT "GUARDIAS_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "USUARIOS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GUARDIAS" ADD CONSTRAINT "GUARDIAS_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "TURNOS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DOCUMENTOS" ADD CONSTRAINT "DOCUMENTOS_subido_por_fkey" FOREIGN KEY ("subido_por") REFERENCES "ADMINISTRADORES"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ACEPTACION_TERMINOS" ADD CONSTRAINT "ACEPTACION_TERMINOS_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "USUARIOS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ACEPTACION_TERMINOS" ADD CONSTRAINT "ACEPTACION_TERMINOS_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "DOCUMENTOS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ALICUOTAS" ADD CONSTRAINT "ALICUOTAS_residente_id_fkey" FOREIGN KEY ("residente_id") REFERENCES "RESIDENTES"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PAGOS" ADD CONSTRAINT "PAGOS_residente_id_fkey" FOREIGN KEY ("residente_id") REFERENCES "RESIDENTES"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PAGOS" ADD CONSTRAINT "PAGOS_alicuota_id_fkey" FOREIGN KEY ("alicuota_id") REFERENCES "ALICUOTAS"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PAGOS" ADD CONSTRAINT "PAGOS_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "RESERVAS"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PAGOS" ADD CONSTRAINT "PAGOS_validado_por_fkey" FOREIGN KEY ("validado_por") REFERENCES "ADMINISTRADORES"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NOTIFICACIONES" ADD CONSTRAINT "NOTIFICACIONES_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "USUARIOS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VISITANTES" ADD CONSTRAINT "VISITANTES_residente_id_fkey" FOREIGN KEY ("residente_id") REFERENCES "RESIDENTES"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CODIGOS_QR" ADD CONSTRAINT "CODIGOS_QR_visitante_id_fkey" FOREIGN KEY ("visitante_id") REFERENCES "VISITANTES"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CODIGOS_QR" ADD CONSTRAINT "CODIGOS_QR_residente_id_fkey" FOREIGN KEY ("residente_id") REFERENCES "RESIDENTES"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BITACORA_TURNOS" ADD CONSTRAINT "BITACORA_TURNOS_guardia_id_fkey" FOREIGN KEY ("guardia_id") REFERENCES "GUARDIAS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BITACORA_TURNOS" ADD CONSTRAINT "BITACORA_TURNOS_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "TURNOS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "INGRESOS" ADD CONSTRAINT "INGRESOS_codigo_qr_id_fkey" FOREIGN KEY ("codigo_qr_id") REFERENCES "CODIGOS_QR"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "INGRESOS" ADD CONSTRAINT "INGRESOS_visitante_id_fkey" FOREIGN KEY ("visitante_id") REFERENCES "VISITANTES"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "INGRESOS" ADD CONSTRAINT "INGRESOS_residente_id_fkey" FOREIGN KEY ("residente_id") REFERENCES "RESIDENTES"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "INGRESOS" ADD CONSTRAINT "INGRESOS_guardia_id_fkey" FOREIGN KEY ("guardia_id") REFERENCES "GUARDIAS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "INGRESOS" ADD CONSTRAINT "INGRESOS_bitacora_id_fkey" FOREIGN KEY ("bitacora_id") REFERENCES "BITACORA_TURNOS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HORARIOS_AREA" ADD CONSTRAINT "HORARIOS_AREA_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "AREAS_SOCIALES"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RESERVAS" ADD CONSTRAINT "RESERVAS_residente_id_fkey" FOREIGN KEY ("residente_id") REFERENCES "RESIDENTES"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RESERVAS" ADD CONSTRAINT "RESERVAS_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "AREAS_SOCIALES"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RESERVAS" ADD CONSTRAINT "RESERVAS_validado_por_fkey" FOREIGN KEY ("validado_por") REFERENCES "ADMINISTRADORES"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "REPORTES" ADD CONSTRAINT "REPORTES_administrador_id_fkey" FOREIGN KEY ("administrador_id") REFERENCES "ADMINISTRADORES"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GESTION_USUARIOS_LOG" ADD CONSTRAINT "GESTION_USUARIOS_LOG_administrador_id_fkey" FOREIGN KEY ("administrador_id") REFERENCES "ADMINISTRADORES"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GESTION_USUARIOS_LOG" ADD CONSTRAINT "GESTION_USUARIOS_LOG_usuario_afectado_id_fkey" FOREIGN KEY ("usuario_afectado_id") REFERENCES "USUARIOS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
