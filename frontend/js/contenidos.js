import { apiFetch, ApiError } from './api.js';
import { cargarContenidos } from './catalogos.js';
import { confirmar } from './confirmacion.js';
import { exigirSesion, exigirRol } from './guard.js';
import { montarLayout } from './layout.js';
import {
  crearElemento,
  mostrarAlerta,
  limpiarAlerta,
  establecerCargando,
  mensajesDeError
} from './ui.js';

const TIPOS = {
  HERRAMIENTA: { etiqueta: 'Herramienta', clase: 'text-bg-primary' },
  LENGUAJE: { etiqueta: 'Lenguaje', clase: 'text-bg-info' },
  COMPONENTE: { etiqueta: 'Componente', clase: 'text-bg-warning' },
  COMPETENCIA: { etiqueta: 'Competencia', clase: 'text-bg-success' }
};

const sesion = exigirSesion();
const pantalla = { filtros: {}, contenido: null };
let modalContenido = null;

if (sesion && exigirRol(sesion, ['ADMIN'])) {
  iniciar();
}

function elemento(id) {
  return document.getElementById(id);
}

function mensajeDe(error) {
  return error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
}

async function iniciar() {
  montarLayout(sesion, 'contenidos');
  modalContenido = bootstrap.Modal.getOrCreateInstance(elemento('modal-contenido'));

  elemento('boton-nuevo').addEventListener('click', () => abrirFormulario(null));
  elemento('formulario-filtros').addEventListener('submit', evento => {
    evento.preventDefault();
    pantalla.filtros = leerFiltros();
    cargarLista();
  });
  elemento('formulario-filtros').addEventListener('reset', () => {
    setTimeout(() => {
      pantalla.filtros = {};
      cargarLista();
    }, 0);
  });
  elemento('formulario-contenido').addEventListener('submit', guardarContenido);

  await cargarLista();
}

function leerFiltros() {
  return {
    q: elemento('filtro-q').value.trim(),
    tipo: elemento('filtro-tipo').value,
    activo: elemento('filtro-activo').value
  };
}

function filaMensaje(texto) {
  return crearElemento('tr', {}, [crearElemento('td', {
    clase: 'text-center text-body-secondary py-4',
    texto,
    atributos: { colspan: '6' }
  })]);
}

async function cargarLista() {
  const cuerpo = elemento('cuerpo-tabla');
  cuerpo.replaceChildren(filaMensaje('Cargando contenidos...'));
  try {
    const lista = await cargarContenidos(pantalla.filtros);
    const ordenada = lista.slice().sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre, 'es'));
    if (ordenada.length === 0) {
      cuerpo.replaceChildren(filaMensaje('No se encontraron contenidos.'));
    } else {
      cuerpo.replaceChildren(...ordenada.map(crearFila));
    }
    const activos = ordenada.filter(contenido => contenido.activo).length;
    elemento('resumen-resultados').textContent = ordenada.length === 0
      ? 'Sin resultados'
      : `${ordenada.length} contenidos · ${activos} activos · ${ordenada.length - activos} inactivos`;
  } catch (error) {
    cuerpo.replaceChildren(filaMensaje('No se pudo cargar el catálogo.'));
    elemento('resumen-resultados').textContent = '';
    mostrarAlerta(elemento('alertas'), 'danger', mensajeDe(error));
  }
}

function crearBoton(icono, etiqueta, contenido, accion, clase = 'btn-outline-secondary') {
  const boton = crearElemento('button', {
    clase: `btn btn-sm ${clase} ms-1`,
    atributos: { type: 'button', title: etiqueta, 'aria-label': `${etiqueta}: ${contenido.nombre}` }
  }, [crearElemento('i', { clase: `bi ${icono}`, atributos: { 'aria-hidden': 'true' } })]);
  boton.addEventListener('click', accion);
  return boton;
}

