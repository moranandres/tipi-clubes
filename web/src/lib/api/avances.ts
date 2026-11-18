import "server-only";
import { cache } from "react";
import {
  ALCANCES_DE_AVANCE,
  AVANCES_POR_PAGINA,
  type AlcanceAvance,
  type FiltrosAvances,
} from "@/lib/portal/filtros-avances";
import { listarContenidosActivos, type Actividad } from "./actividades";
import { listarPeriodos, type Club } from "./clubes";
import { listarIntegrantesActivos } from "./competencias";
import { listarProyectosEnDesarrollo } from "./proyectos";
import { opcionesDeIntegrantes, type OpcionDeFormulario } from "@/lib/portal/opciones";
import type { PeriodoDelClub } from "@/lib/portal/reglas-proyectos";
import { fechaCorta } from "@/lib/portal/tiempo";
import { api, type Esquemas } from "./cliente";
import {
  TAMANO_MAXIMO_DE_PAGINA,
  conSesion,
  exigirAutenticacion,
  intentar,
  reunirPaginas,
  tokenDeSesion,
} from "./con-sesion";
import { comoDetalle, type ResultadoDeDetalle } from "./detalle";
import { comoLista, contarPorEstado, type ConteosDe, type ResultadoDeLista } from "./lista";

export type EstudianteDeAvance = Esquemas["EstudianteAvanceResponse"];
export type Avance = Omit<Esquemas["AvanceResponse"], "estudiante"> & {
  estudiante?: EstudianteDeAvance;
};
export type ResumenDeResultados = Esquemas["ResumenResultadosResponse"];

const ACTIVIDAD_EJECUTADA = "EJECUTADA";

function consultaDe(filtros: FiltrosAvances, alcance: AlcanceAvance | null) {
  return {
    alcance: alcance ?? undefined,
    estado: filtros.estado ?? undefined,
    institucionId: filtros.institucion ?? undefined,
    clubId: filtros.club ?? undefined,
    desde: filtros.desde ?? undefined,
    hasta: filtros.hasta ?? undefined,
  };
}

export async function listarAvances(filtros: FiltrosAvances): Promise<ResultadoDeLista<Avance>> {
  const token = await tokenDeSesion();

  return comoLista<Avance>(
    await intentar(
      api.GET("/api/avances", {
        ...conSesion(token),
        params: {
          query: { ...consultaDe(filtros, filtros.alcance), pagina: filtros.pagina - 1, tamano: AVANCES_POR_PAGINA },
        },
      }),
    ),
  );
}

export async function contarAvancesPorAlcance(filtros: FiltrosAvances): Promise<ConteosDe<AlcanceAvance>> {
  const token = await tokenDeSesion();

  return contarPorEstado(ALCANCES_DE_AVANCE, (alcance) =>
    intentar(
      api.GET("/api/avances", {
        ...conSesion(token),
        params: { query: { ...consultaDe(filtros, alcance), pagina: 0, tamano: 1 } },
      }),
    ),
  );
}

export const obtenerAvance = cache(async (id: number): Promise<ResultadoDeDetalle<Avance>> => {
  const token = await tokenDeSesion();

  return comoDetalle(
    await intentar(api.GET("/api/avances/{id}", { ...conSesion(token), params: { path: { id } } })),
  ) as ResultadoDeDetalle<Avance>;
});

export async function listarAvancesDeProyecto(proyectoId: number): Promise<Avance[] | null> {
  const token = await tokenDeSesion();

  const avances = await reunirPaginas((pagina) =>
    intentar(
      api.GET("/api/avances", {
        ...conSesion(token),
        params: { query: { proyectoId, pagina, tamano: TAMANO_MAXIMO_DE_PAGINA } },
      }),
    ),
  );

  return avances as Avance[] | null;
}

export async function obtenerResumenDeResultados(
  periodo: number | null,
  institucion: number | null,
): Promise<{ datos: ResumenDeResultados | null; detalle: string | null }> {
  const token = await tokenDeSesion();

  const respuesta = await intentar(
    api.GET("/api/resultados/resumen", {
      ...conSesion(token),
      params: { query: { periodoId: periodo ?? undefined, institucionId: institucion ?? undefined } },
    }),
  );

  exigirAutenticacion(respuesta);
  return { datos: respuesta.datos, detalle: respuesta.detalle };
}

export async function listarActividadesEjecutadas(): Promise<Actividad[] | null> {
  const token = await tokenDeSesion();

  return reunirPaginas((pagina) =>
    intentar(
      api.GET("/api/actividades", {
        ...conSesion(token),
        params: { query: { estado: ACTIVIDAD_EJECUTADA, pagina, tamano: TAMANO_MAXIMO_DE_PAGINA } },
      }),
    ),
  );
}

const TIPO_COMPETENCIA = "COMPETENCIA";

export type ClubParaAvance = OpcionDeFormulario & {
  periodo: PeriodoDelClub | null;
  estudiantes: OpcionDeFormulario[];
  proyectos: (OpcionDeFormulario & { fecha: string; nombre: string })[];
  actividades: (OpcionDeFormulario & { fecha: string; nombre: string })[];
};

export async function armarClubesParaAvance(
  clubes: Club[],
  conInstitucion: boolean,
): Promise<ClubParaAvance[] | null> {
  const [periodos, inscripciones, proyectos, actividades] = await Promise.all([
    listarPeriodos(),
    listarIntegrantesActivos(),
    listarProyectosEnDesarrollo(),
    listarActividadesEjecutadas(),
  ]);
  if (!periodos || !inscripciones || !proyectos || !actividades) {
    return null;
  }

  return clubes
    .filter((club) => typeof club.id === "number")
    .map((club) => {
      const periodo = periodos.find((candidato) => candidato.id === club.periodoId);
      const delClub = inscripciones.filter(
        (inscripcion) =>
          inscripcion.clubId === club.id &&
          typeof inscripcion.id === "number" &&
          typeof inscripcion.estudianteId === "number",
      );
      return {
        valor: String(club.id),
        texto: [club.nombre, conInstitucion ? club.institucionNombre : null].filter(Boolean).join(" · "),
        periodo:
          periodo?.fechaInicio && periodo.fechaFin ? { inicio: periodo.fechaInicio, fin: periodo.fechaFin } : null,
        estudiantes: opcionesDeIntegrantes(delClub).map((opcion, indice) => ({
          ...opcion,
          valor: String(delClub[indice].estudianteId),
        })),
        proyectos: proyectos
          .filter((proyecto) => proyecto.clubId === club.id && typeof proyecto.id === "number")
          .map((proyecto) => ({
            valor: String(proyecto.id),
            texto: proyecto.titulo ?? "Proyecto",
            nombre: proyecto.titulo ?? "Proyecto",
            fecha: proyecto.fechaInicio ?? "",
          })),
        actividades: actividades
          .filter((actividad) => actividad.clubId === club.id && typeof actividad.id === "number")
          .map((actividad) => ({
            valor: String(actividad.id),
            texto: `${fechaCorta(actividad.fecha)} · ${actividad.tema ?? "Sesión"}`,
            nombre: actividad.tema ?? "Sesión",
            fecha: actividad.fecha ?? "",
          })),
      };
    });
}

export async function listarCompetenciasEvaluables(): Promise<OpcionDeFormulario[] | null> {
  const contenidos = await listarContenidosActivos();
  return contenidos
    ? contenidos
        .filter((contenido) => contenido.tipo === TIPO_COMPETENCIA && typeof contenido.id === "number")
        .map((contenido) => ({ valor: String(contenido.id), texto: contenido.nombre ?? "Competencia" }))
    : null;
}
