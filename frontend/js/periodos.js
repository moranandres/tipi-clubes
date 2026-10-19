import { apiFetch, ApiError } from './api.js';
import { confirmar } from './confirmacion.js';
import { exigirSesion, exigirRol } from './guard.js';
import { montarLayout } from './layout.js';
import {
  crearElemento,
  formatearFecha,
  mostrarAlerta,
  limpiarAlerta,
  establecerCargando,
  mensajesDeError
} from './ui.js';

const ROLES_PAGINA = ['ADMIN', 'COORDINADOR', 'CONSULTA', 'RESP_INSTITUCIONAL'];

const TITULOS_MODAL = {
  crear: 'Nuevo período',
  editar: 'Editar período'
};

const MENSAJES_EXITO = {
  crear: 'Período creado correctamente.',
  editar: 'Período actualizado correctamente.'
};

const sesion = exigirSesion();
const pantalla = { modo: null, periodo: null };
let modalPeriodo = null;

if (sesion && exigirRol(sesion, ROLES_PAGINA)) {
  iniciar();
}

function elemento(id) {
  return document.getElementById(id);
}

function esAdmin() {
  return sesion.usuario.rol === 'ADMIN';
}

function iniciar() {
  montarLayout(sesion, 'periodos');

  elemento('boton-nuevo').hidden = !esAdmin();
  elemento('encabezado-acciones').hidden = !esAdmin();

  modalPeriodo = bootstrap.Modal.getOrCreateInstance(elemento('modal-periodo'));
  elemento('boton-nuevo').addEventListener('click', () => abrirFormulario('crear', null));
  elemento('formulario-periodo').addEventListener('submit', guardarPeriodo);

  cargarLista();
}

function filaMensaje(texto) {
  const celda = crearElemento('td', {
    clase: 'text-center text-body-secondary py-4',
    texto,
    atributos: { colspan: esAdmin() ? '5' : '4' }
  });
  return crearElemento('tr', {}, [celda]);
}

async function cargarLista() {
  const cuerpo = elemento('cuerpo-tabla');
  cuerpo.replaceChildren(filaMensaje('Cargando períodos...'));
  try {
    const periodos = await apiFetch('/api/periodos');
    if (periodos.length === 0) {
      cuerpo.replaceChildren(filaMensaje('No hay períodos registrados.'));
      elemento('resumen-resultados').textContent = 'Sin períodos registrados';
      return;
    }
    cuerpo.replaceChildren(...periodos.map(crearFila));
    elemento('resumen-resultados').textContent = `${periodos.length} período(s) registrado(s)`;
  } catch (error) {
    cuerpo.replaceChildren(filaMensaje('No se pudo cargar el listado.'));
    elemento('resumen-resultados').textContent = '';
    const mensaje = error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
    mostrarAlerta(elemento('alertas'), 'danger', mensaje);
  }
}

function crearFila(periodo) {
  const estado = periodo.activo
    ? crearElemento('span', { clase: 'badge text-bg-success', texto: 'Activo' })
    : crearElemento('span', { clase: 'badge text-bg-secondary', texto: 'Inactivo' });

  const celdas = [
    crearElemento('td', { clase: 'fw-semibold', texto: periodo.nombre }),
    crearElemento('td', { texto: formatearFecha(periodo.fechaInicio) }),
    crearElemento('td', { texto: formatearFecha(periodo.fechaFin) }),
    crearElemento('td', {}, [estado])
  ];
  if (esAdmin()) {
    celdas.push(crearElemento('td', { clase: 'text-end text-nowrap' }, crearAcciones(periodo)));
  }
  return crearElemento('tr', { clase: periodo.activo ? 'table-success' : '' }, celdas);
}

function crearAcciones(periodo) {
  const acciones = [
    crearBoton('bi-pencil', 'Editar', periodo, () => abrirFormulario('editar', periodo))
  ];
  if (!periodo.activo) {
    acciones.push(crearBoton('bi-check2-circle', 'Marcar como activo', periodo, () => activarPeriodo(periodo)));
  }
  return acciones;
}

