import { apiFetch, ApiError } from './api.js';
import { limpiarSesion } from './auth.js';
import { REGLA_PASSWORD } from './passwords.js';
import { mostrarAlerta, limpiarAlerta, establecerCargando, mensajesDeError } from './ui.js';

const REGLA_TOKEN = /^[A-Za-z0-9_-]{43}$/;
const MENSAJE_INVALIDO = 'El enlace no es válido o ya expiró. Solicite uno nuevo.';

const token = extraerToken();
limpiarSesion();
iniciar();

function extraerToken() {
  const parametros = new URLSearchParams(window.location.hash.slice(1));
  const valor = parametros.get('token');
  window.history.replaceState(null, '', window.location.pathname);
  return valor;
}

function elemento(id) {
  return document.getElementById(id);
}

async function iniciar() {
  const alertas = elemento('alertas');
  const formulario = elemento('formulario-restablecer');

  if (!token || !REGLA_TOKEN.test(token)) {
    mostrarAlerta(alertas, 'danger', MENSAJE_INVALIDO);
    return;
  }

  mostrarAlerta(alertas, 'info', 'Verificando el enlace...');
  try {
    await apiFetch('/api/auth/restablecer/validar', {
      metodo: 'POST',
      cuerpo: { token },
      autenticado: false
    });
  } catch (error) {
    const sinConexion = error instanceof ApiError && error.estado === 0;
    mostrarAlerta(alertas, 'danger', sinConexion ? error.message : MENSAJE_INVALIDO);
    return;
  }

  limpiarAlerta(alertas);
  formulario.hidden = false;
  elemento('password-nueva').focus();
  formulario.addEventListener('submit', guardar);
}

function validar(passwordNueva, confirmacion) {
  const problemas = [];
  if (!REGLA_PASSWORD.test(passwordNueva)) {
    problemas.push('La contraseña nueva debe tener entre 10 y 128 caracteres, con mayúscula, minúscula y número.');
  }
  if (passwordNueva !== confirmacion) {
    problemas.push('La confirmación no coincide con la contraseña nueva.');
  }
  return problemas;
}

async function guardar(evento) {
  evento.preventDefault();
  const alertas = elemento('alertas');
  limpiarAlerta(alertas);

  const passwordNueva = elemento('password-nueva').value;
  const confirmacion = elemento('password-confirmacion').value;
  const problemas = validar(passwordNueva, confirmacion);
  if (problemas.length > 0) {
    mostrarAlerta(alertas, 'danger', 'Revise los datos ingresados:', problemas);
    return;
  }

  const boton = elemento('boton-guardar');
  establecerCargando(boton, true, 'Guardando...');
  try {
    await apiFetch('/api/auth/restablecer', {
      metodo: 'POST',
      cuerpo: { token, passwordNueva },
      autenticado: false
    });
    window.location.replace('login.html?motivo=restablecida');
  } catch (error) {
    const mensaje = error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
    mostrarAlerta(alertas, 'danger', mensaje, mensajesDeError(error));
    establecerCargando(boton, false);
  }
}