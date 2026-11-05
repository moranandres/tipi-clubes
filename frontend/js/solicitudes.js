import { apiFetch, construirConsulta, ApiError } from './api.js';
import {
  cargarInstituciones,
  cargarClubes,
  cargarCursosDelClub,
  cargarEstudiantesActivos,
  cargarInscripcionesActivasDelClub
} from './catalogos.js';
import { exigirSesion } from './guard.js';
import { montarLayout } from './layout.js';
import { renderizarPaginacion } from './paginacion.js';
import {
  crearElemento,
  formatearFechaHora,
  mostrarAlerta,
  limpiarAlerta,
  establecerCargando,
  mensajesDeError
} from './ui.js';

const TAMANO_PAGINA = 10;
const COLUMNAS = 6;
const ROLES_GLOBALES = ['ADMIN', 'COORDINADOR', 'CONSULTA'];
const ROLES_DATOS_MINIMOS = ['COORDINADOR', 'CONSULTA'];
const ROLES_REGISTRO = ['ADMIN', 'RESP_INSTITUCIONAL', 'DOCENTE'];
const ROLES_RESOLUCION = ['ADMIN', 'RESP_INSTITUCIONAL'];
const ESTADOS_ABIERTOS = ['PENDIENTE', 'EN_REVISION'];
const CLUBES_ABIERTOS = ['PLANIFICADO', 'ACTIVO'];
const CURSOS_ABIERTOS = ['PLANIFICADO', 'EN_CURSO'];
const REGLA_CUPO_CLUB = 'Cupo del club';
const REGLA_AUTORIZACION = 'Autorización de participación';
const MOTIVACION_MINIMA = 10;
const MOTIVO_MINIMO = 5;

const NIVELES = {
  PRINCIPIANTE: 'Principiante',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado'
};

const ESTADOS_SOLICITUD = {
  PENDIENTE: { etiqueta: 'Pendiente', clase: 'text-bg-warning' },
  EN_REVISION: { etiqueta: 'En revisión', clase: 'text-bg-info' },
  APROBADA: { etiqueta: 'Aprobada', clase: 'text-bg-success' },
  RECHAZADA: { etiqueta: 'Rechazada', clase: 'text-bg-danger' },
  CANCELADA: { etiqueta: 'Cancelada', clase: 'text-bg-secondary' }
};

const ESTADOS_CLUB = {
  PLANIFICADO: 'Planificado',
  ACTIVO: 'Activo',
  SUSPENDIDO: 'Suspendido',
  CERRADO: 'Cerrado'
};

const ESTADOS_CURSO = {
  PLANIFICADO: 'Planificado',
  EN_CURSO: 'En curso',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado'
};

const PANEL_MOTIVO = {
  rechazo: {
    titulo: 'Rechazar la solicitud',
    texto: 'El estudiante no será inscrito. La solicitud queda cerrada y ya no podrá modificarse.',
    boton: 'Confirmar rechazo',
    ruta: 'rechazo',
    exito: 'rechazada'
  },
  cancelacion: {
    titulo: 'Cancelar la solicitud',
    texto: 'La solicitud se cerrará sin inscribir al estudiante. Si más adelante se necesita, registre una nueva.',
    boton: 'Confirmar cancelación',
    ruta: 'cancelacion',
    exito: 'cancelada'
  }
};

const sesion = exigirSesion();
const pantalla = {
  pagina: 0,
  filtros: {},
  estudianteId: null,
  solicitud: null,
  cambios: false,
  modoMotivo: null,
  verificacion: null,
  turnoVerificacion: 0
};
const catalogo = {
  instituciones: [],
  clubes: [],
  cursosPorClub: new Map(),
  estudiantesPorInstitucion: new Map(),
  integrantesPorClub: new Map()
};
const formulario = { estudiantes: [], integrantes: new Set(), cursos: [] };
let modalNueva = null;
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

function soloDatosMinimos() {
  return ROLES_DATOS_MINIMOS.includes(rolActual());
}

function puedeRegistrar() {
  return ROLES_REGISTRO.includes(rolActual());
}

function puedeResolver(solicitud) {
  if (!ROLES_RESOLUCION.includes(rolActual())) {
    return false;
  }
  return rolActual() === 'ADMIN' || solicitud.institucionId === sesion.usuario.institucionId;
}

function esSolicitante(solicitud) {
  return solicitud.solicitadoPorId === sesion.usuario.id;
}

function puedeCancelar(solicitud) {
  if (!ESTADOS_ABIERTOS.includes(solicitud.estado) || !puedeRegistrar()) {
    return false;
  }
  if (rolActual() === 'DOCENTE') {
    return esSolicitante(solicitud);
  }
  return rolActual() === 'ADMIN' || solicitud.institucionId === sesion.usuario.institucionId;
}

function accionPendiente(solicitud) {
  if (!puedeResolver(solicitud) || esSolicitante(solicitud)) {
    return null;
  }
  if (solicitud.estado === 'PENDIENTE') {
    return 'Revisar';
  }
  if (solicitud.estado === 'EN_REVISION') {
    return 'Resolver';
  }
  return null;
}

function mensajeDe(error) {
  return error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
}

function insignia(mapa, codigo) {
  const datos = mapa[codigo] || { etiqueta: codigo || '—', clase: 'text-bg-light' };
  return crearElemento('span', { clase: `badge ${datos.clase}`, texto: datos.etiqueta });
}

function buscarClub(id) {
  return catalogo.clubes.find(club => club.id === Number(id)) || null;
}

function nombreEstudiante(solicitud) {
  return `${solicitud.estudianteApellidos} ${solicitud.estudianteNombres}`;
}

function identificarEstudiante(solicitud) {
  if (soloDatosMinimos() || !solicitud.estudianteNombres) {
    return solicitud.estudianteCodigo;
  }
  return `${nombreEstudiante(solicitud)} (${solicitud.estudianteCodigo})`;
}

