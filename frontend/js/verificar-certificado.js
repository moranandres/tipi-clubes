import { apiFetch, ApiError } from './api.js';
import { obtenerSesion } from './auth.js';
import { crearElemento, formatearFecha, mostrarAlerta, limpiarAlerta, establecerCargando } from './ui.js';

const TAMANO_MAXIMO_PDF = 10 * 1024 * 1024;

const TIPOS = {
  PARTICIPACION_CURSO: 'Participación en curso',
  APROBACION_CURSO: 'Aprobación de curso',
  PARTICIPACION_COMPETENCIA: 'Participación en competencia',
  RECONOCIMIENTO_COMPETENCIA: 'Reconocimiento en competencia'
};

const estado = { resultado: null, turno: 0 };

function elemento(id) {
  return document.getElementById(id);
}

iniciar();

function iniciar() {
  if (obtenerSesion()) {
    const enlace = elemento('enlace-sistema');
    enlace.href = 'dashboard.html';
    enlace.textContent = 'Volver al sistema';
  }

  elemento('formulario-verificar').addEventListener('submit', evento => {
    evento.preventDefault();
    verificar(elemento('campo-codigo').value);
  });
  elemento('campo-archivo').addEventListener('change', comprobarArchivo);

  const codigo = new URLSearchParams(window.location.search).get('codigo');
  if (codigo) {
    elemento('campo-codigo').value = codigo.slice(0, 40);
    verificar(codigo);
  } else {
    elemento('campo-codigo').focus();
  }
}

function ocultarResultado() {
  estado.resultado = null;
  elemento('tarjeta-resultado').hidden = true;
  elemento('tarjeta-huella').hidden = true;
  elemento('campo-archivo').value = '';
  elemento('resultado-huella').replaceChildren();
}

async function verificar(entrada) {
  const alertas = elemento('alertas');
  limpiarAlerta(alertas);
  const codigo = (entrada || '').trim().toUpperCase();
  if (!codigo) {
    ocultarResultado();
    mostrarAlerta(alertas, 'danger', 'Ingrese el código de verificación que figura en el certificado.');
    elemento('campo-codigo').focus();
    return;
  }
  const turno = ++estado.turno;
  const boton = elemento('boton-verificar');
  establecerCargando(boton, true, 'Verificando...');
  try {
    const resultado = await apiFetch(`/api/publico/certificados/${encodeURIComponent(codigo)}`, { autenticado: false });
    if (turno !== estado.turno) {
      return;
    }
    elemento('campo-codigo').value = resultado.codigoVerificacion;
    actualizarDireccion(resultado.codigoVerificacion);
    mostrarResultado(resultado);
  } catch (error) {
    if (turno !== estado.turno) {
      return;
    }
    ocultarResultado();
    mostrarError(error);
  } finally {
    establecerCargando(boton, false);
  }
}

function actualizarDireccion(codigo) {
  const direccion = new URL(window.location.href);
  direccion.searchParams.set('codigo', codigo);
  window.history.replaceState(null, '', direccion.toString());
}

function mostrarError(error) {
  const alertas = elemento('alertas');
  if (!(error instanceof ApiError)) {
    mostrarAlerta(alertas, 'danger', 'Ocurrió un error inesperado. Intente nuevamente.');
    return;
  }
  if (error.estado === 404) {
    mostrarAlerta(alertas, 'warning', `${error.message} Revise que lo haya escrito tal como aparece en el certificado.`, [
      'El código tiene el formato TIPI-XXXX-XXXX-XXXX.',
      'Si el certificado no aparece, no fue emitido por el sistema TIPI 3.0 o el código fue alterado.'
    ]);
    return;
  }
  mostrarAlerta(alertas, error.estado === 400 ? 'warning' : 'danger', error.message);
}

function agregarDato(lista, termino, valor, claseValor = '') {
  lista.appendChild(crearElemento('dt', { clase: 'col-sm-4', texto: termino }));
  lista.appendChild(crearElemento('dd', {
    clase: `col-sm-8 ${claseValor}`.trim(),
    texto: valor === null || valor === undefined || valor === '' ? '—' : valor
  }));
}

