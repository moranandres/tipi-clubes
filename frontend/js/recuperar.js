import { apiFetch, ApiError } from './api.js';
import { exigirInvitado } from './guard.js';
import { mostrarAlerta, limpiarAlerta, establecerCargando, mensajesDeError } from './ui.js';

const MENSAJE_ENVIADO = 'Si la cuenta existe y está activa, recibirá en su correo un enlace para restablecer la contraseña. '
  + 'El enlace vence en 30 minutos y solo puede usarse una vez. Revise también la carpeta de correo no deseado.';

if (exigirInvitado()) {
  iniciar();
}

function iniciar() {
  const formulario = document.getElementById('formulario-recuperar');
  const alertas = document.getElementById('alertas');
  const boton = document.getElementById('boton-enviar');

  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();
    limpiarAlerta(alertas);

    const identificador = formulario.identificador.value.trim();
    if (!identificador) {
      mostrarAlerta(alertas, 'danger', 'Ingrese su usuario o correo electrónico.');
      return;
    }

    establecerCargando(boton, true, 'Enviando...');
    try {
      await apiFetch('/api/auth/recuperar', {
        metodo: 'POST',
        cuerpo: { identificador },
        autenticado: false
      });
      formulario.hidden = true;
      mostrarAlerta(alertas, 'info', MENSAJE_ENVIADO);
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
      mostrarAlerta(alertas, 'danger', mensaje, mensajesDeError(error));
      establecerCargando(boton, false);
    }
  });
}