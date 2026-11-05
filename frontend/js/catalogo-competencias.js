import { apiFetch, ApiError } from './api.js';
import {
  cargarCompetencias,
  cargarEdicionesDeCompetencia,
  cargarCategoriasDeCompetencia
} from './catalogos.js';
import { confirmar } from './confirmacion.js';
import {
  crearElemento,
  formatearFecha,
  mostrarAlerta,
  limpiarAlerta,
  establecerCargando,
  mensajesDeError
} from './ui.js';

const NIVELES_CATEGORIA = {
  BASICA: { etiqueta: 'Básica', clase: 'text-bg-info' },
  AVANZADA: { etiqueta: 'Avanzada', clase: 'text-bg-primary' }
};

const estado = {
  esAdmin: false,
  alCambiar: () => {},
  verParticipaciones: () => {},
  competencias: [],
  seleccionada: null,
  preferida: null,
  ediciones: [],
  categorias: [],
  editando: null
};
const modales = {};

function elemento(id) {
  return document.getElementById(id);
}

function mensajeDe(error) {
  return error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
}

function insigniaActiva(activa) {
  return crearElemento('span', {
    clase: `badge ${activa ? 'text-bg-success' : 'text-bg-secondary'}`,
    texto: activa ? 'Activa' : 'Inactiva'
  });
}

export function insigniaNivel(nivel) {
  const datos = NIVELES_CATEGORIA[nivel] || { etiqueta: nivel || '—', clase: 'text-bg-light' };
  return crearElemento('span', { clase: `badge ${datos.clase}`, texto: datos.etiqueta });
}

export function etiquetaNivel(nivel) {
  return (NIVELES_CATEGORIA[nivel] || { etiqueta: nivel }).etiqueta;
}

function filaMensaje(texto, columnas) {
  return crearElemento('tr', {}, [crearElemento('td', {
    clase: 'text-center text-body-secondary py-3',
    texto,
    atributos: { colspan: String(columnas) }
  })]);
}

function botonIcono(icono, titulo, alPulsar, clase = 'btn-outline-secondary') {
  const boton = crearElemento('button', {
    clase: `btn btn-sm ${clase} ms-1`,
    atributos: { type: 'button', title: titulo, 'aria-label': titulo }
  }, [crearElemento('i', { clase: `bi ${icono}`, atributos: { 'aria-hidden': 'true' } })]);
  boton.addEventListener('click', alPulsar);
  return boton;
}

function textoOVacio(valor) {
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
}

export function montarCatalogo({ esAdmin, alCambiar, verParticipaciones }) {
  estado.esAdmin = esAdmin;
  estado.alCambiar = alCambiar;
  estado.verParticipaciones = verParticipaciones;

  elemento('boton-nueva-competencia').hidden = !esAdmin;
  elemento('boton-nueva-edicion').hidden = !esAdmin;
  elemento('boton-nueva-categoria').hidden = !esAdmin;
  elemento('texto-catalogo-lectura').hidden = esAdmin;

  modales.competencia = bootstrap.Modal.getOrCreateInstance(elemento('modal-competencia'));
  modales.edicion = bootstrap.Modal.getOrCreateInstance(elemento('modal-edicion'));
  modales.categoria = bootstrap.Modal.getOrCreateInstance(elemento('modal-categoria'));

  elemento('boton-nueva-competencia').addEventListener('click', () => abrirCompetencia(null));
  elemento('boton-nueva-edicion').addEventListener('click', () => abrirEdicion(null));
  elemento('boton-nueva-categoria').addEventListener('click', () => abrirCategoria(null));
  elemento('formulario-competencia').addEventListener('submit', guardarCompetencia);
  elemento('formulario-edicion').addEventListener('submit', guardarEdicion);
  elemento('formulario-categoria').addEventListener('submit', guardarCategoria);
  elemento('filtro-categoria-q').addEventListener('input', pintarCategorias);
  elemento('filtro-categoria-nivel').addEventListener('change', pintarCategorias);
  elemento('filtro-categoria-estado').addEventListener('change', pintarCategorias);

  return { cargar: refrescar, seleccionar: seleccionarPorId };
}

async function refrescar() {
  await recargarCompetencias();
}

async function seleccionarPorId(id) {
  estado.preferida = Number(id);
  await refrescar();
}

