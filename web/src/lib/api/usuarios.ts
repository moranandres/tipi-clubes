import "server-only";
import { cache } from "react";
import {
  ESTADOS_DE_USUARIO,
  USUARIOS_POR_PAGINA,
  activoSegun,
  type EstadoUsuario,
  type FiltrosUsuarios,
} from "@/lib/portal/filtros-usuarios";
import { api, type Esquemas } from "./cliente";
import { conSesion, intentar, tokenDeSesion } from "./con-sesion";
import { comoDetalle, type ResultadoDeDetalle } from "./detalle";
import { comoLista, contarPorEstado, type ConteosDe, type ResultadoDeLista } from "./lista";

export type Usuario = Esquemas["UsuarioDetalleResponse"];

function consultaDe(filtros: FiltrosUsuarios, estado: EstadoUsuario | null) {
  return {
    q: filtros.q || undefined,
    rol: filtros.rol ?? undefined,
    institucionId: filtros.institucion ?? undefined,
    activo: activoSegun(estado),
  };
}

export async function listarUsuarios(
  filtros: FiltrosUsuarios,
): Promise<ResultadoDeLista<Usuario>> {
  const token = await tokenDeSesion();

  return comoLista<Usuario>(
    await intentar(
      api.GET("/api/usuarios", {
        ...conSesion(token),
        params: {
          query: {
            ...consultaDe(filtros, filtros.estado),
            pagina: filtros.pagina - 1,
            tamano: USUARIOS_POR_PAGINA,
          },
        },
      }),
    ),
  );
}

export async function contarUsuariosPorEstado(
  filtros: FiltrosUsuarios,
): Promise<ConteosDe<EstadoUsuario>> {
  const token = await tokenDeSesion();

  return contarPorEstado(ESTADOS_DE_USUARIO, (estado) =>
    intentar(
      api.GET("/api/usuarios", {
        ...conSesion(token),
        params: { query: { ...consultaDe(filtros, estado), pagina: 0, tamano: 1 } },
      }),
    ),
  );
}

export const obtenerUsuario = cache(async (id: number): Promise<ResultadoDeDetalle<Usuario>> => {
  const token = await tokenDeSesion();

  return comoDetalle(
    await intentar(
      api.GET("/api/usuarios/{id}", { ...conSesion(token), params: { path: { id } } }),
    ),
  );
});
