import type { NextRequest } from "next/server";

export function esMismoOrigen(request: NextRequest): boolean {
  const origen = request.headers.get("origin");
  if (!origen) {
    return true;
  }
  const anfitrion = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origen).host === anfitrion;
  } catch {
    return false;
  }
}

export function cabecerasDeCliente(request: NextRequest): Record<string, string> {
  const ip = request.headers.get("x-forwarded-for");
  return ip ? { "X-Forwarded-For": ip } : {};
}