async function recargarCompetencias() {
  const lista = elemento('lista-competencias');
  lista.replaceChildren(crearElemento('div', { clase: 'list-group-item text-body-secondary', texto: 'Cargando competencias...' }));
  try {
    estado.competencias = await cargarCompetencias();
  } catch (error) {
    estado.competencias = [];
    lista.replaceChildren(crearElemento('div', { clase: 'list-group-item text-danger', texto: 'No se pudieron cargar las competencias.' }));
    mostrarAlerta(elemento('alertas-catalogo'), 'danger', mensajeDe(error));
    return;
  }
  pintarCompetencias();
  const preferida = estado.competencias.find(c => c.id === estado.preferida);
  estado.preferida = null;
  const vigente = estado.seleccionada && estado.competencias.find(c => c.id === estado.seleccionada.id);
  const destino = preferida || vigente || estado.competencias[0];
  if (destino) {
    await seleccionar(destino.id);
  } else {
    mostrarSinSeleccion();
  }
}

function mostrarSinSeleccion() {
  estado.seleccionada = null;
  elemento('tarjeta-competencia').hidden = true;
  elemento('tarjeta-sin-competencia').hidden = false;
}

function resumenCompetencia(competencia) {
  const ediciones = competencia.ediciones === 1 ? '1 edición' : `${competencia.ediciones} ediciones`;
  return `${ediciones} · ${competencia.categoriasBasicas} básicas · ${competencia.categoriasAvanzadas} avanzadas`;
}

function pintarCompetencias() {
  const lista = elemento('lista-competencias');
  if (estado.competencias.length === 0) {
    lista.replaceChildren(crearElemento('div', {
      clase: 'list-group-item text-body-secondary',
      texto: estado.esAdmin ? 'No hay competencias. Pulse Nueva para registrar la primera.' : 'No hay competencias registradas.'
    }));
    return;
  }
  lista.replaceChildren(...estado.competencias.map(competencia => {
    const activa = estado.seleccionada && estado.seleccionada.id === competencia.id;
    const cabecera = crearElemento('div', { clase: 'd-flex justify-content-between align-items-center gap-2' }, [
      crearElemento('span', { clase: 'fw-semibold', texto: competencia.nombre })
    ]);
    if (!competencia.activa) {
      cabecera.appendChild(insigniaActiva(false));
    }
    const boton = crearElemento('button', {
      clase: `list-group-item list-group-item-action${activa ? ' active' : ''}`,
      atributos: { type: 'button', 'aria-current': activa ? 'true' : 'false' }
    }, [cabecera, crearElemento('div', { clase: 'small', texto: resumenCompetencia(competencia) })]);
    boton.addEventListener('click', () => seleccionar(competencia.id));
    return boton;
  }));
}

async function seleccionar(id) {
  const competencia = estado.competencias.find(c => c.id === id);
  if (!competencia) {
    mostrarSinSeleccion();
    return;
  }
  estado.seleccionada = competencia;
  pintarCompetencias();
  pintarCabecera();
  elemento('tarjeta-competencia').hidden = false;
  elemento('tarjeta-sin-competencia').hidden = true;
  elemento('cuerpo-ediciones').replaceChildren(filaMensaje('Cargando ediciones...', 5));
  elemento('cuerpo-categorias').replaceChildren(filaMensaje('Cargando categorías...', 5));
  elemento('resumen-categorias').textContent = '';
  try {
    const [ediciones, categorias] = await Promise.all([
      cargarEdicionesDeCompetencia(id),
      cargarCategoriasDeCompetencia(id)
    ]);
    if (!estado.seleccionada || estado.seleccionada.id !== id) {
      return;
    }
    estado.ediciones = ediciones;
    estado.categorias = categorias;
    pintarEdiciones();
    pintarCategorias();
  } catch (error) {
    elemento('cuerpo-ediciones').replaceChildren(filaMensaje('No se pudieron cargar las ediciones.', 5));
    elemento('cuerpo-categorias').replaceChildren(filaMensaje('No se pudieron cargar las categorías.', 5));
    mostrarAlerta(elemento('alertas-catalogo'), 'danger', mensajeDe(error));
  }
}

