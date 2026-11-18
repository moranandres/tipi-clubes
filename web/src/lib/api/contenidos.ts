import "server-only";
import { cache } from "react";
import type { TipoContenido } from "@/lib/portal/filtros-actividades";
import type { FiltrosContenidos } from "@/lib/portal/filtros-contenidos";
import type { Contenido } from "./actividades";
import { api } from "./cliente";
import { conSesion, exigirAutenticacion, intentar, tokenDeSesion } from "./con-sesion";
import { comoDetalle, type ResultadoDeDetalle } from "./detalle";

export type ResultadoDeContenidos =
  | { estado: "ok"; contenidos: Contenido[] }
  | { estado: "denegado"; mensaje: string }
  | { estado: "sin-servicio" };

const ACCESO_DENEGADO = 403;
const MENSAJE_DENEGADO = "Tu cuenta no tiene permiso para ver esta lista.";

const consultarContenidos = cache(
  async (q: string, tipo: TipoContenido | null): Promise<ResultadoDeContenidos> => {
    const token = await tokenDeSesion();

    const respuesta = await intentar(
      api.GET("/api/contenidos", {
        ...conSesion(token),
        params: { query: { q: q || undefined, tipo: tipo ?? undefined } },
      }),
    );

    exigirAutenticacion(respuesta);
    if (respuesta.estado === ACCESO_DENEGADO) {
      return { estado: "denegado", mensaje: respuesta.detalle ?? MENSAJE_DENEGADO };
    }
    if (!respuesta.datos) {
      return { estado: "sin-servicio" };
    }
    return { estado: "ok", contenidos: respuesta.datos };
  },
);

export function listarContenidos(filtros: FiltrosContenidos): Promise<ResultadoDeContenidos> {
  return consultarContenidos(filtros.q, filtros.tipo);
}

export const obtenerContenido = cache(
  async (id: number): Promise<ResultadoDeDetalle<Contenido>> => {
    const token = await tokenDeSesion();

    return comoDetalle(
      await intentar(
        api.GET("/api/contenidos/{id}", { ...conSesion(token), params: { path: { id } } }),
      ),
    );
  },
);
