export const DIAS_DE_LA_SEMANA = [
  "",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export const OPCIONES_DE_DIA = DIAS_DE_LA_SEMANA.slice(1).map((nombre, indice) => ({
  valor: String(indice + 1),
  texto: nombre,
}));

const FORMATO_FECHA = new Intl.DateTimeFormat("es-EC", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const FORMATO_MOMENTO = new Intl.DateTimeFormat("es-EC", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Guayaquil",
});

const HORA_VALIDA =/^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

export function nombreDeDia(dia?: number): string {
  return dia && dia >= 1 && dia <= 7 ? DIAS_DE_LA_SEMANA[dia] : "";
}

export function horaCorta(hora?: string): string {
  return hora ? hora.slice(0, 5) : "";
}

export function fechaCorta(fecha?: string): string {
  return fecha ? FORMATO_FECHA.format(new Date(`${fecha}T00:00:00Z`)) : "";
}

export function momentoCorto(instante?: string): string {
  if (!instante) {
    return "";
  }
  const momento = new Date(instante);
  return Number.isNaN(momento.getTime()) ? "" : FORMATO_MOMENTO.format(momento);
}

export function esHoraValida(hora: string): boolean {
  return HORA_VALIDA.test(hora);
}

export function esFechaValida(fecha: string): boolean {
  return FECHA_VALIDA.test(fecha) && !Number.isNaN(Date.parse(`${fecha}T00:00:00Z`));
}

export function minutosDe(hora: string): number {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas * 60 + minutos;
}

const FORMATO_DIA_ISO = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "America/Guayaquil",
});

export function hoyEnGuayaquil(): string {
  return FORMATO_DIA_ISO.format(new Date());
}
