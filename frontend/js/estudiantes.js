import { apiFetch, apiEnviarArchivo, apiDescargarArchivo, construirConsulta, ApiError } from './api.js';
import { cargarInstituciones, cargarCursosEducativos } from './catalogos.js';
import { confirmar } from './confirmacion.js';
import { exigirSesion } from './guard.js';
import { montarLayout } from './layout.js';
import { renderizarPaginacion } from './paginacion.js';
import {
  crearElemento,
  formatearFecha,
  formatearFechaHora,
  mostrarAlerta,
  limpiarAlerta,
  establecerCargando,
  mensajesDeError
} from './ui.js';

const TAMANO_PAGINA = 10;
const MAX_DOCUMENTO_BYTES = 5 * 1024 * 1024;
const TIPOS_DOCUMENTO = ['application/pdf', 'image/jpeg', 'image/png'];
const EXTENSIONES_DOCUMENTO = ['pdf', 'jpg', 'jpeg', 'png'];
const ROLES_GLOBALES = ['ADMIN', 'COORDINADOR', 'CONSULTA'];
const ROLES_DATOS_MINIMOS = ['COORDINADOR', 'CONSULTA'];
const ROLES_REGISTRO = ['ADMIN', 'RESP_INSTITUCIONAL', 'DOCENTE'];
const ROLES_GESTION = ['ADMIN', 'RESP_INSTITUCIONAL'];

const ESTADOS_ESTUDIANTE = {
  ACTIVO: { etiqueta: 'Activo', clase: 'text-bg-success' },
  RETIRADO: { etiqueta: 'Retirado', clase: 'text-bg-secondary' },
  EGRESADO: { etiqueta: 'Egresado', clase: 'text-bg-info' }
};

const ESTADOS_AUTORIZACION = {
  PENDIENTE: { etiqueta: 'Pendiente', clase: 'text-bg-warning' },
  OTORGADA: { etiqueta: 'Otorgada', clase: 'text-bg-success' },
  NO_OTORGADA: { etiqueta: 'No otorgada', clase: 'text-bg-secondary' },
  REVOCADA: { etiqueta: 'Revocada', clase: 'text-bg-danger' }
};

const OPCIONES_AUTORIZACION = {
  PENDIENTE: ['PENDIENTE', 'OTORGADA', 'NO_OTORGADA'],
  NO_OTORGADA: ['NO_OTORGADA', 'PENDIENTE', 'OTORGADA'],
  OTORGADA: ['OTORGADA', 'REVOCADA'],
  REVOCADA: ['REVOCADA', 'OTORGADA']
};

const TIPOS_AUTORIZACION = {
  PARTICIPACION: 'Autorización de participación',
  USO_IMAGEN: 'Autorización de uso de imagen'
};

const TITULOS_MODAL = {
  crear: 'Nuevo estudiante',
  editar: 'Editar estudiante',
  ver: 'Detalle del estudiante'
};

const sesion = exigirSesion();
const pantalla = {
  pagina: 0,
  filtros: {},
  modo: null,
  estudiante: null,
  estudianteEstado: null,
  estudianteAutorizaciones: null,
  autorizaciones: new Map(),
  tarjetas: new Map(),
  autorizacionesCambiaron: false
};
const catalogo = { instituciones: [], cursos: [] };
let modalEstudiante = null;
let modalEstado = null;
let modalAutorizaciones = null;

if (sesion) {
  iniciar();
}

function elemento(id) {
  return document.getElementById(id);
}

function rolActual() {
  return sesion.usuario.rol;
}

function esGlobal() {
  return ROLES_GLOBALES.includes(rolActual());
}

function soloDatosMinimos() {
  return ROLES_DATOS_MINIMOS.includes(rolActual());
}

function puedeRegistrar() {
  return ROLES_REGISTRO.includes(rolActual());
}

function enAlcance(estudiante) {
  return rolActual() === 'ADMIN' || estudiante.institucionId === sesion.usuario.institucionId;
}

function puedeEditar(estudiante) {
  return puedeRegistrar() && enAlcance(estudiante);
}

function puedeGestionar(estudiante) {
  return ROLES_GESTION.includes(rolActual()) && enAlcance(estudiante);
}

function mensajeDe(error) {
  return error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
}

function nombreCompleto(estudiante) {
  return `${estudiante.apellidos} ${estudiante.nombres}`;
}

function identificacion(estudiante) {
  return soloDatosMinimos() ? estudiante.codigoInterno : `${nombreCompleto(estudiante)} (${estudiante.codigoInterno})`;
}

function insignia(mapa, codigo) {
  const datos = mapa[codigo] || { etiqueta: codigo, clase: 'text-bg-light' };
  return crearElemento('span', { clase: `badge ${datos.clase}`, texto: datos.etiqueta });
}

function hoyEnGuayaquil() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
}