function pintarCabecera() {
  const competencia = estado.seleccionada;
  elemento('nombre-competencia').replaceChildren(document.createTextNode(`${competencia.nombre} `), insigniaActiva(competencia.activa));
  const datos = [];
  if (competencia.organizador) {
    datos.push(crearElemento('div', { texto: `Organiza: ${competencia.organizador}` }));
  }
  if (competencia.sitioWeb) {
    datos.push(crearElemento('div', {}, [
      crearElemento('a', {
        texto: competencia.sitioWeb,
        atributos: { href: competencia.sitioWeb, target: '_blank', rel: 'noopener noreferrer' }
      }),
      crearElemento('i', { clase: 'bi bi-box-arrow-up-right ms-1', atributos: { 'aria-hidden': 'true' } })
    ]));
  }
  datos.push(crearElemento('div', { texto: resumenCompetencia(competencia) }));
  elemento('datos-competencia').replaceChildren(...datos);

  const acciones = [];
  if (estado.esAdmin) {
    const editar = crearElemento('button', { clase: 'btn btn-sm btn-outline-secondary', texto: 'Editar', atributos: { type: 'button' } });
    editar.addEventListener('click', () => abrirCompetencia(competencia));
    acciones.push(editar);
    const alternar = crearElemento('button', {
      clase: `btn btn-sm ${competencia.activa ? 'btn-outline-danger' : 'btn-outline-success'}`,
      texto: competencia.activa ? 'Desactivar' : 'Activar',
      atributos: { type: 'button' }
    });
    alternar.addEventListener('click', () => alternarEstado('competencia', competencia));
    acciones.push(alternar);
  }
  elemento('acciones-competencia').replaceChildren(...acciones);
  elemento('boton-nueva-edicion').disabled = !competencia.activa;
  elemento('boton-nueva-categoria').disabled = !competencia.activa;
}

function textoFechas(edicion) {
  if (!edicion.fechaInicio) {
    return 'Sin fechas';
  }
  if (!edicion.fechaFin || edicion.fechaFin === edicion.fechaInicio) {
    return formatearFecha(edicion.fechaInicio);
  }
  return `${formatearFecha(edicion.fechaInicio)} al ${formatearFecha(edicion.fechaFin)}`;
}

function botonParticipaciones(cantidad, filtros, descripcion) {
  if (cantidad === 0) {
    return crearElemento('span', { clase: 'text-body-secondary', texto: '0' });
  }
  const boton = crearElemento('button', {
    clase: 'btn btn-sm btn-link p-0',
    texto: String(cantidad),
    atributos: { type: 'button', title: `Ver las participaciones de ${descripcion}` }
  });
  boton.addEventListener('click', () => estado.verParticipaciones(filtros));
  return boton;
}

function pintarEdiciones() {
  const cuerpo = elemento('cuerpo-ediciones');
  if (estado.ediciones.length === 0) {
    cuerpo.replaceChildren(filaMensaje('La competencia no tiene ediciones registradas.', 5));
    return;
  }
  cuerpo.replaceChildren(...estado.ediciones.map(edicion => {
    const nombre = [crearElemento('div', { clase: 'fw-semibold', texto: `${edicion.nombre} (${edicion.anio})` })];
    if (edicion.sede) {
      nombre.push(crearElemento('div', { clase: 'small text-body-secondary', texto: edicion.sede }));
    }
    const acciones = [];
    if (estado.esAdmin) {
      acciones.push(botonIcono('bi-pencil', `Editar la edición ${edicion.nombre}`, () => abrirEdicion(edicion)));
      acciones.push(botonIcono(edicion.activa ? 'bi-toggle-on' : 'bi-toggle-off',
        `${edicion.activa ? 'Desactivar' : 'Activar'} la edición ${edicion.nombre}`,
        () => alternarEstado('edicion', edicion), edicion.activa ? 'btn-outline-danger' : 'btn-outline-success'));
    }
    return crearElemento('tr', {}, [
      crearElemento('td', {}, nombre),
      crearElemento('td', { clase: 'small text-nowrap', texto: textoFechas(edicion) }),
      crearElemento('td', {}, [insigniaActiva(edicion.activa)]),
      crearElemento('td', {}, [botonParticipaciones(edicion.participaciones,
        { competenciaId: edicion.competenciaId, edicionId: edicion.id }, `la edición ${edicion.nombre}`)]),
      crearElemento('td', { clase: 'text-end text-nowrap' }, acciones)
    ]);
  }));
}

