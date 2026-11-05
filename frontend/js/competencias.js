import { apiFetch, construirConsulta, ApiError } from './api.js';
import {
  cargarInstituciones,
  cargarClubes,
  cargarInscripcionesActivasDelClub,
  cargarEstudiantesActivos,
  cargarCompetencias,
  cargarEdicionesDeCompetencia,
  cargarCategoriasDeCompetencia,
  cargarParticipaciones
} from './catalogos.js';
import { montarCatalogo, insigniaNivel, etiquetaNivel } from './catalogo-competencias.js';
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
const COLUMNAS = 7;
const ROLES_GLOBALES = ['ADMIN', 'COORDINADOR', 'CONSULTA'];
const ROLES_DATOS_MINIMOS = ['COORDINADOR', 'CONSULTA'];
const ROLES_REGISTRO = ['ADMIN', 'RESP_INSTITUCIONAL', 'DOCENTE'];
const CLUB_OPERATIVO = ['PLANIFICADO', 'ACTIVO'];
const NIVELES = ['BASICA', 'AVANZADA'];

const ESTADOS_CLUB = {
  PLANIFICADO: 'Planificado',
  ACTIVO: 'Activo',
  SUSPENDIDO: 'Suspendido',
  CERRADO: 'Cerrado'
};

const sesion = exigirSesion();
const pantalla = {
  pagina: 0,
  filtros: {},
  estudianteId: null,
  participacion: null,
  cambios: false,
  turnoNueva: 0,
  turnoEquipo: 0
};
const catalogo = {
  instituciones: [],
  clubes: [],
  competencias: [],
  ediciones: new Map(),
  categorias: new Map(),
  integrantesPorClub: new Map(),
  estudiantesPorInstitucion: new Map(),
  participacionesPorGrupo: new Map()
};
const formulario = { integrantes: [], autorizaciones: null, registrados: new Set(), equipos: new Map() };
const edicionForm = { equipos: new Map() };
let modalNueva = null;
let modalDetalle = null;
let vistaCatalogo = null;

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

function puedeModificar(participacion) {
  if (rolActual() === 'ADMIN') {
    return true;
  }
  if (rolActual() === 'RESP_INSTITUCIONAL') {
    return participacion.institucionId === sesion.usuario.institucionId;
  }
  if (rolActual() === 'DOCENTE') {
    return catalogo.clubes.some(club => club.id === participacion.clubId);
  }
  return false;
}

function mensajeDe(error) {
  return error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
}

function hoy() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date());
}

function resultadosBloqueados(edicion) {
  return Boolean(edicion && edicion.fechaInicio && edicion.fechaInicio > hoy());
}

function buscarClub(id) {
  return catalogo.clubes.find(club => club.id === Number(id)) || null;
}

function buscarCompetencia(id) {
  return catalogo.competencias.find(competencia => competencia.id === Number(id)) || null;
}

function nombreEstudiante(participacion) {
  return `${participacion.estudianteApellidos} ${participacion.estudianteNombres}`;
}

function identificarEstudiante(participacion) {
  if (soloDatosMinimos() || !participacion.estudianteNombres) {
    return participacion.estudianteCodigo;
  }
  return `${nombreEstudiante(participacion)} (${participacion.estudianteCodigo})`;
}

function textoPuesto(puesto) {
  return `${puesto}.º lugar`;
}

function opcion(texto, valor) {
  return crearElemento('option', { texto, atributos: { value: String(valor) } });
}

function claveGrupo(clubId, edicionId, categoriaId) {
  return `${clubId}:${edicionId}:${categoriaId}`;
}

function textoOVacio(valor) {
  const limpio = valor.trim().replace(/\s+/g, ' ');
  return limpio === '' ? null : limpio;
}

async function obtenerConCache(mapa, clave, cargar) {
  if (!mapa.has(clave)) {
    mapa.set(clave, await cargar(clave));
  }
  return mapa.get(clave);
}

function edicionesDe(competenciaId) {
  return obtenerConCache(catalogo.ediciones, Number(competenciaId), cargarEdicionesDeCompetencia);
}

function categoriasDe(competenciaId) {
  return obtenerConCache(catalogo.categorias, Number(competenciaId), cargarCategoriasDeCompetencia);
}

function participacionesDelGrupo(clubId, edicionId, categoriaId) {
  return obtenerConCache(catalogo.participacionesPorGrupo, claveGrupo(clubId, edicionId, categoriaId),
    () => cargarParticipaciones({ clubId, edicionId, categoriaId }));
}

function olvidarGrupo(clubId, edicionId, categoriaId) {
  catalogo.participacionesPorGrupo.delete(claveGrupo(clubId, edicionId, categoriaId));
}

function equiposDe(participaciones, excluirId) {
  const equipos = new Map();
  participaciones.forEach(participacion => {
    if (!participacion.equipoNombre || participacion.id === excluirId) {
      return;
    }
    const clave = participacion.equipoNombre.toLowerCase();
    const actual = equipos.get(clave) || { nombre: participacion.equipoNombre, integrantes: 0 };
    actual.integrantes += 1;
    equipos.set(clave, actual);
  });
  return equipos;
}

function textoIntegrantes(cantidad) {
  return cantidad === 1 ? '1 integrante' : `${cantidad} integrantes`;
}

