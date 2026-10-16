import { obtenerSesion } from './auth.js';

const sesion = obtenerSesion();

if (!sesion) {
  window.location.replace('login.html');
} else if (sesion.usuario.debeCambiarPassword) {
  window.location.replace('cambiar-password.html');
} else {
  window.location.replace('dashboard.html');
}