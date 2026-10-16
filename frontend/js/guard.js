import { obtenerSesion } from './auth.js';

export function exigirSesion({ permitirPasswordTemporal = false } = {}) {
  const sesion = obtenerSesion();
  if (!sesion) {
    window.location.replace('login.html?motivo=requerida');
    return null;
  }
  if (sesion.usuario.debeCambiarPassword && !permitirPasswordTemporal) {
    window.location.replace('cambiar-password.html');
    return null;
  }
  return sesion;
}

export function exigirInvitado() {
  const sesion = obtenerSesion();
  if (sesion) {
    window.location.replace(sesion.usuario.debeCambiarPassword ? 'cambiar-password.html' : 'dashboard.html');
    return false;
  }
  return true;
}

export function exigirRol(sesion, rolesPermitidos) {
  if (!rolesPermitidos.includes(sesion.usuario.rol)) {
    window.location.replace('dashboard.html');
    return false;
  }
  return true;
}