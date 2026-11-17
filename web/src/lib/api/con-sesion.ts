import "server-only";
import { redirect } from "next/navigation";
import { RUTA_SESION_EXPIRADA } from "@/lib/sesion/cookie";
import { leerToken } from "@/lib/sesion/usuario";

export type ErroresDeApi = Record<string, string>;

export type Resultado<T> = {
  datos: T | null;
  estado: number;
  detalle: string | null;
  errores: ErroresDeApi | null;
};

type RespuestaDeApi<T> = {
  data?: T;
  error?: { detail?: string; errores?: ErroresDeApi };
  response: Response;
};

type Pagina<T> = {
  contenido?: T[];
  totalPaginas?: number;
};

const ESPERA_MAXIMA_MS = 10000;
const NO_AUTENTICADO = 401;
const PAGINAS_MAXIMAS = 5;

export const TAMANO_MAXIMO_DE_PAGINA = 100;

export async function tokenDeSesion(): Promise<string> {
  const token = await leerToken();
  if (!token) {
    redirect(RUTA_SESION_EXPIRADA);
  }
  return token;
}

export function conSesion(token: string) {
  return {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store" as const,
    signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
  };
}

export async function intentar<T>(peticion: Promise<RespuestaDeApi<T>>): Promise<Resultado<T>> {
  try {
    const { data, error, response } = await peticion;
    return {
      datos: data ?? null,
      estado: response.status,
      detalle: error?.detail ?? null,
      errores: error?.errores ?? null,
    };
  } catch {
    return { datos: null, estado: 0, detalle: null, errores: null };
  }
}

export function exigirAutenticacion(...resultados: { estado: number }[]): void {
  if (resultados.some((resultado) => resultado.estado === NO_AUTENTICADO)) {
    redirect(RUTA_SESION_EXPIRADA);
  }
}

export async function reunirPaginas<T>(
  pedirPagina: (pagina: number) => Promise<Resultado<Pagina<T>>>,
): Promise<T[] | null> {
  const primera = await pedirPagina(0);
  exigirAutenticacion(primera);
  if (!primera.datos) {
    return null;
  }

  const reunidos = [...(primera.datos.contenido ?? [])];
  const total = Math.min(primera.datos.totalPaginas ?? 1, PAGINAS_MAXIMAS);

  for (let pagina = 1; pagina < total; pagina += 1) {
    const siguiente = await pedirPagina(pagina);
    exigirAutenticacion(siguiente);
    if (!siguiente.datos) {
      break;
    }
    reunidos.push(...(siguiente.datos.contenido ?? []));
  }

  return reunidos;
}
