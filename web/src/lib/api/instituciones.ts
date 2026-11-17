import "server-only";
import { cache } from "react";
import {
  ESTADOS_DE_ADHESION,
  INSTITUCIONES_POR_PAGINA,
  type EstadoAdhesion,
  type FiltrosInstituciones,
} from "@/lib/portal/filtros-instituciones";
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

export type Institucion = Esquemas["InstitucionResponse"];
export type UsuarioDetalle = Esquemas["UsuarioDetalleResponse"];

const ROL_RESPONSABLE = "RESP_INSTITUCIONAL";

export async function listarInstituciones(
  filtros: FiltrosInstituciones,
): Promise<ResultadoDeLista<Institucion>> {
  const token = await tokenDeSesion();

  return comoLista<Institucion>(
    await intentar(
      api.GET("/api/instituciones", {
        ...conSesion(token),
        params: {
          query: {
            q: filtros.q || undefined,
            estado: filtros.estado ?? undefined,
            pagina: filtros.pagina - 1,
            tamano: INSTITUCIONES_POR_PAGINA,
          },
        },
      }),
    ),
  );
}

export async function contarInstitucionesPorEstado(
  filtros: FiltrosInstituciones,
): Promise<ConteosDe<EstadoAdhesion>> {
  const token = await tokenDeSesion();

  return contarPorEstado(ESTADOS_DE_ADHESION, (estado) =>
    intentar(
      api.GET("/api/instituciones", {
        ...conSesion(token),
        params: { query: { q: filtros.q || undefined, estado, pagina: 0, tamano: 1 } },
      }),
    ),
  );
}

export const obtenerInstitucion = cache(
  async (id: number): Promise<ResultadoDeDetalle<Institucion>> => {
    const token = await tokenDeSesion();

    return comoDetalle(
      await intentar(
        api.GET("/api/instituciones/{id}", { ...conSesion(token), params: { path: { id } } }),
      ),
    );
  },
);

export async function listarResponsablesDeInstitucion(
  institucionId: number,
): Promise<UsuarioDetalle[] | null> {
  const token = await tokenDeSesion();

  return reunirPaginas((pagina) =>
    intentar(
      api.GET("/api/usuarios", {
        ...conSesion(token),
        params: {
          query: {
            rol: ROL_RESPONSABLE,
            institucionId,
            pagina,
            tamano: TAMANO_MAXIMO_DE_PAGINA,
          },
        },
      }),
    ),
  );
}
