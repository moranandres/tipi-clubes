import {
  apiFetch,
  apiEnviarFormulario,
  apiObtenerArchivo,
  apiDescargarArchivo,
  construirConsulta,
  ApiError
} from './api.js';
import {
  cargarClubes,
  cargarInstituciones,
  cargarPeriodos,
  cargarActividadesDelClub,
  cargarEstudiantesDeInstitucion
} from './catalogos.js';
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
const MAXIMO_BYTES = 5 * 1024 * 1024;
const MAXIMO_ESTUDIANTES = 60;
const ROLES_GLOBALES = ['ADMIN', 'COORDINADOR', 'CONSULTA'];

const TIPOS = {
  FOTOGRAFIA: { etiqueta: 'Fotografía', icono: 'bi-camera', clase: 'text-bg-primary' },
  DOCUMENTO: { etiqueta: 'Informe', icono: 'bi-file-earmark-pdf', clase: 'text-bg-danger' },
  ENLACE: { etiqueta: 'Enlace', icono: 'bi-link-45deg', clase: 'text-bg-info' },
  PRODUCTO: { etiqueta: 'Producto', icono: 'bi-box-seam', clase: 'text-bg-warning' }
};

const FORMATOS = {
  IMAGEN: {
    tipos: ['image/jpeg', 'image/png'],
    extensiones: ['.jpg', '.jpeg', '.png'],
    aceptar: '.jpg,.jpeg,.png,image/jpeg,image/png',
    ayuda: 'Imagen JPG o PNG de máximo 5 MB. El sistema la vuelve a codificar y elimina sus metadatos (ubicación GPS, cámara).',
    error: 'Para una fotografía adjunte una imagen JPG o PNG.'
  },
  PDF: {
    tipos: ['application/pdf'],
    extensiones: ['.pdf'],
    aceptar: '.pdf,application/pdf',
    ayuda: 'Archivo PDF de máximo 5 MB, sin contenido activo (JavaScript, formularios ni adjuntos).',
    error: 'Adjunte un archivo PDF.'
  }
};

const ESTADOS_ACTIVIDAD = {
  PLANIFICADA: { etiqueta: 'Planificada', clase: 'text-bg-info' },
  EJECUTADA: { etiqueta: 'Ejecutada', clase: 'text-bg-success' },
  CANCELADA: { etiqueta: 'Cancelada', clase: 'text-bg-secondary' }
};

const ESTADOS_CLUB = {
  PLANIFICADO: { etiqueta: 'Planificado', clase: 'text-bg-info' },
  ACTIVO: { etiqueta: 'Activo', clase: 'text-bg-success' },
  SUSPENDIDO: { etiqueta: 'Suspendido', clase: 'text-bg-warning' },
  CERRADO: { etiqueta: 'Cerrado', clase: 'text-bg-secondary' }
};

const ESTADOS_AUTORIZACION = {
  OTORGADA: 'otorgada',
  PENDIENTE: 'pendiente',
  NO_OTORGADA: 'no otorgada',
  REVOCADA: 'revocada'
};

const ESTADOS_ASISTENCIA = {
  PRESENTE: { etiqueta: 'Presente', clase: 'text-bg-success' },
  ATRASADO: { etiqueta: 'Atrasado', clase: 'text-bg-warning' },
  AUSENTE: { etiqueta: 'Ausente', clase: 'text-bg-danger' },
  JUSTIFICADO: { etiqueta: 'Justificado', clase: 'text-bg-info' }
};

const sesion = exigirSesion();
const pantalla = {
  clubId: null,
  datos: null,
  modo: null,
  evidencia: null,
  candidatos: [],
  cargandoCandidatos: false,
  seleccion: new Set(),
  originales: new Set(),
  filtrosBusqueda: { estado: 'ACTIVA' },
  paginaBusqueda: 0,
  busquedaVigente: false,
  resumen: null,
  resumenVigente: false,
  detalle: null,
  urlPrevia: null,
  urlFoto: null,
  solicitudSesiones: 0,
  solicitudActividad: 0,
  solicitudCandidatos: 0,
  solicitudBusqueda: 0,
  solicitudResumen: 0,
  solicitudDetalle: 0
};
const catalogo = { clubes: [], clubesPorId: new Map(), instituciones: [], periodos: [] };
let modalEvidencia = null;
let modalRetiro = null;
let modalDetalle = null;

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

function mensajeDe(error) {
  return error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
}

function hoy() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function hhmm(texto) {
  return texto ? texto.slice(0, 5) : '';
}

function textoPorcentaje(valor) {
  return valor === null || valor === undefined
    ? '—'
    : `${Number(valor).toLocaleString('es-EC', { maximumFractionDigits: 1 })} %`;
}

