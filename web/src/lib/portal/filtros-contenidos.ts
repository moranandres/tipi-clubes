import { TIPOS_DE_CONTENIDO, type TipoContenido } from "./filtros-actividades";
import {
  opcionValida,
  primerValor,
  rutaConConsulta,
  textoDeBusqueda,
  type ParametrosDeBusqueda,
} from "./parametros";

export const ESTADOS_DE_CONTENIDO = ["ACTIVO", "INACTIVO"] as const;

export type EstadoContenido = (typeof ESTADOS_DE_CONTENIDO)[number];

export const NOMBRES_DE_ESTADO_DE_CONTENIDO: Record<EstadoContenido, string> = {
  ACTIVO: "Activos",
  INACTIVO: "Inactivos",
};

export const NOMBRE_DE_ESTADO_DE_CONTENIDO: Record<EstadoContenido, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
};

export const PUNTOS_DE_ESTADO_DE_CONTENIDO: Record<EstadoContenido, string> = {
  ACTIVO: "bg-exito",
  INACTIVO: "bg-tenue",
};

export const NOMBRE_DE_TIPO_EN_SINGULAR: Record<TipoContenido, string> = {
  HERRAMIENTA: "Herramienta",
  LENGUAJE: "Lenguaje",
  COMPONENTE: "Componente",
  COMPETENCIA: "Competencia",
};

export const DESCRIPCIONES_DE_TIPO: Record<TipoContenido, string> = {
  HERRAMIENTA: "Plataformas o entornos que se usan en la sesión, como Arduino IDE o Tinkercad.",
  LENGUAJE: "Lenguajes de programación, como Scratch, Python o C++.",
  COMPONENTE: "Piezas físicas de robótica, como sensores, motores o placas.",
  COMPETENCIA: "Habilidades que se evalúan en los avances, como pensamiento lógico.",
};

export type FiltrosContenidos = {
  q: string;
  tipo: TipoContenido | null;
  estado: EstadoContenido | null;
  pagina: number;
};

export const RUTA_CONTENIDOS = "/portal/contenidos";

export const FILTROS_DE_CONTENIDOS_VACIOS: FiltrosContenidos = {
  q: "",
  tipo: null,
  estado: null,
  pagina: 1,
};

export function estadoDeContenido(activo?: boolean): EstadoContenido {
  return activo === false ? "INACTIVO" : "ACTIVO";
}

export function leerFiltrosDeContenidos(parametros: ParametrosDeBusqueda): FiltrosContenidos {
  return {
    q: textoDeBusqueda(parametros.q),
    tipo: opcionValida(TIPOS_DE_CONTENIDO, primerValor(parametros.tipo)),
    estado: opcionValida(ESTADOS_DE_CONTENIDO, primerValor(parametros.estado)),
    pagina: 1,
  };
}

export function rutaDeContenidos(filtros: FiltrosContenidos): string {
  return rutaConConsulta(RUTA_CONTENIDOS, {
    q: filtros.q,
    tipo: filtros.tipo,
    estado: filtros.estado,
  });
}

export function hayFiltrosDeContenidos(filtros: FiltrosContenidos): boolean {
  return Boolean(filtros.q || filtros.tipo || filtros.estado);
}

export function rutaDeContenido(id: number, aviso?: string): string {
  return rutaConConsulta(`${RUTA_CONTENIDOS}/${id}`, { aviso });
}
