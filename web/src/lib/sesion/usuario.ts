import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { api, type Esquemas } from "@/lib/api/cliente";
import { COOKIE_SESION, RUTA_SESION_EXPIRADA } from "./cookie";

export type UsuarioSesion = Esquemas["UsuarioResumen"];

export type ResultadoSesion =
  | { estado: "activa"; usuario: UsuarioSesion }
  | { estado: "ausente" }
  | { estado: "sin-servicio" };

const ESPERA_MAXIMA_MS = 6000;

export const leerSesion = cache(async (): Promise<ResultadoSesion> => {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  if (!token) {
    return { estado: "ausente" };
  }

  try {
    const { data, response } = await api.GET("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
    });
    if (data) {
      return { estado: "activa", usuario: data };
    }
    if (response.status === 401 || response.status === 403) {
      return { estado: "ausente" };
    }
    return { estado: "sin-servicio" };
  } catch {
    return { estado: "sin-servicio" };
  }
});

export async function exigirSesion(): Promise<UsuarioSesion | null> {
  const sesion = await leerSesion();
  if (sesion.estado === "ausente") {
    redirect(RUTA_SESION_EXPIRADA);
  }
  return sesion.estado === "activa" ? sesion.usuario : null;
}

const NOMBRES_ROL: Record<string, string> = {
  ADMIN: "Administrador",
  COORDINADOR: "Coordinador TIPI 3.0",
  RESP_INSTITUCIONAL: "Responsable institucional",
  DOCENTE: "Docente coordinador",
  CONSULTA: "Consulta",
};

export function nombreDeRol(codigo?: string): string {
  return (codigo && NOMBRES_ROL[codigo]) || "Sin rol";
}