function mostrarResultado(resultado) {
  estado.resultado = resultado;
  const valido = resultado.valido;
  elemento('cabecera-resultado').className = `card-header d-flex align-items-center gap-2 ${valido ? 'text-bg-success' : 'text-bg-danger'}`;
  elemento('icono-resultado').className = `bi fs-3 ${valido ? 'bi-patch-check-fill' : 'bi-x-octagon-fill'}`;
  elemento('titulo-resultado').textContent = valido ? 'Certificado válido' : 'Certificado anulado';
  elemento('mensaje-resultado').textContent = valido
    ? 'Fue emitido por el sistema TIPI 3.0 y está vigente.'
    : resultado.mensaje;

  const lista = elemento('lista-resultado');
  lista.replaceChildren();
  agregarDato(lista, 'Código', resultado.codigoVerificacion, 'font-monospace fw-semibold');
  agregarDato(lista, 'Tipo', TIPOS[resultado.tipo] || resultado.tipo);
  agregarDato(lista, 'Título', resultado.titulo);
  agregarDato(lista, 'Institución', resultado.institucionNombre);
  agregarDato(lista, 'Fecha de emisión', formatearFecha(resultado.fechaEmision));
  if (!valido) {
    agregarDato(lista, 'Fecha de anulación', formatearFecha(resultado.fechaAnulacion));
  }
  elemento('tarjeta-resultado').hidden = false;

  elemento('campo-archivo').value = '';
  elemento('resultado-huella').replaceChildren();
  elemento('huella-registrada').textContent = resultado.archivoHash || '';
  elemento('tarjeta-huella').hidden = !(valido && resultado.archivoHash);
}

function aHexadecimal(buffer) {
  return Array.from(new Uint8Array(buffer)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function avisoHuella(tipo, icono, titulo, texto) {
  return crearElemento('div', { clase: `alert alert-${tipo} mb-0 d-flex gap-2 align-items-start`, atributos: { role: 'status' } }, [
    crearElemento('i', { clase: `bi ${icono} fs-5`, atributos: { 'aria-hidden': 'true' } }),
    crearElemento('div', {}, [
      crearElemento('div', { clase: 'fw-semibold', texto: titulo }),
      crearElemento('div', { clase: 'small', texto })
    ])
  ]);
}

async function comprobarArchivo() {
  const contenedor = elemento('resultado-huella');
  const archivo = elemento('campo-archivo').files[0];
  const resultado = estado.resultado;
  contenedor.replaceChildren();
  if (!archivo || !resultado || !resultado.archivoHash) {
    return;
  }
  if (archivo.size > TAMANO_MAXIMO_PDF) {
    contenedor.replaceChildren(avisoHuella('warning', 'bi-exclamation-triangle', 'Archivo demasiado grande',
      'Los certificados de TIPI 3.0 pesan pocos kilobytes. Verifique que seleccionó el PDF correcto.'));
    return;
  }
  if (!window.crypto || !window.crypto.subtle) {
    contenedor.replaceChildren(avisoHuella('secondary', 'bi-info-circle', 'Su navegador no puede calcular la huella aquí',
      'Abra esta página desde una dirección segura (https o localhost) o calcule la huella con "certutil -hashfile archivo.pdf SHA256" en Windows o "sha256sum archivo.pdf" en Linux y compárela con la huella registrada.'));
    return;
  }
  contenedor.replaceChildren(crearElemento('div', { clase: 'small text-body-secondary', texto: 'Calculando la huella del archivo...' }));
  try {
    const huella = aHexadecimal(await window.crypto.subtle.digest('SHA-256', await archivo.arrayBuffer()));
    if (estado.resultado !== resultado) {
      return;
    }
    if (huella === resultado.archivoHash.toLowerCase()) {
      contenedor.replaceChildren(avisoHuella('success', 'bi-shield-check', 'El archivo es el original',
        `La huella de «${archivo.name}» coincide con la registrada al emitir el certificado ${resultado.codigoVerificacion}.`));
    } else {
      contenedor.replaceChildren(avisoHuella('danger', 'bi-shield-exclamation', 'El archivo no coincide',
        `La huella de «${archivo.name}» es distinta de la registrada: el PDF fue modificado o corresponde a otro certificado. No lo acepte como válido.`));
    }
  } catch (error) {
    contenedor.replaceChildren(avisoHuella('danger', 'bi-exclamation-triangle', 'No se pudo leer el archivo',
      'Intente seleccionarlo nuevamente.'));
  }
}
