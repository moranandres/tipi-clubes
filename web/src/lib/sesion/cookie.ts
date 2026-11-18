export const COOKIE_SESION = "tipi_sesion";

export const RUTA_LOGIN = "/login";
export const RUTA_PORTAL = "/portal";
export const RUTA_CAMBIO_DE_CLAVE = "/cambiar-clave";
export const RUTA_SESION_EXPIRADA = "/login?sesion=expirada";

const DURACION_PREDETERMINADA_S = 30 * 60;

function cookieSegura(): boolean {
  const indicada = process.env.SESION_COOKIE_SEGURA?.trim().toLowerCase();
  if (indicada === "true") {
    return true;
  }
  if (indicada === "false") {
    return false;
  }
  return process.env.NODE_ENV === "production";
}

export function opcionesCookieSesion(duracionSegundos?: number) {
  const duracion =
    duracionSegundos && duracionSegundos > 0
      ? Math.floor(duracionSegundos)
      : DURACION_PREDETERMINADA_S;

  return {
    httpOnly: true,
    secure: cookieSegura(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: duracion,
  };
}

export function opcionesCookieVencida() {
  return { ...opcionesCookieSesion(), maxAge: 0 };
}
