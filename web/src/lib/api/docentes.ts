import "server-only";
import { cache } from "react";
import {
  DOCENTES_POR_PAGINA,
  ESTADOS_DE_DOCENTE,
  activoSegun,
  type EstadoDocente,
  type FiltrosDocentes,
} from "@/lib/portal/filtros-docentes";
import { api, type Esquemas } from "./cliente";
import type { Docente } from "./clubes";
import { conSesion, exigirAutenticacion, intentar, tokenDeSesion } from "./con-sesion";
import { comoDetalle, type ResultadoDeDetalle } from "./detalle";
import { comoLista, contarPorEstado, type ConteosDe, type ResultadoDeLista } from "./lista";

export type CuentaDeDocente = Esquemas["CuentaDocenteResponse"];

function consultaDe(filtros: FiltrosDocentes, estado: EstadoDocente | null) {
  return {
    q: filtros.q || undefined,
    activo: activoSegun(estado),
    institucionId: filtros.institucion ?? undefined,
  };
}

export async function listarDocentes(filtros: FiltrosDocentes): Promise<ResultadoDeLista<Docente>> {
  const token = await tokenDeSesion();

  return comoLista<Docente>(
    await intentar(
      api.GET("/api/docentes", {
        ...conSesion(token),
        params: {
          query: {
            ...consultaDe(filtros, filtros.estado),
            pagina: filtros.pagina - 1,
            tamano: DOCENTES_POR_PAGINA,
          },
        },
      }),
    ),
  );
}

export async function contarDocentesPorEstado(
  filtros: FiltrosDocentes,
): Promise<ConteosDe<EstadoDocente>> {
  const token = await tokenDeSesion();

  return contarPorEstado(ESTADOS_DE_DOCENTE, (estado) =>
    intentar(
      api.GET("/api/docentes", {
        ...conSesion(token),
        params: { query: { ...consultaDe(filtros, estado), pagina: 0, tamano: 1 } },
      }),
    ),
  );
}

export const obtenerDocente = cache(async (id: number): Promise<ResultadoDeDetalle<Docente>> => {
  const token = await tokenDeSesion();

  return comoDetalle(
    await intentar(
      api.GET("/api/docentes/{id}", { ...conSesion(token), params: { path: { id } } }),
    ),
  );
});

export async function listarCuentasDisponibles(
  institucionId: number,
  docenteId: number | null,
): Promise<CuentaDeDocente[] | null> {
  const token = await tokenDeSesion();

  const respuesta = await intentar(
    api.GET("/api/docentes/cuentas-disponibles", {
      ...conSesion(token),
      params: { query: { institucionId, docenteId: docenteId ?? undefined } },
    }),
  );

  exigirAutenticacion(respuesta);
  return respuesta.datos;
}
