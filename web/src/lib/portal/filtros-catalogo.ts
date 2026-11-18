import { ESTADOS_DE_CLUB, type EstadoClub } from "./filtros-clubes";
import {
  MODALIDADES_DE_CURSO,
  NIVELES_DE_CURSO,
  type ModalidadCurso,
  type NivelCurso,
} from "./filtros-cursos";
import {
  enteroPositivo,
  opcionValida,
  paginaEnRuta,
  primerValor,
  rutaConConsulta,
  textoDeBusqueda,
  type ParametrosDeBusqueda,
} from "./parametros";

export const OPCIONES_DE_INSCRIPCION = ["ABIERTAS", "CERRADAS"] as const;
export const OPCIONES_DE_CUPO = ["CON_CUPO", "SIN_CUPO"] as const;

export type OpcionDeInscripcion = (typeof OPCIONES_DE_INSCRIPCION)[number];
export type OpcionDeCupo = (typeof OPCIONES_DE_CUPO)[number];

export const NOMBRES_DE_INSCRIPCION: Record<OpcionDeInscripcion, string> = {
  ABIERTAS: "Abiertas",
  CERRADAS: "Cerradas",
};

export const NOMBRES_DE_CUPO: Record<OpcionDeCupo, string> = {
  CON_CUPO: "Con cupos libres",
  SIN_CUPO: "Sin cupos",
};

export type FiltrosCatalogo = {
  q: string;
  institucion: number | null;
  periodo: number | null;
  estado: EstadoClub | null;
  inscripciones: OpcionDeInscripcion | null;
  cupo: OpcionDeCupo | null;
  nivel: NivelCurso | null;
  modalidad: ModalidadCurso | null;
  pagina: number;
};

export const RUTA_CATALOGO = "/portal/catalogo";
export const CLUBES_DEL_CATALOGO_POR_PAGINA = 12;

export const FILTROS_DEL_CATALOGO_VACIOS: FiltrosCatalogo = {
  q: "",
  institucion: null,
  periodo: null,
  estado: null,
  inscripciones: null,
  cupo: null,
  nivel: null,
  modalidad: null,
  pagina: 1,
};

export function leerFiltrosDelCatalogo(parametros: ParametrosDeBusqueda): FiltrosCatalogo {
  return {
    q: textoDeBusqueda(parametros.q),
    institucion: enteroPositivo(primerValor(parametros.institucion)),
    periodo: enteroPositivo(primerValor(parametros.periodo)),
    estado: opcionValida(ESTADOS_DE_CLUB, primerValor(parametros.estado)),
    inscripciones: opcionValida(OPCIONES_DE_INSCRIPCION, primerValor(parametros.inscripciones)),
    cupo: opcionValida(OPCIONES_DE_CUPO, primerValor(parametros.cupo)),
    nivel: opcionValida(NIVELES_DE_CURSO, primerValor(parametros.nivel)),
    modalidad: opcionValida(MODALIDADES_DE_CURSO, primerValor(parametros.modalidad)),
    pagina: enteroPositivo(primerValor(parametros.pagina)) ?? 1,
  };
}

export function rutaDelCatalogo(filtros: FiltrosCatalogo): string {
  return rutaConConsulta(RUTA_CATALOGO, {
    q: filtros.q,
    institucion: filtros.institucion,
    periodo: filtros.periodo,
    estado: filtros.estado,
    inscripciones: filtros.inscripciones,
    cupo: filtros.cupo,
    nivel: filtros.nivel,
    modalidad: filtros.modalidad,
    pagina: paginaEnRuta(filtros.pagina),
  });
}

export function hayFiltrosDelCatalogo(filtros: FiltrosCatalogo): boolean {
  return Boolean(
    filtros.q ||
      filtros.institucion ||
      filtros.periodo ||
      filtros.estado ||
      filtros.inscripciones ||
      filtros.cupo ||
      filtros.nivel ||
      filtros.modalidad,
  );
}

export function rutaDeClubDelCatalogo(id: number): string {
  return `${RUTA_CATALOGO}/${id}`;
}

export function cuposEnTexto(disponibles: number): string {
  if (disponibles <= 0) {
    return "Sin cupos libres";
  }
  return disponibles === 1 ? "1 cupo libre" : `${disponibles} cupos libres`;
}