function categoriasVisibles() {
  const texto = elemento('filtro-categoria-q').value.trim().toLowerCase();
  const nivel = elemento('filtro-categoria-nivel').value;
  const activa = elemento('filtro-categoria-estado').value;
  return estado.categorias.filter(categoria => (!texto || categoria.nombre.toLowerCase().includes(texto))
    && (!nivel || categoria.nivel === nivel)
    && (!activa || String(categoria.activa) === activa));
}

function pintarCategorias() {
  const cuerpo = elemento('cuerpo-categorias');
  if (!estado.seleccionada) {
    return;
  }
  const visibles = categoriasVisibles();
  elemento('resumen-categorias').textContent = `Mostrando ${visibles.length} de ${estado.categorias.length} categorías.`;
  if (visibles.length === 0) {
    cuerpo.replaceChildren(filaMensaje(estado.categorias.length === 0
      ? 'La competencia no tiene categorías registradas.'
      : 'Ninguna categoría coincide con los filtros.', 5));
    return;
  }
  cuerpo.replaceChildren(...visibles.map(categoria => {
    const nombre = [crearElemento('div', { clase: 'fw-semibold', texto: categoria.nombre })];
    if (categoria.descripcion) {
      nombre.push(crearElemento('div', { clase: 'small text-body-secondary texto-preformateado', texto: categoria.descripcion }));
    }
    const acciones = [];
    if (estado.esAdmin) {
      acciones.push(botonIcono('bi-pencil', `Editar la categoría ${categoria.nombre}`, () => abrirCategoria(categoria)));
      acciones.push(botonIcono(categoria.activa ? 'bi-toggle-on' : 'bi-toggle-off',
        `${categoria.activa ? 'Desactivar' : 'Activar'} la categoría ${categoria.nombre}`,
        () => alternarEstado('categoria', categoria), categoria.activa ? 'btn-outline-danger' : 'btn-outline-success'));
    }
    return crearElemento('tr', {}, [
      crearElemento('td', {}, nombre),
      crearElemento('td', {}, [insigniaNivel(categoria.nivel)]),
      crearElemento('td', {}, [insigniaActiva(categoria.activa)]),
      crearElemento('td', {}, [botonParticipaciones(categoria.participaciones,
        { competenciaId: categoria.competenciaId, categoriaId: categoria.id }, `la categoría ${categoria.nombre}`)]),
      crearElemento('td', { clase: 'text-end text-nowrap' }, acciones)
    ]);
  }));
}

const TEXTOS_ESTADO = {
  competencia: {
    sujeto: 'la competencia',
    ruta: registro => `/api/competencias/${registro.id}/estado`,
    efectoOff: 'No se podrán registrar participaciones nuevas ni agregar ediciones o categorías. Las participaciones registradas se conservan en el historial.',
    efectoOn: 'Volverá a admitir nuevas participaciones en sus ediciones y categorías activas.'
  },
  edicion: {
    sujeto: 'la edición',
    ruta: registro => `/api/competencias/${registro.competenciaId}/ediciones/${registro.id}/estado`,
    efectoOff: 'No se podrán registrar participaciones nuevas en esta edición. Las registradas se conservan y se pueden seguir modificando.',
    efectoOn: 'Volverá a admitir nuevas participaciones.'
  },
  categoria: {
    sujeto: 'la categoría',
    ruta: registro => `/api/competencias/${registro.competenciaId}/categorias/${registro.id}/estado`,
    efectoOff: 'No se podrán registrar participaciones nuevas en esta categoría, en ninguna edición. Las registradas se conservan.',
    efectoOn: 'Volverá a admitir nuevas participaciones.'
  }
};

async function alternarEstado(tipo, registro) {
  const textos = TEXTOS_ESTADO[tipo];
  const activar = !registro.activa;
  const aceptado = await confirmar({
    titulo: `${activar ? 'Activar' : 'Desactivar'} ${textos.sujeto}`,
    mensaje: `«${registro.nombre}»: ${activar ? textos.efectoOn : textos.efectoOff}`,
    textoAceptar: activar ? 'Activar' : 'Desactivar'
  });
  if (!aceptado) {
    return;
  }
  const alertas = elemento('alertas-catalogo');
  limpiarAlerta(alertas);
  try {
    await apiFetch(textos.ruta(registro), { metodo: 'PATCH', cuerpo: { activa: activar } });
    mostrarAlerta(alertas, 'success', `${textos.sujeto.charAt(0).toUpperCase()}${textos.sujeto.slice(1)} «${registro.nombre}» quedó ${activar ? 'activa' : 'inactiva'}.`);
    await despuesDeCambiar();
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  }
}