async function iniciar() {
  montarLayout(sesion, 'competencias');

  elemento('boton-nuevo').hidden = !puedeRegistrar();
  elemento('aviso-datos-minimos').hidden = !soloDatosMinimos();
  elemento('aviso-docente').hidden = rolActual() !== 'DOCENTE';
  elemento('grupo-filtro-institucion').hidden = !esGlobal();
  if (soloDatosMinimos()) {
    elemento('etiqueta-filtro-q').textContent = 'Código del estudiante (EST-)';
  }

  modalNueva = bootstrap.Modal.getOrCreateInstance(elemento('modal-nueva'));
  modalDetalle = bootstrap.Modal.getOrCreateInstance(elemento('modal-detalle'));
  vistaCatalogo = montarCatalogo({
    esAdmin: rolActual() === 'ADMIN',
    alCambiar: alCambiarCatalogo,
    verParticipaciones: verParticipacionesDesdeCatalogo
  });

  elemento('tab-catalogo').addEventListener('shown.bs.tab', () => vistaCatalogo.cargar());
  elemento('boton-nuevo').addEventListener('click', abrirNueva);
  elemento('formulario-filtros').addEventListener('submit', evento => {
    evento.preventDefault();
    pantalla.filtros = leerFiltros();
    recargar(0);
  });
  elemento('formulario-filtros').addEventListener('reset', () => {
    setTimeout(async () => {
      llenarFiltroClubes();
      await llenarFiltrosDeCompetencia();
      pantalla.filtros = leerFiltros();
      recargar(0);
    }, 0);
  });
  elemento('filtro-institucion').addEventListener('change', llenarFiltroClubes);
  elemento('filtro-competencia').addEventListener('change', () => llenarFiltrosDeCompetencia());
  elemento('boton-quitar-estudiante').addEventListener('click', () => {
    pantalla.estudianteId = null;
    elemento('aviso-filtro-estudiante').hidden = true;
    recargar(0);
  });

  elemento('formulario-nueva').addEventListener('submit', registrarParticipacion);
  elemento('nueva-club').addEventListener('change', alCambiarClubNueva);
  elemento('nueva-competencia').addEventListener('change', alCambiarCompetenciaNueva);
  elemento('nueva-edicion').addEventListener('change', alCambiarGrupoNueva);
  elemento('nueva-categoria').addEventListener('change', alCambiarGrupoNueva);
  elemento('nueva-buscar-integrante').addEventListener('input', llenarIntegrantesNueva);
  elemento('nueva-integrante').addEventListener('change', actualizarAyudaIntegrante);
  elemento('nueva-equipo').addEventListener('input', () => actualizarAyudaEquipo('nueva', formulario.equipos));

  elemento('panel-edicion').addEventListener('submit', guardarCambios);
  elemento('editar-equipo').addEventListener('input', () => actualizarAyudaEquipo('editar', edicionForm.equipos));
  elemento('boton-abrir-eliminar').addEventListener('click', abrirEliminar);
  elemento('boton-volver-eliminar').addEventListener('click', cerrarEliminar);
  elemento('boton-confirmar-eliminar').addEventListener('click', eliminar);
  elemento('modal-detalle').addEventListener('hidden.bs.modal', () => {
    pantalla.participacion = null;
    if (pantalla.cambios) {
      pantalla.cambios = false;
      recargar(pantalla.pagina);
    }
  });

  await cargarCatalogos();
  await aplicarParametrosIniciales();
  await recargar(0);
  const parametros = new URLSearchParams(window.location.search);
  if (parametros.get('vista') === 'catalogo') {
    bootstrap.Tab.getOrCreateInstance(elemento('tab-catalogo')).show();
    const competenciaId = parametros.get('competenciaId');
    if (competenciaId && /^\d+$/.test(competenciaId)) {
      vistaCatalogo.seleccionar(Number(competenciaId));
    }
  }
  const abrir = parametros.get('id');
  if (abrir && /^\d+$/.test(abrir)) {
    abrirDetalle(Number(abrir));
  }
}

async function cargarCatalogos() {
  const tareas = [cargarClubes(), cargarCompetencias(), esGlobal() ? cargarInstituciones() : Promise.resolve([])];
  const [clubes, competencias, instituciones] = await Promise.allSettled(tareas);
  const problemas = [];
  if (clubes.status === 'fulfilled') {
    catalogo.clubes = clubes.value.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  } else {
    problemas.push(`Clubes: ${mensajeDe(clubes.reason)}`);
  }
  if (competencias.status === 'fulfilled') {
    catalogo.competencias = competencias.value;
  } else {
    problemas.push(`Competencias: ${mensajeDe(competencias.reason)}`);
  }
  if (instituciones.status === 'fulfilled') {
    catalogo.instituciones = instituciones.value;
  } else {
    problemas.push(`Instituciones: ${mensajeDe(instituciones.reason)}`);
  }

  elemento('filtro-institucion').replaceChildren(opcion('Todas', ''),
    ...catalogo.instituciones.map(institucion => opcion(institucion.nombre, institucion.id)));
  llenarFiltroClubes();
  llenarFiltroCompetencias();

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
  elemento('filtro-club').replaceChildren(opcion('Todos', ''), ...clubes.map(club => opcion(etiquetaClub(club, conInstitucion), club.id)));
  if (clubes.some(club => String(club.id) === anterior)) {
    elemento('filtro-club').value = anterior;
  }
}

function etiquetaCompetencia(competencia) {
  return competencia.activa ? competencia.nombre : `${competencia.nombre} (inactiva)`;
}

function llenarFiltroCompetencias() {
  const anterior = elemento('filtro-competencia').value;
  elemento('filtro-competencia').replaceChildren(opcion('Todas', ''),
    ...catalogo.competencias.map(competencia => opcion(etiquetaCompetencia(competencia), competencia.id)));
  if (buscarCompetencia(anterior)) {
    elemento('filtro-competencia').value = anterior;
  }
}

function etiquetaEdicion(edicion) {
  const texto = `${edicion.nombre} (${edicion.anio})`;
  return edicion.activa ? texto : `${texto} · inactiva`;
}

function opcionesCategorias(categorias, primera) {
  const opciones = [opcion(primera, '')];
  NIVELES.forEach(nivel => {
    const delNivel = categorias.filter(categoria => categoria.nivel === nivel);
    if (delNivel.length > 0) {
      const grupo = crearElemento('optgroup', { atributos: { label: `Nivel ${etiquetaNivel(nivel).toLowerCase()}` } });
      delNivel.forEach(categoria => grupo.appendChild(opcion(categoria.activa ? categoria.nombre : `${categoria.nombre} (inactiva)`, categoria.id)));
      opciones.push(grupo);
    }
  });
  return opciones;
}