async function iniciar() {
  montarLayout(sesion, 'solicitudes');

  elemento('boton-nuevo').hidden = !puedeRegistrar();
  elemento('aviso-datos-minimos').hidden = !soloDatosMinimos();
  elemento('aviso-docente').hidden = rolActual() !== 'DOCENTE';
  elemento('grupo-filtro-institucion').hidden = !esGlobal();
  if (soloDatosMinimos()) {
    elemento('etiqueta-filtro-q').textContent = 'Código del estudiante (EST-)';
  }

  modalNueva = bootstrap.Modal.getOrCreateInstance(elemento('modal-nueva'));
  modalDetalle = bootstrap.Modal.getOrCreateInstance(elemento('modal-detalle'));

  elemento('boton-nuevo').addEventListener('click', abrirNueva);
  elemento('formulario-filtros').addEventListener('submit', evento => {
    evento.preventDefault();
    pantalla.filtros = leerFiltros();
    recargar(0);
  });
  elemento('formulario-filtros').addEventListener('reset', () => {
    setTimeout(() => {
      llenarFiltroClubes();
      pantalla.filtros = leerFiltros();
      recargar(0);
    }, 0);
  });
  elemento('filtro-institucion').addEventListener('change', llenarFiltroClubes);
  elemento('boton-quitar-estudiante').addEventListener('click', () => {
    pantalla.estudianteId = null;
    elemento('aviso-filtro-estudiante').hidden = true;
    recargar(0);
  });

  elemento('formulario-nueva').addEventListener('submit', registrarSolicitud);
  elemento('nueva-club').addEventListener('change', alCambiarClubNueva);
  elemento('nueva-buscar-estudiante').addEventListener('input', llenarEstudiantesNueva);
  elemento('nueva-estudiante').addEventListener('change', actualizarAyudaEstudiante);
  elemento('nueva-curso').addEventListener('change', alCambiarCursoNueva);
  elemento('nueva-nivel').addEventListener('change', actualizarCamposNivel);
  elemento('nueva-motivacion').addEventListener('input', actualizarContadorMotivacion);

  elemento('boton-tomar-revision').addEventListener('click', tomarEnRevision);
  elemento('panel-aprobacion').addEventListener('submit', aprobar);
  elemento('aprobar-nivel').addEventListener('change', () => {
    llenarCursosAprobacion();
    verificar();
  });
  elemento('aprobar-curso').addEventListener('change', verificar);
  elemento('aprobar-sobrecupo').addEventListener('change', () => {
    actualizarEtiquetaObservacion();
    evaluarVerificacion();
  });
  elemento('boton-verificar').addEventListener('click', verificar);
  elemento('boton-abrir-rechazo').addEventListener('click', () => abrirPanelMotivo('rechazo'));
  elemento('boton-abrir-cancelacion').addEventListener('click', () => abrirPanelMotivo('cancelacion'));
  elemento('boton-volver-motivo').addEventListener('click', cerrarPanelMotivo);
  elemento('panel-motivo').addEventListener('submit', confirmarMotivo);
  elemento('modal-detalle').addEventListener('hidden.bs.modal', () => {
    pantalla.solicitud = null;
    if (pantalla.cambios) {
      pantalla.cambios = false;
      recargar(pantalla.pagina);
    }
  });

  await cargarCatalogos();
  await aplicarParametrosIniciales();
  await recargar(0);
  const abrir = new URLSearchParams(window.location.search).get('id');
  if (abrir && /^\d+$/.test(abrir)) {
    abrirDetalle(Number(abrir));
  }
}

async function cargarCatalogos() {
  const tareas = [cargarClubes(), esGlobal() ? cargarInstituciones() : Promise.resolve([])];
  const [clubes, instituciones] = await Promise.allSettled(tareas);
  const problemas = [];
  if (clubes.status === 'fulfilled') {
    catalogo.clubes = clubes.value.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  } else {
    problemas.push(`Clubes: ${mensajeDe(clubes.reason)}`);
  }
  if (instituciones.status === 'fulfilled') {
    catalogo.instituciones = instituciones.value;
  } else {
    problemas.push(`Instituciones: ${mensajeDe(instituciones.reason)}`);
  }

  const opciones = [crearElemento('option', { texto: 'Todas', atributos: { value: '' } })];
  catalogo.instituciones.forEach(institucion => {
    opciones.push(crearElemento('option', {
      texto: institucion.nombre,
      atributos: { value: String(institucion.id) }
    }));
  });
  elemento('filtro-institucion').replaceChildren(...opciones);
  llenarFiltroClubes();

  if (problemas.length > 0) {
    mostrarAlerta(elemento('alertas'), 'danger', 'No se pudieron cargar algunos catálogos.', problemas);
  }
}

function etiquetaClub(club, conInstitucion) {
  const partes = [club.nombre];
  if (conInstitucion) {
    partes.push(`· ${club.institucionNombre}`);
  }
  if (club.estado !== 'ACTIVO') {
    partes.push(`(${ESTADOS_CLUB[club.estado] || club.estado})`);
  }
  return partes.join(' ');
}

function llenarFiltroClubes() {
  const institucion = esGlobal() ? elemento('filtro-institucion').value : '';
  const anterior = elemento('filtro-club').value;
  const clubes = catalogo.clubes.filter(club => !institucion || club.institucionId === Number(institucion));
  const conInstitucion = esGlobal() && !institucion;
  const opciones = [crearElemento('option', { texto: 'Todos', atributos: { value: '' } })];
  clubes.forEach(club => {
    opciones.push(crearElemento('option', {
      texto: etiquetaClub(club, conInstitucion),
      atributos: { value: String(club.id) }
    }));
  });
  elemento('filtro-club').replaceChildren(...opciones);
  if (clubes.some(club => String(club.id) === anterior)) {
    elemento('filtro-club').value = anterior;
  }
}

async function aplicarParametrosIniciales() {
  const parametros = new URLSearchParams(window.location.search);
  const clubId = parametros.get('clubId');
  if (clubId && buscarClub(clubId)) {
    elemento('filtro-club').value = String(clubId);
  }
  const estado = parametros.get('estado');
  if (estado && ESTADOS_SOLICITUD[estado]) {
    elemento('filtro-estado').value = estado;
  }
  pantalla.filtros = leerFiltros();

  const estudianteId = parametros.get('estudianteId');
  if (estudianteId && /^\d+$/.test(estudianteId)) {
    pantalla.estudianteId = Number(estudianteId);
    let texto = 'Se muestran solo las solicitudes del estudiante seleccionado.';
    try {
      const estudiante = await apiFetch(`/api/estudiantes/${estudianteId}`);
      const nombre = estudiante.nombres ? `${estudiante.apellidos} ${estudiante.nombres} (${estudiante.codigoInterno})` : estudiante.codigoInterno;
      texto = `Se muestran solo las solicitudes de ${nombre}.`;
    } catch (error) {
      texto = 'Se muestran solo las solicitudes del estudiante indicado en el enlace.';
    }
    elemento('texto-filtro-estudiante').textContent = texto;
    elemento('aviso-filtro-estudiante').hidden = false;
  }
}

function leerFiltros() {
  return {
    q: elemento('filtro-q').value.trim(),
    institucionId: esGlobal() ? elemento('filtro-institucion').value : '',
    clubId: elemento('filtro-club').value,
    nivel: elemento('filtro-nivel').value,
    estado: elemento('filtro-estado').value
  };
}