function textoTamano(bytes) {
  if (bytes === null || bytes === undefined) {
    return '';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toLocaleString('es-EC', { maximumFractionDigits: 0 })} KB`;
  }
  return `${(bytes / (1024 * 1024)).toLocaleString('es-EC', { maximumFractionDigits: 1 })} MB`;
}

function urlSegura(texto) {
  try {
    const direccion = new URL(texto);
    return direccion.protocol === 'http:' || direccion.protocol === 'https:' ? direccion : null;
  } catch (error) {
    return null;
  }
}

function nombreEstudiante(estudiante) {
  if (!estudiante.estudianteNombres && !estudiante.estudianteApellidos) {
    return null;
  }
  return `${estudiante.estudianteApellidos || ''} ${estudiante.estudianteNombres || ''}`.trim();
}

function insignia(texto, clase, titulo) {
  const atributos = titulo ? { title: titulo } : undefined;
  return crearElemento('span', { clase: `badge ${clase}`, texto, atributos });
}

function insigniaTipo(tipo) {
  const datos = TIPOS[tipo] || { etiqueta: tipo, icono: 'bi-question', clase: 'text-bg-light' };
  return crearElemento('span', { clase: `badge ${datos.clase}` }, [
    crearElemento('i', { clase: `bi ${datos.icono} me-1`, atributos: { 'aria-hidden': 'true' } }),
    document.createTextNode(datos.etiqueta)
  ]);
}

function fotoBloqueada(evidencia) {
  return evidencia.estado === 'ACTIVA' && evidencia.tipo === 'FOTOGRAFIA' && !evidencia.descargable;
}

function insigniasEvidencia(evidencia) {
  const partes = [insigniaTipo(evidencia.tipo)];
  if (evidencia.estado === 'RETIRADA') {
    partes.push(insignia('Retirada', 'text-bg-secondary ms-1'));
  }
  if (fotoBloqueada(evidencia)) {
    partes.push(insignia('Bloqueada', 'text-bg-warning ms-1', evidencia.motivoNoDescargable));
  }
  return partes;
}

function textoContenido(evidencia) {
  if (evidencia.archivoNombre) {
    return `${evidencia.archivoNombre} · ${textoTamano(evidencia.archivoTamano)}`;
  }
  if (evidencia.url) {
    const direccion = urlSegura(evidencia.url);
    return direccion ? direccion.host : evidencia.url;
  }
  return '';
}

function textoClub(club) {
  return esGlobal() ? `${club.nombre} — ${club.institucionNombre}` : club.nombre;
}

function llenarSelect(selector, elementos, textoVacio, obtenerValor, obtenerTexto) {
  const opciones = [crearElemento('option', { texto: textoVacio, atributos: { value: '' } })];
  elementos.forEach(item => {
    opciones.push(crearElemento('option', { texto: obtenerTexto(item), atributos: { value: obtenerValor(item) } }));
  });
  selector.replaceChildren(...opciones);
}

function cifra(valor, texto, clase = '') {
  return crearElemento('div', { clase: 'col-6 col-md-4 col-xl' }, [
    crearElemento('div', { clase: `border rounded p-2 h-100 ${clase}` }, [
      crearElemento('div', { clase: 'fs-5 fw-semibold lh-sm', texto: String(valor) }),
      crearElemento('div', { clase: 'small text-body-secondary', texto })
    ])
  ]);
}

function botonIcono(icono, etiqueta, contexto, accion, clase = 'btn-outline-secondary') {
  const boton = crearElemento('button', {
    clase: `btn btn-sm ${clase} ms-1`,
    atributos: { type: 'button', title: etiqueta, 'aria-label': `${etiqueta}: ${contexto}` }
  }, [crearElemento('i', { clase: `bi ${icono}`, atributos: { 'aria-hidden': 'true' } })]);
  boton.addEventListener('click', accion);
  return boton;
}

function enlaceIcono(icono, etiqueta, contexto, href, externo = false) {
  const atributos = { href, title: etiqueta, 'aria-label': `${etiqueta}: ${contexto}` };
  if (externo) {
    atributos.target = '_blank';
    atributos.rel = 'noopener noreferrer';
  }
  return crearElemento('a', { clase: 'btn btn-sm btn-outline-secondary ms-1', atributos }, [
    crearElemento('i', { clase: `bi ${icono}`, atributos: { 'aria-hidden': 'true' } })
  ]);
}

async function iniciar() {
  montarLayout(sesion, 'evidencias');

  modalEvidencia = bootstrap.Modal.getOrCreateInstance(elemento('modal-evidencia'));
  modalRetiro = bootstrap.Modal.getOrCreateInstance(elemento('modal-retiro'));
  modalDetalle = bootstrap.Modal.getOrCreateInstance(elemento('modal-detalle'));

  elemento('grupo-busqueda-institucion').hidden = !esGlobal();
  elemento('grupo-resumen-institucion').hidden = !esGlobal();

  elemento('selector-club').addEventListener('change', () => {
    seleccionarClub(Number(elemento('selector-club').value) || null, null);
  });
  elemento('selector-actividad').addEventListener('change', () => {
    const actividadId = Number(elemento('selector-actividad').value) || null;
    if (actividadId) {
      cargarActividad(actividadId);
    } else {
      ocultarActividad();
    }
  });
  elemento('mostrar-retiradas').addEventListener('change', renderizarTarjetas);
  elemento('boton-agregar').addEventListener('click', () => abrirFormulario('crear', null));

  document.querySelectorAll('input[name="tipo"]').forEach(radio => {
    radio.addEventListener('change', () => {
      limpiarArchivo();
      aplicarTipo();
    });
  });
  document.querySelectorAll('input[name="modo-producto"]').forEach(radio => {
    radio.addEventListener('change', () => {
      limpiarArchivo();
      aplicarTipo();
    });
  });
  elemento('campo-archivo').addEventListener('change', revisarArchivo);
  elemento('campo-descripcion').addEventListener('input', () => {
    elemento('contador-descripcion').textContent = `${elemento('campo-descripcion').value.length} / 1000`;
  });
  elemento('campo-sin-estudiantes').addEventListener('change', () => {
    if (elemento('campo-sin-estudiantes').checked) {
      pantalla.seleccion.clear();
    }
    renderizarCandidatos();
  });
  elemento('filtro-estudiantes').addEventListener('input', renderizarCandidatos);
  elemento('formulario-evidencia').addEventListener('submit', guardarEvidencia);
  elemento('modal-evidencia').addEventListener('hidden.bs.modal', limpiarArchivo);

  elemento('formulario-retiro').addEventListener('submit', confirmarRetiro);
  elemento('retiro-motivo').addEventListener('input', () => {
    elemento('contador-retiro-motivo').textContent = `${elemento('retiro-motivo').value.length} / 500`;
  });

  elemento('boton-detalle-ver-foto').addEventListener('click', verFotografia);
  elemento('boton-detalle-descargar').addEventListener('click', () => {
    if (pantalla.detalle) {
      descargar(pantalla.detalle, elemento('alertas-detalle'));
    }
  });
  elemento('boton-detalle-actividad').addEventListener('click', () => {
    const evidencia = pantalla.detalle;
    modalDetalle.hide();
    if (evidencia) {
      irAActividad(evidencia.actividadId);
    }
  });
  elemento('modal-detalle').addEventListener('hidden.bs.modal', liberarFoto);

  elemento('formulario-busqueda').addEventListener('submit', evento => {
    evento.preventDefault();
    const desde = elemento('busqueda-desde').value;
    const hasta = elemento('busqueda-hasta').value;
    if (desde && hasta && hasta < desde) {
      mostrarAlerta(elemento('alertas-busqueda'), 'danger', 'La fecha «hasta» no puede ser anterior a «desde».');
      return;
    }
    pantalla.filtrosBusqueda = leerFiltrosBusqueda();
    cargarBusqueda(0);
  });
  elemento('formulario-busqueda').addEventListener('reset', () => {
    setTimeout(() => {
      llenarClubesBusqueda();
      pantalla.filtrosBusqueda = leerFiltrosBusqueda();
      cargarBusqueda(0);
    }, 0);
  });
  elemento('busqueda-institucion').addEventListener('change', llenarClubesBusqueda);

  elemento('formulario-resumen').addEventListener('submit', evento => {
    evento.preventDefault();
    cargarResumen();
  });
  elemento('resumen-solo-sin').addEventListener('change', renderizarFilasResumen);

  elemento('pestana-busqueda').addEventListener('shown.bs.tab', () => {
    if (!pantalla.busquedaVigente) {
      cargarBusqueda(pantalla.paginaBusqueda);
    }
  });
  elemento('pestana-resumen').addEventListener('shown.bs.tab', () => {
    if (!pantalla.resumenVigente) {
      cargarResumen();
    }
  });

  await cargarCatalogos();
  await aplicarParametrosIniciales();
}

async function cargarCatalogos() {
  const [clubes, periodos, instituciones] = await Promise.all([
    cargarClubes().catch(error => {
      mostrarAlerta(elemento('alertas'), 'danger', `No se pudieron cargar los clubes. ${mensajeDe(error)}`);
      return [];
    }),
    cargarPeriodos().catch(() => []),
    esGlobal() ? cargarInstituciones().catch(() => []) : Promise.resolve([])
  ]);
  catalogo.clubes = clubes.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  catalogo.clubesPorId = new Map(catalogo.clubes.map(club => [club.id, club]));
  catalogo.periodos = periodos;
  catalogo.instituciones = instituciones;

  const conActividades = catalogo.clubes.filter(club => club.estado !== 'PLANIFICADO');
  llenarSelect(elemento('selector-club'), conActividades, 'Seleccione un club', club => String(club.id), textoClub);
  llenarClubesBusqueda();

  if (esGlobal()) {
    llenarSelect(elemento('busqueda-institucion'), instituciones, 'Todas', item => String(item.id), item => item.nombre);
    llenarSelect(elemento('resumen-institucion'), instituciones, 'Todas', item => String(item.id), item => item.nombre);
  }

  const activo = periodos.find(periodo => periodo.activo);
  const ordenados = periodos.slice().sort((a, b) => (b.fechaInicio || '').localeCompare(a.fechaInicio || ''));
  llenarSelect(elemento('resumen-periodo'), ordenados, activo ? 'Período activo' : 'Seleccione un período',
    periodo => String(periodo.id), periodo => (periodo.activo ? `${periodo.nombre} (activo)` : periodo.nombre));
  if (activo) {
    elemento('resumen-periodo').value = String(activo.id);
  }
}

function llenarClubesBusqueda() {
  const institucionId = Number(elemento('busqueda-institucion').value) || null;
  const clubes = catalogo.clubes.filter(club => club.estado !== 'PLANIFICADO'
    && (!institucionId || club.institucionId === institucionId));
  const anterior = elemento('busqueda-club').value;
  llenarSelect(elemento('busqueda-club'), clubes, 'Todos', club => String(club.id), textoClub);
  if (clubes.some(club => String(club.id) === anterior)) {
    elemento('busqueda-club').value = anterior;
  }
}

function mostrarPestana(id) {
  bootstrap.Tab.getOrCreateInstance(elemento(id)).show();
}

async function aplicarParametrosIniciales() {
  const parametros = new URLSearchParams(window.location.search);
  const actividadId = Number(parametros.get('actividadId'));
  if (Number.isInteger(actividadId) && actividadId > 0) {
    await abrirActividadDirecta(actividadId);
    return;
  }
  const clubId = Number(parametros.get('clubId'));
  const pestana = parametros.get('pestana');
  if (pestana === 'resumen') {
    mostrarPestana('pestana-resumen');
  } else if (pestana === 'buscar') {
    if (clubId && catalogo.clubesPorId.has(clubId)) {
      elemento('busqueda-club').value = String(clubId);
    }
    pantalla.filtrosBusqueda = leerFiltrosBusqueda();
    mostrarPestana('pestana-busqueda');
  }
  const opcionesClub = elemento('selector-club');
  if (clubId && opcionesClub.querySelector(`option[value="${clubId}"]`)) {
    opcionesClub.value = String(clubId);
    await seleccionarClub(clubId, null);
  } else if (opcionesClub.options.length === 2) {
    opcionesClub.selectedIndex = 1;
    await seleccionarClub(Number(opcionesClub.value), null);
  }
}

function asegurarOpcionClub(clubId, nombre) {
  const selector = elemento('selector-club');
  if (!selector.querySelector(`option[value="${clubId}"]`)) {
    selector.appendChild(crearElemento('option', { texto: nombre, atributos: { value: String(clubId) } }));
  }
  selector.value = String(clubId);
}

async function abrirActividadDirecta(actividadId) {
  try {
    const datos = await apiFetch(`/api/actividades/${actividadId}/evidencias`);
    asegurarOpcionClub(datos.clubId, datos.clubNombre);
    await seleccionarClub(datos.clubId, datos);
  } catch (error) {
    mostrarAlerta(elemento('alertas'), 'danger', `No se pudieron abrir las evidencias solicitadas. ${mensajeDe(error)}`);
  }
}

function irAActividad(actividadId) {
  mostrarPestana('pestana-actividad');
  limpiarAlerta(elemento('alertas'));
  window.history.replaceState(null, '', `evidencias.html?actividadId=${actividadId}`);
  abrirActividadDirecta(actividadId);
}

async function seleccionarClub(clubId, datosIniciales) {
  pantalla.clubId = clubId;
  limpiarAlerta(elemento('alertas-actividad'));
  ocultarActividad();
  const selector = elemento('selector-actividad');
  if (!clubId) {
    selector.replaceChildren(crearElemento('option', { texto: 'Seleccione primero un club', atributos: { value: '' } }));
    selector.disabled = true;
    return;
  }
  await cargarSesiones(clubId, datosIniciales);
  if (datosIniciales) {
    mostrarActividad(datosIniciales);
  }
}

async function cargarSesiones(clubId, datosIniciales) {
  const selector = elemento('selector-actividad');
  const solicitud = ++pantalla.solicitudSesiones;
  selector.replaceChildren(crearElemento('option', { texto: 'Cargando sesiones...', atributos: { value: '' } }));
  selector.disabled = true;
  try {
    const actividades = await cargarActividadesDelClub(clubId, 'EJECUTADA');
    if (solicitud !== pantalla.solicitudSesiones) {
      return;
    }
    const opciones = [crearElemento('option', {
      texto: actividades.length === 0 ? 'El club no tiene sesiones ejecutadas' : 'Seleccione una sesión',
      atributos: { value: '' }
    })];
    actividades.forEach(actividad => {
      const curso = actividad.cursoNombre ? ` · ${actividad.cursoNombre}` : '';
      opciones.push(crearElemento('option', {
        texto: `${formatearFecha(actividad.fecha)} ${hhmm(actividad.horaInicio)} · ${actividad.tema}${curso}`,
        atributos: { value: String(actividad.id) }
      }));
    });
    selector.replaceChildren(...opciones);
    if (datosIniciales && !selector.querySelector(`option[value="${datosIniciales.actividadId}"]`)) {
      const estado = ESTADOS_ACTIVIDAD[datosIniciales.estadoActividad];
      selector.appendChild(crearElemento('option', {
        texto: `${formatearFecha(datosIniciales.actividadFecha)} · ${datosIniciales.actividadTema} (${estado ? estado.etiqueta : datosIniciales.estadoActividad})`,
        atributos: { value: String(datosIniciales.actividadId) }
      }));
    }
    if (datosIniciales) {
      selector.value = String(datosIniciales.actividadId);
    }
    selector.disabled = selector.options.length <= 1;
  } catch (error) {
    if (solicitud === pantalla.solicitudSesiones) {
      selector.replaceChildren(crearElemento('option', { texto: 'No se pudieron cargar las sesiones', atributos: { value: '' } }));
      mostrarAlerta(elemento('alertas-actividad'), 'danger', mensajeDe(error));
    }
  }
}

async function cargarActividad(actividadId) {
  const solicitud = ++pantalla.solicitudActividad;
  limpiarAlerta(elemento('alertas-actividad'));
  try {
    const datos = await apiFetch(`/api/actividades/${actividadId}/evidencias`);
    if (solicitud !== pantalla.solicitudActividad) {
      return;
    }
    mostrarActividad(datos);
  } catch (error) {
    if (solicitud === pantalla.solicitudActividad) {
      ocultarActividad();
      mostrarAlerta(elemento('alertas-actividad'), 'danger', mensajeDe(error));
    }
  }
}

function ocultarActividad() {
  pantalla.datos = null;
  elemento('actividad').hidden = true;
  elemento('actividad-vacia').hidden = false;
}

function mostrarActividad(datos) {
  pantalla.datos = datos;
  elemento('actividad-vacia').hidden = true;
  elemento('actividad').hidden = false;

  elemento('actividad-tema').textContent = datos.actividadTema;
  const estado = ESTADOS_ACTIVIDAD[datos.estadoActividad] || { etiqueta: datos.estadoActividad, clase: 'text-bg-light' };
  elemento('actividad-estado').replaceChildren(insignia(estado.etiqueta, estado.clase));
  elemento('actividad-datos').textContent = `${datos.clubNombre} · Sesión del ${formatearFecha(datos.actividadFecha)}`;
  elemento('enlace-actividad').href = `actividades.html?id=${datos.actividadId}`;
  elemento('enlace-asistencia').href = `asistencia.html?actividadId=${datos.actividadId}`;

  const lleno = datos.activas >= datos.maximoPorActividad;
  elemento('actividad-cifras').replaceChildren(
    cifra(`${datos.activas} / ${datos.maximoPorActividad}`, 'evidencias activas', lleno ? 'border-warning' : ''),
    cifra(datos.conteo.fotografias, 'fotografías'),
    cifra(datos.conteo.documentos, 'informes'),
    cifra(datos.conteo.enlaces, 'enlaces'),
    cifra(datos.conteo.productos, 'productos'),
    cifra(datos.retiradas, 'retiradas')
  );

  const bloqueo = elemento('actividad-bloqueo');
  bloqueo.replaceChildren();
  if (!datos.editable && datos.motivoNoEditable) {
    bloqueo.appendChild(crearElemento('div', {
      clase: 'alert alert-secondary py-2 small',
      texto: datos.motivoNoEditable,
      atributos: { role: 'status' }
    }));
  } else if (datos.editable && lleno) {
    bloqueo.appendChild(crearElemento('div', {
      clase: 'alert alert-warning py-2 small',
      texto: `La sesión ya tiene ${datos.maximoPorActividad} evidencias activas, el máximo permitido. Retire alguna antes de agregar otra.`,
      atributos: { role: 'status' }
    }));
  }

  const agregar = elemento('boton-agregar');
  agregar.hidden = !datos.editable;
  agregar.disabled = lleno;

  const casilla = elemento('mostrar-retiradas');
  casilla.parentElement.hidden = datos.retiradas === 0;
  if (datos.retiradas === 0) {
    casilla.checked = false;
  }
  elemento('etiqueta-retiradas').textContent = `Mostrar evidencias retiradas (${datos.retiradas})`;
  renderizarTarjetas();
}

function renderizarTarjetas() {
  const datos = pantalla.datos;
  const contenedor = elemento('lista-evidencias');
  if (!datos) {
    contenedor.replaceChildren();
    return;
  }
  const incluirRetiradas = elemento('mostrar-retiradas').checked;
  const visibles = datos.evidencias.filter(evidencia => incluirRetiradas || evidencia.estado === 'ACTIVA');
  if (visibles.length === 0) {
    const texto = datos.editable
      ? 'Esta sesión aún no tiene evidencias activas. Use «Agregar evidencia» para subir fotografías, informes, enlaces o productos.'
      : 'Esta sesión no tiene evidencias activas.';
    contenedor.replaceChildren(crearElemento('div', { clase: 'col-12' }, [
      crearElemento('p', { clase: 'text-center text-body-secondary py-4 mb-0', texto })
    ]));
    return;
  }
  contenedor.replaceChildren(...visibles.map(tarjetaEvidencia));
}

function listaEstudiantesCorta(evidencia) {
  if (evidencia.sinEstudiantesIdentificables) {
    return crearElemento('p', { clase: 'small text-body-secondary mb-2' }, [
      crearElemento('i', { clase: 'bi bi-person-slash me-1', atributos: { 'aria-hidden': 'true' } }),
      document.createTextNode('Sin estudiantes identificables')
    ]);
  }
  if (evidencia.estudiantes.length === 0) {
    return null;
  }
  const esFoto = evidencia.tipo === 'FOTOGRAFIA';
  const elementos = evidencia.estudiantes.map(estudiante => {
    const nombre = nombreEstudiante(estudiante) || estudiante.estudianteCodigo;
    const hijos = [];
    if (esFoto) {
      hijos.push(crearElemento('i', {
        clase: estudiante.autorizacionImagenVigente
          ? 'bi bi-check-circle-fill text-success me-1'
          : 'bi bi-exclamation-triangle-fill text-danger me-1',
        atributos: { 'aria-hidden': 'true' }
      }));
    }
    hijos.push(document.createTextNode(nombre));
    if (esFoto && !estudiante.autorizacionImagenVigente) {
      hijos.push(crearElemento('span', { clase: 'visually-hidden', texto: ' (sin autorización de imagen vigente)' }));
    }
    return crearElemento('li', {
      clase: 'chip-estudiante',
      atributos: esFoto && !estudiante.autorizacionImagenVigente ? { title: 'Su autorización de uso de imagen ya no está otorgada' } : {}
    }, hijos);
  });
  return crearElemento('div', { clase: 'mb-2' }, [
    crearElemento('div', {
      clase: 'small text-body-secondary mb-1',
      texto: esFoto ? 'Aparecen en la fotografía:' : 'Estudiantes autores:'
    }),
    crearElemento('ul', { clase: 'list-unstyled d-flex flex-wrap gap-1 mb-0 small' }, elementos)
  ]);
}

function tarjetaEvidencia(evidencia) {
  const datos = pantalla.datos;
  const retirada = evidencia.estado === 'RETIRADA';
  const cuerpo = [
    crearElemento('div', { clase: 'd-flex flex-wrap gap-1 mb-2' }, insigniasEvidencia(evidencia)),
    crearElemento('h3', { clase: 'h6 mb-1 text-break', texto: evidencia.titulo }),
    crearElemento('p', {
      clase: 'small text-body-secondary mb-2',
      texto: `Fecha: ${formatearFecha(evidencia.fechaEvidencia)}${textoContenido(evidencia) ? ` · ${textoContenido(evidencia)}` : ''}`
    }),
    crearElemento('p', { clase: 'small mb-2 texto-recortado', texto: evidencia.descripcion })
  ];
  const estudiantes = listaEstudiantesCorta(evidencia);
  if (estudiantes) {
    cuerpo.push(estudiantes);
  }
  if (fotoBloqueada(evidencia)) {
    cuerpo.push(crearElemento('div', {
      clase: 'alert alert-warning py-1 px-2 small mb-0',
      texto: `${evidencia.motivoNoDescargable} Si la persona sigue apareciendo, retire la fotografía.`
    }));
  }
  if (retirada) {
    cuerpo.push(crearElemento('p', {
      clase: 'small text-danger-emphasis mb-0 texto-preformateado',
      texto: `Retirada: ${evidencia.motivoRetiro || '—'}`
    }));
  }

  const acciones = [botonIcono('bi-eye', 'Ver detalle', evidencia.titulo, () => abrirDetalle(evidencia, false))];
  if (evidencia.descargable) {
    acciones.push(botonIcono('bi-download', 'Descargar', evidencia.titulo,
      () => descargar(evidencia, elemento('alertas-actividad'))));
  }
  const direccion = !retirada && evidencia.url ? urlSegura(evidencia.url) : null;
  if (direccion) {
    acciones.push(enlaceIcono('bi-box-arrow-up-right', 'Abrir enlace', evidencia.titulo, direccion.href, true));
  }
  if (datos && datos.editable && !retirada) {
    acciones.push(botonIcono('bi-pencil', 'Editar', evidencia.titulo, () => abrirFormulario('editar', evidencia)));
    acciones.push(botonIcono('bi-archive', 'Retirar', evidencia.titulo, () => abrirRetiro(evidencia), 'btn-outline-danger'));
  }

  return crearElemento('div', { clase: 'col-md-6 col-xxl-4' }, [
    crearElemento('article', {
      clase: `card h-100 shadow-sm${retirada ? ' tarjeta-retirada' : ''}${fotoBloqueada(evidencia) ? ' tarjeta-alerta' : ''}`,
      atributos: { 'aria-label': `${TIPOS[evidencia.tipo] ? TIPOS[evidencia.tipo].etiqueta : evidencia.tipo}: ${evidencia.titulo}` }
    }, [
      crearElemento('div', { clase: 'card-body' }, cuerpo),
      crearElemento('div', { clase: 'card-footer bg-transparent text-end' }, acciones)
    ])
  ]);
}

async function descargar(evidencia, contenedorAlertas) {
  try {
    await apiDescargarArchivo(evidencia.descargaUrl, evidencia.archivoNombre);
  } catch (error) {
    mostrarAlerta(contenedorAlertas, 'danger', `No se pudo descargar «${evidencia.titulo}». ${mensajeDe(error)}`);
  }
}

function tipoSeleccionado() {
  const marcado = document.querySelector('input[name="tipo"]:checked');
  return marcado ? marcado.value : null;
}

function modoProducto() {
  const marcado = document.querySelector('input[name="modo-producto"]:checked');
  return marcado ? marcado.value : 'ARCHIVO';
}

function usaArchivo(tipo) {
  if (pantalla.modo !== 'crear') {
    return false;
  }
  return tipo === 'FOTOGRAFIA' || tipo === 'DOCUMENTO' || (tipo === 'PRODUCTO' && modoProducto() === 'ARCHIVO');
}

function usaUrl(tipo) {
  if (pantalla.modo !== 'crear') {
    return false;
  }
  return tipo === 'ENLACE' || (tipo === 'PRODUCTO' && modoProducto() === 'ENLACE');
}

function relacionaEstudiantes(tipo) {
  return tipo === 'FOTOGRAFIA' || tipo === 'PRODUCTO';
}

function formatoDe(tipo) {
  return tipo === 'FOTOGRAFIA' ? FORMATOS.IMAGEN : FORMATOS.PDF;
}

function limpiarArchivo() {
  elemento('campo-archivo').value = '';
  elemento('vista-previa').hidden = true;
  elemento('imagen-previa').removeAttribute('src');
  if (pantalla.urlPrevia) {
    URL.revokeObjectURL(pantalla.urlPrevia);
    pantalla.urlPrevia = null;
  }
}

function problemaDeArchivo(archivo, tipo) {
  const formato = formatoDe(tipo);
  const nombre = archivo.name.toLowerCase();
  const extensionValida = formato.extensiones.some(extension => nombre.endsWith(extension));
  const tipoValido = !archivo.type || formato.tipos.includes(archivo.type);
  if (!extensionValida || !tipoValido) {
    return formato.error;
  }
  if (archivo.size === 0) {
    return 'El archivo está vacío.';
  }
  if (archivo.size > MAXIMO_BYTES) {
    return `El archivo pesa ${textoTamano(archivo.size)}; el máximo permitido es 5 MB.`;
  }
  return null;
}

function revisarArchivo() {
  const tipo = tipoSeleccionado();
  const archivo = elemento('campo-archivo').files[0];
  const alertas = elemento('alertas-evidencia');
  elemento('vista-previa').hidden = true;
  if (pantalla.urlPrevia) {
    URL.revokeObjectURL(pantalla.urlPrevia);
    pantalla.urlPrevia = null;
  }
  if (!archivo) {
    return;
  }
  const problema = problemaDeArchivo(archivo, tipo);
  if (problema) {
    mostrarAlerta(alertas, 'danger', problema);
    return;
  }
  limpiarAlerta(alertas);
  if (tipo === 'FOTOGRAFIA') {
    pantalla.urlPrevia = URL.createObjectURL(archivo);
    elemento('imagen-previa').src = pantalla.urlPrevia;
    elemento('vista-previa').hidden = false;
  }
}

function abrirFormulario(modo, evidencia) {
  const datos = pantalla.datos;
  if (!datos) {
    return;
  }
  pantalla.modo = modo;
  pantalla.evidencia = evidencia;
  const esCrear = modo === 'crear';

  limpiarAlerta(elemento('alertas-evidencia'));
  limpiarArchivo();
  elemento('titulo-modal-evidencia').textContent = esCrear ? 'Agregar evidencia' : 'Editar evidencia';
  elemento('evidencia-sesion').textContent =
    `${datos.actividadTema} · ${datos.clubNombre} · Sesión del ${formatearFecha(datos.actividadFecha)}`;

  document.querySelectorAll('input[name="tipo"]').forEach(radio => {
    radio.checked = !esCrear && radio.value === evidencia.tipo;
    radio.disabled = !esCrear;
  });
  elemento('modo-producto-archivo').checked = true;

  elemento('campo-titulo').value = evidencia ? evidencia.titulo : '';
  elemento('campo-descripcion').value = evidencia ? evidencia.descripcion : '';
  elemento('contador-descripcion').textContent = `${elemento('campo-descripcion').value.length} / 1000`;
  const campoFecha = elemento('campo-fecha');
  campoFecha.min = datos.actividadFecha;
  campoFecha.max = hoy();
  campoFecha.value = evidencia ? evidencia.fechaEvidencia : datos.actividadFecha;
  elemento('ayuda-fecha').textContent = `Entre el ${formatearFecha(datos.actividadFecha)} (fecha de la sesión) y hoy.`;
  elemento('campo-url').value = '';
  elemento('campo-sin-estudiantes').checked = Boolean(evidencia && evidencia.sinEstudiantesIdentificables);
  elemento('filtro-estudiantes').value = '';

  if (!esCrear) {
    const contenido = evidencia.archivoNombre
      ? `Archivo: ${evidencia.archivoNombre} (${textoTamano(evidencia.archivoTamano)}).`
      : `Enlace: ${evidencia.url}.`;
    elemento('texto-fijo').textContent =
      `${contenido} El tipo, el archivo y el enlace de una evidencia no cambian: para reemplazarlos, retírela y registre una nueva.`;
  }

  pantalla.originales = new Set(evidencia ? evidencia.estudiantes.map(estudiante => estudiante.estudianteId) : []);
  pantalla.seleccion = new Set(pantalla.originales);

  elemento('boton-guardar-evidencia').disabled = false;
  aplicarTipo();
  modalEvidencia.show();
  cargarCandidatos(datos, evidencia);
}

function aplicarTipo() {
  const tipo = tipoSeleccionado();
  const esCrear = pantalla.modo === 'crear';
  elemento('campos-evidencia').hidden = !tipo;
  if (!tipo) {
    return;
  }
  elemento('grupo-modo-producto').hidden = !(esCrear && tipo === 'PRODUCTO');

  const conArchivo = usaArchivo(tipo);
  elemento('grupo-archivo').hidden = !conArchivo;
  if (conArchivo) {
    const formato = formatoDe(tipo);
    elemento('campo-archivo').accept = formato.aceptar;
    elemento('ayuda-archivo').textContent = formato.ayuda;
  }
  elemento('grupo-url').hidden = !usaUrl(tipo);
  elemento('grupo-fijo').hidden = esCrear;

  const conEstudiantes = relacionaEstudiantes(tipo);
  const esFoto = tipo === 'FOTOGRAFIA';
  elemento('grupo-estudiantes').hidden = !conEstudiantes;
  elemento('aviso-imagen').hidden = !esFoto;
  elemento('grupo-sin-estudiantes').hidden = !esFoto;
  elemento('leyenda-estudiantes').textContent = esFoto
    ? 'Estudiantes que aparecen en la fotografía *'
    : 'Estudiantes autores del producto (opcional)';
  if (!esFoto) {
    elemento('campo-sin-estudiantes').checked = false;
  }
  if (!conEstudiantes) {
    pantalla.seleccion.clear();
  }
  if (esFoto) {
    pantalla.candidatos.forEach(candidato => {
      if (!fotoPermitida(candidato)) {
        pantalla.seleccion.delete(candidato.id);
      }
    });
  }
  renderizarCandidatos();
}

function fotoPermitida(candidato) {
  return candidato.autorizacion === null || candidato.autorizacion === 'OTORGADA' || pantalla.originales.has(candidato.id);
}

async function cargarCandidatos(datos, evidencia) {
  const solicitud = ++pantalla.solicitudCandidatos;
  const extras = evidencia ? evidencia.estudiantes : [];
  pantalla.cargandoCandidatos = true;
  pantalla.candidatos = [];
  renderizarCandidatos();
  const [planilla, estudiantes] = await Promise.all([
    apiFetch(`/api/actividades/${datos.actividadId}/asistencia`).catch(() => null),
    cargarEstudiantesDeInstitucion(datos.institucionId).catch(() => null)
  ]);
  if (solicitud !== pantalla.solicitudCandidatos) {
    return;
  }
  pantalla.cargandoCandidatos = false;
  const autorizaciones = estudiantes
    ? new Map(estudiantes.map(estudiante => [estudiante.id, estudiante.autorizacionUsoImagen || 'PENDIENTE']))
    : null;
  const base = planilla ? planilla.estudiantes.map(fila => ({
    id: fila.estudianteId,
    codigo: fila.estudianteCodigo,
    nombre: nombreEstudiante(fila),
    asistencia: fila.estado || null,
    autorizacion: autorizaciones ? (autorizaciones.get(fila.estudianteId) || 'PENDIENTE') : null
  })) : [];
  pantalla.candidatos = combinarCandidatos(base, extras);
  const avisos = [];
  if (!planilla) {
    avisos.push('No se pudieron cargar los estudiantes de la sesión.');
  }
  if (!autorizaciones) {
    avisos.push('No se pudo consultar la autorización de uso de imagen; el sistema la verificará al guardar.');
  }
  if (avisos.length > 0) {
    mostrarAlerta(elemento('alertas-evidencia'), 'warning', avisos.join(' '));
  }
  aplicarTipo();
}

function combinarCandidatos(base, extras) {
  const lista = base.map(candidato => ({ ...candidato }));
  const presentes = new Set(lista.map(candidato => candidato.id));
  extras.forEach(estudiante => {
    if (presentes.has(estudiante.estudianteId)) {
      return;
    }
    lista.push({
      id: estudiante.estudianteId,
      codigo: estudiante.estudianteCodigo,
      nombre: nombreEstudiante(estudiante),
      asistencia: null,
      autorizacion: estudiante.autorizacionImagenVigente ? 'OTORGADA' : 'REVOCADA'
    });
  });
  extras.forEach(estudiante => {
    const candidato = lista.find(item => item.id === estudiante.estudianteId);
    if (candidato && candidato.autorizacion === null) {
      candidato.autorizacion = estudiante.autorizacionImagenVigente ? 'OTORGADA' : 'REVOCADA';
    }
  });
  return lista.sort((a, b) => (a.nombre || a.codigo).localeCompare(b.nombre || b.codigo, 'es'));
}

function etiquetaCandidato(candidato, esFoto) {
  const partes = [
    crearElemento('span', { clase: 'fw-semibold', texto: candidato.nombre || candidato.codigo }),
    crearElemento('span', { clase: 'small text-body-secondary ms-1', texto: candidato.nombre ? candidato.codigo : '' })
  ];
  const asistencia = ESTADOS_ASISTENCIA[candidato.asistencia];
  if (asistencia) {
    partes.push(insignia(asistencia.etiqueta, `${asistencia.clase} ms-1`, 'Asistencia registrada en la sesión'));
  }
  if (esFoto) {
    if (candidato.autorizacion === 'OTORGADA') {
      partes.push(insignia('Imagen autorizada', 'text-bg-success ms-1'));
    } else if (candidato.autorizacion !== null) {
      const estado = ESTADOS_AUTORIZACION[candidato.autorizacion] || candidato.autorizacion;
      const texto = pantalla.originales.has(candidato.id)
        ? `Autorización ${estado}: quítelo o retire la foto`
        : `Sin autorización de imagen (${estado})`;
      partes.push(insignia(texto, pantalla.originales.has(candidato.id) ? 'text-bg-danger ms-1' : 'text-bg-secondary ms-1'));
    }
  }
  return partes;
}

function renderizarCandidatos() {
  const contenedor = elemento('lista-estudiantes');
  const tipo = tipoSeleccionado();
  const esFoto = tipo === 'FOTOGRAFIA';
  const sinEstudiantes = esFoto && elemento('campo-sin-estudiantes').checked;
  elemento('filtro-estudiantes').disabled = sinEstudiantes;
  elemento('contador-estudiantes').textContent = sinEstudiantes
    ? 'Declarada sin estudiantes identificables'
    : `${pantalla.seleccion.size} seleccionado${pantalla.seleccion.size === 1 ? '' : 's'}`;

  if (pantalla.cargandoCandidatos) {
    contenedor.replaceChildren(crearElemento('p', { clase: 'small text-body-secondary mb-0', texto: 'Cargando estudiantes de la sesión...' }));
    elemento('ayuda-estudiantes').textContent = '';
    return;
  }
  const filtro = elemento('filtro-estudiantes').value.trim().toLowerCase();
  const visibles = pantalla.candidatos.filter(candidato => !filtro
    || (candidato.nombre || '').toLowerCase().includes(filtro)
    || (candidato.codigo || '').toLowerCase().includes(filtro));

  if (pantalla.candidatos.length === 0) {
    contenedor.replaceChildren(crearElemento('p', {
      clase: 'small text-body-secondary mb-0',
      texto: 'La sesión no tiene estudiantes en su planilla.'
    }));
  } else if (visibles.length === 0) {
    contenedor.replaceChildren(crearElemento('p', {
      clase: 'small text-body-secondary mb-0',
      texto: 'Ningún estudiante coincide con el filtro.'
    }));
  } else {
    contenedor.replaceChildren(...visibles.map(candidato => {
      const id = `estudiante-evidencia-${candidato.id}`;
      const casilla = crearElemento('input', {
        clase: 'form-check-input',
        atributos: { type: 'checkbox', id, value: String(candidato.id) }
      });
      casilla.checked = pantalla.seleccion.has(candidato.id);
      casilla.disabled = sinEstudiantes || (esFoto && !fotoPermitida(candidato));
      casilla.addEventListener('change', () => {
        if (casilla.checked) {
          pantalla.seleccion.add(candidato.id);
        } else {
          pantalla.seleccion.delete(candidato.id);
        }
        elemento('contador-estudiantes').textContent =
          `${pantalla.seleccion.size} seleccionado${pantalla.seleccion.size === 1 ? '' : 's'}`;
      });
      const etiqueta = crearElemento('label', { clase: 'form-check-label', atributos: { for: id } },
        etiquetaCandidato(candidato, esFoto));
      return crearElemento('div', { clase: 'form-check mb-1' }, [casilla, etiqueta]);
    }));
  }
  elemento('ayuda-estudiantes').textContent = esFoto
    ? 'Se listan los estudiantes de la sesión: integrantes del club en la fecha de la actividad o inscritos del curso si la sesión es de un curso. Los que no tienen la autorización de imagen otorgada no se pueden marcar.'
    : 'Se listan los estudiantes de la sesión: integrantes del club en la fecha de la actividad o inscritos del curso si la sesión es de un curso.';
}

function leerTexto(id) {
  const valor = elemento(id).value.trim();
  return valor === '' ? null : valor;
}

function validarFormulario() {
  const datos = pantalla.datos;
  const tipo = tipoSeleccionado();
  const problemas = [];
  if (!tipo) {
    problemas.push('Elija el tipo de evidencia.');
    return problemas;
  }
  if (!leerTexto('campo-titulo')) {
    problemas.push('Indique el título de la evidencia.');
  }
  if (!leerTexto('campo-descripcion')) {
    problemas.push('Describa la evidencia.');
  }
  const fecha = elemento('campo-fecha').value;
  if (!fecha) {
    problemas.push('Indique la fecha de la evidencia.');
  } else if (fecha < datos.actividadFecha || fecha > hoy()) {
    problemas.push(`La fecha de la evidencia debe estar entre la fecha de la sesión (${formatearFecha(datos.actividadFecha)}) y hoy.`);
  }
  if (usaArchivo(tipo)) {
    const archivo = elemento('campo-archivo').files[0];
    if (!archivo) {
      problemas.push('Adjunte el archivo de la evidencia.');
    } else {
      const problema = problemaDeArchivo(archivo, tipo);
      if (problema) {
        problemas.push(problema);
      }
    }
  }
  if (usaUrl(tipo)) {
    const texto = leerTexto('campo-url');
    const direccion = texto ? urlSegura(texto) : null;
    if (!texto) {
      problemas.push('Indique el enlace de la evidencia.');
    } else if (!direccion || /\s/.test(texto)) {
      problemas.push('El enlace debe ser una dirección completa que empiece con http:// o https://, sin espacios.');
    } else if (direccion.username || direccion.password) {
      problemas.push('El enlace no debe incluir usuario ni contraseña.');
    }
  }
  if (tipo === 'FOTOGRAFIA' && !elemento('campo-sin-estudiantes').checked && pantalla.seleccion.size === 0) {
    problemas.push('Marque a los estudiantes que aparecen en la fotografía o declárela sin estudiantes identificables.');
  }
  if (pantalla.seleccion.size > MAXIMO_ESTUDIANTES) {
    problemas.push(`Marque como máximo ${MAXIMO_ESTUDIANTES} estudiantes.`);
  }
  return problemas;
}

function estudiantesAEnviar(tipo) {
  if (!relacionaEstudiantes(tipo)) {
    return [];
  }
  if (tipo === 'FOTOGRAFIA' && elemento('campo-sin-estudiantes').checked) {
    return [];
  }
  return Array.from(pantalla.seleccion);
}

function construirFormulario(tipo) {
  const formulario = new FormData();
  formulario.append('tipo', tipo);
  formulario.append('titulo', leerTexto('campo-titulo'));
  formulario.append('descripcion', leerTexto('campo-descripcion'));
  formulario.append('fechaEvidencia', elemento('campo-fecha').value);
  if (usaUrl(tipo)) {
    formulario.append('url', leerTexto('campo-url'));
  }
  if (usaArchivo(tipo)) {
    formulario.append('archivo', elemento('campo-archivo').files[0]);
  }
  estudiantesAEnviar(tipo).forEach(id => formulario.append('estudianteIds', String(id)));
  if (tipo === 'FOTOGRAFIA' && elemento('campo-sin-estudiantes').checked) {
    formulario.append('sinEstudiantesIdentificables', 'true');
  }
  return formulario;
}

async function guardarEvidencia(evento) {
  evento.preventDefault();
  const alertas = elemento('alertas-evidencia');
  limpiarAlerta(alertas);
  const problemas = validarFormulario();
  if (problemas.length > 0) {
    mostrarAlerta(alertas, 'danger', 'Revise los datos ingresados:', problemas);
    return;
  }
  const datos = pantalla.datos;
  const tipo = tipoSeleccionado();
  const esCrear = pantalla.modo === 'crear';
  const boton = elemento('boton-guardar-evidencia');
  establecerCargando(boton, true, esCrear ? 'Subiendo...' : 'Guardando...');
  try {
    let guardada;
    if (esCrear) {
      guardada = await apiEnviarFormulario(`/api/actividades/${datos.actividadId}/evidencias`, construirFormulario(tipo));
    } else {
      guardada = await apiFetch(`/api/evidencias/${pantalla.evidencia.id}`, {
        metodo: 'PUT',
        cuerpo: {
          titulo: leerTexto('campo-titulo'),
          descripcion: leerTexto('campo-descripcion'),
          fechaEvidencia: elemento('campo-fecha').value,
          estudianteIds: estudiantesAEnviar(tipo),
          sinEstudiantesIdentificables: tipo === 'FOTOGRAFIA' && elemento('campo-sin-estudiantes').checked
        }
      });
    }
    modalEvidencia.hide();
    pantalla.busquedaVigente = false;
    pantalla.resumenVigente = false;
    await cargarActividad(datos.actividadId);
    mostrarExito(esCrear
      ? `Evidencia «${guardada.titulo}» registrada en la sesión.`
      : `Evidencia «${guardada.titulo}» actualizada.`);
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

function mostrarExito(mensaje) {
  if (pantalla.datos) {
    mostrarAlerta(elemento('alertas-actividad'), 'success', mensaje);
  }
}

function abrirRetiro(evidencia) {
  pantalla.evidencia = evidencia;
  limpiarAlerta(elemento('alertas-retiro'));
  elemento('retiro-titulo').textContent = evidencia.titulo;
  elemento('retiro-datos').textContent =
    `${TIPOS[evidencia.tipo] ? TIPOS[evidencia.tipo].etiqueta : evidencia.tipo} · ${formatearFecha(evidencia.fechaEvidencia)} · ${evidencia.actividadTema}`;
  elemento('retiro-aviso').textContent = evidencia.archivoNombre
    ? 'El archivo se elimina del repositorio de evidencias y no se puede recuperar. La evidencia queda en el historial de la sesión como retirada, con su motivo, y deja de contar en el resumen.'
    : 'La evidencia queda en el historial de la sesión como retirada, con su motivo, y deja de contar en el resumen.';
  elemento('retiro-motivo').value = '';
  elemento('contador-retiro-motivo').textContent = '0 / 500';
  elemento('boton-confirmar-retiro').disabled = false;
  modalRetiro.show();
}

async function confirmarRetiro(evento) {
  evento.preventDefault();
  const alertas = elemento('alertas-retiro');
  limpiarAlerta(alertas);
  const motivo = leerTexto('retiro-motivo');
  if (!motivo) {
    mostrarAlerta(alertas, 'danger', 'Indique el motivo del retiro.');
    return;
  }
  const evidencia = pantalla.evidencia;
  const boton = elemento('boton-confirmar-retiro');
  establecerCargando(boton, true, 'Retirando...');
  try {
    await apiFetch(`/api/evidencias/${evidencia.id}/retiro`, { metodo: 'POST', cuerpo: { motivo } });
    modalRetiro.hide();
    pantalla.busquedaVigente = false;
    pantalla.resumenVigente = false;
    await cargarActividad(evidencia.actividadId);
    mostrarExito(`La evidencia «${evidencia.titulo}» fue retirada.`);
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

function liberarFoto() {
  elemento('detalle-foto').hidden = true;
  elemento('detalle-imagen').removeAttribute('src');
  if (pantalla.urlFoto) {
    URL.revokeObjectURL(pantalla.urlFoto);
    pantalla.urlFoto = null;
  }
}

function filaDato(termino, valor, clase = '') {
  return [
    crearElemento('dt', { clase: 'col-sm-4 text-body-secondary', texto: termino }),
    crearElemento('dd', { clase: `col-sm-8 ${clase}`.trim(), texto: valor || '—' })
  ];
}

async function abrirDetalle(resumenEvidencia, desdeBusqueda) {
  const solicitud = ++pantalla.solicitudDetalle;
  pantalla.detalle = null;
  liberarFoto();
  limpiarAlerta(elemento('alertas-detalle'));
  elemento('detalle-titulo').textContent = resumenEvidencia.titulo || 'Cargando...';
  elemento('detalle-insignias').replaceChildren();
  elemento('detalle-actividad').textContent = '';
  elemento('detalle-bloqueo').hidden = true;
  elemento('detalle-datos').replaceChildren();
  elemento('grupo-detalle-estudiantes').hidden = true;
  elemento('grupo-detalle-retiro').hidden = true;
  elemento('detalle-registro').textContent = '';
  elemento('boton-detalle-ver-foto').hidden = true;
  elemento('boton-detalle-descargar').hidden = true;
  elemento('enlace-detalle-url').hidden = true;
  elemento('boton-detalle-actividad').hidden = !desdeBusqueda;
  modalDetalle.show();
  try {
    const evidencia = await apiFetch(`/api/evidencias/${resumenEvidencia.id}`);
    if (solicitud !== pantalla.solicitudDetalle) {
      return;
    }
    renderizarDetalle(evidencia);
  } catch (error) {
    if (solicitud === pantalla.solicitudDetalle) {
      elemento('detalle-titulo').textContent = 'Evidencia no disponible';
      mostrarAlerta(elemento('alertas-detalle'), 'danger', mensajeDe(error));
    }
  }
}

function renderizarDetalle(evidencia) {
  pantalla.detalle = evidencia;
  const retirada = evidencia.estado === 'RETIRADA';
  elemento('detalle-titulo').textContent = evidencia.titulo;
  elemento('detalle-insignias').replaceChildren(...insigniasEvidencia(evidencia));
  elemento('detalle-actividad').textContent =
    `${evidencia.actividadTema} · sesión del ${formatearFecha(evidencia.actividadFecha)} · ${evidencia.clubNombre} · ${evidencia.institucionNombre}`;

  if (fotoBloqueada(evidencia)) {
    elemento('detalle-bloqueo').textContent =
      `${evidencia.motivoNoDescargable} La foto no se muestra ni se descarga hasta que la autorización vuelva a otorgarse; si la persona sigue apareciendo, retírela.`;
    elemento('detalle-bloqueo').hidden = false;
  }

  const datos = [
    ...filaDato('Fecha de la evidencia', formatearFecha(evidencia.fechaEvidencia)),
    ...filaDato('Descripción', evidencia.descripcion, 'texto-preformateado'),
    ...filaDato('Responsable de la sesión', evidencia.responsableActividadNombre)
  ];
  if (evidencia.archivoNombre) {
    datos.push(...filaDato('Archivo', `${evidencia.archivoNombre} · ${evidencia.archivoTipo} · ${textoTamano(evidencia.archivoTamano)}`));
    datos.push(...filaDato('Huella SHA-256', evidencia.archivoHash, 'text-break font-monospace'));
  }
  if (evidencia.url) {
    datos.push(...filaDato('Enlace', evidencia.url, 'text-break'));
  }
  elemento('detalle-datos').replaceChildren(...datos);

  const lista = elemento('detalle-estudiantes');
  if (evidencia.sinEstudiantesIdentificables) {
    lista.replaceChildren(crearElemento('li', { texto: 'Declarada sin estudiantes identificables.' }));
    elemento('grupo-detalle-estudiantes').hidden = false;
  } else if (evidencia.estudiantes.length > 0) {
    const esFoto = evidencia.tipo === 'FOTOGRAFIA';
    lista.replaceChildren(...evidencia.estudiantes.map(estudiante => {
      const nombre = nombreEstudiante(estudiante);
      const hijos = [document.createTextNode(nombre ? `${nombre} (${estudiante.estudianteCodigo})` : estudiante.estudianteCodigo)];
      if (esFoto) {
        hijos.push(estudiante.autorizacionImagenVigente
          ? insignia('Imagen autorizada', 'text-bg-success ms-2')
          : insignia('Autorización de imagen no vigente', 'text-bg-danger ms-2'));
      }
      return crearElemento('li', { clase: 'mb-1' }, hijos);
    }));
    elemento('grupo-detalle-estudiantes').hidden = false;
  }

  if (retirada) {
    elemento('detalle-motivo-retiro').textContent = `Motivo: ${evidencia.motivoRetiro || '—'}`;
    elemento('detalle-retirada').textContent =
      `Retirada por ${evidencia.retiradaPorNombre || '—'} el ${formatearFechaHora(evidencia.fechaRetiro)}`;
    elemento('grupo-detalle-retiro').hidden = false;
  }

  let registro = `Registrada por ${evidencia.registradoPorNombre || '—'} el ${formatearFechaHora(evidencia.fechaRegistro)}`;
  if (evidencia.actualizadoEn && evidencia.actualizadoEn !== evidencia.fechaRegistro) {
    registro += ` · Última actualización: ${formatearFechaHora(evidencia.actualizadoEn)}`;
  }
  elemento('detalle-registro').textContent = registro;

  elemento('boton-detalle-ver-foto').hidden = !(evidencia.descargable && evidencia.tipo === 'FOTOGRAFIA');
  elemento('boton-detalle-descargar').hidden = !evidencia.descargable;
  const direccion = !retirada && evidencia.url ? urlSegura(evidencia.url) : null;
  const enlace = elemento('enlace-detalle-url');
  if (direccion) {
    enlace.href = direccion.href;
    enlace.hidden = false;
  } else {
    enlace.removeAttribute('href');
    enlace.hidden = true;
  }
}

async function verFotografia() {
  const evidencia = pantalla.detalle;
  if (!evidencia || !evidencia.descargable) {
    return;
  }
  const boton = elemento('boton-detalle-ver-foto');
  boton.disabled = true;
  try {
    const contenido = await apiObtenerArchivo(evidencia.descargaUrl);
    if (pantalla.detalle !== evidencia) {
      return;
    }
    if (!contenido.type.startsWith('image/')) {
      throw new ApiError(0, 'El archivo recibido no es una imagen.');
    }
    liberarFoto();
    pantalla.urlFoto = URL.createObjectURL(contenido);
    const imagen = elemento('detalle-imagen');
    imagen.src = pantalla.urlFoto;
    imagen.alt = evidencia.titulo;
    elemento('detalle-foto').hidden = false;
  } catch (error) {
    mostrarAlerta(elemento('alertas-detalle'), 'danger', `No se pudo mostrar la fotografía. ${mensajeDe(error)}`);
  } finally {
    boton.disabled = false;
  }
}

function leerFiltrosBusqueda() {
  return {
    institucionId: esGlobal() ? elemento('busqueda-institucion').value : '',
    clubId: elemento('busqueda-club').value,
    tipo: elemento('busqueda-tipo').value,
    estado: elemento('busqueda-estado').value,
    desde: elemento('busqueda-desde').value,
    hasta: elemento('busqueda-hasta').value
  };
}

function filaMensajeBusqueda(texto) {
  return crearElemento('tr', {}, [crearElemento('td', {
    clase: 'text-center text-body-secondary py-4',
    texto,
    atributos: { colspan: '6' }
  })]);
}

async function cargarBusqueda(pagina) {
  const solicitud = ++pantalla.solicitudBusqueda;
  const cuerpo = elemento('cuerpo-busqueda');
  limpiarAlerta(elemento('alertas-busqueda'));
  cuerpo.replaceChildren(filaMensajeBusqueda('Cargando evidencias...'));
  try {
    const respuesta = await apiFetch(`/api/evidencias${construirConsulta({
      ...pantalla.filtrosBusqueda,
      pagina,
      tamano: TAMANO_PAGINA
    })}`);
    if (solicitud !== pantalla.solicitudBusqueda) {
      return;
    }
    pantalla.paginaBusqueda = respuesta.pagina;
    pantalla.busquedaVigente = true;
    if (respuesta.contenido.length === 0) {
      cuerpo.replaceChildren(filaMensajeBusqueda('No se encontraron evidencias con los filtros indicados.'));
    } else {
      cuerpo.replaceChildren(...respuesta.contenido.map(filaBusqueda));
    }
    elemento('resumen-busqueda').textContent = textoPaginacion(respuesta);
    renderizarPaginacion(elemento('paginacion-busqueda'), respuesta, cargarBusqueda);
  } catch (error) {
    if (solicitud === pantalla.solicitudBusqueda) {
      cuerpo.replaceChildren(filaMensajeBusqueda('No se pudo cargar el listado.'));
      elemento('resumen-busqueda').textContent = '';
      elemento('paginacion-busqueda').replaceChildren();
      mostrarAlerta(elemento('alertas-busqueda'), 'danger', mensajeDe(error));
    }
  }
}

function textoPaginacion(respuesta) {
  if (respuesta.totalElementos === 0) {
    return 'Sin resultados';
  }
  const desde = respuesta.pagina * respuesta.tamano + 1;
  const hasta = desde + respuesta.contenido.length - 1;
  return `Mostrando ${desde}–${hasta} de ${respuesta.totalElementos}`;
}

function celdaEstudiantes(evidencia) {
  if (evidencia.sinEstudiantesIdentificables) {
    return [crearElemento('span', { clase: 'small text-body-secondary', texto: 'Sin identificables' })];
  }
  const total = evidencia.estudiantes.length;
  if (total === 0) {
    return [crearElemento('span', { clase: 'small text-body-secondary', texto: '—' })];
  }
  const partes = [crearElemento('span', { texto: total === 1 ? '1 estudiante' : `${total} estudiantes` })];
  if (fotoBloqueada(evidencia)) {
    partes.push(crearElemento('div', { clase: 'small text-danger-emphasis', texto: 'Autorización no vigente' }));
  }
  return partes;
}

function filaBusqueda(evidencia) {
  const club = [crearElemento('div', { texto: evidencia.clubNombre || '—' })];
  if (esGlobal()) {
    club.push(crearElemento('div', { clase: 'small text-body-secondary', texto: evidencia.institucionNombre || '—' }));
  }
  const acciones = [botonIcono('bi-eye', 'Ver detalle', evidencia.titulo, () => abrirDetalle(evidencia, true))];
  if (evidencia.descargable) {
    acciones.push(botonIcono('bi-download', 'Descargar', evidencia.titulo,
      () => descargar(evidencia, elemento('alertas-busqueda'))));
  }
  const direccion = evidencia.estado === 'ACTIVA' && evidencia.url ? urlSegura(evidencia.url) : null;
  if (direccion) {
    acciones.push(enlaceIcono('bi-box-arrow-up-right', 'Abrir enlace', evidencia.titulo, direccion.href, true));
  }
  acciones.push(botonIcono('bi-images', 'Evidencias de la sesión', evidencia.actividadTema,
    () => irAActividad(evidencia.actividadId)));

  return crearElemento('tr', {}, [
    crearElemento('td', { clase: 'text-nowrap', texto: formatearFecha(evidencia.fechaEvidencia) }),
    crearElemento('td', {}, [
      crearElemento('div', { clase: 'd-flex flex-wrap gap-1 mb-1' }, insigniasEvidencia(evidencia)),
      crearElemento('div', { clase: 'fw-semibold text-break', texto: evidencia.titulo }),
      crearElemento('div', { clase: 'small text-body-secondary text-break', texto: textoContenido(evidencia) })
    ]),
    crearElemento('td', {}, [
      crearElemento('div', { texto: evidencia.actividadTema }),
      crearElemento('div', { clase: 'small text-body-secondary', texto: `Sesión del ${formatearFecha(evidencia.actividadFecha)}` })
    ]),
    crearElemento('td', {}, club),
    crearElemento('td', {}, celdaEstudiantes(evidencia)),
    crearElemento('td', { clase: 'text-end text-nowrap' }, acciones)
  ]);
}

async function cargarResumen() {
  const alertas = elemento('alertas-resumen');
  limpiarAlerta(alertas);
  const solicitud = ++pantalla.solicitudResumen;
  const boton = elemento('boton-resumen');
  establecerCargando(boton, true, 'Calculando...');
  try {
    const resumen = await apiFetch(`/api/evidencias/resumen${construirConsulta({
      periodoId: elemento('resumen-periodo').value,
      institucionId: esGlobal() ? elemento('resumen-institucion').value : ''
    })}`);
    if (solicitud !== pantalla.solicitudResumen) {
      return;
    }
    pantalla.resumen = resumen;
    pantalla.resumenVigente = true;
    renderizarResumen(resumen);
  } catch (error) {
    if (solicitud === pantalla.solicitudResumen) {
      elemento('resumen').hidden = true;
      mostrarAlerta(alertas, 'danger', mensajeDe(error));
    }
  } finally {
    establecerCargando(boton, false);
  }
}

function renderizarResumen(resumen) {
  elemento('resumen').hidden = false;
  let titulo = `Período ${resumen.periodoNombre}`;
  if (resumen.institucionId && esGlobal()) {
    const institucion = catalogo.instituciones.find(item => item.id === resumen.institucionId);
    titulo += ` · ${institucion ? institucion.nombre : 'Institución seleccionada'}`;
  }
  elemento('resumen-titulo').textContent = titulo;
  const sinEvidencia = resumen.totalClubes - resumen.clubesConEvidencia;
  elemento('resumen-cifras').replaceChildren(
    cifra(`${resumen.clubesConEvidencia} / ${resumen.totalClubes}`,
      `clubes con evidencias (${textoPorcentaje(resumen.porcentajeClubesConEvidencia)})`,
      sinEvidencia > 0 ? 'border-warning' : ''),
    cifra(`${resumen.actividadesConEvidencia} / ${resumen.actividadesEjecutadas}`,
      `sesiones ejecutadas con evidencia (${textoPorcentaje(resumen.porcentajeActividadesConEvidencia)})`),
    cifra(resumen.conteo.fotografias, 'fotografías'),
    cifra(resumen.conteo.documentos, 'informes'),
    cifra(resumen.conteo.enlaces, 'enlaces'),
    cifra(resumen.conteo.productos, 'productos')
  );
  renderizarFilasResumen();
}

function barraCobertura(club) {
  if (club.actividadesEjecutadas === 0) {
    return crearElemento('span', { clase: 'small text-body-secondary', texto: 'Sin sesiones' });
  }
  const valor = Math.round((club.actividadesConEvidencia * 1000) / club.actividadesEjecutadas) / 10;
  const relleno = crearElemento('div', { clase: `progress-bar${valor < 50 ? ' bg-warning' : ''}` });
  relleno.style.width = `${Math.min(100, Math.max(0, valor))}%`;
  return crearElemento('div', { clase: 'd-flex align-items-center gap-2' }, [
    crearElemento('div', {
      clase: 'progress flex-grow-1 barra-asistencia',
      atributos: {
        role: 'progressbar',
        'aria-label': `Cobertura de evidencias de ${club.clubNombre}`,
        'aria-valuenow': String(valor),
        'aria-valuemin': '0',
        'aria-valuemax': '100'
      }
    }, [relleno]),
    crearElemento('span', { clase: 'small text-nowrap', texto: textoPorcentaje(valor) })
  ]);
}

function celdaNumero(valor) {
  return crearElemento('td', { clase: 'text-end', texto: String(valor) });
}

function filaResumen(club) {
  const nombre = [crearElemento('div', { clase: 'fw-semibold', texto: club.clubNombre })];
  if (esGlobal()) {
    nombre.push(crearElemento('div', { clase: 'small text-body-secondary', texto: club.institucionNombre }));
  }
  const marcas = [];
  if (club.estadoClub !== 'ACTIVO') {
    const estado = ESTADOS_CLUB[club.estadoClub] || { etiqueta: club.estadoClub, clase: 'text-bg-light' };
    marcas.push(insignia(estado.etiqueta, estado.clase));
  }
  if (!club.conEvidencia) {
    marcas.push(insignia('Sin evidencias', 'text-bg-warning'));
  }
  if (marcas.length > 0) {
    nombre.push(crearElemento('div', { clase: 'd-flex flex-wrap gap-1 mt-1' }, marcas));
  }

  const acciones = [
    botonIcono('bi-search', 'Buscar sus evidencias', club.clubNombre, () => buscarDelClub(club)),
    enlaceIcono('bi-calendar-check', 'Sesiones ejecutadas', club.clubNombre,
      `actividades.html?clubId=${club.clubId}&estado=EJECUTADA`)
  ];
  return crearElemento('tr', { clase: club.conEvidencia ? '' : 'fila-sin-evidencia' }, [
    crearElemento('td', {}, nombre),
    celdaNumero(club.actividadesEjecutadas),
    celdaNumero(club.actividadesConEvidencia),
    crearElemento('td', {}, [barraCobertura(club)]),
    celdaNumero(club.conteo.fotografias),
    celdaNumero(club.conteo.documentos),
    celdaNumero(club.conteo.enlaces),
    celdaNumero(club.conteo.productos),
    crearElemento('td', {
      clase: 'text-end fw-semibold',
      texto: String(club.conteo.fotografias + club.conteo.documentos + club.conteo.enlaces + club.conteo.productos)
    }),
    crearElemento('td', { clase: 'text-end text-nowrap' }, acciones)
  ]);
}

function renderizarFilasResumen() {
  const resumen = pantalla.resumen;
  const cuerpo = elemento('cuerpo-resumen');
  if (!resumen) {
    cuerpo.replaceChildren();
    return;
  }
  const soloSin = elemento('resumen-solo-sin').checked;
  const clubes = resumen.clubes.filter(club => !soloSin || !club.conEvidencia);
  if (clubes.length === 0) {
    cuerpo.replaceChildren(crearElemento('tr', {}, [crearElemento('td', {
      clase: 'text-center text-body-secondary py-4',
      texto: soloSin ? 'Todos los clubes del período tienen evidencias.' : 'No hay clubes con actividad en el período indicado.',
      atributos: { colspan: '10' }
    })]));
    return;
  }
  cuerpo.replaceChildren(...clubes.map(filaResumen));
}

function buscarDelClub(club) {
  limpiarAlerta(elemento('alertas-busqueda'));
  if (esGlobal()) {
    elemento('busqueda-institucion').value = String(club.institucionId);
  }
  llenarClubesBusqueda();
  const selector = elemento('busqueda-club');
  if (!selector.querySelector(`option[value="${club.clubId}"]`)) {
    selector.appendChild(crearElemento('option', { texto: club.clubNombre, atributos: { value: String(club.clubId) } }));
  }
  selector.value = String(club.clubId);
  elemento('busqueda-tipo').value = '';
  elemento('busqueda-estado').value = 'ACTIVA';
  elemento('busqueda-desde').value = '';
  elemento('busqueda-hasta').value = '';
  pantalla.filtrosBusqueda = leerFiltrosBusqueda();
  pantalla.busquedaVigente = true;
  mostrarPestana('pestana-busqueda');
  cargarBusqueda(0);
}