function formatearTamano(bytes) {
  if (bytes === null || bytes === undefined) {
    return '';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function iniciar() {
  montarLayout(sesion, 'estudiantes');

  const minima = soloDatosMinimos();
  elemento('boton-nuevo').hidden = !puedeRegistrar();
  elemento('aviso-datos-minimos').hidden = !minima;
  elemento('grupo-filtro-institucion').hidden = !esGlobal();
  elemento('etiqueta-filtro-q').textContent = minima ? 'Código del estudiante' : 'Nombre o código';
  elemento('filtro-q').placeholder = minima ? 'EST-' : '';
  document.querySelectorAll('.columna-completa').forEach(columna => {
    columna.hidden = minima;
  });

  modalEstudiante = bootstrap.Modal.getOrCreateInstance(elemento('modal-estudiante'));
  modalEstado = bootstrap.Modal.getOrCreateInstance(elemento('modal-estado'));
  modalAutorizaciones = bootstrap.Modal.getOrCreateInstance(elemento('modal-autorizaciones'));

  elemento('boton-nuevo').addEventListener('click', () => abrirFormulario('crear', null));

  elemento('formulario-filtros').addEventListener('submit', evento => {
    evento.preventDefault();
    pantalla.filtros = leerFiltros();
    cargarLista(0);
  });
  elemento('formulario-filtros').addEventListener('reset', () => {
    setTimeout(() => {
      pantalla.filtros = {};
      cargarLista(0);
    }, 0);
  });

  elemento('formulario-estudiante').addEventListener('submit', guardarEstudiante);
  ['campo-nombres', 'campo-apellidos'].forEach(id => {
    elemento(id).addEventListener('input', ocultarConfirmacionHomonimo);
  });

  elemento('formulario-estado').addEventListener('submit', guardarEstado);
  elemento('estado-nuevo').addEventListener('change', actualizarAvisoEstado);

  elemento('modal-autorizaciones').addEventListener('hidden.bs.modal', () => {
    if (pantalla.autorizacionesCambiaron) {
      pantalla.autorizacionesCambiaron = false;
      cargarLista(pantalla.pagina);
    }
  });

  await cargarCatalogos();
  await cargarLista(0);
}

function llenarSelectInstituciones(selector, textoVacio) {
  const opciones = [crearElemento('option', { texto: textoVacio, atributos: { value: '' } })];
  catalogo.instituciones.forEach(institucion => {
    opciones.push(crearElemento('option', {
      texto: institucion.nombre,
      atributos: { value: String(institucion.id) }
    }));
  });
  selector.replaceChildren(...opciones);
}

function llenarSelectCursos(selector, textoVacio) {
  const opciones = [crearElemento('option', { texto: textoVacio, atributos: { value: '' } })];
  const grupos = new Map();
  catalogo.cursos.forEach(curso => {
    if (!grupos.has(curso.nivel)) {
      const grupo = crearElemento('optgroup', { atributos: { label: curso.nivel } });
      grupos.set(curso.nivel, grupo);
      opciones.push(grupo);
    }
    grupos.get(curso.nivel).appendChild(crearElemento('option', {
      texto: curso.etiqueta,
      atributos: { value: curso.codigo }
    }));
  });
  selector.replaceChildren(...opciones);
}

async function cargarCatalogos() {
  const [instituciones, cursos] = await Promise.allSettled([cargarInstituciones(), cargarCursosEducativos()]);
  const problemas = [];
  if (instituciones.status === 'fulfilled') {
    catalogo.instituciones = instituciones.value;
  } else {
    problemas.push(`Instituciones: ${mensajeDe(instituciones.reason)}`);
  }
  if (cursos.status === 'fulfilled') {
    catalogo.cursos = cursos.value;
  } else {
    problemas.push(`Cursos: ${mensajeDe(cursos.reason)}`);
  }
  llenarSelectInstituciones(elemento('filtro-institucion'), 'Todas');
  llenarSelectInstituciones(elemento('campo-institucion'), 'Seleccione una institución');
  llenarSelectCursos(elemento('filtro-curso'), 'Todos');
  llenarSelectCursos(elemento('campo-curso'), 'Seleccione el curso');
  if (problemas.length > 0) {
    mostrarAlerta(elemento('alertas'), 'danger', 'No se pudieron cargar algunos catálogos.', problemas);
  }
}

function leerFiltros() {
  return {
    q: elemento('filtro-q').value.trim(),
    institucionId: esGlobal() ? elemento('filtro-institucion').value : '',
    curso: elemento('filtro-curso').value,
    estado: elemento('filtro-estado').value
  };
}

function totalColumnas() {
  return soloDatosMinimos() ? 5 : 7;
}

function filaMensaje(texto) {
  const celda = crearElemento('td', {
    clase: 'text-center text-body-secondary py-4',
    texto,
    atributos: { colspan: String(totalColumnas()) }
  });
  return crearElemento('tr', {}, [celda]);
}

function resumen(respuesta) {
  if (respuesta.totalElementos === 0) {
    return 'Sin resultados';
  }
  const desde = respuesta.pagina * respuesta.tamano + 1;
  const hasta = desde + respuesta.contenido.length - 1;
  return `Mostrando ${desde}–${hasta} de ${respuesta.totalElementos}`;
}

async function cargarLista(pagina) {
  const cuerpo = elemento('cuerpo-tabla');
  cuerpo.replaceChildren(filaMensaje('Cargando estudiantes...'));
  try {
    const ruta = `/api/estudiantes${construirConsulta({ ...pantalla.filtros, pagina, tamano: TAMANO_PAGINA })}`;
    const respuesta = await apiFetch(ruta);
    pantalla.pagina = respuesta.pagina;
    if (respuesta.contenido.length === 0) {
      cuerpo.replaceChildren(filaMensaje('No se encontraron estudiantes.'));
    } else {
      cuerpo.replaceChildren(...respuesta.contenido.map(crearFila));
    }
    elemento('resumen-resultados').textContent = resumen(respuesta);
    renderizarPaginacion(elemento('paginacion'), respuesta, cargarLista);
  } catch (error) {
    cuerpo.replaceChildren(filaMensaje('No se pudo cargar el listado.'));
    elemento('resumen-resultados').textContent = '';
    elemento('paginacion').replaceChildren();
    mostrarAlerta(elemento('alertas'), 'danger', mensajeDe(error));
  }
}

function lineaAutorizacion(etiqueta, estado) {
  return crearElemento('div', { clase: 'small d-flex justify-content-between align-items-center gap-2 mb-1' }, [
    crearElemento('span', { clase: 'text-body-secondary text-nowrap', texto: etiqueta }),
    insignia(ESTADOS_AUTORIZACION, estado)
  ]);
}

function crearFila(estudiante) {
  const celdas = [
    crearElemento('td', { clase: 'text-nowrap font-monospace small', texto: estudiante.codigoInterno })
  ];
  if (!soloDatosMinimos()) {
    celdas.push(crearElemento('td', { clase: 'fw-semibold', texto: nombreCompleto(estudiante) }));
  }
  celdas.push(crearElemento('td', { texto: estudiante.institucionNombre || `Institución ${estudiante.institucionId}` }));
  celdas.push(crearElemento('td', {}, [
    crearElemento('div', { texto: estudiante.cursoEtiqueta }),
    crearElemento('div', { clase: 'small text-body-secondary', texto: estudiante.nivel })
  ]));
  if (!soloDatosMinimos()) {
    celdas.push(crearElemento('td', {}, [
      lineaAutorizacion('Participación', estudiante.autorizacionParticipacion),
      lineaAutorizacion('Uso de imagen', estudiante.autorizacionUsoImagen)
    ]));
  }
  celdas.push(crearElemento('td', {}, [insignia(ESTADOS_ESTUDIANTE, estudiante.estado)]));
  celdas.push(crearElemento('td', { clase: 'text-end text-nowrap' }, crearAcciones(estudiante)));
  return crearElemento('tr', {}, celdas);
}

function crearAcciones(estudiante) {
  const acciones = [
    crearBoton('bi-eye', 'Ver detalle', estudiante, () => abrirFormulario('ver', estudiante)),
    crearEnlaceHistorial(estudiante)
  ];
  if (puedeEditar(estudiante)) {
    acciones.push(crearBoton('bi-pencil', 'Editar', estudiante, () => abrirFormulario('editar', estudiante)));
    acciones.push(crearBoton('bi-file-earmark-check', 'Autorizaciones', estudiante,
      () => abrirAutorizaciones(estudiante)));
  }
  if (puedeGestionar(estudiante)) {
    acciones.push(crearBoton('bi-arrow-left-right', 'Cambiar estado', estudiante,
      () => abrirCambioEstado(estudiante)));
    acciones.push(crearBoton('bi-trash', 'Eliminar', estudiante, () => eliminarEstudiante(estudiante), true));
  }
  return acciones;
}

function crearEnlaceHistorial(estudiante) {
  const marca = crearElemento('i', { clase: 'bi bi-clock-history', atributos: { 'aria-hidden': 'true' } });
  return crearElemento('a', {
    clase: 'btn btn-sm btn-outline-secondary ms-1',
    atributos: {
      href: `historial.html?id=${estudiante.id}`,
      title: 'Historial',
      'aria-label': `Historial: ${identificacion(estudiante)}`
    }
  }, [marca]);
}

function crearBoton(icono, etiqueta, estudiante, accion, peligro = false) {
  const marca = crearElemento('i', { clase: `bi ${icono}`, atributos: { 'aria-hidden': 'true' } });
  const boton = crearElemento('button', {
    clase: `btn btn-sm ${peligro ? 'btn-outline-danger' : 'btn-outline-secondary'} ms-1`,
    atributos: {
      type: 'button',
      title: etiqueta,
      'aria-label': `${etiqueta}: ${identificacion(estudiante)}`
    }
  }, [marca]);
  boton.addEventListener('click', accion);
  return boton;
}

function leerCampo(nombre) {
  const valor = elemento(`campo-${nombre}`).value.trim();
  return valor === '' ? null : valor;
}

function ocultarConfirmacionHomonimo() {
  elemento('grupo-homonimo').hidden = true;
  elemento('campo-confirmar-homonimo').checked = false;
}

function mostrarDetalle(estudiante) {
  elemento('detalle-codigo').textContent = estudiante.codigoInterno;
  elemento('detalle-estado').replaceChildren(insignia(ESTADOS_ESTUDIANTE, estudiante.estado));
  elemento('detalle-nivel').textContent = estudiante.nivel;
  const completo = !soloDatosMinimos();
  document.querySelectorAll('.detalle-completo').forEach(nodo => {
    nodo.hidden = !completo;
  });
  if (completo) {
    elemento('detalle-participacion').replaceChildren(
      insignia(ESTADOS_AUTORIZACION, estudiante.autorizacionParticipacion));
    elemento('detalle-imagen').replaceChildren(
      insignia(ESTADOS_AUTORIZACION, estudiante.autorizacionUsoImagen));
    elemento('detalle-registro').textContent = formatearFechaHora(estudiante.createdAt);
  }
}

function abrirFormulario(modo, estudiante) {
  pantalla.modo = modo;
  pantalla.estudiante = estudiante;
  const esCrear = modo === 'crear';
  const esVer = modo === 'ver';
  const minima = soloDatosMinimos();

  limpiarAlerta(elemento('alertas-modal'));
  ocultarConfirmacionHomonimo();
  elemento('titulo-modal-estudiante').textContent = esVer && estudiante
    ? `${TITULOS_MODAL.ver} ${estudiante.codigoInterno}`
    : TITULOS_MODAL[modo];

  elemento('grupo-detalle').hidden = !esVer;
  if (esVer) {
    mostrarDetalle(estudiante);
  }

  let institucionInicial = '';
  if (estudiante) {
    institucionInicial = String(estudiante.institucionId);
  } else if (!esGlobal() && sesion.usuario.institucionId) {
    institucionInicial = String(sesion.usuario.institucionId);
  }
  elemento('campo-institucion').value = institucionInicial;
  elemento('campo-institucion').disabled = !esCrear || rolActual() !== 'ADMIN';

  document.querySelectorAll('.grupo-nombres').forEach(grupo => {
    grupo.hidden = minima;
  });
  elemento('campo-nombres').value = estudiante && !minima ? estudiante.nombres : '';
  elemento('campo-apellidos').value = estudiante && !minima ? estudiante.apellidos : '';
  elemento('campo-curso').value = estudiante ? estudiante.curso : '';
  ['nombres', 'apellidos', 'curso'].forEach(nombre => {
    elemento(`campo-${nombre}`).disabled = esVer;
  });

  elemento('grupo-ayuda-registro').hidden = !esCrear;

  const boton = elemento('boton-guardar');
  boton.hidden = esVer;
  boton.disabled = false;
  boton.textContent = esCrear ? 'Registrar' : 'Guardar';

  modalEstudiante.show();
}

function validarFormulario() {
  const problemas = [];
  if (pantalla.modo === 'crear' && !elemento('campo-institucion').value) {
    problemas.push('Seleccione la institución del estudiante.');
  }
  if (!leerCampo('nombres')) {
    problemas.push('Los nombres son obligatorios.');
  }
  if (!leerCampo('apellidos')) {
    problemas.push('Los apellidos son obligatorios.');
  }
  if (!elemento('campo-curso').value) {
    problemas.push('Seleccione el curso del estudiante.');
  }
  return problemas;
}

function construirCuerpo(esCrear) {
  const cuerpo = {
    nombres: leerCampo('nombres'),
    apellidos: leerCampo('apellidos'),
    curso: elemento('campo-curso').value,
    confirmarHomonimo: elemento('campo-confirmar-homonimo').checked
  };
  if (esCrear) {
    cuerpo.institucionId = Number(elemento('campo-institucion').value);
  }
  return cuerpo;
}

async function guardarEstudiante(evento) {
  evento.preventDefault();
  if (pantalla.modo === 'ver') {
    return;
  }
  const alertas = elemento('alertas-modal');
  limpiarAlerta(alertas);

  const problemas = validarFormulario();
  if (problemas.length > 0) {
    mostrarAlerta(alertas, 'danger', 'Revise los datos ingresados:', problemas);
    return;
  }

  const esCrear = pantalla.modo === 'crear';
  const ruta = esCrear ? '/api/estudiantes' : `/api/estudiantes/${pantalla.estudiante.id}`;
  const boton = elemento('boton-guardar');
  establecerCargando(boton, true, 'Guardando...');
  try {
    const guardado = await apiFetch(ruta, { metodo: esCrear ? 'POST' : 'PUT', cuerpo: construirCuerpo(esCrear) });
    modalEstudiante.hide();
    mostrarAlerta(
      elemento('alertas'),
      'success',
      esCrear
        ? `Estudiante registrado con el código ${guardado.codigoInterno}. Sus autorizaciones quedaron pendientes.`
        : `Estudiante ${guardado.codigoInterno} actualizado correctamente.`
    );
    await cargarLista(esCrear ? 0 : pantalla.pagina);
  } catch (error) {
    if (error instanceof ApiError && error.estado === 409) {
      elemento('grupo-homonimo').hidden = false;
      mostrarAlerta(alertas, 'warning', error.message);
    } else {
      mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
    }
  } finally {
    establecerCargando(boton, false);
  }
}

function abrirCambioEstado(estudiante) {
  pantalla.estudianteEstado = estudiante;
  limpiarAlerta(elemento('alertas-estado'));
  elemento('estado-estudiante').textContent = identificacion(estudiante);
  elemento('estado-actual').replaceChildren(insignia(ESTADOS_ESTUDIANTE, estudiante.estado));

  const opciones = Object.entries(ESTADOS_ESTUDIANTE)
    .filter(([codigo]) => codigo !== estudiante.estado)
    .map(([codigo, datos]) => crearElemento('option', { texto: datos.etiqueta, atributos: { value: codigo } }));
  elemento('estado-nuevo').replaceChildren(...opciones);
  actualizarAvisoEstado();
  elemento('boton-guardar-estado').disabled = false;
  modalEstado.show();
}

function actualizarAvisoEstado() {
  elemento('aviso-estado').hidden = elemento('estado-nuevo').value === 'ACTIVO';
}

async function guardarEstado(evento) {
  evento.preventDefault();
  const estudiante = pantalla.estudianteEstado;
  const nuevo = elemento('estado-nuevo').value;
  const alertas = elemento('alertas-estado');
  limpiarAlerta(alertas);
  if (!nuevo) {
    mostrarAlerta(alertas, 'danger', 'Seleccione el nuevo estado.');
    return;
  }
  const boton = elemento('boton-guardar-estado');
  establecerCargando(boton, true, 'Guardando...');
  try {
    await apiFetch(`/api/estudiantes/${estudiante.id}/estado`, { metodo: 'PATCH', cuerpo: { estado: nuevo } });
    modalEstado.hide();
    mostrarAlerta(
      elemento('alertas'),
      'success',
      `El estudiante ${estudiante.codigoInterno} ahora está en estado ${ESTADOS_ESTUDIANTE[nuevo].etiqueta}.`
    );
    await cargarLista(pantalla.pagina);
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

async function eliminarEstudiante(estudiante) {
  const aceptado = await confirmar({
    titulo: 'Eliminar estudiante',
    mensaje: `¿Desea eliminar a ${identificacion(estudiante)}? Use esta opción solo para registros creados por error: `
      + 'también se eliminan sus autorizaciones y documentos. Si el estudiante ya tiene inscripciones, solicitudes, '
      + 'participaciones o certificados no podrá eliminarse; en ese caso cambie su estado a Retirado o Egresado.',
    textoAceptar: 'Eliminar'
  });
  if (!aceptado) {
    return;
  }
  try {
    await apiFetch(`/api/estudiantes/${estudiante.id}`, { metodo: 'DELETE' });
    mostrarAlerta(elemento('alertas'), 'success', `El estudiante ${estudiante.codigoInterno} fue eliminado.`);
    await cargarLista(pantalla.pagina);
  } catch (error) {
    mostrarAlerta(elemento('alertas'), 'danger', mensajeDe(error));
  }
}

function campo(raiz, nombre) {
  return raiz.querySelector(`[data-campo="${nombre}"]`);
}

function vincularEtiqueta(raiz, tipo, nombreEtiqueta, nombreControl) {
  const id = `autorizacion-${tipo}-${nombreControl}`;
  campo(raiz, nombreControl).id = id;
  campo(raiz, nombreEtiqueta).setAttribute('for', id);
}

function construirTarjeta(tipo) {
  const fragmento = elemento('plantilla-autorizacion').content.cloneNode(true);
  const raiz = fragmento.firstElementChild;
  campo(raiz, 'titulo').textContent = TIPOS_AUTORIZACION[tipo];
  vincularEtiqueta(raiz, tipo, 'etiqueta-archivo', 'archivo');
  vincularEtiqueta(raiz, tipo, 'etiqueta-estado', 'estado');
  vincularEtiqueta(raiz, tipo, 'etiqueta-fecha', 'campo-fecha');
  vincularEtiqueta(raiz, tipo, 'etiqueta-observacion', 'campo-observacion');
  campo(raiz, 'campo-fecha').max = hoyEnGuayaquil();

  campo(raiz, 'formulario-documento').addEventListener('submit', evento => {
    evento.preventDefault();
    cargarDocumento(tipo);
  });
  campo(raiz, 'formulario-estado').addEventListener('submit', evento => {
    evento.preventDefault();
    guardarAutorizacion(tipo);
  });
  campo(raiz, 'estado').addEventListener('change', () => actualizarAyudaEstado(tipo));
  campo(raiz, 'descargar').addEventListener('click', () => descargarDocumento(tipo));

  pantalla.tarjetas.set(tipo, raiz);
  return raiz;
}

async function abrirAutorizaciones(estudiante) {
  pantalla.estudianteAutorizaciones = estudiante;
  pantalla.autorizaciones.clear();
  pantalla.tarjetas.clear();
  pantalla.autorizacionesCambiaron = false;

  const alertas = elemento('alertas-autorizaciones');
  limpiarAlerta(alertas);
  elemento('titulo-modal-autorizaciones').textContent = `Autorizaciones de ${estudiante.codigoInterno}`;
  elemento('subtitulo-autorizaciones').textContent =
    `${nombreCompleto(estudiante)} · ${estudiante.cursoEtiqueta} · ${estudiante.institucionNombre || ''}`;
  const contenedor = elemento('contenedor-autorizaciones');
  contenedor.replaceChildren(crearElemento('p', {
    clase: 'text-body-secondary text-center py-4 mb-0',
    texto: 'Cargando autorizaciones...'
  }));
  modalAutorizaciones.show();

  try {
    const lista = await apiFetch(`/api/estudiantes/${estudiante.id}/autorizaciones`);
    lista.forEach(autorizacion => pantalla.autorizaciones.set(autorizacion.tipo, autorizacion));
    const tarjetas = Object.keys(TIPOS_AUTORIZACION).map(tipo => {
      const tarjeta = construirTarjeta(tipo);
      renderizarTarjeta(tipo);
      return tarjeta;
    });
    contenedor.replaceChildren(...tarjetas);
  } catch (error) {
    contenedor.replaceChildren();
    mostrarAlerta(alertas, 'danger', mensajeDe(error));
  }
}

function autorizacionVacia(tipo) {
  return {
    tipo,
    estado: 'PENDIENTE',
    fechaRegistro: null,
    observacion: null,
    tieneDocumento: false,
    documentoNombre: null,
    documentoTipo: null,
    documentoTamano: null,
    documentoSubidoEn: null,
    revocadoEn: null,
    actualizadoEn: null
  };
}

function renderizarTarjeta(tipo) {
  const raiz = pantalla.tarjetas.get(tipo);
  const autorizacion = pantalla.autorizaciones.get(tipo) || autorizacionVacia(tipo);
  const datosEstado = ESTADOS_AUTORIZACION[autorizacion.estado];

  const marca = campo(raiz, 'insignia');
  marca.className = `badge ${datosEstado.clase}`;
  marca.textContent = datosEstado.etiqueta;

  campo(raiz, 'fecha').textContent = formatearFecha(autorizacion.fechaRegistro);
  campo(raiz, 'observacion').textContent = autorizacion.observacion || '—';
  campo(raiz, 'documento').textContent = autorizacion.tieneDocumento
    ? `${autorizacion.documentoNombre} (${formatearTamano(autorizacion.documentoTamano)}), cargado el ${formatearFechaHora(autorizacion.documentoSubidoEn)}`
    : 'Sin documento cargado';
  const revocada = Boolean(autorizacion.revocadoEn);
  campo(raiz, 'etiqueta-revocada').hidden = !revocada;
  campo(raiz, 'revocada').hidden = !revocada;
  campo(raiz, 'revocada').textContent = revocada ? formatearFechaHora(autorizacion.revocadoEn) : '';
  campo(raiz, 'actualizada').textContent = formatearFechaHora(autorizacion.actualizadoEn);
  campo(raiz, 'descargar').hidden = !autorizacion.tieneDocumento;

  campo(raiz, 'boton-cargar').textContent = autorizacion.tieneDocumento ? 'Reemplazar' : 'Cargar';
  campo(raiz, 'ayuda-archivo').textContent = autorizacion.tieneDocumento
    ? 'PDF, JPG o PNG de hasta 5 MB. El nuevo archivo reemplaza al documento actual.'
    : 'PDF, JPG o PNG de hasta 5 MB.';
  campo(raiz, 'archivo').value = '';

  const selector = campo(raiz, 'estado');
  const opciones = OPCIONES_AUTORIZACION[autorizacion.estado].map(codigo => crearElemento('option', {
    texto: codigo === autorizacion.estado
      ? `${ESTADOS_AUTORIZACION[codigo].etiqueta} (actual)`
      : ESTADOS_AUTORIZACION[codigo].etiqueta,
    atributos: { value: codigo }
  }));
  selector.replaceChildren(...opciones);
  selector.value = autorizacion.estado;
  campo(raiz, 'campo-fecha').value = autorizacion.fechaRegistro || '';
  campo(raiz, 'campo-observacion').value = autorizacion.observacion || '';
  actualizarAyudaEstado(tipo);
}

function documentoPosteriorARevocacion(autorizacion) {
  if (!autorizacion.tieneDocumento || !autorizacion.documentoSubidoEn) {
    return false;
  }
  if (!autorizacion.revocadoEn) {
    return true;
  }
  return new Date(autorizacion.documentoSubidoEn) > new Date(autorizacion.revocadoEn);
}

function actualizarAyudaEstado(tipo) {
  const raiz = pantalla.tarjetas.get(tipo);
  const autorizacion = pantalla.autorizaciones.get(tipo) || autorizacionVacia(tipo);
  const nuevo = campo(raiz, 'estado').value;
  const ayuda = campo(raiz, 'ayuda-estado');
  const boton = campo(raiz, 'boton-estado');
  const etiquetaFecha = campo(raiz, 'etiqueta-fecha');
  const etiquetaObservacion = campo(raiz, 'etiqueta-observacion');

  let texto = '';
  let bloqueado = false;
  if (nuevo === 'OTORGADA') {
    if (!autorizacion.tieneDocumento) {
      texto = 'Cargue primero el documento firmado por el representante legal.';
      bloqueado = true;
    } else if (autorizacion.estado === 'REVOCADA' && !documentoPosteriorARevocacion(autorizacion)) {
      texto = 'Para otorgar nuevamente una autorización revocada, cargue un documento firmado nuevo.';
      bloqueado = true;
    } else {
      texto = 'Indique la fecha en que el representante legal firmó la autorización.';
    }
  } else if (nuevo === 'REVOCADA') {
    texto = autorizacion.estado === 'REVOCADA'
      ? 'Puede corregir el motivo de la revocación.'
      : 'Indique en la observación el motivo por el que el representante retira la autorización.';
    if (tipo === 'PARTICIPACION' && autorizacion.estado !== 'REVOCADA') {
      texto += ' Si el estudiante pertenece a clubes, después deberá tramitar su retiro.';
    }
  } else if (nuevo === 'NO_OTORGADA') {
    texto = 'El representante legal no autorizó. Podrá otorgarse más adelante con el documento firmado.';
  } else {
    texto = 'Aún no se recibe la respuesta del representante legal.';
  }

  ayuda.textContent = texto;
  ayuda.className = bloqueado ? 'form-text mt-0 text-danger' : 'form-text mt-0';
  boton.disabled = bloqueado;
  etiquetaFecha.textContent = nuevo === 'OTORGADA' ? 'Fecha de autorización *' : 'Fecha de autorización';
  etiquetaObservacion.textContent = nuevo === 'REVOCADA' ? 'Motivo de la revocación *' : 'Observación';
}

function alertasDe(tipo) {
  return campo(pantalla.tarjetas.get(tipo), 'alertas');
}

function validarArchivo(archivo) {
  if (!archivo) {
    return 'Seleccione el documento firmado.';
  }
  const extension = archivo.name.includes('.') ? archivo.name.split('.').pop().toLowerCase() : '';
  if (!TIPOS_DOCUMENTO.includes(archivo.type) && !EXTENSIONES_DOCUMENTO.includes(extension)) {
    return 'El documento debe ser PDF, JPG o PNG.';
  }
  if (archivo.size === 0) {
    return 'El archivo está vacío.';
  }
  if (archivo.size > MAX_DOCUMENTO_BYTES) {
    return `El archivo pesa ${formatearTamano(archivo.size)}; el máximo permitido es 5 MB.`;
  }
  return null;
}

async function cargarDocumento(tipo) {
  const raiz = pantalla.tarjetas.get(tipo);
  const alertas = alertasDe(tipo);
  limpiarAlerta(alertas);
  const archivo = campo(raiz, 'archivo').files[0];
  const problema = validarArchivo(archivo);
  if (problema) {
    mostrarAlerta(alertas, 'danger', problema);
    return;
  }

  const estudiante = pantalla.estudianteAutorizaciones;
  const boton = campo(raiz, 'boton-cargar');
  establecerCargando(boton, true, 'Cargando...');
  try {
    const actualizada = await apiEnviarArchivo(
      `/api/estudiantes/${estudiante.id}/autorizaciones/${tipo}/documento`,
      archivo
    );
    pantalla.autorizaciones.set(tipo, actualizada);
    pantalla.autorizacionesCambiaron = true;
    establecerCargando(boton, false);
    renderizarTarjeta(tipo);
    if (actualizada.estado === 'OTORGADA') {
      mostrarAlerta(alertas, 'success', 'Documento reemplazado correctamente.');
    } else {
      campo(raiz, 'estado').value = 'OTORGADA';
      actualizarAyudaEstado(tipo);
      mostrarAlerta(alertas, 'success',
        'Documento cargado. Para completar el trámite, registre el estado Otorgada con la fecha de firma.');
    }
  } catch (error) {
    establecerCargando(boton, false);
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  }
}

function validarAutorizacion(tipo) {
  const raiz = pantalla.tarjetas.get(tipo);
  const nuevo = campo(raiz, 'estado').value;
  const fecha = campo(raiz, 'campo-fecha').value;
  const observacion = campo(raiz, 'campo-observacion').value.trim();
  const problemas = [];
  if (campo(raiz, 'campo-fecha').validity.badInput) {
    problemas.push('La fecha de la autorización no es válida.');
  }
  if (nuevo === 'OTORGADA' && !fecha) {
    problemas.push('Indique la fecha en que se otorgó la autorización.');
  }
  if (fecha && fecha > hoyEnGuayaquil()) {
    problemas.push('La fecha de la autorización no puede ser futura.');
  }
  if (nuevo === 'REVOCADA' && !observacion) {
    problemas.push('Indique en la observación el motivo de la revocación.');
  }
  return problemas;
}

async function guardarAutorizacion(tipo) {
  const raiz = pantalla.tarjetas.get(tipo);
  const alertas = alertasDe(tipo);
  limpiarAlerta(alertas);
  const problemas = validarAutorizacion(tipo);
  if (problemas.length > 0) {
    mostrarAlerta(alertas, 'danger', 'Revise los datos de la autorización:', problemas);
    return;
  }

  const nuevo = campo(raiz, 'estado').value;
  const anterior = (pantalla.autorizaciones.get(tipo) || autorizacionVacia(tipo)).estado;
  if (nuevo === 'REVOCADA' && anterior === 'OTORGADA') {
    const aceptado = await confirmarRevocacion(tipo);
    if (!aceptado) {
      return;
    }
  }

  const estudiante = pantalla.estudianteAutorizaciones;
  const cuerpo = {
    estado: nuevo,
    fechaRegistro: campo(raiz, 'campo-fecha').value || null,
    observacion: campo(raiz, 'campo-observacion').value.trim() || null
  };
  const boton = campo(raiz, 'boton-estado');
  establecerCargando(boton, true, 'Guardando...');
  try {
    const actualizada = await apiFetch(`/api/estudiantes/${estudiante.id}/autorizaciones/${tipo}`, {
      metodo: 'PUT',
      cuerpo
    });
    pantalla.autorizaciones.set(tipo, actualizada);
    pantalla.autorizacionesCambiaron = true;
    establecerCargando(boton, false);
    renderizarTarjeta(tipo);
    if (actualizada.advertencia) {
      mostrarAlerta(alertas, 'warning', actualizada.advertencia);
    } else {
      mostrarAlerta(alertas, 'success',
        `Autorización registrada como ${ESTADOS_AUTORIZACION[actualizada.estado].etiqueta}.`);
    }
  } catch (error) {
    establecerCargando(boton, false);
    actualizarAyudaEstado(tipo);
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  }
}

function confirmarRevocacion(tipo) {
  return new Promise(resolver => {
    const raiz = pantalla.tarjetas.get(tipo);
    const alertas = alertasDe(tipo);
    alertas.replaceChildren();
    const aviso = crearElemento('div', { clase: 'alert alert-warning mb-3', atributos: { role: 'alert' } });
    aviso.appendChild(crearElemento('p', {
      clase: 'mb-2',
      texto: 'La revocación queda registrada en la auditoría y no puede deshacerse: para volver a otorgarla '
        + 'se necesita un documento firmado nuevo. ¿Desea revocar la autorización?'
    }));
    const cancelar = crearElemento('button', {
      clase: 'btn btn-sm btn-outline-secondary me-2',
      texto: 'Cancelar',
      atributos: { type: 'button' }
    });
    const aceptar = crearElemento('button', {
      clase: 'btn btn-sm btn-danger',
      texto: 'Revocar',
      atributos: { type: 'button' }
    });
    const botonEstado = campo(raiz, 'boton-estado');
    botonEstado.disabled = true;
    const terminar = respuesta => {
      alertas.replaceChildren();
      botonEstado.disabled = false;
      resolver(respuesta);
    };
    cancelar.addEventListener('click', () => terminar(false));
    aceptar.addEventListener('click', () => terminar(true));
    aviso.append(cancelar, aceptar);
    alertas.appendChild(aviso);
    aceptar.focus();
  });
}

async function descargarDocumento(tipo) {
  const raiz = pantalla.tarjetas.get(tipo);
  const autorizacion = pantalla.autorizaciones.get(tipo);
  const alertas = alertasDe(tipo);
  limpiarAlerta(alertas);
  const boton = campo(raiz, 'descargar');
  boton.disabled = true;
  try {
    await apiDescargarArchivo(
      `/api/estudiantes/${pantalla.estudianteAutorizaciones.id}/autorizaciones/${tipo}/documento`,
      autorizacion ? autorizacion.documentoNombre : 'documento'
    );
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error));
  } finally {
    boton.disabled = false;
  }
}
