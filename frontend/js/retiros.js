import { apiFetch, construirConsulta, ApiError } from './api.js';
import {
  cargarInstituciones,
  cargarClubes,
  cargarInscripcionesActivasDelClub,
  cargarRetirosPendientesDelClub
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
const COLUMNAS = 6;
const ROLES_GLOBALES = ['ADMIN', 'COORDINADOR', 'CONSULTA'];
const ROLES_DATOS_MINIMOS = ['COORDINADOR', 'CONSULTA'];
const ROLES_REGISTRO = ['ADMIN', 'RESP_INSTITUCIONAL', 'DOCENTE'];
const ROLES_RESOLUCION = ['ADMIN', 'RESP_INSTITUCIONAL'];
const MOTIVO_RETIRO_MINIMO = 10;
const MOTIVO_MINIMO = 5;
const MOTIVO_MAXIMO = 500;

const ESTADOS_RETIRO = {
  PENDIENTE: { etiqueta: 'Pendiente', clase: 'text-bg-warning' },
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

const NIVELES = {
  PRINCIPIANTE: 'Principiante',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado'
};

const PANEL_MOTIVO = {
  rechazo: {
    titulo: 'Rechazar el retiro',
    texto: 'El estudiante seguirá siendo integrante del club y de sus cursos. La solicitud queda cerrada.',
    boton: 'Confirmar rechazo',
    ruta: 'rechazo',
    exito: 'rechazada: el estudiante sigue siendo integrante del club'
  },
  cancelacion: {
    titulo: 'Cancelar la solicitud de retiro',
    texto: 'La solicitud se cerrará sin retirar al estudiante. Si más adelante se necesita, registre una nueva.',
    boton: 'Confirmar cancelación',
    ruta: 'cancelacion',
    exito: 'cancelada: el estudiante sigue siendo integrante del club'
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
  efectos: null,
  turnoEfectos: 0
};
const catalogo = {
  instituciones: [],
  clubes: [],
  integrantesPorClub: new Map(),
  pendientesPorClub: new Map()
};
const formulario = { integrantes: [], pendientes: new Set() };
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

function deSuInstitucion(solicitud) {
  return rolActual() === 'ADMIN' || solicitud.institucionId === sesion.usuario.institucionId;
}

function puedeResolver(solicitud) {
  return ROLES_RESOLUCION.includes(rolActual()) && deSuInstitucion(solicitud);
}

function esSolicitante(solicitud) {
  return solicitud.solicitadoPorId === sesion.usuario.id;
}

function puedeCancelar(solicitud) {
  if (solicitud.estado !== 'PENDIENTE' || !puedeRegistrar()) {
    return false;
  }
  if (rolActual() === 'DOCENTE') {
    return esSolicitante(solicitud);
  }
  return deSuInstitucion(solicitud);
}

function puedeAprobarAhora(solicitud) {
  return solicitud.estado === 'PENDIENTE' && puedeResolver(solicitud) && !esSolicitante(solicitud);
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

function cantidadCursosRetirados(solicitud) {
  if (Array.isArray(solicitud.cursosRetirados)) {
    return solicitud.cursosRetirados.length;
  }
  return solicitud.cursosRetirados || 0;
}

function textoCantidadCursos(cantidad) {
  if (cantidad === 0) {
    return 'sin cursos activos que cerrar';
  }
  return cantidad === 1 ? '1 curso cerrado' : `${cantidad} cursos cerrados`;
}

async function iniciar() {
  montarLayout(sesion, 'retiros');

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
  elemento('nueva-buscar-integrante').addEventListener('input', llenarIntegrantesNueva);
  elemento('nueva-integrante').addEventListener('change', actualizarAyudaIntegrante);
  elemento('nueva-motivo').addEventListener('input', actualizarContadorMotivo);

  elemento('panel-aprobacion').addEventListener('submit', aprobar);
  elemento('boton-recalcular').addEventListener('click', calcularEfectos);
  elemento('aprobar-confirmacion').addEventListener('change', evaluarEfectos);
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
  if (estado && ESTADOS_RETIRO[estado]) {
    elemento('filtro-estado').value = estado;
  }
  pantalla.filtros = leerFiltros();

  const estudianteId = parametros.get('estudianteId');
  if (estudianteId && /^\d+$/.test(estudianteId)) {
    pantalla.estudianteId = Number(estudianteId);
    let texto = 'Se muestran solo los retiros del estudiante seleccionado.';
    try {
      const estudiante = await apiFetch(`/api/estudiantes/${estudianteId}`);
      const nombre = estudiante.nombres
        ? `${estudiante.apellidos} ${estudiante.nombres} (${estudiante.codigoInterno})`
        : estudiante.codigoInterno;
      texto = `Se muestran solo los retiros de ${nombre}.`;
    } catch (error) {
      texto = 'Se muestran solo los retiros del estudiante indicado en el enlace.';
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
    estado: elemento('filtro-estado').value
  };
}

function consultaActual(extra) {
  return { ...pantalla.filtros, estudianteId: pantalla.estudianteId, ...extra };
}

function filaMensaje(texto) {
  const celda = crearElemento('td', {
    clase: 'text-center text-body-secondary py-4',
    texto,
    atributos: { colspan: String(COLUMNAS) }
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
  cuerpo.replaceChildren(filaMensaje('Cargando solicitudes de retiro...'));
  try {
    const ruta = `/api/solicitudes-retiro${construirConsulta(consultaActual({ pagina, tamano: TAMANO_PAGINA }))}`;
    const respuesta = await apiFetch(ruta);
    pantalla.pagina = respuesta.pagina;
    if (respuesta.contenido.length === 0) {
      cuerpo.replaceChildren(filaMensaje('No se encontraron solicitudes de retiro.'));
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
  try {
    const respuesta = await apiFetch(
      `/api/solicitudes-retiro${construirConsulta(consultaActual({ estado: 'PENDIENTE', pagina: 0, tamano: 1 }))}`
    );
    contenedor.replaceChildren(crearContador(respuesta.totalElementos));
  } catch (error) {
    contenedor.replaceChildren();
  }
}

function crearContador(total) {
  const datos = ESTADOS_RETIRO.PENDIENTE;
  const boton = crearElemento('button', {
    clase: 'btn btn-sm btn-outline-secondary py-0',
    atributos: { type: 'button', title: 'Filtrar: pendientes' }
  }, [
    crearElemento('span', { clase: `badge ${datos.clase} me-1`, texto: String(total) }),
    document.createTextNode(total === 1 ? 'pendiente' : 'pendientes')
  ]);
  boton.addEventListener('click', () => {
    elemento('filtro-estado').value = 'PENDIENTE';
    pantalla.filtros = leerFiltros();
    recargar(0);
  });
  return boton;
}

function textoEfecto(solicitud) {
  if (solicitud.estado === 'APROBADA') {
    return [
      crearElemento('div', { texto: `Retirado el ${formatearFecha(solicitud.fechaRetiro)}` }),
      crearElemento('div', {
        clase: 'small text-body-secondary',
        texto: textoCantidadCursos(cantidadCursosRetirados(solicitud))
      })
    ];
  }
  if (solicitud.estado === 'PENDIENTE') {
    return [crearElemento('div', { clase: 'small text-body-secondary', texto: 'Sigue como integrante hasta que se resuelva' })];
  }
  return [crearElemento('div', { clase: 'small text-body-secondary', texto: 'Sin cambios: sigue como integrante' })];
}

function crearFila(solicitud) {
  const estudiante = [];
  if (soloDatosMinimos() || !solicitud.estudianteNombres) {
    estudiante.push(crearElemento('div', { clase: 'font-monospace text-nowrap', texto: solicitud.estudianteCodigo }));
  } else {
    estudiante.push(crearElemento('div', { clase: 'fw-semibold', texto: nombreEstudiante(solicitud) }));
    estudiante.push(crearElemento('div', {
      clase: 'small font-monospace text-nowrap text-body-secondary',
      texto: solicitud.estudianteCodigo
    }));
  }

  const club = [crearElemento('div', { texto: solicitud.clubNombre || `Club ${solicitud.clubId}` })];
  if (esGlobal()) {
    club.push(crearElemento('div', { clase: 'small text-body-secondary', texto: solicitud.institucionNombre }));
  }

  return crearElemento('tr', {}, [
    crearElemento('td', { clase: 'small text-nowrap', texto: formatearFechaHora(solicitud.fechaSolicitud) }),
    crearElemento('td', {}, estudiante),
    crearElemento('td', {}, club),
    crearElemento('td', {}, [insignia(ESTADOS_RETIRO, solicitud.estado)]),
    crearElemento('td', {}, textoEfecto(solicitud)),
    crearElemento('td', { clase: 'text-end text-nowrap' }, crearAcciones(solicitud))
  ]);
}

function crearAcciones(solicitud) {
  const acciones = [];
  if (puedeAprobarAhora(solicitud)) {
    const boton = crearElemento('button', {
      clase: 'btn btn-sm btn-primary ms-1',
      texto: 'Resolver',
      atributos: { type: 'button', 'aria-label': `Resolver el retiro de ${identificarEstudiante(solicitud)}` }
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
      'aria-label': `Ver detalle del retiro de ${identificarEstudiante(solicitud)}`
    }
  }, [marca]);
  ver.addEventListener('click', () => abrirDetalle(solicitud.id));
  acciones.push(ver);
  return acciones;
}

async function obtenerConCache(mapa, clave, cargar) {
  if (!mapa.has(clave)) {
    mapa.set(clave, await cargar(clave));
  }
  return mapa.get(clave);
}

function olvidarClub(clubId) {
  catalogo.integrantesPorClub.delete(clubId);
  catalogo.pendientesPorClub.delete(clubId);
}

async function abrirNueva() {
  limpiarAlerta(elemento('alertas-nueva'));
  const disponibles = catalogo.clubes.filter(club => club.estado !== 'CERRADO' && club.integrantesActivos > 0);
  const opciones = [crearElemento('option', { texto: 'Seleccione un club', atributos: { value: '' } })];
  disponibles.forEach(club => {
    opciones.push(crearElemento('option', {
      texto: etiquetaClub(club, rolActual() === 'ADMIN'),
      atributos: { value: String(club.id) }
    }));
  });
  elemento('nueva-club').replaceChildren(...opciones);
  const preferido = elemento('filtro-club').value;
  elemento('nueva-club').value = disponibles.some(club => String(club.id) === preferido) ? preferido : '';

  elemento('nueva-buscar-integrante').value = '';
  elemento('nueva-motivo').value = '';
  elemento('boton-registrar').disabled = false;
  actualizarContadorMotivo();

  if (disponibles.length === 0) {
    mostrarAlerta(elemento('alertas-nueva'), 'warning', rolActual() === 'DOCENTE'
      ? 'Ninguno de los clubes que coordina tiene integrantes activos.'
      : 'No hay clubes abiertos con integrantes activos.');
  }
  modalNueva.show();
  await alCambiarClubNueva();
}

function reiniciarSeleccionNueva(texto) {
  formulario.integrantes = [];
  formulario.pendientes = new Set();
  elemento('nueva-integrante').replaceChildren();
  elemento('nueva-integrante').disabled = true;
  elemento('nueva-buscar-integrante').disabled = true;
  elemento('ayuda-nueva-integrante').textContent = texto;
  elemento('ayuda-nueva-integrante').className = 'form-text';
  elemento('grupo-efectos-nueva').hidden = true;
}

async function alCambiarClubNueva() {
  const club = buscarClub(elemento('nueva-club').value);
  const ayuda = elemento('ayuda-nueva-club');
  if (!club) {
    ayuda.textContent = '';
    reiniciarSeleccionNueva('Seleccione primero el club.');
    return;
  }
  const partes = [`Integrantes activos: ${club.integrantesActivos} de ${club.cupoMaximo} (${club.cuposDisponibles} cupos disponibles).`];
  if (club.estado !== 'ACTIVO') {
    partes.push(`El club está ${(ESTADOS_CLUB[club.estado] || club.estado).toLowerCase()}.`);
  }
  ayuda.textContent = partes.join(' ');

  reiniciarSeleccionNueva('Cargando integrantes del club...');
  try {
    const [integrantes, pendientes] = await Promise.all([
      obtenerConCache(catalogo.integrantesPorClub, club.id, cargarInscripcionesActivasDelClub),
      obtenerConCache(catalogo.pendientesPorClub, club.id, cargarRetirosPendientesDelClub)
    ]);
    if (elemento('nueva-club').value !== String(club.id)) {
      return;
    }
    formulario.integrantes = integrantes.slice().sort((a, b) =>
      `${a.estudianteApellidos} ${a.estudianteNombres}`.localeCompare(`${b.estudianteApellidos} ${b.estudianteNombres}`, 'es'));
    formulario.pendientes = new Set(pendientes.map(solicitud => solicitud.inscripcionId));
    elemento('nueva-buscar-integrante').disabled = false;
    elemento('nueva-integrante').disabled = false;
    llenarIntegrantesNueva();
  } catch (error) {
    reiniciarSeleccionNueva('No se pudieron cargar los integrantes del club.');
    mostrarAlerta(elemento('alertas-nueva'), 'danger', mensajeDe(error));
  }
}

function cursosActivos(inscripcion) {
  return (inscripcion.cursos || []).filter(curso => curso.estado === 'ACTIVA');
}

function nombreIntegrante(inscripcion) {
  return `${inscripcion.estudianteApellidos} ${inscripcion.estudianteNombres}`;
}

function textoIntegrante(inscripcion) {
  const cantidad = cursosActivos(inscripcion).length;
  const partes = [
    nombreIntegrante(inscripcion),
    inscripcion.estudianteCodigo,
    inscripcion.cursoEducativoEtiqueta,
    cantidad === 1 ? '1 curso activo' : `${cantidad} cursos activos`
  ];
  if (formulario.pendientes.has(inscripcion.id)) {
    partes.push('ya tiene un retiro pendiente');
  }
  return partes.join(' · ');
}

function llenarIntegrantesNueva() {
  const selector = elemento('nueva-integrante');
  const anterior = selector.value;
  const texto = elemento('nueva-buscar-integrante').value.trim().toLowerCase();
  const visibles = formulario.integrantes.filter(inscripcion => !texto
    || `${nombreIntegrante(inscripcion)} ${inscripcion.estudianteCodigo}`.toLowerCase().includes(texto));
  selector.replaceChildren(...visibles.map(inscripcion => {
    const opcion = crearElemento('option', {
      texto: textoIntegrante(inscripcion),
      atributos: { value: String(inscripcion.id) }
    });
    opcion.disabled = formulario.pendientes.has(inscripcion.id);
    return opcion;
  }));
  if (visibles.some(inscripcion => String(inscripcion.id) === anterior && !formulario.pendientes.has(inscripcion.id))) {
    selector.value = anterior;
  }
  if (formulario.integrantes.length === 0) {
    elemento('ayuda-nueva-integrante').textContent = 'El club no tiene integrantes activos.';
    elemento('grupo-efectos-nueva').hidden = true;
    return;
  }
  actualizarAyudaIntegrante();
}

function integranteSeleccionado() {
  const id = Number(elemento('nueva-integrante').value);
  return formulario.integrantes.find(inscripcion => inscripcion.id === id) || null;
}

function actualizarAyudaIntegrante() {
  const ayuda = elemento('ayuda-nueva-integrante');
  const inscripcion = integranteSeleccionado();
  const grupo = elemento('grupo-efectos-nueva');
  if (!inscripcion) {
    const total = elemento('nueva-integrante').options.length;
    const bloqueados = formulario.integrantes.filter(i => formulario.pendientes.has(i.id)).length;
    const partes = [`${total} de ${formulario.integrantes.length} integrantes activos. Seleccione uno de la lista.`];
    if (bloqueados > 0) {
      partes.push(bloqueados === 1
        ? '1 integrante ya tiene un retiro pendiente y no puede seleccionarse.'
        : `${bloqueados} integrantes ya tienen un retiro pendiente y no pueden seleccionarse.`);
    }
    ayuda.textContent = partes.join(' ');
    ayuda.className = 'form-text';
    grupo.hidden = true;
    return;
  }
  ayuda.textContent = `Seleccionado: ${nombreIntegrante(inscripcion)} (${inscripcion.estudianteCodigo}), integrante desde el ${formatearFecha(inscripcion.fechaIngreso)}.`;
  ayuda.className = 'form-text';

  const club = buscarClub(inscripcion.clubId);
  const efectos = [];
  if (club) {
    const tras = Math.max(club.cupoMaximo - (club.integrantesActivos - 1), 0);
    efectos.push(`Dejará de ser integrante del club «${club.nombre}» y se liberará un cupo (disponibles: ${club.cuposDisponibles} → ${tras} de ${club.cupoMaximo}).`);
  } else {
    efectos.push('Dejará de ser integrante del club y se liberará un cupo.');
  }
  const cursos = cursosActivos(inscripcion);
  if (cursos.length === 0) {
    efectos.push('No tiene inscripciones activas en cursos del club.');
  } else {
    cursos.forEach(curso => {
      efectos.push(`Se cerrará su inscripción en el curso «${curso.cursoNombre}» (${NIVELES[curso.cursoNivel] || curso.cursoNivel}) y se liberará ese cupo.`);
    });
  }
  efectos.push('Si tiene solicitudes de inscripción abiertas en este club, se cancelarán automáticamente.');
  efectos.push('Su historial (cursos, competencias y certificados) se conserva.');
  elemento('lista-efectos-nueva').replaceChildren(...efectos.map(texto => crearElemento('li', { texto })));
  grupo.hidden = false;
}

function actualizarContadorMotivo() {
  const longitud = elemento('nueva-motivo').value.trim().length;
  elemento('contador-motivo').textContent = `${longitud} / ${MOTIVO_MAXIMO} caracteres (mínimo ${MOTIVO_RETIRO_MINIMO}).`;
}

function validarNueva() {
  const problemas = [];
  if (!elemento('nueva-club').value) {
    problemas.push('Seleccione el club.');
  }
  const inscripcion = integranteSeleccionado();
  if (!inscripcion) {
    problemas.push('Seleccione el integrante que se retira.');
  } else if (formulario.pendientes.has(inscripcion.id)) {
    problemas.push('El integrante ya tiene una solicitud de retiro pendiente.');
  }
  const motivo = elemento('nueva-motivo').value.trim();
  if (motivo.length < MOTIVO_RETIRO_MINIMO || motivo.length > MOTIVO_MAXIMO) {
    problemas.push(`El motivo del retiro debe tener entre ${MOTIVO_RETIRO_MINIMO} y ${MOTIVO_MAXIMO} caracteres.`);
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
  const cuerpo = {
    inscripcionId: Number(elemento('nueva-integrante').value),
    motivo: elemento('nueva-motivo').value.trim()
  };
  const boton = elemento('boton-registrar');
  establecerCargando(boton, true, 'Registrando...');
  try {
    const creada = await apiFetch('/api/solicitudes-retiro', { metodo: 'POST', cuerpo });
    modalNueva.hide();
    const mensaje = `Solicitud de retiro N.º ${creada.id} registrada para ${identificarEstudiante(creada)} en ${creada.clubNombre}. Queda pendiente de aprobación.`;
    const avisos = creada.avisos || [];
    if (avisos.length > 0) {
      mostrarAlerta(elemento('alertas'), 'warning', `${mensaje} Tenga en cuenta:`, avisos);
    } else {
      mostrarAlerta(elemento('alertas'), 'success', mensaje);
    }
    olvidarClub(creada.clubId);
    await recargar(0);
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
    olvidarClub(Number(elemento('nueva-club').value));
  } finally {
    establecerCargando(boton, false);
  }
}

async function abrirDetalle(id) {
  limpiarAlerta(elemento('alertas'));
  try {
    const solicitud = await apiFetch(`/api/solicitudes-retiro/${id}`);
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
  pantalla.efectos = null;
  const completa = !soloDatosMinimos() && solicitud.estudianteNombres !== undefined;

  elemento('titulo-modal-detalle').textContent = `Solicitud de retiro N.º ${solicitud.id}`;
  elemento('subtitulo-detalle').replaceChildren(
    insignia(ESTADOS_RETIRO, solicitud.estado),
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
  if (completa) {
    agregarDato(datos, 'Motivo del retiro', textoLargo(solicitud.motivo));
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
    pasos.push(pasoTrazabilidad('bi-hourglass-split', 'text-warning',
      'Pendiente de aprobación o rechazo. Mientras tanto, el estudiante sigue siendo integrante del club.'));
  }
  elemento('lista-trazabilidad').replaceChildren(...pasos);
}

function listaCursosRetirados(solicitud) {
  if (!Array.isArray(solicitud.cursosRetirados)) {
    return textoCantidadCursos(cantidadCursosRetirados(solicitud));
  }
  if (solicitud.cursosRetirados.length === 0) {
    return 'Ninguno: no tenía inscripciones activas en cursos del club';
  }
  return crearElemento('ul', { clase: 'mb-0 ps-3' }, solicitud.cursosRetirados.map(curso => crearElemento('li', {
    texto: `${curso.cursoNombre} (cerrada el ${formatearFecha(curso.fechaFin)})`
  })));
}

function renderizarResolucion(solicitud, completa) {
  const seccion = elemento('seccion-resolucion');
  const lista = elemento('lista-resolucion');
  lista.replaceChildren();
  if (solicitud.estado === 'APROBADA') {
    agregarDato(lista, 'Fecha de retiro', formatearFecha(solicitud.fechaRetiro));
    agregarDato(lista, 'Cursos cerrados', listaCursosRetirados(solicitud));
    if (completa) {
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
  const espera = elemento('panel-espera');
  const texto = elemento('texto-espera');
  espera.hidden = true;
  elemento('panel-aprobacion').hidden = true;
  elemento('panel-motivo').hidden = true;
  elemento('boton-abrir-cancelacion').hidden = !puedeCancelar(solicitud);

  if (solicitud.estado !== 'PENDIENTE' || soloDatosMinimos()) {
    return;
  }
  if (!puedeResolver(solicitud)) {
    texto.textContent = 'La solicitud espera que el Responsable institucional o el Administrador la apruebe o la rechace.';
    espera.hidden = false;
    return;
  }
  if (esSolicitante(solicitud)) {
    texto.textContent = 'Usted registró esta solicitud. Por separación de funciones, debe aprobarla o rechazarla otro responsable de la institución o un administrador.';
    espera.hidden = false;
    return;
  }
  prepararAprobacion();
}

function prepararAprobacion() {
  elemento('panel-aprobacion').hidden = false;
  elemento('aprobar-observacion').value = '';
  elemento('aprobar-confirmacion').checked = false;
  elemento('boton-aprobar').disabled = true;
  elemento('boton-abrir-rechazo').disabled = false;
  calcularEfectos();
}

function itemEfecto(icono, partes) {
  return crearElemento('li', { clase: 'list-group-item d-flex gap-2 align-items-start' }, [
    crearElemento('i', { clase: `bi ${icono}`, atributos: { 'aria-hidden': 'true' } }),
    crearElemento('div', {}, partes)
  ]);
}

function itemCupo(cupo, accion) {
  const etiqueta = cupo.tipo === 'CLUB' ? 'Club' : 'Curso';
  return itemEfecto('bi-box-arrow-right text-primary', [
    crearElemento('span', { clase: 'fw-semibold', texto: `${etiqueta} «${cupo.nombre}»: ` }),
    crearElemento('span', {
      texto: `${accion}. Integrantes activos ${cupo.activosAhora} de ${cupo.cupoMaximo}; cupos disponibles ${cupo.disponiblesAhora} → ${cupo.disponiblesTrasAprobar}.`
    })
  ]);
}

function itemSolicitudesACancelar(ids) {
  const partes = [crearElemento('span', {
    clase: 'fw-semibold',
    texto: ids.length === 1 ? 'Solicitud de inscripción abierta: ' : 'Solicitudes de inscripción abiertas: '
  })];
  partes.push(document.createTextNode(ids.length === 1 ? 'se cancelará automáticamente la N.º ' : 'se cancelarán automáticamente las N.º '));
  ids.forEach((id, indice) => {
    if (indice > 0) {
      partes.push(document.createTextNode(', '));
    }
    partes.push(crearElemento('a', { texto: String(id), atributos: { href: `solicitudes.html?id=${id}` } }));
  });
  partes.push(document.createTextNode('.'));
  return itemEfecto('bi-slash-circle text-warning', partes);
}

function renderizarEfectos(efectos) {
  const items = [];
  efectos.impedimentos.forEach(impedimento => {
    items.push(itemEfecto('bi-x-circle-fill text-danger', [
      crearElemento('span', { clase: 'fw-semibold', texto: 'Impide aprobar: ' }),
      crearElemento('span', { texto: impedimento })
    ]));
  });
  items.push(itemCupo(efectos.club, 'el estudiante dejará de ser integrante'));
  if (efectos.cursos.length === 0) {
    items.push(itemEfecto('bi-info-circle text-body-secondary', [
      crearElemento('span', { texto: 'No tiene inscripciones activas en cursos del club.' })
    ]));
  } else {
    efectos.cursos.forEach(curso => items.push(itemCupo(curso, 'se cerrará su inscripción')));
  }
  if (efectos.solicitudesInscripcionACancelar.length > 0) {
    items.push(itemSolicitudesACancelar(efectos.solicitudesInscripcionACancelar));
  }
  items.push(itemEfecto('bi-journal-check text-success', [
    crearElemento('span', { texto: 'El historial del estudiante (cursos, competencias y certificados) se conserva.' })
  ]));
  elemento('lista-efectos').replaceChildren(...items);
}

async function calcularEfectos() {
  const solicitud = pantalla.solicitud;
  if (!solicitud || solicitud.estado !== 'PENDIENTE') {
    return;
  }
  const turno = ++pantalla.turnoEfectos;
  const lista = elemento('lista-efectos');
  lista.replaceChildren(crearElemento('li', { clase: 'list-group-item text-body-secondary', texto: 'Calculando efectos...' }));
  elemento('resumen-efectos').textContent = '';
  elemento('boton-aprobar').disabled = true;
  try {
    const efectos = await apiFetch(`/api/solicitudes-retiro/${solicitud.id}/efectos`);
    if (turno !== pantalla.turnoEfectos || pantalla.solicitud !== solicitud) {
      return;
    }
    pantalla.efectos = efectos;
    renderizarEfectos(efectos);
    evaluarEfectos();
  } catch (error) {
    if (turno !== pantalla.turnoEfectos) {
      return;
    }
    pantalla.efectos = null;
    lista.replaceChildren(crearElemento('li', {
      clase: 'list-group-item text-danger',
      texto: `No se pudieron calcular los efectos: ${mensajeDe(error)}`
    }));
    elemento('resumen-efectos').className = 'small mt-2 text-body-secondary';
    elemento('resumen-efectos').textContent = 'Puede intentar la aprobación; el servidor volverá a validar todas las reglas.';
    evaluarEfectos();
  }
}

function evaluarEfectos() {
  const efectos = pantalla.efectos;
  const resumenEfectos = elemento('resumen-efectos');
  const boton = elemento('boton-aprobar');
  const confirmado = elemento('aprobar-confirmacion').checked;
  if (!efectos) {
    boton.disabled = !confirmado;
    return;
  }
  if (!efectos.aprobable) {
    boton.disabled = true;
    resumenEfectos.className = 'small mt-2 text-danger-emphasis';
    resumenEfectos.textContent = 'No se puede aprobar: resuelva los puntos marcados en rojo, rechace la solicitud o cancélela.';
    return;
  }
  boton.disabled = !confirmado;
  resumenEfectos.className = 'small mt-2 text-success-emphasis';
  resumenEfectos.textContent = confirmado
    ? 'Todo listo. Al aprobar, los cambios se aplican en una sola operación y quedan registrados en la auditoría.'
    : 'Se puede aprobar. Marque la casilla de confirmación para habilitar el botón.';
}

async function aprobar(evento) {
  evento.preventDefault();
  const solicitud = pantalla.solicitud;
  const alertas = elemento('alertas-detalle');
  limpiarAlerta(alertas);
  if (!elemento('aprobar-confirmacion').checked) {
    mostrarAlerta(alertas, 'danger', 'Marque la casilla de confirmación del retiro.');
    return;
  }
  const observacion = elemento('aprobar-observacion').value.trim();
  const boton = elemento('boton-aprobar');
  establecerCargando(boton, true, 'Aprobando...');
  try {
    const aprobada = await apiFetch(`/api/solicitudes-retiro/${solicitud.id}/aprobacion`, {
      metodo: 'PATCH',
      cuerpo: { observacion: observacion === '' ? null : observacion }
    });
    pantalla.cambios = true;
    olvidarClub(aprobada.clubId);
    await actualizarClub(aprobada.clubId);
    establecerCargando(boton, false);
    renderizarDetalle(aprobada);
    mostrarAlerta(alertas, 'success',
      `Retiro aprobado: ${identificarEstudiante(aprobada)} dejó de ser integrante de ${aprobada.clubNombre} desde el ${formatearFecha(aprobada.fechaRetiro)}.`,
      aprobada.avisos || []);
  } catch (error) {
    establecerCargando(boton, false);
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
    calcularEfectos();
  }
}

async function actualizarClub(clubId) {
  try {
    const club = await apiFetch(`/api/clubes/${clubId}`);
    const indice = catalogo.clubes.findIndex(existente => existente.id === clubId);
    if (indice >= 0) {
      catalogo.clubes[indice] = { ...catalogo.clubes[indice], ...club };
    }
  } catch (error) {
    return;
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
  elemento('panel-espera').hidden = true;
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
  if (motivo.length < MOTIVO_MINIMO || motivo.length > MOTIVO_MAXIMO) {
    mostrarAlerta(alertas, 'danger', `El motivo debe tener entre ${MOTIVO_MINIMO} y ${MOTIVO_MAXIMO} caracteres.`);
    return;
  }
  const boton = elemento('boton-confirmar-motivo');
  establecerCargando(boton, true, 'Guardando...');
  try {
    const actualizada = await apiFetch(`/api/solicitudes-retiro/${solicitud.id}/${datos.ruta}`, {
      metodo: 'PATCH',
      cuerpo: { motivo }
    });
    pantalla.cambios = true;
    olvidarClub(actualizada.clubId);
    establecerCargando(boton, false);
    renderizarDetalle(actualizada);
    mostrarAlerta(alertas, 'success', `La solicitud quedó ${datos.exito}.`);
  } catch (error) {
    establecerCargando(boton, false);
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  }
}
