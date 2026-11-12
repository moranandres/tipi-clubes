export const COOKIE_SESION = "tipi_sesion";

export const RUTA_LOGIN = "/login";
export const RUTA_PORTAL = "/portal";
export const RUTA_SESION_EXPIRADA = "/login?sesion=expirada";

const DURACION_PREDETERMINADA_S = 30 * 60;

export function opcionesCookieSesion(duracionSegundos?: number) {
  const duracion =
    duracionSegundos && duracionSegundos > 0
      ? Math.floor(duracionSegundos)
      : DURACION_PREDETERMINADA_S;

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: duracion,
  };
}

export function opcionesCookieVencida() {
  return { ...opcionesCookieSesion(), maxAge: 0 };
}
