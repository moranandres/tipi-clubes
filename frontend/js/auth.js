const CLAVE_SESION = 'tipi.sesion';

export function guardarSesion(respuestaLogin) {
  const sesion = {
    token: respuestaLogin.accessToken,
    expiraEn: Date.now() + respuestaLogin.expiresInSeconds * 1000,
    usuario: respuestaLogin.usuario
  };
  sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  return sesion;
}

export function obtenerSesion() {
  const crudo = sessionStorage.getItem(CLAVE_SESION);
  if (!crudo) {
    return null;
  }
  try {
    const sesion = JSON.parse(crudo);
    if (!sesion.token || Date.now() >= sesion.expiraEn) {
      limpiarSesion();
      return null;
    }
    return sesion;
  } catch (error) {
    limpiarSesion();
    return null;
  }
}

export function limpiarSesion() {
  sessionStorage.removeItem(CLAVE_SESION);
}

export function actualizarUsuario(usuario) {
  const sesion = obtenerSesion();
  if (!sesion) {
    return null;
  }
  sesion.usuario = usuario;
  sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  return sesion;
}

export function cerrarSesion() {
  limpiarSesion();
  window.location.replace('login.html?motivo=salida');
}