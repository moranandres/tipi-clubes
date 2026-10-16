import { apiFetch, ApiError } from './api.js';
import { guardarSesion } from './auth.js';
import { exigirInvitado } from './guard.js';
import { mostrarAlerta, limpiarAlerta, establecerCargando, mensajesDeError } from './ui.js';

if (exigirInvitado()) {
  iniciar();
}

function iniciar() {
  const formulario = document.getElementById('formulario-login');
  const alertas = document.getElementById('alertas');
  const boton = document.getElementById('boton-ingresar');

  const motivo = new URLSearchParams(window.location.search).get('motivo');
  if (motivo === 'expirada') {
    mostrarAlerta(alertas, 'warning', 'Su sesión expiró. Inicie sesión nuevamente.');
  } else if (motivo === 'requerida') {
    mostrarAlerta(alertas, 'info', 'Inicie sesión para continuar.');
  } else if (motivo === 'salida') {
    mostrarAlerta(alertas, 'success', 'Sesión cerrada correctamente.');
  }

  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();
    limpiarAlerta(alertas);

    const identificador = formulario.identificador.value.trim();
    const password = formulario.password.value;
    if (!identificador || !password) {
      mostrarAlerta(alertas, 'danger', 'Ingrese su usuario y su contraseña.');
      return;
    }

    establecerCargando(boton, true, 'Ingresando...');
    try {
      const respuesta = await apiFetch('/api/auth/login', {
        metodo: 'POST',
        cuerpo: { identificador, password },
        autenticado: false
      });
      const sesion = guardarSesion(respuesta);
      window.location.replace(sesion.usuario.debeCambiarPassword ? 'cambiar-password.html' : 'dashboard.html');
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
      mostrarAlerta(alertas, 'danger', mensaje, mensajesDeError(error));
      establecerCargando(boton, false);
      formulario.password.value = '';
      formulario.password.focus();
    }
  });
}