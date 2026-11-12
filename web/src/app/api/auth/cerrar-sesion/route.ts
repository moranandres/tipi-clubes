import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api/cliente";
import { COOKIE_SESION, opcionesCookieVencida } from "@/lib/sesion/cookie";
import { cabecerasDeCliente, esMismoOrigen } from "@/lib/sesion/peticion";

const ESPERA_MAXIMA_MS = 5000;

export async function POST(request: NextRequest) {
  if (!esMismoOrigen(request)) {
    return NextResponse.json({ mensaje: "Origen no permitido." }, { status: 403 });
  }

  const token = request.cookies.get(COOKIE_SESION)?.value;

  if (token) {
    await api
      .POST("/api/auth/logout", {
        headers: { ...cabecerasDeCliente(request), Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
      })
      .catch(() => null);
  }

  const respuesta = new NextResponse(null, { status: 204 });
  respuesta.cookies.set(COOKIE_SESION, "", opcionesCookieVencida());
  return respuesta;
}
