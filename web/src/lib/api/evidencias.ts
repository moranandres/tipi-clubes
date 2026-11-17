import "server-only";
import { cache } from "react";
import {
  EVIDENCIAS_POR_PAGINA,
  TIPOS_DE_EVIDENCIA,
  type FiltrosEvidencias,
  type TipoEvidencia,
} from "@/lib/portal/filtros-evidencias";
import { api, type Esquemas } from "./cliente";
import {
  TAMANO_MAXIMO_DE_PAGINA,
  conSesion,
  intentar,
  reunirPaginas,
  tokenDeSesion,
} from "./con-sesion";
import { comoDetalle, type ResultadoDeDetalle } from "./detalle";
import { comoLista, contarPorEstado, type ConteosDe, type ResultadoDeLista } from "./lista";

export type EstudianteDeEvidencia = Esquemas["EstudianteEvidenciaResponse"];

export type Evidencia = Omit<Esquemas["EvidenciaResponse"], "estudiantes"> & {
  estudiantes?: EstudianteDeEvidencia[];
};

export type EvidenciasDeSesion = Omit<Esquemas["EvidenciasActividadResponse"], "evidencias"> & {
  evidencias?: Evidencia[];
};

const TIPO_USO_DE_IMAGEN = "USO_IMAGEN";
const AUTORIZACION_OTORGADA = "OTORGADA";

function consultaDe(filtros: FiltrosEvidencias, tipo: TipoEvidencia | null) {
  return {
    tipo: tipo ?? undefined,
    estado: filtros.estado ?? undefined,
    clubId: filtros.club ?? undefined,
    institucionId: filtros.institucion ?? undefined,
    desde: filtros.desde ?? undefined,
    hasta: filtros.hasta ?? undefined,
  };
}

export async function listarEvidencias(
  filtros: FiltrosEvidencias,
): Promise<ResultadoDeLista<Evidencia>> {
  const token = await tokenDeSesion();

  return comoLista<Evidencia>(
    await intentar(
      api.GET("/api/evidencias", {
        ...conSesion(token),
        params: {
          query: {
            ...consultaDe(filtros, filtros.tipo),
            pagina: filtros.pagina - 1,
            tamano: EVIDENCIAS_POR_PAGINA,
          },
        },
      }),
    ),
  );
}

export async function contarEvidenciasPorTipo(
  filtros: FiltrosEvidencias,
): Promise<ConteosDe<TipoEvidencia>> {
  const token = await tokenDeSesion();

  return contarPorEstado(TIPOS_DE_EVIDENCIA, (tipo) =>
    intentar(
      api.GET("/api/evidencias", {
        ...conSesion(token),
        params: { query: { ...consultaDe(filtros, tipo), pagina: 0, tamano: 1 } },
      }),
    ),
  );
}

export const obtenerEvidenciasDeSesion = cache(
  async (actividadId: number): Promise<ResultadoDeDetalle<EvidenciasDeSesion>> => {
    const token = await tokenDeSesion();

    return comoDetalle(
      await intentar(
        api.GET("/api/actividades/{id}/evidencias", {
          ...conSesion(token),
          params: { path: { id: actividadId } },
        }),
      ),
    ) as ResultadoDeDetalle<EvidenciasDeSesion>;
  },
);

export async function listarAutorizadosDeImagen(institucionId: number): Promise<Set<number> | null> {
  const token = await tokenDeSesion();

  const autorizaciones = await reunirPaginas((pagina) =>
    intentar(
      api.GET("/api/autorizaciones", {
        ...conSesion(token),
        params: {
          query: {
            tipo: TIPO_USO_DE_IMAGEN,
            estado: AUTORIZACION_OTORGADA,
            institucionId,
            pagina,
            tamano: TAMANO_MAXIMO_DE_PAGINA,
          },
        },
      }),
    ),
  );

  if (!autorizaciones) {
    return null;
  }
  return new Set(
    autorizaciones
      .map((autorizacion) => autorizacion.estudianteId)
      .filter((id): id is number => typeof id === "number"),
  );
}
