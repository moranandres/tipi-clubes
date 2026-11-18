import { fechaDeFiltro, rangoOrdenado } from "./filtros-actividades";
import { enteroPositivo, primerValor, rutaConConsulta, type ParametrosDeBusqueda } from "./parametros";
import { esFechaValida } from "./tiempo";
import { enteroDe } from "./validacion";

export const ESTADOS_DE_SEGUIMIENTO = ["ADECUADO", "EN_RIESGO", "CRITICO", "SIN_DATOS"] as const;
export const SITUACIONES_DE_ACTIVIDAD = ["EJECUTADA", "POR_EJECUTAR", "POR_REGISTRAR", "VENCIDA", "CANCELADA"] as const;

export type EstadoSeguimiento = (typeof ESTADOS_DE_SEGUIMIENTO)[number];
export type SituacionActividad = (typeof SITUACIONES_DE_ACTIVIDAD)[number];

export const NOMBRES_DE_ESTADO_DE_SEGUIMIENTO: Record<EstadoSeguimiento, string> = {
  ADECUADO: "Adecuado",
  EN_RIESGO: "En riesgo",
  CRITICO: "Crítico",
  SIN_DATOS: "Sin datos",
};

export const PUNTOS_DE_ESTADO_DE_SEGUIMIENTO: Record<EstadoSeguimiento, string> = {
  ADECUADO: "bg-exito",
  EN_RIESGO: "bg-aviso",
  CRITICO: "bg-error",
  SIN_DATOS: "bg-tenue",
};

export const NOMBRES_DE_SITUACION: Record<SituacionActividad, string> = {
  EJECUTADA: "Ejecutada",
  POR_EJECUTAR: "Por ejecutar",
  POR_REGISTRAR: "Por registrar",
  VENCIDA: "Vencida",
  CANCELADA: "Cancelada",
};

export const PUNTOS_DE_SITUACION: Record<SituacionActividad, string> = {
  EJECUTADA: "bg-exito",
  POR_EJECUTAR: "bg-acento",
  POR_REGISTRAR: "bg-aviso",
  VENCIDA: "bg-error",
  CANCELADA: "bg-tenue",
};

export type FiltrosDePeriodo = {
  q: string;
  periodo: number | null;
  institucion: number | null;
  desde: string | null;
  hasta: string | null;
  pagina: number;
};

export const FILTROS_DE_PERIODO_VACIOS: FiltrosDePeriodo = {
  q: "",
  periodo: null,
  institucion: null,
  desde: null,
  hasta: null,
  pagina: 1,
};

export const RUTA_SEGUIMIENTO = "/portal/seguimiento";

export function leerFiltrosDePeriodo(parametros: ParametrosDeBusqueda): FiltrosDePeriodo {
  return {
    q: "",
    periodo: enteroPositivo(primerValor(parametros.periodo)),
    institucion: enteroPositivo(primerValor(parametros.institucion)),
    ...rangoOrdenado(fechaDeFiltro(parametros.desde), fechaDeFiltro(parametros.hasta)),
    pagina: 1,
  };
}

export function rutaDeSeguimientoDeClub(clubId: number, desde: string | null, hasta: string | null): string {
  return rutaConConsulta(`${RUTA_SEGUIMIENTO}/${clubId}`, { desde, hasta });
}

export type DatosDeParametros = {
  diasGraciaRegistro: string;
  umbralAdecuado: string;
  umbralMinimo: string;
};

export type ErroresDeParametros = Partial<Record<keyof DatosDeParametros, string>>;

export const CAMPOS_DE_PARAMETROS: readonly (keyof DatosDeParametros)[] = [
  "diasGraciaRegistro",
  "umbralAdecuado",
  "umbralMinimo",
];

const UN_DECIMAL = /^\d{1,3}(\.\d)?$/;

function errorDeUmbral(valor: string, vacio: string): string | undefined {
  const texto = valor.trim().replace(",", ".");
  if (!texto) {
    return vacio;
  }
  if (!UN_DECIMAL.test(texto)) {
    return Number.isNaN(Number(texto)) ? "Escribe un número." : "Use como máximo un decimal";
  }
  const numero = Number(texto);
  if (numero <= 0) {
    return "El umbral debe ser mayor que 0";
  }
  return numero > 100 ? "El umbral no puede superar 100" : undefined;
}

export function numeroDeUmbral(valor: string): number {
  return Number(valor.trim().replace(",", "."));
}

export function validarParametros(datos: DatosDeParametros): ErroresDeParametros {
  const dias = enteroDe(datos.diasGraciaRegistro);
  const errores: ErroresDeParametros = {
    diasGraciaRegistro: !datos.diasGraciaRegistro.trim()
      ? "Indique los días de gracia para registrar la ejecución"
      : dias === null || dias > 15
        ? "Los días de gracia van de 0 a 15"
        : undefined,
    umbralAdecuado: errorDeUmbral(datos.umbralAdecuado, "Indique el umbral de cumplimiento adecuado"),
    umbralMinimo: errorDeUmbral(datos.umbralMinimo, "Indique el umbral de cumplimiento mínimo"),
  };
  if (!errores.umbralAdecuado && !errores.umbralMinimo && numeroDeUmbral(datos.umbralMinimo) >= numeroDeUmbral(datos.umbralAdecuado)) {
    errores.umbralMinimo = "El umbral mínimo debe ser menor que el umbral adecuado.";
  }
  return errores;
}

export function esRangoValido(desde: string | null, hasta: string | null): boolean {
  return (!desde || esFechaValida(desde)) && (!hasta || esFechaValida(hasta));
}

export function porcentaje(valor?: number | null): string {
  return typeof valor === "number" ? `${new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 }).format(valor)} %` : "—";
}

const FORMATO_MES = new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric", timeZone: "UTC" });
const MES = /^\d{4}-\d{2}$/;

export function nombreDeMes(mes?: string): string {
  if (!mes || !MES.test(mes)) {
    return mes ?? "";
  }
  return FORMATO_MES.format(new Date(`${mes}-01T00:00:00Z`));
}
