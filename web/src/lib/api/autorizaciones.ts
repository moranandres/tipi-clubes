import "server-only";
import { cache } from "react";
import {
  AUTORIZACIONES_POR_PAGINA,
  type FiltrosAutorizaciones,
} from "@/lib/portal/filtros-autorizaciones";
import {
  ESTADOS_DE_AUTORIZACION,
  type EstadoAutorizacion,
} from "@/lib/portal/filtros-estudiantes";
import { api, type Esquemas } from "./cliente";
import { conSesion, intentar, tokenDeSesion } from "./con-sesion";
import { comoDetalle, type ResultadoDeDetalle } from "./detalle";
import { comoLista, contarPorEstado, type ConteosDe, type ResultadoDeLista } from "./lista";

export type Autorizacion = Esquemas["AutorizacionResponse"];
export type AutorizacionDeLista = Esquemas["AutorizacionListadoResponse"];
export type Representante = Esquemas["RepresentanteResponse"];

function consultaDe(filtros: FiltrosAutorizaciones, estado: EstadoAutorizacion | null) {
  return {
    estado: estado ?? undefined,
    tipo: filtros.tipo ?? undefined,
    institucionId: filtros.institucion ?? undefined,
    estudianteId: filtros.estudiante ?? undefined,
  };
}

export async function listarAutorizaciones(
  filtros: FiltrosAutorizaciones,
): Promise<ResultadoDeLista<AutorizacionDeLista>> {
  const token = await tokenDeSesion();

  return comoLista<AutorizacionDeLista>(
    await intentar(
      api.GET("/api/autorizaciones", {
        ...conSesion(token),
        params: {
          query: {
            ...consultaDe(filtros, filtros.estado),
            pagina: filtros.pagina - 1,
            tamano: AUTORIZACIONES_POR_PAGINA,
          },
        },
      }),
    ),
  );
}

export async function contarAutorizacionesPorEstado(
  filtros: FiltrosAutorizaciones,
): Promise<ConteosDe<EstadoAutorizacion>> {
  const token = await tokenDeSesion();

  return contarPorEstado(ESTADOS_DE_AUTORIZACION, (estado) =>
    intentar(
      api.GET("/api/autorizaciones", {
        ...conSesion(token),
        params: { query: { ...consultaDe(filtros, estado), pagina: 0, tamano: 1 } },
      }),
    ),
  );
}

export const obtenerAutorizacionesDeEstudiante = cache(
  async (estudianteId: number): Promise<ResultadoDeDetalle<Autorizacion[]>> => {
    const token = await tokenDeSesion();

    return comoDetalle(
      await intentar(
        api.GET("/api/estudiantes/{estudianteId}/autorizaciones", {
          ...conSesion(token),
          params: { path: { estudianteId } },
        }),
      ),
    ) as ResultadoDeDetalle<Autorizacion[]>;
  },
);
