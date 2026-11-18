import "server-only";
import { cache } from "react";
import {
  ESTADOS_DE_PROYECTO,
  PROYECTOS_POR_PAGINA,
  type EstadoProyecto,
  type FiltrosProyectos,
} from "@/lib/portal/filtros-proyectos";
import { api, type Esquemas } from "./cliente";
import { TAMANO_MAXIMO_DE_PAGINA, conSesion, intentar, reunirPaginas, tokenDeSesion } from "./con-sesion";
import { comoDetalle, type ResultadoDeDetalle } from "./detalle";
import type { Evidencia } from "./evidencias";
import { listarDocentesActivos, listarPeriodos, type Club } from "./clubes";
import { listarIntegrantesActivos } from "./competencias";
import { comoLista, contarPorEstado, type ConteosDe, type ResultadoDeLista } from "./lista";
import { identidadDe } from "@/lib/portal/identidad";
import { opcionesDeDocentes, type OpcionDeFormulario } from "@/lib/portal/opciones";
import type { PeriodoDelClub } from "@/lib/portal/reglas-proyectos";

export type IntegranteDeProyecto = Esquemas["IntegranteProyectoResponse"];
export type EvidenciaVinculada = Esquemas["EvidenciaVinculadaResponse"];

export type Proyecto = Omit<Esquemas["ProyectoResponse"], "integrantes"> & {
  integrantes?: IntegranteDeProyecto[];
};

const EVIDENCIA_ACTIVA = "ACTIVA";
const PROYECTO_EN_DESARROLLO: EstadoProyecto = "EN_DESARROLLO";

function consultaDe(filtros: FiltrosProyectos, estado: EstadoProyecto | null) {
  return {
    estado: estado ?? undefined,
    tipo: filtros.tipo ?? undefined,
    institucionId: filtros.institucion ?? undefined,
    clubId: filtros.club ?? undefined,
    periodoId: filtros.periodo ?? undefined,
  };
}

export async function listarProyectos(filtros: FiltrosProyectos): Promise<ResultadoDeLista<Proyecto>> {
  const token = await tokenDeSesion();

  return comoLista<Proyecto>(
    await intentar(
      api.GET("/api/proyectos", {
        ...conSesion(token),
        params: {
          query: {
            ...consultaDe(filtros, filtros.estado),
            pagina: filtros.pagina - 1,
            tamano: PROYECTOS_POR_PAGINA,
          },
        },
      }),
    ),
  );
}

export async function contarProyectosPorEstado(filtros: FiltrosProyectos): Promise<ConteosDe<EstadoProyecto>> {
  const token = await tokenDeSesion();

  return contarPorEstado(ESTADOS_DE_PROYECTO, (estado) =>
    intentar(
      api.GET("/api/proyectos", {
        ...conSesion(token),
        params: { query: { ...consultaDe(filtros, estado), pagina: 0, tamano: 1 } },
      }),
    ),
  );
}

export const obtenerProyecto = cache(async (id: number): Promise<ResultadoDeDetalle<Proyecto>> => {
  const token = await tokenDeSesion();

  return comoDetalle(
    await intentar(api.GET("/api/proyectos/{id}", { ...conSesion(token), params: { path: { id } } })),
  ) as ResultadoDeDetalle<Proyecto>;
});

export async function listarProyectosEnDesarrollo(): Promise<Proyecto[] | null> {
  const token = await tokenDeSesion();

  const proyectos = await reunirPaginas((pagina) =>
    intentar(
      api.GET("/api/proyectos", {
        ...conSesion(token),
        params: { query: { estado: PROYECTO_EN_DESARROLLO, pagina, tamano: TAMANO_MAXIMO_DE_PAGINA } },
      }),
    ),
  );

  return proyectos as Proyecto[] | null;
}

export async function listarEvidenciasActivasDeClub(clubId: number): Promise<Evidencia[] | null> {
  const token = await tokenDeSesion();

  const evidencias = await reunirPaginas((pagina) =>
    intentar(
      api.GET("/api/evidencias", {
        ...conSesion(token),
        params: { query: { clubId, estado: EVIDENCIA_ACTIVA, pagina, tamano: TAMANO_MAXIMO_DE_PAGINA } },
      }),
    ),
  );

  return evidencias as Evidencia[] | null;
}

export type ClubParaProyecto = OpcionDeFormulario & {
  docenteId: string;
  periodo: PeriodoDelClub | null;
  docentes: OpcionDeFormulario[];
  integrantes: { id: number; principal: string; codigo: string | null; autorizado: boolean }[];
};

export async function armarClubesParaProyecto(
  clubes: Club[],
  conInstitucion: boolean,
): Promise<ClubParaProyecto[] | null> {
  const instituciones = [
    ...new Set(clubes.map((club) => club.institucionId).filter((id): id is number => typeof id === "number")),
  ];
  const [periodos, inscripciones, docentes] = await Promise.all([
    listarPeriodos(),
    listarIntegrantesActivos(),
    Promise.all(instituciones.map((id) => listarDocentesActivos(id))),
  ]);
  if (!periodos || !inscripciones || docentes.some((lista) => lista === null)) {
    return null;
  }

  const docentesPorInstitucion = new Map(
    instituciones.map((id, indice) => [id, opcionesDeDocentes(docentes[indice] ?? [])]),
  );

  return clubes
    .filter((club) => typeof club.id === "number")
    .map((club) => {
      const periodo = periodos.find((candidato) => candidato.id === club.periodoId);
      return {
        valor: String(club.id),
        texto: [club.nombre, conInstitucion ? club.institucionNombre : null].filter(Boolean).join(" · "),
        docenteId: club.docenteId ? String(club.docenteId) : "",
        periodo:
          periodo?.fechaInicio && periodo.fechaFin ? { inicio: periodo.fechaInicio, fin: periodo.fechaFin } : null,
        docentes: docentesPorInstitucion.get(club.institucionId ?? 0) ?? [],
        integrantes: inscripciones
          .filter((inscripcion) => inscripcion.clubId === club.id && typeof inscripcion.estudianteId === "number")
          .map((inscripcion) => {
            const identidad = identidadDe(
              {
                nombres: inscripcion.estudianteNombres,
                apellidos: inscripcion.estudianteApellidos,
                codigo: inscripcion.estudianteCodigo,
              },
              false,
            );
            return {
              id: inscripcion.estudianteId as number,
              principal: identidad.principal,
              codigo: identidad.codigo,
              autorizado: true,
            };
          }),
      };
    });
}