function crearFila(contenido) {
  const tipo = TIPOS[contenido.tipo] || { etiqueta: contenido.tipo, clase: 'text-bg-light' };
  const estado = contenido.activo
    ? crearElemento('span', { clase: 'badge text-bg-success', texto: 'Activo' })
    : crearElemento('span', { clase: 'badge text-bg-secondary', texto: 'Inactivo' });
  const acciones = [
    crearBoton('bi-pencil', 'Editar', contenido, () => abrirFormulario(contenido)),
    contenido.activo
      ? crearBoton('bi-toggle-off', 'Desactivar', contenido, () => cambiarEstado(contenido, false), 'btn-outline-danger')
      : crearBoton('bi-toggle-on', 'Activar', contenido, () => cambiarEstado(contenido, true), 'btn-outline-success')
  ];
  return crearElemento('tr', {}, [
    crearElemento('td', { clase: 'fw-semibold', texto: contenido.nombre }),
    crearElemento('td', {}, [crearElemento('span', { clase: `badge ${tipo.clase}`, texto: tipo.etiqueta })]),
    crearElemento('td', { clase: 'small', texto: contenido.descripcion || '—' }),
    crearElemento('td', { clase: 'text-end', texto: String(contenido.actividades) }),
    crearElemento('td', {}, [estado]),
    crearElemento('td', { clase: 'text-end text-nowrap' }, acciones)
  ]);
}

function abrirFormulario(contenido) {
  pantalla.contenido = contenido;
  limpiarAlerta(elemento('alertas-modal'));
  elemento('titulo-modal-contenido').textContent = contenido ? 'Editar contenido' : 'Nuevo contenido';
  elemento('campo-tipo').value = contenido ? contenido.tipo : '';
  const usado = Boolean(contenido && contenido.actividades > 0);
  elemento('campo-tipo').disabled = usado;
  elemento('ayuda-tipo').hidden = !usado;
  elemento('campo-nombre').value = contenido ? contenido.nombre : '';
  elemento('campo-descripcion').value = contenido && contenido.descripcion ? contenido.descripcion : '';
  elemento('boton-guardar').disabled = false;
  modalContenido.show();
}

async function guardarContenido(evento) {
  evento.preventDefault();
  const alertas = elemento('alertas-modal');
  limpiarAlerta(alertas);
  const tipo = elemento('campo-tipo').value;
  const nombre = elemento('campo-nombre').value.trim();
  const descripcion = elemento('campo-descripcion').value.trim();
  const problemas = [];
  if (!tipo) {
    problemas.push('Seleccione el tipo de contenido.');
  }
  if (!nombre) {
    problemas.push('El nombre es obligatorio.');
  }
  if (problemas.length > 0) {
    mostrarAlerta(alertas, 'danger', 'Revise los datos ingresados:', problemas);
    return;
  }
  const contenido = pantalla.contenido;
  const boton = elemento('boton-guardar');
  establecerCargando(boton, true, 'Guardando...');
  try {
    await apiFetch(contenido ? `/api/contenidos/${contenido.id}` : '/api/contenidos', {
      metodo: contenido ? 'PUT' : 'POST',
      cuerpo: { tipo, nombre, descripcion: descripcion || null }
    });
    modalContenido.hide();
    mostrarAlerta(elemento('alertas'), 'success', contenido ? `Contenido «${nombre}» actualizado.` : `Contenido «${nombre}» agregado al catálogo.`);
    await cargarLista();
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

async function cambiarEstado(contenido, activo) {
  const aceptado = await confirmar({
    titulo: activo ? 'Activar contenido' : 'Desactivar contenido',
    mensaje: activo
      ? `«${contenido.nombre}» volverá a estar disponible para asignarse a nuevas actividades.`
      : `«${contenido.nombre}» dejará de ofrecerse en las nuevas actividades. Las ${contenido.actividades} actividades que ya lo usan lo conservan.`,
    textoAceptar: activo ? 'Activar' : 'Desactivar'
  });
  if (!aceptado) {
    return;
  }
  try {
    await apiFetch(`/api/contenidos/${contenido.id}/estado`, { metodo: 'PATCH', cuerpo: { activo } });
    mostrarAlerta(elemento('alertas'), 'success', `Contenido «${contenido.nombre}» ${activo ? 'activado' : 'desactivado'}.`);
    await cargarLista();
  } catch (error) {
    mostrarAlerta(elemento('alertas'), 'danger', mensajeDe(error));
  }
}
