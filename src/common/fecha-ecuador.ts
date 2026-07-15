/**
 * Devuelve la hora actual de Ecuador (UTC-5) como Date "UTC literal".
 * Se usa para guardar en campos timestamp without time zone sin que
 * Prisma sume/reste horas.
 */
export function ahoraEcuadorLiteral(): Date {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const p = f.formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? '00';
  let hour = g('hour');
  if (hour === '24') hour = '00';
  return new Date(
    `${g('year')}-${g('month')}-${g('day')}T${hour}:${g('minute')}:${g('second')}Z`,
  );
}

/**
 * Convierte un string de fecha local (ej. "2026-07-12T14:30:00") a Date
 * "UTC literal", agregando la 'Z' para que Prisma lo guarde tal cual.
 */
export function fechaLocalLiteral(fechaStr: string): Date {
  // Si ya trae Z u offset, lo usamos tal cual; si no, agregamos Z
  if (/[Zz]|[+-]\d{2}:\d{2}$/.test(fechaStr)) {
    return new Date(fechaStr);
  }
  return new Date(fechaStr + 'Z');
}