function consultaActual(extra) {
  return { ...pantalla.filtros, estudianteId: pantalla.estudianteId, ...extra };
}

function filaMensaje(texto, columnas = COLUMNAS) {
  const celda = crearElemento('td', {
    clase: 'text-center text-body-secondary py-4',
    texto,
    atributos: { colspan: String(columnas) }
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

async function recargar(pagina) {
  await Promise.all([cargarLista(pagina), cargarContadores()]);
}

async function cargarLista(pagina) {
  const cuerpo = elemento('cuerpo-tabla');
  cuerpo.replaceChildren(filaMensaje('Cargando solicitudes...'));
  try {
    const ruta = `/api/solicitudes-inscripcion${construirConsulta(consultaActual({ pagina, tamano: TAMANO_PAGINA }))}`;
    const respuesta = await apiFetch(ruta);
    pantalla.pagina = respuesta.pagina;
    if (respuesta.contenido.length === 0) {
      cuerpo.replaceChildren(filaMensaje('No se encontraron solicitudes.'));
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

async function cargarContadores() {
  const contenedor = elemento('contadores');
  const estados = ['PENDIENTE', 'EN_REVISION'];
  try {
    const totales = await Promise.all(estados.map(estado => apiFetch(
      `/api/solicitudes-inscripcion${construirConsulta(consultaActual({ estado, pagina: 0, tamano: 1 }))}`
    ).then(respuesta => respuesta.totalElementos)));
    contenedor.replaceChildren(...estados.map((estado, indice) => crearContador(estado, totales[indice])));
  } catch (error) {
    contenedor.replaceChildren();
  }
}

function crearContador(estado, total) {
  const datos = ESTADOS_SOLICITUD[estado];
  const boton = crearElemento('button', {
    clase: 'btn btn-sm btn-outline-secondary py-0',
    atributos: { type: 'button', title: `Filtrar: ${datos.etiqueta.toLowerCase()}` }
  }, [
    crearElemento('span', { clase: `badge ${datos.clase} me-1`, texto: String(total) }),
    document.createTextNode(estado === 'PENDIENTE' ? 'pendientes' : 'en revisión')
  ]);
  boton.addEventListener('click', () => {
    elemento('filtro-estado').value = estado;
    pantalla.filtros = leerFiltros();
    recargar(0);
  });
  return boton;
}

function crearFila(solicitud) {
  const estudiante = [];
  if (soloDatosMinimos() || !solicitud.estudianteNombres) {
    estudiante.push(crearElemento('div', { clase: 'font-monospace text-nowrap', texto: solicitud.estudianteCodigo }));
  } else {
    estudiante.push(crearElemento('div', { clase: 'fw-semibold', texto: nombreEstudiante(solicitud) }));
    estudiante.push(crearElemento('div', { clase: 'small font-monospace text-nowrap text-body-secondary', texto: solicitud.estudianteCodigo }));
  }

  const club = [crearElemento('div', { texto: solicitud.clubNombre || `Club ${solicitud.clubId}` })];
  if (esGlobal()) {
    club.push(crearElemento('div', { clase: 'small text-body-secondary', texto: solicitud.institucionNombre }));
  }
  club.push(crearElemento('div', {
    clase: 'small text-body-secondary',
    texto: solicitud.cursoNombre ? `Curso: ${solicitud.cursoNombre}` : 'Solo inscripción al club'
  }));
  if (solicitud.estado === 'APROBADA' && solicitud.cursoAsignadoId && solicitud.cursoAsignadoId !== solicitud.cursoId) {
    club.push(crearElemento('div', { clase: 'small text-success-emphasis', texto: `Asignado: ${solicitud.cursoAsignadoNombre}` }));
  }

  const nivel = [crearElemento('div', { texto: NIVELES[solicitud.nivel] || solicitud.nivel })];
  if (solicitud.nivelAsignado && solicitud.nivelAsignado !== solicitud.nivel) {
    nivel.push(crearElemento('div', {
      clase: 'small text-success-emphasis',
      texto: `Asignado: ${NIVELES[solicitud.nivelAsignado]}`
    }));
  }

  const estado = [insignia(ESTADOS_SOLICITUD, solicitud.estado)];
  if (solicitud.estado === 'EN_REVISION' && solicitud.revisadoPorNombre) {
    estado.push(crearElemento('div', { clase: 'small text-body-secondary mt-1', texto: `por ${solicitud.revisadoPorNombre}` }));
  }

  return crearElemento('tr', {}, [
    crearElemento('td', { clase: 'small text-nowrap', texto: formatearFechaHora(solicitud.fechaSolicitud) }),
    crearElemento('td', {}, estudiante),
    crearElemento('td', {}, club),
    crearElemento('td', {}, nivel),
    crearElemento('td', {}, estado),
    crearElemento('td', { clase: 'text-end text-nowrap' }, crearAcciones(solicitud))
  ]);
}

function crearAcciones(solicitud) {
  const acciones = [];
  const pendiente = accionPendiente(solicitud);
  if (pendiente) {
    const boton = crearElemento('button', {
      clase: 'btn btn-sm btn-primary ms-1',
      texto: pendiente,
      atributos: { type: 'button', 'aria-label': `${pendiente} la solicitud de ${identificarEstudiante(solicitud)}` }
    });
    boton.addEventListener('click', () => abrirDetalle(solicitud.id));
    acciones.push(boton);
  }
  const marca = crearElemento('i', { clase: 'bi bi-eye', atributos: { 'aria-hidden': 'true' } });
  const ver = crearElemento('button', {
    clase: 'btn btn-sm btn-outline-secondary ms-1',
    atributos: {
      type: 'button',
      title: 'Ver detalle',
      'aria-label': `Ver detalle de la solicitud de ${identificarEstudiante(solicitud)}`
    }
  }, [marca]);
  ver.addEventListener('click', () => abrirDetalle(solicitud.id));
  acciones.push(ver);
  return acciones;
}

async function abrirNueva() {
  limpiarAlerta(elemento('alertas-nueva'));
  const abiertos = catalogo.clubes.filter(club => CLUBES_ABIERTOS.includes(club.estado));
  const opciones = [crearElemento('option', { texto: 'Seleccione un club', atributos: { value: '' } })];
  abiertos.forEach(club => {
    opciones.push(crearElemento('option', {
      texto: etiquetaClub(club, rolActual() === 'ADMIN'),
      atributos: { value: String(club.id) }
    }));
  });
  elemento('nueva-club').replaceChildren(...opciones);
  const preferido = elemento('filtro-club').value;
  elemento('nueva-club').value = abiertos.some(club => String(club.id) === preferido) ? preferido : '';

  elemento('nueva-buscar-estudiante').value = '';
  elemento('nueva-nivel').value = '';
  elemento('nueva-conocimientos').value = '';
  elemento('nueva-experiencia').value = '';
  elemento('nueva-motivacion').value = '';
  elemento('boton-registrar').disabled = false;
  actualizarCamposNivel();
  actualizarContadorMotivacion();

  if (abiertos.length === 0) {
    mostrarAlerta(elemento('alertas-nueva'), 'warning', rolActual() === 'DOCENTE'
      ? 'No coordina ningún club planificado o activo que pueda recibir solicitudes.'
      : 'No hay clubes planificados o activos que puedan recibir solicitudes.');
  }
  modalNueva.show();
  await alCambiarClubNueva();
}

function reiniciarSeleccionNueva(texto) {
  formulario.estudiantes = [];
  formulario.integrantes = new Set();
  formulario.cursos = [];
  elemento('nueva-estudiante').replaceChildren();
  elemento('nueva-estudiante').disabled = true;
  elemento('nueva-buscar-estudiante').disabled = true;
  elemento('ayuda-nueva-estudiante').textContent = texto;
  elemento('nueva-curso').replaceChildren(crearElemento('option', {
    texto: 'Solo inscribir en el club',
    atributos: { value: '' }
  }));
  elemento('nueva-curso').disabled = true;
  elemento('ayuda-nueva-curso').textContent = 'Opcional. Si el estudiante ya es integrante del club, indique el curso.';
}

async function obtenerConCache(mapa, clave, cargar) {
  if (!mapa.has(clave)) {
    mapa.set(clave, await cargar(clave));
  }
  return mapa.get(clave);
}

async function alCambiarClubNueva() {
  const club = buscarClub(elemento('nueva-club').value);
  const ayuda = elemento('ayuda-nueva-club');
  if (!club) {
    ayuda.textContent = '';
    reiniciarSeleccionNueva('Seleccione primero el club.');
    return;
  }
  const partes = [`Integrantes: ${club.integrantesActivos} de ${club.cupoMaximo} (${club.cuposDisponibles} cupos disponibles).`];
  if (club.estado !== 'ACTIVO') {
    partes.push(`El club está ${(ESTADOS_CLUB[club.estado] || club.estado).toLowerCase()}.`);
  }
  if (club.cuposDisponibles === 0) {
    partes.push('El club está lleno: la solicitud se puede registrar, pero solo el Administrador podrá aprobarla con sobrecupo.');
  }
  ayuda.textContent = partes.join(' ');

  reiniciarSeleccionNueva('Cargando estudiantes de la institución...');
  try {
    const [estudiantes, cursos, integrantes] = await Promise.all([
      obtenerConCache(catalogo.estudiantesPorInstitucion, club.institucionId, cargarEstudiantesActivos),
      obtenerConCache(catalogo.cursosPorClub, club.id, cargarCursosDelClub),
      obtenerConCache(catalogo.integrantesPorClub, club.id, cargarInscripcionesActivasDelClub)
    ]);
    if (elemento('nueva-club').value !== String(club.id)) {
      return;
    }
    formulario.estudiantes = estudiantes.slice().sort((a, b) =>
      `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, 'es'));
    formulario.integrantes = new Set(integrantes.map(inscripcion => inscripcion.estudianteId));
    formulario.cursos = cursos.filter(curso => CURSOS_ABIERTOS.includes(curso.estado));
    elemento('nueva-buscar-estudiante').disabled = false;
    elemento('nueva-estudiante').disabled = false;
    llenarEstudiantesNueva();
    llenarCursosNueva();
  } catch (error) {
    reiniciarSeleccionNueva('No se pudieron cargar los estudiantes.');
    mostrarAlerta(elemento('alertas-nueva'), 'danger', mensajeDe(error));
  }
}

function textoEstudiante(estudiante) {
  const partes = [`${estudiante.apellidos} ${estudiante.nombres}`, estudiante.codigoInterno, estudiante.cursoEtiqueta];
  if (formulario.integrantes.has(estudiante.id)) {
    partes.push('ya es integrante');
  }
  if (estudiante.autorizacionParticipacion !== 'OTORGADA') {
    partes.push('sin autorización de participación');
  }
  return partes.join(' · ');
}

function llenarEstudiantesNueva() {
  const selector = elemento('nueva-estudiante');
  const anterior = selector.value;
  const texto = elemento('nueva-buscar-estudiante').value.trim().toLowerCase();
  const visibles = formulario.estudiantes.filter(estudiante => !texto
    || `${estudiante.apellidos} ${estudiante.nombres} ${estudiante.codigoInterno}`.toLowerCase().includes(texto));
  selector.replaceChildren(...visibles.map(estudiante => crearElemento('option', {
    texto: textoEstudiante(estudiante),
    atributos: { value: String(estudiante.id) }
  })));
  if (visibles.some(estudiante => String(estudiante.id) === anterior)) {
    selector.value = anterior;
  }
  if (formulario.estudiantes.length === 0) {
    elemento('ayuda-nueva-estudiante').textContent = 'La institución del club no tiene estudiantes activos registrados.';
    return;
  }
  actualizarAyudaEstudiante();
}

function estudianteSeleccionado() {
  const id = Number(elemento('nueva-estudiante').value);
  return formulario.estudiantes.find(estudiante => estudiante.id === id) || null;
}

function actualizarAyudaEstudiante() {
  const ayuda = elemento('ayuda-nueva-estudiante');
  const estudiante = estudianteSeleccionado();
  if (!estudiante) {
    const total = elemento('nueva-estudiante').options.length;
    ayuda.textContent = `${total} de ${formulario.estudiantes.length} estudiantes activos de la institución. Seleccione uno de la lista.`;
    ayuda.className = 'form-text';
    return;
  }
  const avisos = [];
  if (estudiante.autorizacionParticipacion !== 'OTORGADA') {
    avisos.push('No tiene la autorización de participación otorgada: puede registrar la solicitud, pero no podrá aprobarse hasta que se otorgue en la pantalla de Estudiantes.');
  }
  if (formulario.integrantes.has(estudiante.id)) {
    avisos.push('Ya es integrante activo del club: indique el curso al que desea inscribirlo.');
  }
  ayuda.textContent = avisos.length > 0 ? avisos.join(' ') : `Seleccionado: ${estudiante.apellidos} ${estudiante.nombres} (${estudiante.codigoInterno}).`;
  ayuda.className = avisos.length > 0 ? 'form-text text-warning-emphasis' : 'form-text';
}

function textoCurso(curso) {
  return `${curso.nombre} · ${NIVELES[curso.nivel]} · ${curso.inscritosActivos}/${curso.cupoMaximo} · ${ESTADOS_CURSO[curso.estado]}`;
}

function llenarCursosNueva() {
  const opciones = [crearElemento('option', { texto: 'Solo inscribir en el club', atributos: { value: '' } })];
  formulario.cursos.forEach(curso => {
    opciones.push(crearElemento('option', { texto: textoCurso(curso), atributos: { value: String(curso.id) } }));
  });
  elemento('nueva-curso').replaceChildren(...opciones);
  elemento('nueva-curso').disabled = false;
  elemento('ayuda-nueva-curso').textContent = formulario.cursos.length === 0
    ? 'El club no tiene cursos planificados o en curso; la solicitud solo inscribirá al estudiante en el club.'
    : 'Opcional. Si el estudiante ya es integrante del club, indique el curso.';
}

function cursoSeleccionadoNueva() {
  const id = Number(elemento('nueva-curso').value);
  return formulario.cursos.find(curso => curso.id === id) || null;
}

function alCambiarCursoNueva() {
  const curso = cursoSeleccionadoNueva();
  if (curso) {
    elemento('nueva-nivel').value = curso.nivel;
  }
  actualizarCamposNivel();
}

function actualizarCamposNivel() {
  const nivel = elemento('nueva-nivel').value;
  elemento('grupo-nueva-conocimientos').hidden = !['INTERMEDIO', 'AVANZADO'].includes(nivel);
  elemento('grupo-nueva-experiencia').hidden = nivel !== 'AVANZADO';
  const curso = cursoSeleccionadoNueva();
  const ayuda = elemento('ayuda-nueva-nivel');
  if (curso && nivel && curso.nivel !== nivel) {
    ayuda.textContent = `No coincide con el nivel del curso (${NIVELES[curso.nivel]}). Quien apruebe definirá el nivel y el curso definitivos.`;
    ayuda.className = 'form-text text-warning-emphasis';
  } else if (nivel === 'PRINCIPIANTE') {
    ayuda.textContent = 'Solo se pide la motivación.';
    ayuda.className = 'form-text';
  } else if (nivel === 'INTERMEDIO') {
    ayuda.textContent = 'Se piden los conocimientos y la motivación.';
    ayuda.className = 'form-text';
  } else if (nivel === 'AVANZADO') {
    ayuda.textContent = 'Se piden los conocimientos, la experiencia previa y la motivación.';
    ayuda.className = 'form-text';
  } else {
    ayuda.textContent = '';
  }
}

function actualizarContadorMotivacion() {
  const longitud = elemento('nueva-motivacion').value.trim().length;
  elemento('contador-motivacion').textContent = `${longitud} / 2000 caracteres (mínimo ${MOTIVACION_MINIMA}).`;
}

function textoONulo(id) {
  const valor = elemento(id).value.trim();
  return valor === '' ? null : valor;
}

function validarNueva() {
  const problemas = [];
  const nivel = elemento('nueva-nivel').value;
  if (!elemento('nueva-club').value) {
    problemas.push('Seleccione el club.');
  }
  const estudiante = estudianteSeleccionado();
  if (!estudiante) {
    problemas.push('Seleccione el estudiante.');
  }
  if (!nivel) {
    problemas.push('Seleccione el nivel de conocimiento del estudiante.');
  }
  if (['INTERMEDIO', 'AVANZADO'].includes(nivel) && !textoONulo('nueva-conocimientos')) {
    problemas.push(`Para el nivel ${NIVELES[nivel].toLowerCase()} describa los conocimientos del estudiante.`);
  }
  if (nivel === 'AVANZADO' && !textoONulo('nueva-experiencia')) {
    problemas.push('Para el nivel avanzado describa la experiencia previa del estudiante.');
  }
  const motivacion = elemento('nueva-motivacion').value.trim();
  if (motivacion.length < MOTIVACION_MINIMA) {
    problemas.push(`La motivación debe tener al menos ${MOTIVACION_MINIMA} caracteres.`);
  }
  if (estudiante && formulario.integrantes.has(estudiante.id) && !elemento('nueva-curso').value) {
    problemas.push('El estudiante ya es integrante del club: indique el curso al que desea inscribirlo.');
  }
  return problemas;
}

async function registrarSolicitud(evento) {
  evento.preventDefault();
  const alertas = elemento('alertas-nueva');
  limpiarAlerta(alertas);
  const problemas = validarNueva();
  if (problemas.length > 0) {
    mostrarAlerta(alertas, 'danger', 'Revise los datos ingresados:', problemas);
    return;
  }
  const nivel = elemento('nueva-nivel').value;
  const cuerpo = {
    estudianteId: Number(elemento('nueva-estudiante').value),
    clubId: Number(elemento('nueva-club').value),
    cursoId: elemento('nueva-curso').value ? Number(elemento('nueva-curso').value) : null,
    nivel,
    conocimientos: nivel === 'PRINCIPIANTE' ? null : textoONulo('nueva-conocimientos'),
    experienciaPrevia: nivel === 'AVANZADO' ? textoONulo('nueva-experiencia') : null,
    motivacion: elemento('nueva-motivacion').value.trim()
  };
  const boton = elemento('boton-registrar');
  establecerCargando(boton, true, 'Registrando...');
  try {
    const creada = await apiFetch('/api/solicitudes-inscripcion', { metodo: 'POST', cuerpo });
    modalNueva.hide();
    const destino = creada.cursoNombre ? `${creada.clubNombre}, curso ${creada.cursoNombre}` : creada.clubNombre;
    const mensaje = `Solicitud N.º ${creada.id} registrada para ${identificarEstudiante(creada)} en ${destino}. Queda pendiente de revisión.`;
    const advertencias = creada.advertencias || [];
    if (advertencias.length > 0) {
      mostrarAlerta(elemento('alertas'), 'warning', `${mensaje} Tenga en cuenta:`, advertencias);
    } else {
      mostrarAlerta(elemento('alertas'), 'success', mensaje);
    }
    catalogo.integrantesPorClub.delete(creada.clubId);
    await recargar(0);
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

async function abrirDetalle(id) {
  limpiarAlerta(elemento('alertas'));
  try {
    const solicitud = await apiFetch(`/api/solicitudes-inscripcion/${id}`);
    limpiarAlerta(elemento('alertas-detalle'));
    renderizarDetalle(solicitud);
    modalDetalle.show();
  } catch (error) {
    mostrarAlerta(elemento('alertas'), 'danger', mensajeDe(error));
  }
}

function agregarDato(lista, termino, valor) {
  lista.appendChild(crearElemento('dt', { clase: 'col-sm-4', texto: termino }));
  const descripcion = crearElemento('dd', { clase: 'col-sm-8' });
  if (valor instanceof Node) {
    descripcion.appendChild(valor);
  } else {
    descripcion.textContent = valor === null || valor === undefined || valor === '' ? '—' : valor;
  }
  lista.appendChild(descripcion);
}

function textoLargo(valor) {
  return crearElemento('div', { clase: 'texto-preformateado', texto: valor || '—' });
}

function renderizarDetalle(solicitud) {
  pantalla.solicitud = solicitud;
  pantalla.modoMotivo = null;
  pantalla.verificacion = null;
  const completa = !soloDatosMinimos() && solicitud.estudianteNombres !== undefined;

  elemento('titulo-modal-detalle').textContent = `Solicitud N.º ${solicitud.id}`;
  elemento('subtitulo-detalle').replaceChildren(
    insignia(ESTADOS_SOLICITUD, solicitud.estado),
    document.createTextNode(` ${identificarEstudiante(solicitud)} · ${solicitud.clubNombre}`)
  );

  const datos = elemento('lista-datos');
  datos.replaceChildren();
  if (completa) {
    agregarDato(datos, 'Estudiante', nombreEstudiante(solicitud));
  }
  agregarDato(datos, 'Código', crearElemento('span', { clase: 'font-monospace text-nowrap', texto: solicitud.estudianteCodigo }));
  agregarDato(datos, 'Institución', solicitud.institucionNombre);
  agregarDato(datos, 'Club', solicitud.clubNombre);
  agregarDato(datos, 'Curso solicitado', solicitud.cursoNombre || 'Ninguno (solo inscripción al club)');
  agregarDato(datos, 'Nivel declarado', NIVELES[solicitud.nivel] || solicitud.nivel);

  elemento('seccion-formulario').hidden = !completa;
  if (completa) {
    const lista = elemento('lista-formulario');
    lista.replaceChildren();
    agregarDato(lista, 'Conocimientos', solicitud.nivel === 'PRINCIPIANTE' ? 'No se pide para principiantes' : textoLargo(solicitud.conocimientos));
    agregarDato(lista, 'Experiencia previa', solicitud.nivel === 'AVANZADO' ? textoLargo(solicitud.experienciaPrevia) : 'Solo se pide para el nivel avanzado');
    agregarDato(lista, 'Motivación', textoLargo(solicitud.motivacion));
  }

  renderizarTrazabilidad(solicitud, completa);
  renderizarResolucion(solicitud, completa);
  renderizarAcciones(solicitud);
}

function pasoTrazabilidad(icono, clase, texto) {
  return crearElemento('li', { clase: 'd-flex gap-2 mb-1' }, [
    crearElemento('i', { clase: `bi ${icono} ${clase}`, atributos: { 'aria-hidden': 'true' } }),
    crearElemento('span', { texto })
  ]);
}

function porQuien(nombre) {
  return nombre ? ` por ${nombre}` : '';
}

function renderizarTrazabilidad(solicitud, completa) {
  const pasos = [pasoTrazabilidad('bi-pencil-square', 'text-body-secondary',
    `Registrada el ${formatearFechaHora(solicitud.fechaSolicitud)}${completa ? porQuien(solicitud.solicitadoPorNombre) : ''}.`)];
  if (solicitud.fechaRevision) {
    pasos.push(pasoTrazabilidad('bi-clipboard-check', 'text-info',
      `Tomada en revisión el ${formatearFechaHora(solicitud.fechaRevision)}${completa ? porQuien(solicitud.revisadoPorNombre) : ''}.`));
  }
  if (solicitud.fechaResolucion) {
    const final = {
      APROBADA: ['bi-check-circle', 'text-success', 'Aprobada'],
      RECHAZADA: ['bi-x-circle', 'text-danger', 'Rechazada'],
      CANCELADA: ['bi-slash-circle', 'text-body-secondary', 'Cancelada']
    }[solicitud.estado];
    if (final) {
      pasos.push(pasoTrazabilidad(final[0], final[1],
        `${final[2]} el ${formatearFechaHora(solicitud.fechaResolucion)}${completa ? porQuien(solicitud.resueltoPorNombre) : ''}.`));
    }
  } else if (solicitud.estado === 'PENDIENTE') {
    pasos.push(pasoTrazabilidad('bi-hourglass-split', 'text-warning', 'Pendiente de que un responsable la tome en revisión.'));
  } else if (solicitud.estado === 'EN_REVISION') {
    pasos.push(pasoTrazabilidad('bi-hourglass-split', 'text-warning', 'Pendiente de aprobación o rechazo.'));
  }
  elemento('lista-trazabilidad').replaceChildren(...pasos);
}

function renderizarResolucion(solicitud, completa) {
  const seccion = elemento('seccion-resolucion');
  const lista = elemento('lista-resolucion');
  lista.replaceChildren();
  if (solicitud.estado === 'APROBADA') {
    agregarDato(lista, 'Nivel asignado', NIVELES[solicitud.nivelAsignado]);
    agregarDato(lista, 'Curso asignado', solicitud.cursoAsignadoNombre || 'Ninguno (solo inscripción al club)');
    if (completa) {
      agregarDato(lista, 'Sobrecupo', solicitud.sobrecupoAutorizado ? 'Autorizado por el Administrador' : 'No');
      agregarDato(lista, 'Observación', textoLargo(solicitud.observacionResolucion));
    }
    seccion.hidden = false;
    return;
  }
  if (completa && ['RECHAZADA', 'CANCELADA'].includes(solicitud.estado)) {
    agregarDato(lista, solicitud.estado === 'RECHAZADA' ? 'Motivo del rechazo' : 'Motivo de la cancelación',
      textoLargo(solicitud.observacionResolucion));
    seccion.hidden = false;
    return;
  }
  seccion.hidden = true;
}

function renderizarAcciones(solicitud) {
  const resolver = puedeResolver(solicitud);
  const propia = esSolicitante(solicitud);
  const panelRevision = elemento('panel-revision');
  const texto = elemento('texto-revision');
  const botonRevision = elemento('boton-tomar-revision');

  panelRevision.hidden = true;
  botonRevision.hidden = true;
  botonRevision.disabled = false;
  elemento('panel-aprobacion').hidden = true;
  elemento('panel-motivo').hidden = true;
  elemento('boton-abrir-cancelacion').hidden = !puedeCancelar(solicitud);

  if (!ESTADOS_ABIERTOS.includes(solicitud.estado) || soloDatosMinimos()) {
    return;
  }
  if (!resolver) {
    texto.textContent = solicitud.estado === 'PENDIENTE'
      ? 'La solicitud espera que el Responsable institucional o el Administrador la tome en revisión.'
      : 'La solicitud está en revisión; la aprobará o rechazará el Responsable institucional o el Administrador.';
    panelRevision.hidden = false;
    return;
  }
  if (propia) {
    texto.textContent = 'Usted registró esta solicitud. Por separación de funciones, debe revisarla y resolverla otro responsable de la institución o un administrador.';
    panelRevision.hidden = false;
    return;
  }
  if (solicitud.estado === 'PENDIENTE') {
    texto.textContent = 'Al tomarla en revisión quedará registrada a su nombre y podrá verificar los requisitos, aprobarla o rechazarla.';
    botonRevision.hidden = false;
    panelRevision.hidden = false;
    return;
  }
  prepararAprobacion(solicitud);
}

async function tomarEnRevision() {
  const solicitud = pantalla.solicitud;
  const boton = elemento('boton-tomar-revision');
  const alertas = elemento('alertas-detalle');
  limpiarAlerta(alertas);
  establecerCargando(boton, true, 'Procesando...');
  try {
    const actualizada = await apiFetch(`/api/solicitudes-inscripcion/${solicitud.id}/revision`, { metodo: 'PATCH' });
    pantalla.cambios = true;
    establecerCargando(boton, false);
    renderizarDetalle(actualizada);
    mostrarAlerta(alertas, 'info', 'La solicitud está ahora en revisión a su nombre. Verifique los requisitos y apruébela o recházela.');
  } catch (error) {
    establecerCargando(boton, false);
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  }
}

async function prepararAprobacion(solicitud) {
  const panel = elemento('panel-aprobacion');
  panel.hidden = false;
  elemento('aprobar-nivel').value = solicitud.nivel;
  elemento('aprobar-observacion').value = '';
  elemento('aprobar-sobrecupo').checked = false;
  elemento('grupo-sobrecupo').hidden = true;
  elemento('boton-aprobar').disabled = true;
  elemento('boton-abrir-rechazo').disabled = false;
  actualizarEtiquetaObservacion();
  elemento('aprobar-curso').replaceChildren(crearElemento('option', { texto: 'Cargando cursos...', atributos: { value: '' } }));
  elemento('aprobar-curso').disabled = true;
  try {
    const cursos = await obtenerConCache(catalogo.cursosPorClub, solicitud.clubId, cargarCursosDelClub);
    if (pantalla.solicitud !== solicitud) {
      return;
    }
    llenarCursosAprobacion(solicitud.cursoId);
  } catch (error) {
    llenarCursosAprobacion(solicitud.cursoId, []);
    mostrarAlerta(elemento('alertas-detalle'), 'warning', `No se pudieron cargar los cursos del club: ${mensajeDe(error)}`);
  }
  verificar();
}

function cursosAbiertosDelClub(clubId) {
  return (catalogo.cursosPorClub.get(clubId) || []).filter(curso => CURSOS_ABIERTOS.includes(curso.estado));
}

function llenarCursosAprobacion(preferido = null, forzados = null) {
  const solicitud = pantalla.solicitud;
  if (!solicitud) {
    return;
  }
  const selector = elemento('aprobar-curso');
  const ayuda = elemento('ayuda-aprobar-curso');
  const nivel = elemento('aprobar-nivel').value;
  const anterior = preferido !== null ? String(preferido) : selector.value;
  const disponibles = (forzados || cursosAbiertosDelClub(solicitud.clubId)).filter(curso => curso.nivel === nivel);
  const opciones = [];
  if (!solicitud.cursoId) {
    opciones.push(crearElemento('option', { texto: 'Sin curso: solo inscribir en el club', atributos: { value: '' } }));
  }
  disponibles.forEach(curso => {
    opciones.push(crearElemento('option', { texto: textoCurso(curso), atributos: { value: String(curso.id) } }));
  });
  if (opciones.length === 0) {
    opciones.push(crearElemento('option', { texto: `No hay cursos abiertos de nivel ${NIVELES[nivel].toLowerCase()}`, atributos: { value: '' } }));
  }
  selector.replaceChildren(...opciones);
  selector.disabled = disponibles.length === 0;
  if (disponibles.some(curso => String(curso.id) === anterior)) {
    selector.value = anterior;
  }

  if (solicitud.cursoId && disponibles.length === 0) {
    ayuda.textContent = `La solicitud pidió un curso, así que debe asignarse uno del club. No hay cursos abiertos de nivel ${NIVELES[nivel].toLowerCase()}: mantenga el nivel del curso solicitado o rechace la solicitud.`;
  } else if (solicitud.cursoId) {
    ayuda.textContent = 'La solicitud pidió un curso: puede asignar el mismo u otro curso abierto del club con el nivel asignado.';
  } else {
    ayuda.textContent = 'Solo se listan los cursos planificados o en curso del club con el nivel asignado.';
  }
}

function actualizarEtiquetaObservacion() {
  const sobrecupo = elemento('aprobar-sobrecupo').checked;
  elemento('etiqueta-aprobar-observacion').textContent = sobrecupo
    ? 'Justificación del sobrecupo *'
    : 'Observación (opcional)';
  elemento('aprobar-observacion').required = sobrecupo;
}

function itemVerificacion(control) {
  const icono = control.cumple ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger';
  return crearElemento('li', { clase: 'list-group-item d-flex gap-2 align-items-start' }, [
    crearElemento('i', { clase: `bi ${icono}`, atributos: { 'aria-hidden': 'true' } }),
    crearElemento('div', {}, [
      crearElemento('span', { clase: 'fw-semibold', texto: `${control.regla}: ` }),
      crearElemento('span', { texto: control.detalle }),
      crearElemento('span', { clase: 'visually-hidden', texto: control.cumple ? ' (cumple)' : ' (no cumple)' })
    ])
  ]);
}

async function verificar() {
  const solicitud = pantalla.solicitud;
  if (!solicitud || solicitud.estado !== 'EN_REVISION') {
    return;
  }
  const turno = ++pantalla.turnoVerificacion;
  const lista = elemento('lista-verificacion');
  lista.replaceChildren(crearElemento('li', { clase: 'list-group-item text-body-secondary', texto: 'Verificando requisitos...' }));
  elemento('resumen-verificacion').textContent = '';
  elemento('boton-aprobar').disabled = true;
  const consulta = construirConsulta({
    cursoId: elemento('aprobar-curso').value,
    nivelAsignado: elemento('aprobar-nivel').value
  });
  try {
    const resultado = await apiFetch(`/api/solicitudes-inscripcion/${solicitud.id}/verificacion${consulta}`);
    if (turno !== pantalla.turnoVerificacion || pantalla.solicitud !== solicitud) {
      return;
    }
    pantalla.verificacion = resultado;
    lista.replaceChildren(...resultado.controles.map(itemVerificacion));
    evaluarVerificacion();
  } catch (error) {
    if (turno !== pantalla.turnoVerificacion) {
      return;
    }
    pantalla.verificacion = null;
    lista.replaceChildren(crearElemento('li', {
      clase: 'list-group-item text-danger',
      texto: `No se pudo verificar: ${mensajeDe(error)}`
    }));
    elemento('boton-aprobar').disabled = false;
    elemento('resumen-verificacion').textContent = 'Puede intentar la aprobación; el servidor volverá a validar todas las reglas.';
  }
}

function evaluarVerificacion() {
  const resultado = pantalla.verificacion;
  const resumenVerificacion = elemento('resumen-verificacion');
  const boton = elemento('boton-aprobar');
  if (!resultado) {
    return;
  }
  const fallidos = resultado.controles.filter(control => !control.cumple);
  const soloCupoClub = fallidos.length > 0 && fallidos.every(control => control.regla === REGLA_CUPO_CLUB);
  const esAdmin = rolActual() === 'ADMIN';
  elemento('grupo-sobrecupo').hidden = !(esAdmin && soloCupoClub) && !elemento('aprobar-sobrecupo').checked;
  if (!soloCupoClub && elemento('aprobar-sobrecupo').checked) {
    elemento('aprobar-sobrecupo').checked = false;
    actualizarEtiquetaObservacion();
    elemento('grupo-sobrecupo').hidden = true;
  }

  if (fallidos.length === 0) {
    boton.disabled = false;
    resumenVerificacion.className = 'small mt-2 text-success-emphasis';
    resumenVerificacion.textContent = resultado.cursoId
      ? 'Se cumplen todos los requisitos. Al aprobar, el estudiante quedará inscrito en el club (si aún no lo está) y en el curso asignado.'
      : 'Se cumplen todos los requisitos. Al aprobar, el estudiante quedará inscrito como integrante del club.';
    return;
  }
  if (soloCupoClub && esAdmin) {
    const marcado = elemento('aprobar-sobrecupo').checked;
    boton.disabled = !marcado;
    resumenVerificacion.className = 'small mt-2 text-warning-emphasis';
    resumenVerificacion.textContent = marcado
      ? 'Aprobará con sobrecupo: escriba la justificación en la observación; quedará registrada en la auditoría.'
      : 'El club está lleno. Como Administrador puede autorizar un sobrecupo marcando la casilla y justificándolo.';
    return;
  }
  boton.disabled = true;
  resumenVerificacion.className = 'small mt-2 text-danger-emphasis';
  const partes = ['No se puede aprobar todavía: resuelva los puntos marcados o rechace la solicitud.'];
  if (fallidos.some(control => control.regla === REGLA_AUTORIZACION)) {
    partes.push('La autorización de participación se registra en la pantalla de Estudiantes.');
  }
  if (soloCupoClub) {
    partes.push('Solo el Administrador puede autorizar un sobrecupo.');
  }
  resumenVerificacion.textContent = partes.join(' ');
}

async function aprobar(evento) {
  evento.preventDefault();
  const solicitud = pantalla.solicitud;
  const alertas = elemento('alertas-detalle');
  limpiarAlerta(alertas);
  const sobrecupo = elemento('aprobar-sobrecupo').checked;
  const observacion = elemento('aprobar-observacion').value.trim();
  if (sobrecupo && observacion === '') {
    mostrarAlerta(alertas, 'danger', 'Escriba en la observación la justificación del sobrecupo.');
    return;
  }
  const cuerpo = {
    nivelAsignado: elemento('aprobar-nivel').value,
    cursoId: elemento('aprobar-curso').value ? Number(elemento('aprobar-curso').value) : null,
    observacion: observacion === '' ? null : observacion,
    autorizarSobrecupo: sobrecupo
  };
  const boton = elemento('boton-aprobar');
  establecerCargando(boton, true, 'Aprobando...');
  try {
    const aprobada = await apiFetch(`/api/solicitudes-inscripcion/${solicitud.id}/aprobacion`, { metodo: 'PATCH', cuerpo });
    pantalla.cambios = true;
    catalogo.cursosPorClub.delete(aprobada.clubId);
    catalogo.integrantesPorClub.delete(aprobada.clubId);
    establecerCargando(boton, false);
    renderizarDetalle(aprobada);
    const destino = aprobada.cursoAsignadoNombre
      ? `en el club ${aprobada.clubNombre} y en el curso ${aprobada.cursoAsignadoNombre}`
      : `como integrante del club ${aprobada.clubNombre}`;
    mostrarAlerta(alertas, 'success', `Solicitud aprobada: se registró la inscripción de ${identificarEstudiante(aprobada)} ${destino}.`);
  } catch (error) {
    establecerCargando(boton, false);
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
    verificar();
  }
}

function abrirPanelMotivo(modo) {
  const datos = PANEL_MOTIVO[modo];
  pantalla.modoMotivo = modo;
  limpiarAlerta(elemento('alertas-detalle'));
  elemento('titulo-panel-motivo').textContent = datos.titulo;
  elemento('texto-panel-motivo').textContent = datos.texto;
  elemento('boton-confirmar-motivo').textContent = datos.boton;
  elemento('boton-confirmar-motivo').disabled = false;
  elemento('campo-motivo').value = '';
  elemento('panel-aprobacion').hidden = true;
  elemento('panel-revision').hidden = true;
  elemento('boton-abrir-cancelacion').hidden = true;
  elemento('panel-motivo').hidden = false;
  elemento('campo-motivo').focus();
}

function cerrarPanelMotivo() {
  pantalla.modoMotivo = null;
  elemento('panel-motivo').hidden = true;
  renderizarAcciones(pantalla.solicitud);
}

async function confirmarMotivo(evento) {
  evento.preventDefault();
  const solicitud = pantalla.solicitud;
  const datos = PANEL_MOTIVO[pantalla.modoMotivo];
  const alertas = elemento('alertas-detalle');
  limpiarAlerta(alertas);
  const motivo = elemento('campo-motivo').value.trim();
  if (motivo.length < MOTIVO_MINIMO || motivo.length > 500) {
    mostrarAlerta(alertas, 'danger', `El motivo debe tener entre ${MOTIVO_MINIMO} y 500 caracteres.`);
    return;
  }
  const boton = elemento('boton-confirmar-motivo');
  establecerCargando(boton, true, 'Guardando...');
  try {
    const actualizada = await apiFetch(`/api/solicitudes-inscripcion/${solicitud.id}/${datos.ruta}`, {
      metodo: 'PATCH',
      cuerpo: { motivo }
    });
    pantalla.cambios = true;
    establecerCargando(boton, false);
    renderizarDetalle(actualizada);
    mostrarAlerta(alertas, 'success', `La solicitud quedó ${datos.exito}.`);
  } catch (error) {
    establecerCargando(boton, false);
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  }
}
