import "server-only";
import {
  ESTADOS_DE_RETIRO,
  RETIROS_POR_PAGINA,
  type EstadoRetiro,
  type FiltrosRetiros,
} from "@/lib/portal/filtros-retiros";
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
import type { InscripcionDeClub } from "./estudiantes";
import { comoLista, contarPorEstado, type ConteosDe, type ResultadoDeLista } from "./lista";

export type Retiro = Esquemas["RetiroResponse"];
export type EfectosDeRetiro = Esquemas["EfectosRetiroResponse"];
export type CupoTrasRetiro = Esquemas["CupoEfecto"];

type OrigenDeInscripciones = { clubId: number } | { estudianteId: number };

const INSCRIPCION_ACTIVA = "ACTIVA";

function consultaDe(filtros: FiltrosRetiros, estado: EstadoRetiro | null) {
  return {
    q: filtros.q || undefined,
    estado: estado ?? undefined,
    institucionId: filtros.institucion ?? undefined,
  };
}

export async function listarRetiros(filtros: FiltrosRetiros): Promise<ResultadoDeLista<Retiro>> {
  const token = await tokenDeSesion();

  return comoLista<Retiro>(
    await intentar(
      api.GET("/api/solicitudes-retiro", {
        ...conSesion(token),
        params: {
          query: {
            ...consultaDe(filtros, filtros.estado),
            pagina: filtros.pagina - 1,
            tamano: RETIROS_POR_PAGINA,
          },
        },
      }),
    ),
  );
}

export async function contarRetirosPorEstado(
  filtros: FiltrosRetiros,
): Promise<ConteosDe<EstadoRetiro>> {
  const token = await tokenDeSesion();

  return contarPorEstado(ESTADOS_DE_RETIRO, (estado) =>
    intentar(
      api.GET("/api/solicitudes-retiro", {
        ...conSesion(token),
        params: { query: { ...consultaDe(filtros, estado), pagina: 0, tamano: 1 } },
      }),
    ),
  );
}

export async function obtenerRetiro(id: number): Promise<ResultadoDeDetalle<Retiro>> {
  const token = await tokenDeSesion();

  return comoDetalle(
    await intentar(
      api.GET("/api/solicitudes-retiro/{id}", { ...conSesion(token), params: { path: { id } } }),
    ),
  ) as ResultadoDeDetalle<Retiro>;
}

export async function obtenerEfectosDeRetiro(id: number): Promise<EfectosDeRetiro | null> {
  const token = await tokenDeSesion();

  const respuesta = await intentar(
    api.GET("/api/solicitudes-retiro/{id}/efectos", {
      ...conSesion(token),
      params: { path: { id } },
    }),
  );

  exigirAutenticacion(respuesta);
  return respuesta.datos;
}

export async function listarInscripcionesActivas(
  origen: OrigenDeInscripciones,
): Promise<InscripcionDeClub[] | null> {
  const token = await tokenDeSesion();

  const inscripciones = await reunirPaginas((pagina) =>
    intentar(
      api.GET("/api/inscripciones", {
        ...conSesion(token),
        params: {
          query: {
            ...origen,
            estado: INSCRIPCION_ACTIVA,
            pagina,
            tamano: TAMANO_MAXIMO_DE_PAGINA,
          },
        },
      }),
    ),
  );

  return inscripciones as InscripcionDeClub[] | null;
}
