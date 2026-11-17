import { fechaDeFiltro, rangoOrdenado } from "./filtros-actividades";
import {
  enteroPositivo,
  opcionValida,
  paginaEnRuta,
  primerValor,
  rutaConConsulta,
  type ParametrosDeBusqueda,
} from "./parametros";

export const TIPOS_DE_EVIDENCIA = ["FOTOGRAFIA", "DOCUMENTO", "ENLACE", "PRODUCTO"] as const;
export const ESTADOS_DE_EVIDENCIA = ["ACTIVA", "RETIRADA"] as const;

export type TipoEvidencia = (typeof TIPOS_DE_EVIDENCIA)[number];
export type EstadoEvidencia = (typeof ESTADOS_DE_EVIDENCIA)[number];

export const NOMBRES_DE_TIPO_DE_EVIDENCIA: Record<TipoEvidencia, string> = {
  FOTOGRAFIA: "Fotografía",
  DOCUMENTO: "Documento",
  ENLACE: "Enlace",
  PRODUCTO: "Producto",
};

export const PLURALES_DE_TIPO_DE_EVIDENCIA: Record<TipoEvidencia, string> = {
  FOTOGRAFIA: "Fotografías",
  DOCUMENTO: "Documentos",
  ENLACE: "Enlaces",
  PRODUCTO: "Productos",
};

export const DESCRIPCIONES_DE_TIPO_DE_EVIDENCIA: Record<TipoEvidencia, string> = {
  FOTOGRAFIA: "Foto JPG o PNG de la sesión.",
  DOCUMENTO: "Informe o acta en PDF.",
  ENLACE: "Video, repositorio o publicación en la web.",
  PRODUCTO: "Lo que construyeron: PDF o enlace.",
};

export const PUNTOS_DE_TIPO_DE_EVIDENCIA: Record<TipoEvidencia, string> = {
  FOTOGRAFIA: "bg-acento",
  DOCUMENTO: "bg-exito",
  ENLACE: "bg-aviso",
  PRODUCTO: "bg-error",
};

export const NOMBRES_DE_ESTADO_DE_EVIDENCIA: Record<EstadoEvidencia, string> = {
  ACTIVA: "Activas",
  RETIRADA: "Retiradas",
};

export type FiltrosEvidencias = {
  q: string;
  tipo: TipoEvidencia | null;
  estado: EstadoEvidencia | null;
  club: number | null;
  institucion: number | null;
  desde: string | null;
  hasta: string | null;
  pagina: number;
};

export const RUTA_EVIDENCIAS = "/portal/evidencias";
export const RUTA_NUEVA_EVIDENCIA = "/portal/evidencias/nueva";
export const EVIDENCIAS_POR_PAGINA = 12;

export const FILTROS_DE_EVIDENCIAS_VACIOS: FiltrosEvidencias = {
  q: "",
  tipo: null,
  estado: null,
  club: null,
  institucion: null,
  desde: null,
  hasta: null,
  pagina: 1,
};

export function leerFiltrosDeEvidencias(parametros: ParametrosDeBusqueda): FiltrosEvidencias {
  return {
    q: "",
    tipo: opcionValida(TIPOS_DE_EVIDENCIA, primerValor(parametros.tipo)),
    estado: opcionValida(ESTADOS_DE_EVIDENCIA, primerValor(parametros.estado)),
    club: enteroPositivo(primerValor(parametros.club)),
    institucion: enteroPositivo(primerValor(parametros.institucion)),
    ...rangoOrdenado(fechaDeFiltro(parametros.desde), fechaDeFiltro(parametros.hasta)),
    pagina: enteroPositivo(primerValor(parametros.pagina)) ?? 1,
  };
}

export function rutaDeEvidencias(filtros: FiltrosEvidencias): string {
  return rutaConConsulta(RUTA_EVIDENCIAS, {
    tipo: filtros.tipo,
    estado: filtros.estado,
    institucion: filtros.institucion,
    club: filtros.club,
    desde: filtros.desde,
    hasta: filtros.hasta,
    pagina: paginaEnRuta(filtros.pagina),
  });
}

export function hayFiltrosDeEvidencias(filtros: FiltrosEvidencias): boolean {
  return Boolean(
    filtros.tipo ||
      filtros.estado ||
      filtros.club ||
      filtros.institucion ||
      filtros.desde ||
      filtros.hasta,
  );
}

export function rutaDeEvidenciasDeSesion(actividadId: number, aviso?: string): string {
  return rutaConConsulta(`${RUTA_EVIDENCIAS}/${actividadId}`, { aviso });
}

export function rutaDeArchivoDeEvidencia(
  actividadId: number,
  evidenciaId: number,
  descargar: boolean,
): string {
  return rutaConConsulta(`${RUTA_EVIDENCIAS}/${actividadId}/archivo/${evidenciaId}`, {
    descargar: descargar ? 1 : null,
  });
}
