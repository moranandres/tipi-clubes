import { fechaDeFiltro, rangoOrdenado } from "./filtros-actividades";
import {
  enteroPositivo,
  opcionValida,
  paginaEnRuta,
  primerValor,
  rutaConConsulta,
  textoDeBusqueda,
  type ParametrosDeBusqueda,
} from "./parametros";

export const ESTADOS_DE_CERTIFICADO = ["EMITIDO", "ANULADO"] as const;
export const TIPOS_DE_CERTIFICADO = [
  "PARTICIPACION_CURSO",
  "APROBACION_CURSO",
  "PARTICIPACION_COMPETENCIA",
  "RECONOCIMIENTO_COMPETENCIA",
] as const;

export type EstadoCertificado = (typeof ESTADOS_DE_CERTIFICADO)[number];
export type TipoCertificado = (typeof TIPOS_DE_CERTIFICADO)[number];

export const TIPOS_DE_CURSO: readonly TipoCertificado[] = ["PARTICIPACION_CURSO", "APROBACION_CURSO"];
export const TIPOS_DE_COMPETENCIA: readonly TipoCertificado[] = [
  "PARTICIPACION_COMPETENCIA",
  "RECONOCIMIENTO_COMPETENCIA",
];

export const NOMBRES_DE_ESTADO_DE_CERTIFICADO: Record<EstadoCertificado, string> = {
  EMITIDO: "Vigente",
  ANULADO: "Anulado",
};

export const PLURALES_DE_ESTADO_DE_CERTIFICADO: Record<EstadoCertificado, string> = {
  EMITIDO: "Vigentes",
  ANULADO: "Anulados",
};

export const PUNTOS_DE_ESTADO_DE_CERTIFICADO: Record<EstadoCertificado, string> = {
  EMITIDO: "bg-exito",
  ANULADO: "bg-error",
};

export const NOMBRES_DE_TIPO_DE_CERTIFICADO: Record<TipoCertificado, string> = {
  PARTICIPACION_CURSO: "Participación en curso",
  APROBACION_CURSO: "Aprobación de curso",
  PARTICIPACION_COMPETENCIA: "Participación en competencia",
  RECONOCIMIENTO_COMPETENCIA: "Reconocimiento en competencia",
};

export const OPCIONES_DE_TIPO_DE_CERTIFICADO = TIPOS_DE_CERTIFICADO.map((tipo) => ({
  valor: tipo,
  texto: NOMBRES_DE_TIPO_DE_CERTIFICADO[tipo],
}));

export type FiltrosCertificados = {
  q: string;
  estado: EstadoCertificado | null;
  tipo: TipoCertificado | null;
  institucion: number | null;
  club: number | null;
  desde: string | null;
  hasta: string | null;
  pagina: number;
};

export const RUTA_CERTIFICADOS = "/portal/certificados";
export const RUTA_EMITIR_CERTIFICADO = "/portal/certificados/nuevo";
export const CERTIFICADOS_POR_PAGINA = 10;

export const FILTROS_DE_CERTIFICADOS_VACIOS: FiltrosCertificados = {
  q: "",
  estado: null,
  tipo: null,
  institucion: null,
  club: null,
  desde: null,
  hasta: null,
  pagina: 1,
};

export function esTipoDeCertificado(valor: unknown): valor is TipoCertificado {
  return TIPOS_DE_CERTIFICADO.includes(valor as TipoCertificado);
}

export function esTipoDeCurso(tipo: TipoCertificado): boolean {
  return TIPOS_DE_CURSO.includes(tipo);
}

export function leerFiltrosDeCertificados(parametros: ParametrosDeBusqueda): FiltrosCertificados {
  return {
    q: textoDeBusqueda(parametros.q),
    estado: opcionValida(ESTADOS_DE_CERTIFICADO, primerValor(parametros.estado)),
    tipo: opcionValida(TIPOS_DE_CERTIFICADO, primerValor(parametros.tipo)),
    institucion: enteroPositivo(primerValor(parametros.institucion)),
    club: enteroPositivo(primerValor(parametros.club)),
    ...rangoOrdenado(fechaDeFiltro(parametros.desde), fechaDeFiltro(parametros.hasta)),
    pagina: enteroPositivo(primerValor(parametros.pagina)) ?? 1,
  };
}

export function rutaDeCertificados(filtros: FiltrosCertificados): string {
  return rutaConConsulta(RUTA_CERTIFICADOS, {
    q: filtros.q,
    estado: filtros.estado,
    tipo: filtros.tipo,
    institucion: filtros.institucion,
    club: filtros.club,
    desde: filtros.desde,
    hasta: filtros.hasta,
    pagina: paginaEnRuta(filtros.pagina),
  });
}

export function hayFiltrosDeCertificados(filtros: FiltrosCertificados): boolean {
  return Boolean(
    filtros.q ||
      filtros.estado ||
      filtros.tipo ||
      filtros.institucion ||
      filtros.club ||
      filtros.desde ||
      filtros.hasta,
  );
}

export function rutaDeCertificado(id: number, aviso?: string): string {
  return rutaConConsulta(`${RUTA_CERTIFICADOS}/${id}`, { aviso });
}

export function rutaDePdfDeCertificado(id: number, descargar: boolean): string {
  return rutaConConsulta(`${RUTA_CERTIFICADOS}/${id}/pdf`, { descargar: descargar ? 1 : null });
}

export function rutaDeParticipantesDeCurso(cursoId: number): string {
  return `${RUTA_CERTIFICADOS}/cursos/${cursoId}`;
}

export function rutaDeEmision(origen: "curso" | "competencia", participacion?: number): string {
  return rutaConConsulta(RUTA_EMITIR_CERTIFICADO, { origen, participacion });
}