function crearBoton(icono, etiqueta, periodo, accion) {
  const marca = crearElemento('i', { clase: `bi ${icono}`, atributos: { 'aria-hidden': 'true' } });
  const boton = crearElemento('button', {
    clase: 'btn btn-sm btn-outline-secondary ms-1',
    atributos: {
      type: 'button',
      title: etiqueta,
      'aria-label': `${etiqueta}: ${periodo.nombre}`
    }
  }, [marca]);
  boton.addEventListener('click', accion);
  return boton;
}

function leerCampo(nombre) {
  const valor = elemento(`campo-${nombre}`).value.trim();
  return valor === '' ? null : valor;
}

function abrirFormulario(modo, periodo) {
  pantalla.modo = modo;
  pantalla.periodo = periodo;
  limpiarAlerta(elemento('alertas-modal'));
  elemento('titulo-modal-periodo').textContent = TITULOS_MODAL[modo];
  elemento('campo-nombre').value = periodo ? periodo.nombre : '';
  elemento('campo-fechaInicio').value = periodo ? periodo.fechaInicio : '';
  elemento('campo-fechaFin').value = periodo ? periodo.fechaFin : '';
  elemento('boton-guardar').disabled = false;
  modalPeriodo.show();
}

function validarFormulario() {
  const problemas = [];
  const nombre = leerCampo('nombre');
  const inicio = leerCampo('fechaInicio');
  const fin = leerCampo('fechaFin');

  if (!nombre) {
    problemas.push('El nombre del período es obligatorio.');
  }
  if (!inicio) {
    problemas.push('La fecha de inicio es obligatoria.');
  }
  if (!fin) {
    problemas.push('La fecha de fin es obligatoria.');
  }
  if (inicio && fin && fin <= inicio) {
    problemas.push('La fecha de fin debe ser posterior a la fecha de inicio.');
  }
  return problemas;
}

async function guardarPeriodo(evento) {
  evento.preventDefault();
  const alertas = elemento('alertas-modal');
  limpiarAlerta(alertas);

  const problemas = validarFormulario();
  if (problemas.length > 0) {
    mostrarAlerta(alertas, 'danger', 'Revise los datos ingresados:', problemas);
    return;
  }

  const modo = pantalla.modo;
  const cuerpo = {
    nombre: leerCampo('nombre'),
    fechaInicio: leerCampo('fechaInicio'),
    fechaFin: leerCampo('fechaFin')
  };
  const ruta = modo === 'crear' ? '/api/periodos' : `/api/periodos/${pantalla.periodo.id}`;
  const metodo = modo === 'crear' ? 'POST' : 'PUT';

  const boton = elemento('boton-guardar');
  establecerCargando(boton, true, 'Guardando...');
  try {
    await apiFetch(ruta, { metodo, cuerpo });
    modalPeriodo.hide();
    mostrarAlerta(elemento('alertas'), 'success', MENSAJES_EXITO[modo]);
    await cargarLista();
  } catch (error) {
    const mensaje = error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
    mostrarAlerta(alertas, 'danger', mensaje, mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

async function activarPeriodo(periodo) {
  const aceptado = await confirmar({
    titulo: 'Activar período',
    mensaje: `¿Desea marcar «${periodo.nombre}» como período activo? El período activo actual dejará de serlo.`,
    textoAceptar: 'Activar'
  });
  if (!aceptado) {
    return;
  }
  try {
    await apiFetch(`/api/periodos/${periodo.id}/activar`, { metodo: 'PATCH' });
    mostrarAlerta(elemento('alertas'), 'success', `El período «${periodo.nombre}» es ahora el período activo.`);
    await cargarLista();
  } catch (error) {
    const mensaje = error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
    mostrarAlerta(elemento('alertas'), 'danger', mensaje);
  }
}