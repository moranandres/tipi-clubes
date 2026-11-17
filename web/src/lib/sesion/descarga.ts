import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, RUTA_SESION_EXPIRADA } from "./cookie";
import { cabecerasDeCliente } from "./peticion";

export type OpcionesDeDescarga = {
  headers: Record<string, string>;
  parseAs: "stream";
  cache: "no-store";
  signal: AbortSignal;
};

type Reenvio = {
  rutaDeVuelta: string;
  pedir: (opciones: OpcionesDeDescarga) => Promise<{ response: Response }>;
};

const ESPERA_MAXIMA_MS = 20000;
const NO_AUTENTICADO = 401;
const PARAMETRO_DE_DESCARGA = "descargar";
const TIPO_GENERICO = "application/octet-stream";
const DISPOSICION_ADJUNTA = /^\s*attachment/i;

export function redirigir(request: NextRequest, ruta: string): NextResponse {
  return NextResponse.redirect(new URL(ruta, request.url));
}

function disposicionDe(original: string | null, descargar: boolean): string {
  const base = original ?? "attachment";
  return descargar ? base : base.replace(DISPOSICION_ADJUNTA, "inline");
}

export async function reenviarArchivo(
  request: NextRequest,
  { rutaDeVuelta, pedir }: Reenvio,
): Promise<NextResponse> {
  const token = request.cookies.get(COOKIE_SESION)?.value;
  if (!token) {
    return redirigir(request, RUTA_SESION_EXPIRADA);
  }

  let respuesta: Response;
  try {
    const { response } = await pedir({
      headers: { ...cabecerasDeCliente(request), Authorization: `Bearer ${token}` },
      parseAs: "stream",
      cache: "no-store",
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
    });
    respuesta = response;
  } catch {
    return redirigir(request, rutaDeVuelta);
  }

  if (respuesta.status === NO_AUTENTICADO) {
    return redirigir(request, RUTA_SESION_EXPIRADA);
  }
  if (!respuesta.ok || !respuesta.body) {
    return redirigir(request, rutaDeVuelta);
  }

  const descargar = request.nextUrl.searchParams.has(PARAMETRO_DE_DESCARGA);
  const cabeceras = new Headers({
    "Content-Type": respuesta.headers.get("content-type") ?? TIPO_GENERICO,
    "Content-Disposition": disposicionDe(respuesta.headers.get("content-disposition"), descargar),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  const longitud = respuesta.headers.get("content-length");
  if (longitud) {
    cabeceras.set("Content-Length", longitud);
  }

  return new NextResponse(respuesta.body, { status: 200, headers: cabeceras });
}