async function llenarFiltrosDeCompetencia(valores = {}) {
  const competenciaId = elemento('filtro-competencia').value;
  const edicion = elemento('filtro-edicion');
  const categoria = elemento('filtro-categoria');
  const edicionAnterior = valores.edicionId !== undefined ? String(valores.edicionId) : edicion.value;
  const categoriaAnterior = valores.categoriaId !== undefined ? String(valores.categoriaId) : categoria.value;
  if (!competenciaId) {
    edicion.replaceChildren(opcion('Todas', ''));
    categoria.replaceChildren(opcion('Todas', ''));
    edicion.disabled = true;
    categoria.disabled = true;
    return;
  }
  try {
    const [ediciones, categorias] = await Promise.all([edicionesDe(competenciaId), categoriasDe(competenciaId)]);
    if (elemento('filtro-competencia').value !== competenciaId) {
      return;
    }
    edicion.replaceChildren(opcion('Todas', ''), ...ediciones.map(e => opcion(etiquetaEdicion(e), e.id)));
    categoria.replaceChildren(...opcionesCategorias(categorias, 'Todas'));
    edicion.disabled = false;
    categoria.disabled = false;
    if (ediciones.some(e => String(e.id) === edicionAnterior)) {
      edicion.value = edicionAnterior;
    }
    if (categorias.some(c => String(c.id) === categoriaAnterior)) {
      categoria.value = categoriaAnterior;
    }
  } catch (error) {
    mostrarAlerta(elemento('alertas'), 'danger', mensajeDe(error));
  }
}