async function despuesDeCambiar() {
  estado.alCambiar();
  await recargarCompetencias();
}

function abrirCompetencia(competencia) {
  estado.editando = competencia;
  limpiarAlerta(elemento('alertas-competencia'));
  elemento('titulo-modal-competencia').textContent = competencia ? `Editar ${competencia.nombre}` : 'Nueva competencia';
  elemento('competencia-nombre').value = competencia ? competencia.nombre : '';
  elemento('competencia-organizador').value = competencia && competencia.organizador ? competencia.organizador : '';
  elemento('competencia-sitio').value = competencia && competencia.sitioWeb ? competencia.sitioWeb : '';
  modales.competencia.show();
}

async function guardarCompetencia(evento) {
  evento.preventDefault();
  const alertas = elemento('alertas-competencia');
  limpiarAlerta(alertas);
  const cuerpo = {
    nombre: elemento('competencia-nombre').value.trim(),
    organizador: textoOVacio(elemento('competencia-organizador').value),
    sitioWeb: textoOVacio(elemento('competencia-sitio').value)
  };
  const problemas = [];
  if (!cuerpo.nombre) {
    problemas.push('El nombre de la competencia es obligatorio.');
  }
  if (cuerpo.sitioWeb && !/^https?:\/\/\S+$/.test(cuerpo.sitioWeb)) {
    problemas.push('El sitio web debe empezar con http:// o https://.');
  }
  if (problemas.length > 0) {
    mostrarAlerta(alertas, 'danger', 'Revise los datos ingresados:', problemas);
    return;
  }
  const editando = estado.editando;
  const boton = elemento('boton-guardar-competencia');
  establecerCargando(boton, true, 'Guardando...');
  try {
    const guardada = await apiFetch(editando ? `/api/competencias/${editando.id}` : '/api/competencias', {
      metodo: editando ? 'PUT' : 'POST',
      cuerpo
    });
    modales.competencia.hide();
    estado.seleccionada = guardada;
    mostrarAlerta(elemento('alertas-catalogo'), 'success',
      editando ? `Competencia «${guardada.nombre}» actualizada.` : `Competencia «${guardada.nombre}» registrada. Agregue sus ediciones y categorías.`);
    await despuesDeCambiar();
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

function abrirEdicion(edicion) {
  estado.editando = edicion;
  limpiarAlerta(elemento('alertas-edicion'));
  elemento('titulo-modal-edicion').textContent = edicion
    ? `Editar ${edicion.nombre}`
    : `Nueva edición de ${estado.seleccionada.nombre}`;
  elemento('edicion-nombre').value = edicion ? edicion.nombre : '';
  elemento('edicion-anio').value = edicion ? String(edicion.anio) : String(new Date().getFullYear());
  elemento('edicion-inicio').value = edicion && edicion.fechaInicio ? edicion.fechaInicio : '';
  elemento('edicion-fin').value = edicion && edicion.fechaFin ? edicion.fechaFin : '';
  elemento('edicion-sede').value = edicion && edicion.sede ? edicion.sede : '';
  modales.edicion.show();
}

function validarEdicion(cuerpo) {
  const problemas = [];
  if (!cuerpo.nombre) {
    problemas.push('El nombre de la edición es obligatorio.');
  }
  if (!Number.isInteger(cuerpo.anio) || cuerpo.anio < 2000 || cuerpo.anio > 2100) {
    problemas.push('El año debe estar entre 2000 y 2100.');
  }
  if (cuerpo.fechaFin && !cuerpo.fechaInicio) {
    problemas.push('Si indica la fecha de fin, indique también la fecha de inicio.');
  }
  if (cuerpo.fechaInicio && Number(cuerpo.fechaInicio.slice(0, 4)) !== cuerpo.anio) {
    problemas.push(`La fecha de inicio debe corresponder al año de la edición (${cuerpo.anio}).`);
  }
  if (cuerpo.fechaInicio && cuerpo.fechaFin && cuerpo.fechaFin < cuerpo.fechaInicio) {
    problemas.push('La fecha de fin no puede ser anterior a la fecha de inicio.');
  }
  return problemas;
}

async function guardarEdicion(evento) {
  evento.preventDefault();
  const alertas = elemento('alertas-edicion');
  limpiarAlerta(alertas);
  const anioTexto = elemento('edicion-anio').value.trim();
  const cuerpo = {
    nombre: elemento('edicion-nombre').value.trim(),
    anio: anioTexto === '' ? null : Number(anioTexto),
    fechaInicio: elemento('edicion-inicio').value || null,
    fechaFin: elemento('edicion-fin').value || null,
    sede: textoOVacio(elemento('edicion-sede').value)
  };
  const problemas = validarEdicion(cuerpo);
  if (problemas.length > 0) {
    mostrarAlerta(alertas, 'danger', 'Revise los datos ingresados:', problemas);
    return;
  }
  const editando = estado.editando;
  const competenciaId = estado.seleccionada.id;
  const boton = elemento('boton-guardar-edicion');
  establecerCargando(boton, true, 'Guardando...');
  try {
    const guardada = await apiFetch(editando
      ? `/api/competencias/${competenciaId}/ediciones/${editando.id}`
      : `/api/competencias/${competenciaId}/ediciones`, { metodo: editando ? 'PUT' : 'POST', cuerpo });
    modales.edicion.hide();
    mostrarAlerta(elemento('alertas-catalogo'), 'success',
      editando ? `Edición «${guardada.nombre}» actualizada.` : `Edición «${guardada.nombre}» registrada y activa.`);
    await despuesDeCambiar();
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

function abrirCategoria(categoria) {
  estado.editando = categoria;
  limpiarAlerta(elemento('alertas-categoria'));
  elemento('titulo-modal-categoria').textContent = categoria
    ? `Editar ${categoria.nombre}`
    : `Nueva categoría de ${estado.seleccionada.nombre}`;
  elemento('categoria-nivel').value = categoria ? categoria.nivel : (elemento('filtro-categoria-nivel').value || '');
  elemento('categoria-nombre').value = categoria ? categoria.nombre : '';
  elemento('categoria-descripcion').value = categoria && categoria.descripcion ? categoria.descripcion : '';
  const bloqueado = Boolean(categoria && categoria.participaciones > 0);
  elemento('categoria-nivel').disabled = bloqueado;
  elemento('ayuda-categoria-nivel').textContent = bloqueado
    ? `El nivel no se puede cambiar porque la categoría ya tiene ${categoria.participaciones === 1 ? '1 participación registrada' : `${categoria.participaciones} participaciones registradas`}.`
    : '';
  modales.categoria.show();
}

async function guardarCategoria(evento) {
  evento.preventDefault();
  const alertas = elemento('alertas-categoria');
  limpiarAlerta(alertas);
  const cuerpo = {
    nivel: elemento('categoria-nivel').value || null,
    nombre: elemento('categoria-nombre').value.trim(),
    descripcion: textoOVacio(elemento('categoria-descripcion').value)
  };
  const problemas = [];
  if (!cuerpo.nivel) {
    problemas.push('Seleccione el nivel de la categoría.');
  }
  if (!cuerpo.nombre) {
    problemas.push('El nombre de la categoría es obligatorio.');
  }
  if (problemas.length > 0) {
    mostrarAlerta(alertas, 'danger', 'Revise los datos ingresados:', problemas);
    return;
  }
  const editando = estado.editando;
  const competenciaId = estado.seleccionada.id;
  const boton = elemento('boton-guardar-categoria');
  establecerCargando(boton, true, 'Guardando...');
  try {
    const guardada = await apiFetch(editando
      ? `/api/competencias/${competenciaId}/categorias/${editando.id}`
      : `/api/competencias/${competenciaId}/categorias`, { metodo: editando ? 'PUT' : 'POST', cuerpo });
    modales.categoria.hide();
    mostrarAlerta(elemento('alertas-catalogo'), 'success', editando
      ? `Categoría «${guardada.nombre}» actualizada.`
      : `Categoría «${guardada.nombre}» registrada en el nivel ${etiquetaNivel(guardada.nivel).toLowerCase()}.`);
    await despuesDeCambiar();
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}
