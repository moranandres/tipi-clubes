import { apiFetch, ApiError } from './api.js';
import { actualizarUsuario, cerrarSesion } from './auth.js';
import { exigirSesion } from './guard.js';
import { mostrarAlerta, limpiarAlerta, establecerCargando, mensajesDeError } from './ui.js';

const REGLA_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,128}$/;

const sesion = exigirSesion({ permitirPasswordTemporal: true });

if (sesion) {
  iniciar(sesion);
}

function iniciar(sesionActual) {
  const formulario = document.getElementById('formulario-password');
  const alertas = document.getElementById('alertas');
  const boton = document.getElementById('boton-guardar');
  const enlaceCancelar = document.getElementById('enlace-cancelar');
  const botonSalir = document.getElementById('boton-salir');

  const obligatorio = sesionActual.usuario.debeCambiarPassword;
  enlaceCancelar.hidden = obligatorio;
  botonSalir.hidden = !obligatorio;
  botonSalir.addEventListener('click', cerrarSesion);

  if (obligatorio) {
    mostrarAlerta(alertas, 'warning', 'Debe cambiar su contraseña temporal para continuar.');
  }

  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();
    limpiarAlerta(alertas);

    const passwordActual = document.getElementById('password-actual').value;
    const passwordNueva = document.getElementById('password-nueva').value;
    const confirmacion = document.getElementById('password-confirmacion').value;

    const problemas = validar(passwordActual, passwordNueva, confirmacion);
    if (problemas.length > 0) {
      mostrarAlerta(alertas, 'danger', 'Revise los datos ingresados:', problemas);
      return;
    }

    establecerCargando(boton, true, 'Guardando...');
    try {
      await apiFetch('/api/auth/cambiar-password', {
        metodo: 'POST',
        cuerpo: { passwordActual, passwordNueva }
      });
      const usuario = await apiFetch('/api/auth/me');
      actualizarUsuario(usuario);
      window.location.replace('dashboard.html');
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
      mostrarAlerta(alertas, 'danger', mensaje, mensajesDeError(error));
      establecerCargando(boton, false);
    }
  });
}

function validar(passwordActual, passwordNueva, confirmacion) {
  const problemas = [];
  if (!passwordActual) {
    problemas.push('Ingrese su contraseña actual.');
  }
  if (!REGLA_PASSWORD.test(passwordNueva)) {
    problemas.push('La contraseña nueva debe tener entre 10 y 128 caracteres, con mayúscula, minúscula y número.');
  }
  if (passwordNueva !== confirmacion) {
    problemas.push('La confirmación no coincide con la contraseña nueva.');
  }
  if (passwordActual && passwordActual === passwordNueva) {
    problemas.push('La contraseña nueva debe ser distinta de la actual.');
  }
  return problemas;
}