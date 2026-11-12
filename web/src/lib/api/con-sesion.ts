import "server-only";
import { redirect } from "next/navigation";
import { RUTA_SESION_EXPIRADA } from "@/lib/sesion/cookie";
import { leerToken } from "@/lib/sesion/usuario";

export type Resultado<T> = {
  datos: T | null;
  estado: number;
  detalle: string | null;
};

type RespuestaDeApi<T> = {
  data?: T;
  error?: { detail?: string };
  response: Response;
};

const ESPERA_MAXIMA_MS = 10000;
const NO_AUTENTICADO = 401;

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
    return { datos: data ?? null, estado: response.status, detalle: error?.detail ?? null };
  } catch {
    return { datos: null, estado: 0, detalle: null };
  }
}

export function exigirAutenticacion(...resultados: { estado: number }[]): void {
  if (resultados.some((resultado) => resultado.estado === NO_AUTENTICADO)) {
    redirect(RUTA_SESION_EXPIRADA);
  }
}
