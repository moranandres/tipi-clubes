import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api/cliente";
import { COOKIE_SESION, opcionesCookieSesion } from "@/lib/sesion/cookie";
import { cabecerasDeCliente, esMismoOrigen } from "@/lib/sesion/peticion";

const ESPERA_MAXIMA_MS = 8000;
const LONGITUD_MAXIMA = 200;

const MENSAJE_CREDENCIALES = "Usuario o contraseña incorrectos, o cuenta temporalmente no disponible.";
const MENSAJE_SIN_SERVICIO =
  "El servidor de TIPI 3.0 no responde. Vuelve a intentarlo en unos minutos.";

function respuestaError(estado: number, mensaje: string) {
  return NextResponse.json({ mensaje }, { status: estado });
}

function campoDeTexto(cuerpo: unknown, nombre: string): string {
  if (typeof cuerpo !== "object" || cuerpo === null) {
    return "";
  }
  const valor = (cuerpo as Record<string, unknown>)[nombre];
  return typeof valor === "string" ? valor : "";
}

export async function POST(request: NextRequest) {
  if (!esMismoOrigen(request)) {
    return respuestaError(403, "Origen no permitido.");
  }

  const cuerpo: unknown = await request.json().catch(() => null);
  const identificador = campoDeTexto(cuerpo, "identificador").trim();
  const password = campoDeTexto(cuerpo, "password");

  if (!identificador || !password) {
    return respuestaError(400, "Escribe tu usuario y tu contraseña.");
  }
  if (identificador.length > LONGITUD_MAXIMA || password.length > LONGITUD_MAXIMA) {
    return respuestaError(400, "El usuario o la contraseña son demasiado largos.");
  }

  try {
    const { data, error, response } = await api.POST("/api/auth/login", {
      body: { identificador, password },
      headers: cabecerasDeCliente(request),
      cache: "no-store",
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
    });

    if (!data?.accessToken) {
      if (response.status === 401) {
        return respuestaError(401, error?.detail ?? MENSAJE_CREDENCIALES);
      }
      if (response.status === 400) {
        return respuestaError(400, error?.detail ?? "Revisa los datos e inténtalo de nuevo.");
      }
      return respuestaError(502, MENSAJE_SIN_SERVICIO);
    }

    const respuesta = NextResponse.json({ usuario: data.usuario ?? null });
    respuesta.cookies.set(
      COOKIE_SESION,
      data.accessToken,
      opcionesCookieSesion(data.expiresInSeconds),
    );
    return respuesta;
  } catch {
    return respuestaError(503, MENSAJE_SIN_SERVICIO);
  }
}