async function aplicarParametrosIniciales() {
  const parametros = new URLSearchParams(window.location.search);
  const clubId = parametros.get('clubId');
  if (clubId && buscarClub(clubId)) {
    elemento('filtro-club').value = String(clubId);
  }
  const competenciaId = parametros.get('competenciaId');
  if (competenciaId && buscarCompetencia(competenciaId)) {
    elemento('filtro-competencia').value = String(competenciaId);
    await llenarFiltrosDeCompetencia({
      edicionId: parametros.get('edicionId') || '',
      categoriaId: parametros.get('categoriaId') || ''
    });
  }
  pantalla.filtros = leerFiltros();

  const estudianteId = parametros.get('estudianteId');
  if (estudianteId && /^\d+$/.test(estudianteId)) {
    pantalla.estudianteId = Number(estudianteId);
    let texto = 'Se muestran solo las participaciones del estudiante seleccionado.';
    try {
      const estudiante = await apiFetch(`/api/estudiantes/${estudianteId}`);
      const nombre = estudiante.nombres
        ? `${estudiante.apellidos} ${estudiante.nombres} (${estudiante.codigoInterno})`
        : estudiante.codigoInterno;
      texto = `Se muestran solo las participaciones de ${nombre}.`;
    } catch (error) {
      texto = 'Se muestran solo las participaciones del estudiante indicado en el enlace.';
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
    competenciaId: elemento('filtro-competencia').value,
    edicionId: elemento('filtro-edicion').disabled ? '' : elemento('filtro-edicion').value,
    categoriaId: elemento('filtro-categoria').disabled ? '' : elemento('filtro-categoria').value,
    nivel: elemento('filtro-nivel').value,
    equipo: elemento('filtro-equipo').value.trim()
  };
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
  return `Mostrando ${desde}–${hasta} de ${respuesta.totalElementos} participaciones`;
}

async function recargar(pagina) {
  await cargarLista(pagina);
}

async function cargarLista(pagina) {
  const cuerpo = elemento('cuerpo-tabla');
  cuerpo.replaceChildren(filaMensaje('Cargando participaciones...'));
  try {
    const consulta = { ...pantalla.filtros, estudianteId: pantalla.estudianteId, pagina, tamano: TAMANO_PAGINA };
    const respuesta = await apiFetch(`/api/participaciones-competencia${construirConsulta(consulta)}`);
    pantalla.pagina = respuesta.pagina;
    if (respuesta.contenido.length === 0) {
      cuerpo.replaceChildren(filaMensaje('No se encontraron participaciones.'));
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

function celdaResultado(participacion) {
  const partes = [];
  if (participacion.puesto) {
    partes.push(crearElemento('div', { clase: 'fw-semibold', texto: textoPuesto(participacion.puesto) }));
  }
  if (participacion.reconocimiento) {
    partes.push(crearElemento('div', { clase: 'small' }, [
      crearElemento('i', { clase: 'bi bi-award me-1 text-warning', atributos: { 'aria-hidden': 'true' } }),
      document.createTextNode(participacion.reconocimiento)
    ]));
  }
  if (partes.length === 0) {
    partes.push(crearElemento('span', { clase: 'small text-body-secondary', texto: 'Sin resultado' }));
  }
  return partes;
}

function crearFila(participacion) {
  const estudiante = [];
  if (soloDatosMinimos() || !participacion.estudianteNombres) {
    estudiante.push(crearElemento('div', { clase: 'font-monospace text-nowrap', texto: participacion.estudianteCodigo }));
  } else {
    estudiante.push(crearElemento('div', { clase: 'fw-semibold', texto: nombreEstudiante(participacion) }));
    estudiante.push(crearElemento('div', {
      clase: 'small font-monospace text-nowrap text-body-secondary',
      texto: participacion.estudianteCodigo
    }));
  }
  const club = [crearElemento('div', { texto: participacion.clubNombre })];
  if (esGlobal()) {
    club.push(crearElemento('div', { clase: 'small text-body-secondary', texto: participacion.institucionNombre }));
  }
  const competencia = [
    crearElemento('div', { texto: participacion.competenciaNombre }),
    crearElemento('div', { clase: 'small text-body-secondary', texto: `${participacion.edicionNombre} (${participacion.edicionAnio})` })
  ];
  const categoria = [
    crearElemento('div', { texto: participacion.categoriaNombre }),
    insigniaNivel(participacion.categoriaNivel)
  ];
  const equipo = participacion.equipoNombre
    ? [crearElemento('span', { texto: participacion.equipoNombre })]
    : [crearElemento('span', { clase: 'small text-body-secondary', texto: 'Individual' })];

  return crearElemento('tr', {}, [
    crearElemento('td', {}, estudiante),
    crearElemento('td', {}, club),
    crearElemento('td', {}, competencia),
    crearElemento('td', {}, categoria),
    crearElemento('td', {}, equipo),
    crearElemento('td', {}, celdaResultado(participacion)),
    crearElemento('td', { clase: 'text-end text-nowrap' }, crearAcciones(participacion))
  ]);
}

function crearAcciones(participacion) {
  const acciones = [];
  if (puedeModificar(participacion)) {
    const editar = crearElemento('button', {
      clase: 'btn btn-sm btn-outline-primary ms-1',
      atributos: {
        type: 'button',
        title: 'Modificar',
        'aria-label': `Modificar la participación de ${identificarEstudiante(participacion)}`
      }
    }, [crearElemento('i', { clase: 'bi bi-pencil', atributos: { 'aria-hidden': 'true' } })]);
    editar.addEventListener('click', () => abrirDetalle(participacion.id, true));
    acciones.push(editar);
  }
  const ver = crearElemento('button', {
    clase: 'btn btn-sm btn-outline-secondary ms-1',
    atributos: {
      type: 'button',
      title: 'Ver detalle',
      'aria-label': `Ver detalle de la participación de ${identificarEstudiante(participacion)}`
    }
  }, [crearElemento('i', { clase: 'bi bi-eye', atributos: { 'aria-hidden': 'true' } })]);
  ver.addEventListener('click', () => abrirDetalle(participacion.id, false));
  acciones.push(ver);
  return acciones;
}

function alCambiarCatalogo() {
  catalogo.ediciones.clear();
  catalogo.categorias.clear();
  cargarCompetencias().then(async competencias => {
    catalogo.competencias = competencias;
    llenarFiltroCompetencias();
    await llenarFiltrosDeCompetencia();
  }).catch(error => mostrarAlerta(elemento('alertas'), 'danger', mensajeDe(error)));
}

async function verParticipacionesDesdeCatalogo(filtros) {
  ['filtro-q', 'filtro-institucion', 'filtro-club', 'filtro-nivel', 'filtro-equipo'].forEach(id => {
    elemento(id).value = '';
  });
  llenarFiltroClubes();
  elemento('filtro-competencia').value = String(filtros.competenciaId);
  await llenarFiltrosDeCompetencia({ edicionId: filtros.edicionId || '', categoriaId: filtros.categoriaId || '' });
  pantalla.filtros = leerFiltros();
  bootstrap.Tab.getOrCreateInstance(elemento('tab-participaciones')).show();
  await recargar(0);
}

async function abrirNueva() {
  limpiarAlerta(elemento('alertas-nueva'));
  const disponibles = catalogo.clubes.filter(club => CLUB_OPERATIVO.includes(club.estado) && club.integrantesActivos > 0);
  elemento('nueva-club').replaceChildren(opcion('Seleccione un club', ''),
    ...disponibles.map(club => opcion(etiquetaClub(club, rolActual() === 'ADMIN'), club.id)));
  const clubPreferido = elemento('filtro-club').value;
  elemento('nueva-club').value = disponibles.some(club => String(club.id) === clubPreferido) ? clubPreferido : '';

  const activas = catalogo.competencias.filter(competencia => competencia.activa);
  elemento('nueva-competencia').replaceChildren(opcion('Seleccione una competencia', ''),
    ...activas.map(competencia => opcion(competencia.nombre, competencia.id)));
  const competenciaPreferida = elemento('filtro-competencia').value;
  if (activas.some(competencia => String(competencia.id) === competenciaPreferida)) {
    elemento('nueva-competencia').value = competenciaPreferida;
  } else if (activas.length === 1) {
    elemento('nueva-competencia').value = String(activas[0].id);
  }

  ['nueva-buscar-integrante', 'nueva-equipo', 'nueva-puesto', 'nueva-reconocimiento', 'nueva-observaciones'].forEach(id => {
    elemento(id).value = '';
  });
  elemento('boton-registrar').disabled = false;
  elemento('boton-registrar-otro').disabled = false;

  const avisos = [];
  if (disponibles.length === 0) {
    avisos.push(rolActual() === 'DOCENTE'
      ? 'Ninguno de los clubes que coordina está abierto con integrantes activos.'
      : 'No hay clubes planificados o activos con integrantes activos.');
  }
  if (activas.length === 0) {
    avisos.push('No hay competencias activas. El Administrador debe registrarlas en la pestaña Catálogo de competencias.');
  }
  if (avisos.length > 0) {
    mostrarAlerta(elemento('alertas-nueva'), 'warning', 'No es posible registrar participaciones por ahora:', avisos);
  }
  modalNueva.show();
  await alCambiarCompetenciaNueva({
    edicionId: elemento('filtro-edicion').value,
    categoriaId: elemento('filtro-categoria').value
  });
  await alCambiarClubNueva();
}

async function alCambiarCompetenciaNueva(preferidos = {}) {
  const competenciaId = elemento('nueva-competencia').value;
  const edicion = elemento('nueva-edicion');
  const categoria = elemento('nueva-categoria');
  if (!competenciaId) {
    edicion.replaceChildren(opcion('Seleccione primero la competencia', ''));
    categoria.replaceChildren(opcion('Seleccione primero la competencia', ''));
    edicion.disabled = true;
    categoria.disabled = true;
    await alCambiarGrupoNueva();
    return;
  }
  try {
    const [ediciones, categorias] = await Promise.all([edicionesDe(competenciaId), categoriasDe(competenciaId)]);
    if (elemento('nueva-competencia').value !== competenciaId) {
      return;
    }
    const edicionesActivas = ediciones.filter(e => e.activa);
    const categoriasActivas = categorias.filter(c => c.activa);
    edicion.replaceChildren(opcion(edicionesActivas.length === 0 ? 'La competencia no tiene ediciones activas' : 'Seleccione una edición', ''),
      ...edicionesActivas.map(e => opcion(`${e.nombre} (${e.anio})`, e.id)));
    categoria.replaceChildren(...opcionesCategorias(categoriasActivas,
      categoriasActivas.length === 0 ? 'La competencia no tiene categorías activas' : 'Seleccione una categoría'));
    edicion.disabled = edicionesActivas.length === 0;
    categoria.disabled = categoriasActivas.length === 0;
    const edicionPreferida = preferidos.edicionId ? String(preferidos.edicionId) : '';
    if (edicionesActivas.some(e => String(e.id) === edicionPreferida)) {
      edicion.value = edicionPreferida;
    } else if (edicionesActivas.length === 1) {
      edicion.value = String(edicionesActivas[0].id);
    }
    const categoriaPreferida = preferidos.categoriaId ? String(preferidos.categoriaId) : '';
    if (categoriasActivas.some(c => String(c.id) === categoriaPreferida)) {
      categoria.value = categoriaPreferida;
    }
  } catch (error) {
    mostrarAlerta(elemento('alertas-nueva'), 'danger', mensajeDe(error));
  }
  await alCambiarGrupoNueva();
}

function edicionElegida() {
  const competenciaId = Number(elemento('nueva-competencia').value);
  const lista = catalogo.ediciones.get(competenciaId) || [];
  return lista.find(e => e.id === Number(elemento('nueva-edicion').value)) || null;
}

function categoriaElegida() {
  const competenciaId = Number(elemento('nueva-competencia').value);
  const lista = catalogo.categorias.get(competenciaId) || [];
  return lista.find(c => c.id === Number(elemento('nueva-categoria').value)) || null;
}

function textoAyudaEdicion(edicion) {
  const partes = [];
  if (edicion.fechaInicio) {
    partes.push(edicion.fechaFin && edicion.fechaFin !== edicion.fechaInicio
      ? `Del ${formatearFecha(edicion.fechaInicio)} al ${formatearFecha(edicion.fechaFin)}`
      : `El ${formatearFecha(edicion.fechaInicio)}`);
  } else {
    partes.push('Sin fechas registradas');
  }
  if (edicion.sede) {
    partes.push(`en ${edicion.sede}`);
  }
  return `${partes.join(' ')}.`;
}

function aplicarBloqueoResultados(prefijo, edicion) {
  const bloqueado = resultadosBloqueados(edicion);
  const puesto = elemento(`${prefijo}-puesto`);
  const reconocimiento = elemento(`${prefijo}-reconocimiento`);
  const ayuda = elemento(`ayuda-resultados-${prefijo}`);
  puesto.disabled = bloqueado;
  reconocimiento.disabled = bloqueado;
  if (bloqueado) {
    puesto.value = '';
    reconocimiento.value = '';
    ayuda.textContent = `La edición empieza el ${formatearFecha(edicion.fechaInicio)}: el puesto y el reconocimiento se registran desde esa fecha.`;
    ayuda.className = 'form-text text-warning-emphasis';
  } else {
    ayuda.textContent = 'Si aún no hay resultados, déjelos vacíos y regístrelos después desde el detalle.';
    ayuda.className = 'form-text';
  }
}

async function alCambiarGrupoNueva() {
  const edicion = edicionElegida();
  elemento('ayuda-nueva-edicion').textContent = edicion ? textoAyudaEdicion(edicion) : '';
  aplicarBloqueoResultados('nueva', edicion);
  await cargarGrupoNueva();
}

function reiniciarIntegrantes(texto) {
  formulario.integrantes = [];
  formulario.autorizaciones = null;
  elemento('nueva-integrante').replaceChildren();
  elemento('nueva-integrante').disabled = true;
  elemento('nueva-buscar-integrante').disabled = true;
  elemento('ayuda-nueva-integrante').textContent = texto;
}

async function alCambiarClubNueva() {
  const club = buscarClub(elemento('nueva-club').value);
  if (!club) {
    reiniciarIntegrantes('Seleccione primero el club.');
    await cargarGrupoNueva();
    return;
  }
  reiniciarIntegrantes('Cargando integrantes del club...');
  try {
    const [integrantes, estudiantes] = await Promise.all([
      obtenerConCache(catalogo.integrantesPorClub, club.id, cargarInscripcionesActivasDelClub),
      obtenerConCache(catalogo.estudiantesPorInstitucion, club.institucionId, cargarEstudiantesActivos).catch(() => null)
    ]);
    if (elemento('nueva-club').value !== String(club.id)) {
      return;
    }
    formulario.integrantes = integrantes.slice().sort((a, b) =>
      `${a.estudianteApellidos} ${a.estudianteNombres}`.localeCompare(`${b.estudianteApellidos} ${b.estudianteNombres}`, 'es'));
    formulario.autorizaciones = estudiantes
      ? new Map(estudiantes.map(estudiante => [estudiante.id, estudiante.autorizacionParticipacion]))
      : null;
    elemento('nueva-buscar-integrante').disabled = false;
    elemento('nueva-integrante').disabled = false;
  } catch (error) {
    reiniciarIntegrantes('No se pudieron cargar los integrantes del club.');
    mostrarAlerta(elemento('alertas-nueva'), 'danger', mensajeDe(error));
  }
  await cargarGrupoNueva();
}

async function cargarGrupoNueva() {
  const turno = ++pantalla.turnoNueva;
  const clubId = elemento('nueva-club').value;
  const edicion = edicionElegida();
  const categoria = categoriaElegida();
  formulario.registrados = new Set();
  formulario.equipos = new Map();
  if (clubId && edicion && categoria) {
    try {
      const participaciones = await participacionesDelGrupo(Number(clubId), edicion.id, categoria.id);
      if (turno !== pantalla.turnoNueva) {
        return;
      }
      formulario.registrados = new Set(participaciones.map(p => p.estudianteId));
      formulario.equipos = equiposDe(participaciones, null);
    } catch (error) {
      if (turno !== pantalla.turnoNueva) {
        return;
      }
      mostrarAlerta(elemento('alertas-nueva'), 'danger', mensajeDe(error));
    }
  }
  llenarListaEquipos('lista-equipos-nueva', formulario.equipos);
  actualizarAyudaEquipo('nueva', formulario.equipos);
  llenarIntegrantesNueva();
}

function motivoBloqueo(inscripcion) {
  if (formulario.registrados.has(inscripcion.estudianteId)) {
    return 'ya participa en esta categoría';
  }
  if (formulario.autorizaciones) {
    const autorizacion = formulario.autorizaciones.get(inscripcion.estudianteId);
    if (autorizacion !== 'OTORGADA') {
      return 'sin autorización de participación';
    }
  }
  return null;
}

function nombreIntegrante(inscripcion) {
  return `${inscripcion.estudianteApellidos} ${inscripcion.estudianteNombres}`;
}

function llenarIntegrantesNueva() {
  const selector = elemento('nueva-integrante');
  if (selector.disabled && formulario.integrantes.length === 0) {
    return;
  }
  const anterior = selector.value;
  const texto = elemento('nueva-buscar-integrante').value.trim().toLowerCase();
  const visibles = formulario.integrantes.filter(inscripcion => !texto
    || `${nombreIntegrante(inscripcion)} ${inscripcion.estudianteCodigo}`.toLowerCase().includes(texto));
  selector.replaceChildren(...visibles.map(inscripcion => {
    const bloqueo = motivoBloqueo(inscripcion);
    const partes = [nombreIntegrante(inscripcion), inscripcion.estudianteCodigo, inscripcion.cursoEducativoEtiqueta];
    if (bloqueo) {
      partes.push(bloqueo);
    }
    const elementoOpcion = opcion(partes.join(' · '), inscripcion.id);
    elementoOpcion.disabled = Boolean(bloqueo);
    return elementoOpcion;
  }));
  if (visibles.some(inscripcion => String(inscripcion.id) === anterior && !motivoBloqueo(inscripcion))) {
    selector.value = anterior;
  }
  actualizarAyudaIntegrante();
}

function integranteSeleccionado() {
  const id = Number(elemento('nueva-integrante').value);
  return formulario.integrantes.find(inscripcion => inscripcion.id === id) || null;
}

function actualizarAyudaIntegrante() {
  const ayuda = elemento('ayuda-nueva-integrante');
  if (elemento('nueva-integrante').disabled) {
    return;
  }
  if (formulario.integrantes.length === 0) {
    ayuda.textContent = 'El club no tiene integrantes activos.';
    return;
  }
  const inscripcion = integranteSeleccionado();
  if (inscripcion) {
    ayuda.textContent = `Seleccionado: ${nombreIntegrante(inscripcion)} (${inscripcion.estudianteCodigo}).`;
    return;
  }
  const total = elemento('nueva-integrante').options.length;
  const partes = [`${total} de ${formulario.integrantes.length} integrantes activos. Seleccione uno de la lista.`];
  const yaParticipan = formulario.integrantes.filter(i => formulario.registrados.has(i.estudianteId)).length;
  const sinAutorizacion = formulario.integrantes.filter(i => motivoBloqueo(i) === 'sin autorización de participación').length;
  if (yaParticipan > 0) {
    partes.push(yaParticipan === 1
      ? '1 integrante ya participa en esta categoría de la edición.'
      : `${yaParticipan} integrantes ya participan en esta categoría de la edición.`);
  }
  if (sinAutorizacion > 0) {
    partes.push(sinAutorizacion === 1
      ? '1 integrante no tiene la autorización de participación otorgada.'
      : `${sinAutorizacion} integrantes no tienen la autorización de participación otorgada.`);
  }
  if (!edicionElegida() || !categoriaElegida()) {
    partes.push('Elija la edición y la categoría para ver quién ya participa.');
  }
  ayuda.textContent = partes.join(' ');
}

function llenarListaEquipos(id, equipos) {
  elemento(id).replaceChildren(...Array.from(equipos.values())
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .map(equipo => crearElemento('option', { atributos: { value: equipo.nombre } })));
}

function actualizarAyudaEquipo(prefijo, equipos) {
  const ayuda = elemento(`ayuda-${prefijo}-equipo`);
  const escrito = textoOVacio(elemento(`${prefijo}-equipo`).value);
  ayuda.className = 'form-text';
  if (escrito) {
    const existente = equipos.get(escrito.toLowerCase());
    if (existente) {
      ayuda.textContent = `Se une al equipo «${existente.nombre}», que ya tiene ${textoIntegrantes(existente.integrantes)} del club en esta categoría.`;
    } else {
      ayuda.textContent = `Se crea el equipo «${escrito}» en esta categoría. El nombre no puede estar usado por otro club en la misma edición y categoría.`;
    }
    return;
  }
  if (equipos.size === 0) {
    ayuda.textContent = 'Déjelo vacío si la participación es individual.';
    return;
  }
  const lista = Array.from(equipos.values()).map(equipo => `${equipo.nombre} (${textoIntegrantes(equipo.integrantes)})`);
  ayuda.textContent = `Equipos del club en esta categoría: ${lista.join(', ')}. Escriba el mismo nombre para sumarlo a uno, o déjelo vacío si es individual.`;
}

function leerPuesto(id, problemas) {
  const texto = elemento(id).value.trim();
  if (texto === '') {
    return null;
  }
  const valor = Number(texto);
  if (!Number.isInteger(valor) || valor < 1 || valor > 999) {
    problemas.push('El puesto debe ser un número entero entre 1 y 999.');
    return null;
  }
  return valor;
}

function validarNueva() {
  const problemas = [];
  if (!elemento('nueva-club').value) {
    problemas.push('Seleccione el club.');
  }
  if (!elemento('nueva-competencia').value) {
    problemas.push('Seleccione la competencia.');
  }
  if (!edicionElegida()) {
    problemas.push('Seleccione la edición.');
  }
  if (!categoriaElegida()) {
    problemas.push('Seleccione la categoría.');
  }
  const inscripcion = integranteSeleccionado();
  if (!inscripcion) {
    problemas.push('Seleccione el integrante que participa.');
  } else if (motivoBloqueo(inscripcion)) {
    problemas.push(`El integrante seleccionado ${motivoBloqueo(inscripcion)}.`);
  }
  const puesto = leerPuesto('nueva-puesto', problemas);
  return { problemas, puesto };
}

async function registrarParticipacion(evento) {
  evento.preventDefault();
  const otro = evento.submitter && evento.submitter.id === 'boton-registrar-otro';
  const alertas = elemento('alertas-nueva');
  limpiarAlerta(alertas);
  const { problemas, puesto } = validarNueva();
  if (problemas.length > 0) {
    mostrarAlerta(alertas, 'danger', 'Revise los datos ingresados:', problemas);
    return;
  }
  const edicion = edicionElegida();
  const categoria = categoriaElegida();
  const clubId = Number(elemento('nueva-club').value);
  const cuerpo = {
    inscripcionId: Number(elemento('nueva-integrante').value),
    edicionId: edicion.id,
    categoriaId: categoria.id,
    equipoNombre: textoOVacio(elemento('nueva-equipo').value),
    puesto,
    reconocimiento: textoOVacio(elemento('nueva-reconocimiento').value),
    observaciones: elemento('nueva-observaciones').value.trim() || null
  };
  const boton = elemento(otro ? 'boton-registrar-otro' : 'boton-registrar');
  const companero = elemento(otro ? 'boton-registrar' : 'boton-registrar-otro');
  establecerCargando(boton, true, 'Registrando...');
  companero.disabled = true;
  try {
    const creada = await apiFetch('/api/participaciones-competencia', { metodo: 'POST', cuerpo });
    olvidarGrupo(clubId, edicion.id, categoria.id);
    const mensaje = `Participación N.º ${creada.id} registrada: ${identificarEstudiante(creada)} en ${creada.categoriaNombre} de ${creada.edicionNombre}.`;
    if (otro) {
      mostrarAlerta(alertas, 'success', `${mensaje} Seleccione el siguiente integrante.`, creada.avisos || []);
      elemento('nueva-buscar-integrante').value = '';
      elemento('nueva-integrante').value = '';
      await cargarGrupoNueva();
    } else {
      modalNueva.hide();
      mostrarAlerta(elemento('alertas'), 'success', mensaje, creada.avisos || []);
    }
    await recargar(0);
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
    olvidarGrupo(clubId, edicion.id, categoria.id);
    catalogo.integrantesPorClub.delete(clubId);
  } finally {
    establecerCargando(boton, false);
    companero.disabled = false;
  }
}

async function abrirDetalle(id, enfocarEdicion) {
  limpiarAlerta(elemento('alertas'));
  try {
    const participacion = await apiFetch(`/api/participaciones-competencia/${id}`);
    limpiarAlerta(elemento('alertas-detalle'));
    await renderizarDetalle(participacion);
    modalDetalle.show();
    if (enfocarEdicion && !elemento('panel-edicion').hidden) {
      elemento('modal-detalle').addEventListener('shown.bs.modal', () => elemento('editar-equipo').focus(), { once: true });
    }
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

function esCompleta(participacion) {
  return !soloDatosMinimos() && participacion.estudianteNombres !== undefined;
}

async function renderizarDetalle(participacion) {
  pantalla.participacion = participacion;
  const completa = esCompleta(participacion);

  elemento('titulo-modal-detalle').textContent = `Participación N.º ${participacion.id}`;
  elemento('subtitulo-detalle').textContent =
    `${identificarEstudiante(participacion)} · ${participacion.competenciaNombre} · ${participacion.edicionNombre}`;

  const datos = elemento('lista-datos');
  datos.replaceChildren();
  if (completa) {
    agregarDato(datos, 'Estudiante', nombreEstudiante(participacion));
  }
  agregarDato(datos, 'Código', crearElemento('span', { clase: 'font-monospace text-nowrap', texto: participacion.estudianteCodigo }));
  agregarDato(datos, 'Institución', participacion.institucionNombre);
  agregarDato(datos, 'Club', participacion.clubNombre);
  agregarDato(datos, 'Competencia', participacion.competenciaNombre);
  agregarDato(datos, 'Edición', `${participacion.edicionNombre} (${participacion.edicionAnio})`);
  const categoria = crearElemento('span', {}, [
    document.createTextNode(`${participacion.categoriaNombre} `),
    insigniaNivel(participacion.categoriaNivel)
  ]);
  agregarDato(datos, 'Categoría', categoria);
  agregarDato(datos, 'Equipo', participacion.equipoNombre || 'Participación individual');
  agregarDato(datos, 'Puesto', participacion.puesto ? textoPuesto(participacion.puesto) : 'Sin registrar');
  agregarDato(datos, 'Reconocimiento', participacion.reconocimiento || 'Sin registrar');
  if (completa) {
    agregarDato(datos, 'Observaciones', textoLargo(participacion.observaciones));
  }

  renderizarTrazabilidad(participacion, completa);
  cerrarEliminar();
  await Promise.all([renderizarEquipo(participacion), prepararEdicion(participacion)]);
}

function pasoTrazabilidad(icono, clase, texto) {
  return crearElemento('li', { clase: 'd-flex gap-2 mb-1' }, [
    crearElemento('i', { clase: `bi ${icono} ${clase}`, atributos: { 'aria-hidden': 'true' } }),
    crearElemento('span', { texto: texto.endsWith('.') ? texto : `${texto}.` })
  ]);
}

function porQuien(nombre) {
  return nombre ? ` por ${nombre}` : '';
}

function renderizarTrazabilidad(participacion, completa) {
  const pasos = [pasoTrazabilidad('bi-pencil-square', 'text-body-secondary',
    `Registrada el ${formatearFechaHora(participacion.createdAt)}${completa ? porQuien(participacion.registradoPorNombre) : ''}`)];
  if (participacion.updatedAt) {
    pasos.push(pasoTrazabilidad('bi-arrow-repeat', 'text-primary',
      `Modificada por última vez el ${formatearFechaHora(participacion.updatedAt)}${completa ? porQuien(participacion.actualizadoPorNombre) : ''}`));
  }
  elemento('lista-trazabilidad').replaceChildren(...pasos);
}

function companerosDe(participaciones, participacion) {
  const nombre = participacion.equipoNombre.toLowerCase();
  return participaciones.filter(p => p.equipoNombre && p.equipoNombre.toLowerCase() === nombre);
}

async function renderizarEquipo(participacion) {
  const seccion = elemento('seccion-equipo');
  const lista = elemento('lista-equipo');
  seccion.hidden = true;
  lista.replaceChildren();
  edicionForm.equipos = new Map();
  try {
    const participaciones = await participacionesDelGrupo(participacion.clubId, participacion.edicionId, participacion.categoriaId);
    if (pantalla.participacion !== participacion) {
      return;
    }
    edicionForm.equipos = equiposDe(participaciones, participacion.id);
    llenarListaEquipos('lista-equipos-editar', edicionForm.equipos);
    actualizarAyudaEquipo('editar', edicionForm.equipos);
    if (!participacion.equipoNombre) {
      return;
    }
    const integrantes = companerosDe(participaciones, participacion);
    lista.replaceChildren(...integrantes.map(p => {
      const texto = soloDatosMinimos() || !p.estudianteNombres
        ? p.estudianteCodigo
        : `${p.estudianteApellidos} ${p.estudianteNombres} (${p.estudianteCodigo})`;
      return crearElemento('li', { clase: p.id === participacion.id ? 'fw-semibold' : '', texto });
    }));
    seccion.hidden = integrantes.length === 0;
  } catch (error) {
    return;
  }
}

async function edicionDe(participacion) {
  try {
    const ediciones = await edicionesDe(participacion.competenciaId);
    return ediciones.find(e => e.id === participacion.edicionId) || null;
  } catch (error) {
    return null;
  }
}

async function prepararEdicion(participacion) {
  const panel = elemento('panel-edicion');
  const lectura = elemento('panel-solo-lectura');
  const texto = elemento('texto-solo-lectura');
  panel.hidden = true;
  lectura.hidden = true;
  if (soloDatosMinimos()) {
    return;
  }
  if (!puedeModificar(participacion)) {
    texto.textContent = rolActual() === 'DOCENTE'
      ? 'Usted registró esta participación, pero ya no coordina el club: solo puede consultarla. La modifica el docente actual del club, el Responsable institucional o el Administrador.'
      : 'Su rol solo puede consultar esta participación.';
    lectura.hidden = false;
    return;
  }
  elemento('editar-equipo').value = participacion.equipoNombre || '';
  elemento('editar-puesto').value = participacion.puesto ? String(participacion.puesto) : '';
  elemento('editar-reconocimiento').value = participacion.reconocimiento || '';
  elemento('editar-observaciones').value = participacion.observaciones || '';
  elemento('boton-guardar').disabled = false;
  elemento('boton-abrir-eliminar').disabled = false;
  const edicion = await edicionDe(participacion);
  if (pantalla.participacion !== participacion) {
    return;
  }
  aplicarBloqueoResultados('editar', edicion);
  if (resultadosBloqueados(edicion)) {
    elemento('editar-puesto').value = participacion.puesto ? String(participacion.puesto) : '';
    elemento('editar-reconocimiento').value = participacion.reconocimiento || '';
  }
  actualizarAyudaEquipo('editar', edicionForm.equipos);
  panel.hidden = false;
}

async function guardarCambios(evento) {
  evento.preventDefault();
  const participacion = pantalla.participacion;
  const alertas = elemento('alertas-detalle');
  limpiarAlerta(alertas);
  const problemas = [];
  const puesto = elemento('editar-puesto').disabled
    ? participacion.puesto
    : leerPuesto('editar-puesto', problemas);
  if (problemas.length > 0) {
    mostrarAlerta(alertas, 'danger', 'Revise los datos ingresados:', problemas);
    return;
  }
  const cuerpo = {
    equipoNombre: textoOVacio(elemento('editar-equipo').value),
    puesto: puesto || null,
    reconocimiento: elemento('editar-reconocimiento').disabled
      ? participacion.reconocimiento
      : textoOVacio(elemento('editar-reconocimiento').value),
    observaciones: elemento('editar-observaciones').value.trim() || null
  };
  const boton = elemento('boton-guardar');
  establecerCargando(boton, true, 'Guardando...');
  try {
    const actualizada = await apiFetch(`/api/participaciones-competencia/${participacion.id}`, { metodo: 'PUT', cuerpo });
    olvidarGrupo(actualizada.clubId, actualizada.edicionId, actualizada.categoriaId);
    establecerCargando(boton, false);
    const avisos = actualizada.avisos || [];
    await renderizarDetalle(actualizada);
    if (avisos.length > 0) {
      mostrarAlerta(alertas, 'info', avisos.join(' '));
    } else {
      pantalla.cambios = true;
      mostrarAlerta(alertas, 'success', 'Cambios guardados. Quedan registrados en la auditoría.');
    }
  } catch (error) {
    establecerCargando(boton, false);
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  }
}

function abrirEliminar() {
  const participacion = pantalla.participacion;
  limpiarAlerta(elemento('alertas-detalle'));
  elemento('texto-eliminar').textContent = `Se eliminará la participación de ${identificarEstudiante(participacion)} en ${participacion.categoriaNombre} de ${participacion.edicionNombre}. La eliminación queda registrada en la auditoría y no se puede deshacer. Si la participación ya tiene certificados, el sistema no permitirá eliminarla.`;
  elemento('panel-edicion').hidden = true;
  elemento('panel-eliminar').hidden = false;
  elemento('boton-confirmar-eliminar').disabled = false;
  elemento('boton-confirmar-eliminar').focus();
}

function cerrarEliminar() {
  const visible = !elemento('panel-eliminar').hidden;
  elemento('panel-eliminar').hidden = true;
  if (visible && pantalla.participacion && puedeModificar(pantalla.participacion) && !soloDatosMinimos()) {
    elemento('panel-edicion').hidden = false;
  }
}

async function eliminar() {
  const participacion = pantalla.participacion;
  const alertas = elemento('alertas-detalle');
  limpiarAlerta(alertas);
  const boton = elemento('boton-confirmar-eliminar');
  establecerCargando(boton, true, 'Eliminando...');
  try {
    await apiFetch(`/api/participaciones-competencia/${participacion.id}`, { metodo: 'DELETE' });
    olvidarGrupo(participacion.clubId, participacion.edicionId, participacion.categoriaId);
    establecerCargando(boton, false);
    pantalla.cambios = true;
    modalDetalle.hide();
    mostrarAlerta(elemento('alertas'), 'success',
      `Participación N.º ${participacion.id} de ${identificarEstudiante(participacion)} eliminada.`);
  } catch (error) {
    establecerCargando(boton, false);
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  }
}
