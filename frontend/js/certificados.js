import { apiFetch, apiDescargarArchivo, construirConsulta, ApiError } from './api.js';
import {
  cargarInstituciones,
  cargarClubes,
  cargarCursosDelClub,
  cargarParticipaciones,
  cargarEdicionesDeCompetencia,
  cargarCertificadosDelClub
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
const COLUMNAS = 7;
const ROLES_GLOBALES = ['ADMIN', 'COORDINADOR', 'CONSULTA'];
const ROLES_DATOS_MINIMOS = ['COORDINADOR', 'CONSULTA'];
const ROLES_EMISION = ['ADMIN', 'RESP_INSTITUCIONAL'];
const ROLES_DESCARGA = ['ADMIN', 'RESP_INSTITUCIONAL', 'DOCENTE'];
const MOTIVO_MINIMO = 10;
const MOTIVO_MAXIMO = 500;

const TIPOS = {
  PARTICIPACION_CURSO: { etiqueta: 'Participación en curso', corta: 'Participación', origen: 'CURSO' },
  APROBACION_CURSO: { etiqueta: 'Aprobación de curso', corta: 'Aprobación', origen: 'CURSO' },
  PARTICIPACION_COMPETENCIA: { etiqueta: 'Participación en competencia', corta: 'Participación', origen: 'COMPETENCIA' },
  RECONOCIMIENTO_COMPETENCIA: { etiqueta: 'Reconocimiento en competencia', corta: 'Reconocimiento', origen: 'COMPETENCIA' }
};

const ESTADOS = {
  EMITIDO: { etiqueta: 'Vigente', clase: 'text-bg-success' },
  ANULADO: { etiqueta: 'Anulado', clase: 'text-bg-danger' }
};

const ESTADOS_CURSO = {
  PLANIFICADO: 'Planificado',
  EN_CURSO: 'En curso',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado'
};

const RESULTADOS = {
  APROBADO: 'Aprobado',
  NO_APROBADO: 'No aprobado'
};

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
  certificado: null,
  cambios: false,
  turnoEmision: 0,
  alCerrarEmision: null
};
const catalogo = {
  instituciones: [],
  clubes: [],
  cursosPorClub: new Map(),
  participacionesPorClub: new Map(),
  vigentesPorClub: new Map(),
  edicionesPorCompetencia: new Map()
};
const emision = { candidatos: [], nota: '' };
let modalEmitir = null;
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

function puedeEmitir() {
  return ROLES_EMISION.includes(rolActual());
}

function deSuInstitucion(certificado) {
  return rolActual() === 'ADMIN' || certificado.institucionId === sesion.usuario.institucionId;
}

function puedeAnular(certificado) {
  return puedeEmitir() && certificado.estado === 'EMITIDO' && deSuInstitucion(certificado);
}

function puedeDescargar(certificado) {
  return ROLES_DESCARGA.includes(rolActual()) && certificado.estado === 'EMITIDO';
}

function mensajeDe(error) {
  return error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
}

function hoy() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date());
}

function insignia(mapa, codigo) {
  const datos = mapa[codigo] || { etiqueta: codigo || '—', clase: 'text-bg-light' };
  return crearElemento('span', { clase: `badge ${datos.clase}`, texto: datos.etiqueta });
}

function etiquetaTipo(tipo) {
  return TIPOS[tipo] ? TIPOS[tipo].etiqueta : tipo;
}

function buscarClub(id) {
  return catalogo.clubes.find(club => club.id === Number(id)) || null;
}

function nombreEstudiante(certificado) {
  return `${certificado.estudianteApellidos} ${certificado.estudianteNombres}`;
}

function vistaCompleta(certificado) {
  return !soloDatosMinimos() && Boolean(certificado.estudianteNombres);
}

function identificarEstudiante(certificado) {
  return vistaCompleta(certificado)
    ? `${nombreEstudiante(certificado)} (${certificado.estudianteCodigo})`
    : certificado.estudianteCodigo;
}

function enlaceVerificacion(certificado) {
  if (certificado.urlVerificacion) {
    return certificado.urlVerificacion;
  }
  const direccion = new URL('verificar-certificado.html', window.location.href);
  direccion.searchParams.set('codigo', certificado.codigoVerificacion);
  return direccion.toString();
}

function enlaceVerificacionLocal(certificado) {
  return `verificar-certificado.html?codigo=${encodeURIComponent(certificado.codigoVerificacion)}`;
}

function nombreArchivo(certificado) {
  return `certificado-${certificado.codigoVerificacion}.pdf`;
}

async function iniciar() {
  montarLayout(sesion, 'certificados');

  elemento('boton-nuevo').hidden = !puedeEmitir();
  elemento('aviso-datos-minimos').hidden = !soloDatosMinimos();
  elemento('aviso-docente').hidden = rolActual() !== 'DOCENTE';
  elemento('grupo-filtro-institucion').hidden = !esGlobal();
  if (soloDatosMinimos()) {
    elemento('etiqueta-filtro-q').textContent = 'Código EST-, título o código TIPI-';
  }

  modalEmitir = bootstrap.Modal.getOrCreateInstance(elemento('modal-emitir'));
  modalDetalle = bootstrap.Modal.getOrCreateInstance(elemento('modal-detalle'));

  elemento('boton-nuevo').addEventListener('click', abrirEmision);
  elemento('formulario-filtros').addEventListener('submit', evento => {
    evento.preventDefault();
    buscar();
  });
  elemento('formulario-filtros').addEventListener('reset', () => {
    setTimeout(() => {
      llenarFiltroClubes();
      buscar();
    }, 0);
  });
  elemento('filtro-institucion').addEventListener('change', llenarFiltroClubes);
  elemento('boton-quitar-estudiante').addEventListener('click', () => {
    pantalla.estudianteId = null;
    elemento('aviso-filtro-estudiante').hidden = true;
    recargar(0);
  });

  elemento('formulario-emitir').addEventListener('submit', emitir);
  document.querySelectorAll('input[name="emitir-origen"]').forEach(opcion => {
    opcion.addEventListener('change', alCambiarOrigen);
  });
  elemento('emitir-club').addEventListener('change', alCambiarClubEmision);
  elemento('emitir-curso').addEventListener('change', alCambiarCursoEmision);
  elemento('emitir-buscar').addEventListener('input', llenarCandidatos);
  elemento('emitir-candidato').addEventListener('change', actualizarTipos);
  elemento('modal-emitir').addEventListener('hidden.bs.modal', () => {
    const accion = pantalla.alCerrarEmision;
    pantalla.alCerrarEmision = null;
    if (accion) {
      accion();
    }
  });

  elemento('boton-descargar').addEventListener('click', () => descargar(pantalla.certificado, elemento('boton-descargar'), elemento('alertas-detalle')));
  elemento('boton-copiar').addEventListener('click', copiarEnlace);
  elemento('boton-abrir-anulacion').addEventListener('click', abrirPanelAnulacion);
  elemento('boton-volver-anulacion').addEventListener('click', cerrarPanelAnulacion);
  elemento('campo-motivo').addEventListener('input', evaluarAnulacion);
  elemento('anular-confirmacion').addEventListener('change', evaluarAnulacion);
  elemento('panel-anulacion').addEventListener('submit', anular);
  elemento('modal-detalle').addEventListener('hidden.bs.modal', () => {
    pantalla.certificado = null;
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
  if (estado && ESTADOS[estado]) {
    elemento('filtro-estado').value = estado;
  }
  const tipo = parametros.get('tipo');
  if (tipo && TIPOS[tipo]) {
    elemento('filtro-tipo').value = tipo;
  }
  const texto = parametros.get('q');
  if (texto) {
    elemento('filtro-q').value = texto.slice(0, 100);
  }
  pantalla.filtros = leerFiltros();

  const estudianteId = parametros.get('estudianteId');
  if (estudianteId && /^\d+$/.test(estudianteId)) {
    pantalla.estudianteId = Number(estudianteId);
    let aviso = 'Se muestran solo los certificados del estudiante seleccionado.';
    try {
      const estudiante = await apiFetch(`/api/estudiantes/${estudianteId}`);
      const nombre = estudiante.nombres
        ? `${estudiante.apellidos} ${estudiante.nombres} (${estudiante.codigoInterno})`
        : estudiante.codigoInterno;
      aviso = `Se muestran solo los certificados de ${nombre}.`;
    } catch (error) {
      aviso = 'Se muestran solo los certificados del estudiante indicado en el enlace.';
    }
    elemento('texto-filtro-estudiante').textContent = aviso;
    elemento('aviso-filtro-estudiante').hidden = false;
  }
}

function leerFiltros() {
  return {
    q: elemento('filtro-q').value.trim(),
    institucionId: esGlobal() ? elemento('filtro-institucion').value : '',
    clubId: elemento('filtro-club').value,
    tipo: elemento('filtro-tipo').value,
    estado: elemento('filtro-estado').value,
    desde: elemento('filtro-desde').value,
    hasta: elemento('filtro-hasta').value
  };
}

function buscar() {
  const filtros = leerFiltros();
  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    mostrarAlerta(elemento('alertas'), 'danger', 'La fecha «Emitidos desde» no puede ser posterior a «Emitidos hasta».');
    return;
  }
  limpiarAlerta(elemento('alertas'));
  pantalla.filtros = filtros;
  recargar(0);
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
  cuerpo.replaceChildren(filaMensaje('Cargando certificados...'));
  try {
    const ruta = `/api/certificados${construirConsulta(consultaActual({ pagina, tamano: TAMANO_PAGINA }))}`;
    const respuesta = await apiFetch(ruta);
    pantalla.pagina = respuesta.pagina;
    if (respuesta.contenido.length === 0) {
      cuerpo.replaceChildren(filaMensaje('No se encontraron certificados.'));
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
    const [vigentes, anulados] = await Promise.all(['EMITIDO', 'ANULADO'].map(estado => apiFetch(
      `/api/certificados${construirConsulta(consultaActual({ estado, pagina: 0, tamano: 1 }))}`
    )));
    contenedor.replaceChildren(
      crearContador('EMITIDO', vigentes.totalElementos, ['vigente', 'vigentes']),
      crearContador('ANULADO', anulados.totalElementos, ['anulado', 'anulados'])
    );
  } catch (error) {
    contenedor.replaceChildren();
  }
}

function crearContador(estado, total, [singular, plural]) {
  const datos = ESTADOS[estado];
  const boton = crearElemento('button', {
    clase: 'btn btn-sm btn-outline-secondary py-0',
    atributos: { type: 'button', title: `Filtrar: ${plural}` }
  }, [
    crearElemento('span', { clase: `badge ${datos.clase} me-1`, texto: String(total) }),
    document.createTextNode(total === 1 ? singular : plural)
  ]);
  boton.addEventListener('click', () => {
    elemento('filtro-estado').value = estado;
    buscar();
  });
  return boton;
}

function crearFila(certificado) {
  const estudiante = [];
  if (vistaCompleta(certificado)) {
    estudiante.push(crearElemento('div', { clase: 'fw-semibold', texto: nombreEstudiante(certificado) }));
    estudiante.push(crearElemento('div', {
      clase: 'small font-monospace text-nowrap text-body-secondary',
      texto: certificado.estudianteCodigo
    }));
  } else {
    estudiante.push(crearElemento('div', { clase: 'font-monospace text-nowrap', texto: certificado.estudianteCodigo }));
  }

  const club = [crearElemento('div', { texto: certificado.clubNombre || `Club ${certificado.clubId}` })];
  if (esGlobal()) {
    club.push(crearElemento('div', { clase: 'small text-body-secondary', texto: certificado.institucionNombre }));
  }

  const descripcion = [
    crearElemento('div', { texto: certificado.titulo }),
    crearElemento('div', { clase: 'small text-body-secondary', texto: etiquetaTipo(certificado.tipo) })
  ];

  return crearElemento('tr', {}, [
    crearElemento('td', { clase: 'small text-nowrap', texto: formatearFecha(certificado.fechaEmision) }),
    crearElemento('td', { clase: 'font-monospace small text-nowrap', texto: certificado.codigoVerificacion }),
    crearElemento('td', {}, estudiante),
    crearElemento('td', {}, descripcion),
    crearElemento('td', {}, club),
    crearElemento('td', {}, [insignia(ESTADOS, certificado.estado)]),
    crearElemento('td', { clase: 'text-end text-nowrap' }, crearAcciones(certificado))
  ]);
}

function crearAcciones(certificado) {
  const acciones = [];
  const quien = identificarEstudiante(certificado);
  if (puedeDescargar(certificado)) {
    const descargarBoton = crearElemento('button', {
      clase: 'btn btn-sm btn-outline-primary ms-1',
      atributos: {
        type: 'button',
        title: 'Descargar PDF',
        'aria-label': `Descargar el PDF del certificado ${certificado.codigoVerificacion} de ${quien}`
      }
    }, [crearElemento('i', { clase: 'bi bi-file-earmark-pdf', atributos: { 'aria-hidden': 'true' } })]);
    descargarBoton.addEventListener('click', () => descargar(certificado, descargarBoton, elemento('alertas')));
    acciones.push(descargarBoton);
  }
  const ver = crearElemento('button', {
    clase: 'btn btn-sm btn-outline-secondary ms-1',
    atributos: {
      type: 'button',
      title: 'Ver detalle',
      'aria-label': `Ver detalle del certificado ${certificado.codigoVerificacion} de ${quien}`
    }
  }, [crearElemento('i', { clase: 'bi bi-eye', atributos: { 'aria-hidden': 'true' } })]);
  ver.addEventListener('click', () => abrirDetalle(certificado.id));
  acciones.push(ver);
  return acciones;
}

async function descargar(certificado, boton, alertas) {
  if (!certificado) {
    return;
  }
  limpiarAlerta(alertas);
  const conTexto = boton.textContent.trim() !== '';
  if (conTexto) {
    establecerCargando(boton, true, 'Descargando...');
  } else {
    boton.disabled = true;
  }
  try {
    await apiDescargarArchivo(`/api/certificados/${certificado.id}/pdf`, nombreArchivo(certificado));
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error));
  } finally {
    if (conTexto) {
      establecerCargando(boton, false);
    } else {
      boton.disabled = false;
    }
  }
}

function origenSeleccionado() {
  const marcado = document.querySelector('input[name="emitir-origen"]:checked');
  return marcado ? marcado.value : 'CURSO';
}

function clubesEmisibles() {
  return catalogo.clubes.filter(club => rolActual() === 'ADMIN' || club.institucionId === sesion.usuario.institucionId);
}

async function abrirEmision() {
  limpiarAlerta(elemento('alertas-emitir'));
  const clubes = clubesEmisibles();
  const opciones = [crearElemento('option', { texto: 'Seleccione un club', atributos: { value: '' } })];
  clubes.forEach(club => {
    opciones.push(crearElemento('option', {
      texto: etiquetaClub(club, rolActual() === 'ADMIN'),
      atributos: { value: String(club.id) }
    }));
  });
  elemento('emitir-club').replaceChildren(...opciones);
  const preferido = elemento('filtro-club').value;
  elemento('emitir-club').value = clubes.some(club => String(club.id) === preferido) ? preferido : '';
  elemento('emitir-origen-curso').checked = true;
  if (clubes.length === 0) {
    mostrarAlerta(elemento('alertas-emitir'), 'warning', 'No hay clubes registrados en su institución.');
  }
  modalEmitir.show();
  await alCambiarOrigen();
}

async function alCambiarOrigen() {
  const deCurso = origenSeleccionado() === 'CURSO';
  elemento('grupo-curso').hidden = !deCurso;
  elemento('etiqueta-emitir-candidato').textContent = deCurso ? 'Participante del curso *' : 'Participación en competencia *';
  await alCambiarClubEmision();
}

function reiniciarCandidatos(texto) {
  emision.candidatos = [];
  elemento('emitir-candidato').replaceChildren();
  elemento('emitir-candidato').disabled = true;
  elemento('emitir-buscar').disabled = true;
  elemento('emitir-buscar').value = '';
  elemento('ayuda-emitir-candidato').textContent = texto;
  actualizarTipos();
}

async function obtenerConCache(mapa, clave, cargar) {
  if (!mapa.has(clave)) {
    mapa.set(clave, await cargar(clave));
  }
  return mapa.get(clave);
}

function olvidarClub(clubId) {
  catalogo.cursosPorClub.delete(clubId);
  catalogo.participacionesPorClub.delete(clubId);
  catalogo.vigentesPorClub.delete(clubId);
}

async function alCambiarClubEmision() {
  const turno = ++pantalla.turnoEmision;
  const club = buscarClub(elemento('emitir-club').value);
  const selectorCurso = elemento('emitir-curso');
  if (!club) {
    selectorCurso.replaceChildren(crearElemento('option', { texto: 'Seleccione primero el club', atributos: { value: '' } }));
    selectorCurso.disabled = true;
    reiniciarCandidatos('Seleccione primero el club.');
    return;
  }
  if (origenSeleccionado() === 'CURSO') {
    await prepararCursos(club, turno);
  } else {
    await prepararParticipaciones(club, turno);
  }
}

function etiquetaCurso(curso) {
  const partes = [curso.nombre, ESTADOS_CURSO[curso.estado] || curso.estado];
  if (curso.fechaFin) {
    partes.push(`hasta el ${formatearFecha(curso.fechaFin)}`);
  }
  return partes.join(' · ');
}

async function prepararCursos(club, turno) {
  const selectorCurso = elemento('emitir-curso');
  selectorCurso.replaceChildren(crearElemento('option', { texto: 'Cargando cursos...', atributos: { value: '' } }));
  selectorCurso.disabled = true;
  reiniciarCandidatos('Seleccione primero el curso.');
  try {
    const cursos = await obtenerConCache(catalogo.cursosPorClub, club.id, cargarCursosDelClub);
    if (turno !== pantalla.turnoEmision) {
      return;
    }
    const ordenados = cursos.slice().sort((a, b) => {
      const finalizadoA = a.estado === 'FINALIZADO' ? 0 : 1;
      const finalizadoB = b.estado === 'FINALIZADO' ? 0 : 1;
      return finalizadoA - finalizadoB || a.nombre.localeCompare(b.nombre, 'es');
    });
    const finalizados = ordenados.filter(curso => curso.estado === 'FINALIZADO');
    const opciones = [crearElemento('option', {
      texto: finalizados.length === 0 ? 'El club no tiene cursos finalizados' : 'Seleccione un curso',
      atributos: { value: '' }
    })];
    ordenados.forEach(curso => {
      const opcion = crearElemento('option', { texto: etiquetaCurso(curso), atributos: { value: String(curso.id) } });
      opcion.disabled = curso.estado !== 'FINALIZADO';
      opciones.push(opcion);
    });
    selectorCurso.replaceChildren(...opciones);
    selectorCurso.disabled = finalizados.length === 0;
    if (finalizados.length === 1) {
      selectorCurso.value = String(finalizados[0].id);
    }
    elemento('ayuda-emitir-curso').textContent = cursos.length === 0
      ? 'El club no tiene cursos registrados.'
      : `${finalizados.length} de ${cursos.length} cursos finalizados. Solo los cursos finalizados tienen participantes que se pueden certificar.`;
    await alCambiarCursoEmision();
  } catch (error) {
    if (turno !== pantalla.turnoEmision) {
      return;
    }
    selectorCurso.replaceChildren(crearElemento('option', { texto: 'No se pudieron cargar los cursos', atributos: { value: '' } }));
    mostrarAlerta(elemento('alertas-emitir'), 'danger', mensajeDe(error));
  }
}

function buscarCursoEmision() {
  const club = buscarClub(elemento('emitir-club').value);
  const cursos = club ? catalogo.cursosPorClub.get(club.id) || [] : [];
  return cursos.find(curso => curso.id === Number(elemento('emitir-curso').value)) || null;
}

async function alCambiarCursoEmision() {
  if (origenSeleccionado() !== 'CURSO') {
    return;
  }
  const turno = ++pantalla.turnoEmision;
  const curso = buscarCursoEmision();
  if (!curso) {
    reiniciarCandidatos('Seleccione primero el curso.');
    return;
  }
  reiniciarCandidatos('Cargando participantes del curso...');
  try {
    const participantes = await apiFetch(`/api/cursos/${curso.id}/participantes`);
    if (turno !== pantalla.turnoEmision) {
      return;
    }
    const finalizados = participantes.filter(participante => participante.estado === 'FINALIZADA');
    emision.candidatos = finalizados
      .map(participante => ({
        clave: String(participante.inscripcionCursoId),
        origen: 'CURSO',
        id: participante.inscripcionCursoId,
        codigo: participante.estudianteCodigo,
        nombre: `${participante.estudianteApellidos} ${participante.estudianteNombres}`,
        curso,
        resultado: participante.resultado,
        vigentes: participante.certificadosVigentes || []
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    habilitarCandidatos(participantes.length === finalizados.length
      ? ''
      : `${participantes.length - finalizados.length} participantes no terminaron el curso (retirados) y no se muestran.`);
  } catch (error) {
    if (turno !== pantalla.turnoEmision) {
      return;
    }
    reiniciarCandidatos('No se pudieron cargar los participantes.');
    mostrarAlerta(elemento('alertas-emitir'), 'danger', mensajeDe(error));
  }
}

async function cargarEdiciones(competenciaIds) {
  await Promise.all(competenciaIds.map(id => obtenerConCache(catalogo.edicionesPorCompetencia, id, cargarEdicionesDeCompetencia)));
  const ediciones = new Map();
  competenciaIds.forEach(id => {
    (catalogo.edicionesPorCompetencia.get(id) || []).forEach(edicion => ediciones.set(edicion.id, edicion));
  });
  return ediciones;
}

function vigentesPorParticipacion(certificados) {
  const mapa = new Map();
  certificados
    .filter(certificado => certificado.participacionId)
    .forEach(certificado => {
      const lista = mapa.get(certificado.participacionId) || [];
      lista.push({ id: certificado.id, tipo: certificado.tipo, codigoVerificacion: certificado.codigoVerificacion });
      mapa.set(certificado.participacionId, lista);
    });
  return mapa;
}

async function prepararParticipaciones(club, turno) {
  reiniciarCandidatos('Cargando participaciones del club...');
  try {
    const [participaciones, vigentes] = await Promise.all([
      obtenerConCache(catalogo.participacionesPorClub, club.id, clubId => cargarParticipaciones({ clubId })),
      obtenerConCache(catalogo.vigentesPorClub, club.id, clubId => cargarCertificadosDelClub(clubId, 'EMITIDO'))
    ]);
    const competencias = [...new Set(participaciones.map(participacion => participacion.competenciaId))];
    const ediciones = await cargarEdiciones(competencias);
    if (turno !== pantalla.turnoEmision) {
      return;
    }
    const porParticipacion = vigentesPorParticipacion(vigentes);
    emision.candidatos = participaciones
      .map(participacion => ({
        clave: String(participacion.id),
        origen: 'COMPETENCIA',
        id: participacion.id,
        codigo: participacion.estudianteCodigo,
        nombre: `${participacion.estudianteApellidos} ${participacion.estudianteNombres}`,
        participacion,
        edicion: ediciones.get(participacion.edicionId) || null,
        vigentes: porParticipacion.get(participacion.id) || []
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es') || b.participacion.edicionAnio - a.participacion.edicionAnio);
    habilitarCandidatos('');
  } catch (error) {
    if (turno !== pantalla.turnoEmision) {
      return;
    }
    reiniciarCandidatos('No se pudieron cargar las participaciones.');
    mostrarAlerta(elemento('alertas-emitir'), 'danger', mensajeDe(error));
  }
}

function habilitarCandidatos(nota) {
  emision.nota = nota;
  const hay = emision.candidatos.length > 0;
  elemento('emitir-buscar').disabled = !hay;
  elemento('emitir-candidato').disabled = !hay;
  if (!hay) {
    elemento('ayuda-emitir-candidato').textContent = origenSeleccionado() === 'CURSO'
      ? 'El curso no tiene participantes que lo hayan terminado.'
      : 'El club no tiene participaciones en competencias registradas.';
  }
  llenarCandidatos();
}

function descripcionCompetencia(participacion) {
  return `${participacion.competenciaNombre} · ${participacion.edicionNombre} · ${participacion.categoriaNombre}`;
}

function logro(participacion) {
  const partes = [];
  if (participacion.puesto) {
    partes.push(`Puesto ${participacion.puesto}`);
  }
  if (participacion.reconocimiento) {
    partes.push(participacion.reconocimiento);
  }
  return partes.join(' · ');
}

function textoCandidato(candidato) {
  const partes = [candidato.nombre, candidato.codigo];
  if (candidato.origen === 'CURSO') {
    partes.push(candidato.resultado ? RESULTADOS[candidato.resultado] : 'Resultado sin registrar');
  } else {
    partes.push(descripcionCompetencia(candidato.participacion));
    const texto = logro(candidato.participacion);
    if (texto) {
      partes.push(texto);
    }
  }
  if (candidato.vigentes.length > 0) {
    partes.push(`ya tiene: ${candidato.vigentes.map(v => (TIPOS[v.tipo] ? TIPOS[v.tipo].corta : v.tipo)).join(' y ')}`);
  }
  return partes.join(' · ');
}

function llenarCandidatos() {
  const selector = elemento('emitir-candidato');
  const anterior = selector.value;
  const texto = elemento('emitir-buscar').value.trim().toLowerCase();
  const visibles = emision.candidatos.filter(candidato => !texto
    || `${candidato.nombre} ${candidato.codigo}`.toLowerCase().includes(texto));
  selector.replaceChildren(...visibles.map(candidato => crearElemento('option', {
    texto: textoCandidato(candidato),
    atributos: { value: candidato.clave }
  })));
  if (visibles.some(candidato => candidato.clave === anterior)) {
    selector.value = anterior;
  } else if (visibles.length === 1) {
    selector.value = visibles[0].clave;
  }
  actualizarTipos();
}

function candidatoSeleccionado() {
  const clave = elemento('emitir-candidato').value;
  return emision.candidatos.find(candidato => candidato.clave === clave) || null;
}

function vigenteDeTipo(candidato, tipo) {
  return candidato.vigentes.find(vigente => vigente.tipo === tipo) || null;
}

function motivoNoEmitible(candidato, tipo) {
  const vigente = vigenteDeTipo(candidato, tipo);
  if (vigente) {
    return `Ya tiene un certificado vigente de este tipo (${vigente.codigoVerificacion}). Anúlelo si necesita emitir uno nuevo.`;
  }
  if (tipo === 'APROBACION_CURSO' && candidato.resultado !== 'APROBADO') {
    return candidato.resultado === 'NO_APROBADO'
      ? 'El estudiante no aprobó el curso.'
      : 'El resultado del curso no está registrado. Regístrelo en Cursos y horarios → Participantes.';
  }
  if (candidato.origen === 'COMPETENCIA') {
    const edicion = candidato.edicion;
    if (edicion && !edicion.fechaInicio) {
      return 'La edición no tiene fecha de inicio registrada.';
    }
    if (edicion && edicion.fechaInicio > hoy()) {
      return `La edición empieza el ${formatearFecha(edicion.fechaInicio)}: se certifica desde esa fecha.`;
    }
    if (tipo === 'RECONOCIMIENTO_COMPETENCIA' && !candidato.participacion.puesto && !candidato.participacion.reconocimiento) {
      return 'La participación no tiene puesto ni reconocimiento registrado.';
    }
  }
  return null;
}

function tiposDelOrigen() {
  const origen = origenSeleccionado();
  return Object.keys(TIPOS).filter(tipo => TIPOS[tipo].origen === origen);
}

function actualizarTipos() {
  const candidato = candidatoSeleccionado();
  const contenedor = elemento('opciones-tipo');
  const anterior = (document.querySelector('input[name="emitir-tipo"]:checked') || {}).value;
  const tipos = tiposDelOrigen();
  const disponibles = [];
  const opciones = tipos.map(tipo => {
    const id = `emitir-tipo-${tipo.toLowerCase()}`;
    const motivo = candidato ? motivoNoEmitible(candidato, tipo) : 'Seleccione primero el estudiante.';
    const entrada = crearElemento('input', {
      clase: 'form-check-input',
      atributos: { type: 'radio', name: 'emitir-tipo', id, value: tipo }
    });
    entrada.disabled = Boolean(motivo);
    if (!motivo) {
      disponibles.push(tipo);
    }
    entrada.addEventListener('change', actualizarResumenEmision);
    const etiqueta = crearElemento('label', { clase: 'form-check-label', texto: TIPOS[tipo].etiqueta, atributos: { for: id } });
    const hijos = [entrada, etiqueta];
    if (motivo && candidato) {
      hijos.push(crearElemento('div', { clase: 'form-text mt-0', texto: motivo }));
    }
    return crearElemento('div', { clase: 'form-check' }, hijos);
  });
  contenedor.replaceChildren(...opciones);
  const elegido = disponibles.includes(anterior) ? anterior : disponibles.length === 1 ? disponibles[0] : null;
  if (elegido) {
    elemento(`emitir-tipo-${elegido.toLowerCase()}`).checked = true;
  }
  actualizarAyudaCandidato(candidato, disponibles);
  actualizarResumenEmision();
}

function actualizarAyudaCandidato(candidato, disponibles) {
  const ayuda = elemento('ayuda-emitir-candidato');
  if (emision.candidatos.length === 0) {
    return;
  }
  const partes = [];
  if (!candidato) {
    partes.push(`${elemento('emitir-candidato').options.length} de ${emision.candidatos.length} en la lista. Seleccione uno.`);
  } else if (disponibles.length === 0) {
    partes.push(`${candidato.nombre} (${candidato.codigo}) no tiene certificados pendientes de emitir en este origen.`);
  } else {
    partes.push(`Seleccionado: ${candidato.nombre} (${candidato.codigo}).`);
  }
  if (emision.nota) {
    partes.push(emision.nota);
  }
  ayuda.textContent = partes.join(' ');
}

function tipoSeleccionado() {
  const marcado = document.querySelector('input[name="emitir-tipo"]:checked');
  return marcado && !marcado.disabled ? marcado.value : null;
}

function agregarDato(lista, termino, valor, claseTermino = 'col-sm-4', claseValor = 'col-sm-8') {
  lista.appendChild(crearElemento('dt', { clase: claseTermino, texto: termino }));
  const descripcion = crearElemento('dd', { clase: claseValor });
  if (valor instanceof Node) {
    descripcion.appendChild(valor);
  } else {
    descripcion.textContent = valor === null || valor === undefined || valor === '' ? '—' : valor;
  }
  lista.appendChild(descripcion);
}

function actualizarResumenEmision() {
  const candidato = candidatoSeleccionado();
  const tipo = tipoSeleccionado();
  const grupo = elemento('grupo-resumen-emision');
  elemento('boton-emitir').disabled = !(candidato && tipo);
  if (!candidato || !tipo) {
    grupo.hidden = true;
    return;
  }
  const club = buscarClub(elemento('emitir-club').value);
  const lista = elemento('lista-resumen-emision');
  lista.replaceChildren();
  agregarDato(lista, 'Tipo', TIPOS[tipo].etiqueta, 'col-sm-3', 'col-sm-9');
  agregarDato(lista, 'Estudiante', `${candidato.nombre} (${candidato.codigo})`, 'col-sm-3', 'col-sm-9');
  if (candidato.origen === 'CURSO') {
    const resultado = candidato.resultado ? `, resultado: ${RESULTADOS[candidato.resultado]}` : '';
    agregarDato(lista, 'Curso', `${candidato.curso.nombre}${resultado}`, 'col-sm-3', 'col-sm-9');
  } else {
    const texto = logro(candidato.participacion);
    agregarDato(lista, 'Competencia', `${descripcionCompetencia(candidato.participacion)}${texto ? ` (${texto})` : ''}`, 'col-sm-3', 'col-sm-9');
  }
  if (club) {
    agregarDato(lista, 'Club', `${club.nombre} · ${club.institucionNombre}`, 'col-sm-3', 'col-sm-9');
  }
  grupo.hidden = false;
}

async function emitir(evento) {
  evento.preventDefault();
  const alertas = elemento('alertas-emitir');
  limpiarAlerta(alertas);
  const candidato = candidatoSeleccionado();
  const tipo = tipoSeleccionado();
  if (!candidato || !tipo) {
    mostrarAlerta(alertas, 'danger', 'Seleccione el estudiante y un tipo de certificado disponible.');
    return;
  }
  const cuerpo = candidato.origen === 'CURSO'
    ? { tipo, inscripcionCursoId: candidato.id }
    : { tipo, participacionId: candidato.id };
  const clubId = Number(elemento('emitir-club').value);
  const boton = elemento('boton-emitir');
  establecerCargando(boton, true, 'Generando PDF...');
  try {
    const emitido = await apiFetch('/api/certificados', { metodo: 'POST', cuerpo });
    olvidarClub(clubId);
    pantalla.alCerrarEmision = () => {
      recargar(0);
      abrirDetalle(emitido.id, {
        tipo: 'success',
        texto: `Certificado ${emitido.codigoVerificacion} emitido para ${identificarEstudiante(emitido)}. Ya puede descargar el PDF y compartir su enlace de verificación.`
      });
    };
    modalEmitir.hide();
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
    if (error instanceof ApiError && error.estado === 409) {
      olvidarClub(clubId);
      if (candidato.origen === 'CURSO') {
        await alCambiarCursoEmision();
      } else {
        await alCambiarClubEmision();
      }
    }
  } finally {
    establecerCargando(boton, false);
    actualizarResumenEmision();
  }
}

async function abrirDetalle(id, aviso = null) {
  limpiarAlerta(elemento('alertas'));
  try {
    const certificado = await apiFetch(`/api/certificados/${id}`);
    limpiarAlerta(elemento('alertas-detalle'));
    renderizarDetalle(certificado);
    if (aviso) {
      mostrarAlerta(elemento('alertas-detalle'), aviso.tipo, aviso.texto);
    }
    modalDetalle.show();
  } catch (error) {
    mostrarAlerta(elemento('alertas'), 'danger', mensajeDe(error));
  }
}

function textoLargo(valor) {
  return crearElemento('div', { clase: 'texto-preformateado', texto: valor || '—' });
}

function tamanoLegible(bytes) {
  if (!bytes && bytes !== 0) {
    return '—';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  return `${(bytes / 1024).toLocaleString('es-EC', { maximumFractionDigits: 1 })} KB`;
}

function origenDetalle(certificado) {
  if (certificado.participacionId) {
    return crearElemento('a', {
      texto: `Participación en competencia N.º ${certificado.participacionId}`,
      atributos: { href: `competencias.html?id=${certificado.participacionId}` }
    });
  }
  if (certificado.inscripcionCursoId) {
    return `Inscripción en curso N.º ${certificado.inscripcionCursoId}`;
  }
  return TIPOS[certificado.tipo] && TIPOS[certificado.tipo].origen === 'CURSO' ? 'Curso' : 'Competencia';
}

function renderizarDetalle(certificado) {
  pantalla.certificado = certificado;
  const completa = vistaCompleta(certificado);

  elemento('titulo-modal-detalle').textContent = `Certificado ${certificado.codigoVerificacion}`;
  elemento('subtitulo-detalle').replaceChildren(
    insignia(ESTADOS, certificado.estado),
    document.createTextNode(` ${etiquetaTipo(certificado.tipo)} · ${identificarEstudiante(certificado)}`)
  );

  const datos = elemento('lista-datos');
  datos.replaceChildren();
  agregarDato(datos, 'Título', certificado.titulo);
  agregarDato(datos, 'Tipo', etiquetaTipo(certificado.tipo));
  if (completa) {
    agregarDato(datos, 'Estudiante', nombreEstudiante(certificado));
  }
  agregarDato(datos, 'Código del estudiante', crearElemento('span', { clase: 'font-monospace text-nowrap', texto: certificado.estudianteCodigo }));
  agregarDato(datos, 'Institución', certificado.institucionNombre);
  agregarDato(datos, 'Club', certificado.clubNombre);
  if (completa) {
    agregarDato(datos, 'Origen', origenDetalle(certificado));
  }
  agregarDato(datos, 'Fecha de emisión', formatearFecha(certificado.fechaEmision));

  const verificacion = elemento('lista-verificacion');
  verificacion.replaceChildren();
  agregarDato(verificacion, 'Código de verificación', crearElemento('span', {
    clase: 'font-monospace fw-semibold text-nowrap',
    texto: certificado.codigoVerificacion
  }));
  if (completa && certificado.archivoHash) {
    agregarDato(verificacion, 'Huella SHA-256 del PDF', crearElemento('span', {
      clase: 'font-monospace text-break',
      texto: certificado.archivoHash
    }));
    agregarDato(verificacion, 'Tamaño del PDF', tamanoLegible(certificado.archivoTamano));
  }
  elemento('enlace-verificacion').value = enlaceVerificacion(certificado);
  elemento('boton-abrir-verificacion').href = enlaceVerificacionLocal(certificado);
  elemento('ayuda-copiar').textContent = certificado.estado === 'ANULADO'
    ? 'La verificación pública mostrará que este certificado está anulado.'
    : 'Este enlace es el mismo que figura en el PDF.';

  renderizarTrazabilidad(certificado, completa);
  renderizarAnulacion(certificado, completa);
  renderizarAcciones(certificado);
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

function renderizarTrazabilidad(certificado, completa) {
  const cuando = certificado.createdAt ? formatearFechaHora(certificado.createdAt) : formatearFecha(certificado.fechaEmision);
  const pasos = [pasoTrazabilidad('bi-award', 'text-success',
    `Emitido el ${cuando}${completa ? porQuien(certificado.emitidoPorNombre) : ''}.`)];
  if (certificado.estado === 'ANULADO') {
    pasos.push(pasoTrazabilidad('bi-x-octagon', 'text-danger',
      `Anulado el ${formatearFechaHora(certificado.fechaAnulacion)}${completa ? porQuien(certificado.anuladoPorNombre) : ''}.`));
  } else {
    pasos.push(pasoTrazabilidad('bi-patch-check', 'text-body-secondary',
      'Vigente: la verificación pública lo muestra como válido.'));
  }
  elemento('lista-trazabilidad').replaceChildren(...pasos);
}

function renderizarAnulacion(certificado, completa) {
  const seccion = elemento('seccion-anulacion');
  const lista = elemento('lista-anulacion');
  lista.replaceChildren();
  if (certificado.estado !== 'ANULADO') {
    seccion.hidden = true;
    return;
  }
  agregarDato(lista, 'Fecha de anulación', formatearFechaHora(certificado.fechaAnulacion));
  if (completa) {
    agregarDato(lista, 'Anulado por', certificado.anuladoPorNombre);
    agregarDato(lista, 'Motivo', textoLargo(certificado.motivoAnulacion));
  }
  seccion.hidden = false;
}

function renderizarAcciones(certificado) {
  elemento('panel-anulacion').hidden = true;
  elemento('boton-abrir-anulacion').hidden = !puedeAnular(certificado);
  elemento('boton-descargar').hidden = !puedeDescargar(certificado);
}

async function copiarEnlace() {
  const campo = elemento('enlace-verificacion');
  const ayuda = elemento('ayuda-copiar');
  try {
    await navigator.clipboard.writeText(campo.value);
    ayuda.textContent = 'Enlace copiado al portapapeles.';
  } catch (error) {
    campo.focus();
    campo.select();
    ayuda.textContent = 'No se pudo copiar automáticamente: el enlace quedó seleccionado, presione Ctrl+C.';
  }
}

function abrirPanelAnulacion() {
  limpiarAlerta(elemento('alertas-detalle'));
  elemento('campo-motivo').value = '';
  elemento('anular-confirmacion').checked = false;
  elemento('boton-abrir-anulacion').hidden = true;
  elemento('panel-anulacion').hidden = false;
  evaluarAnulacion();
  elemento('campo-motivo').focus();
}

function cerrarPanelAnulacion() {
  renderizarAcciones(pantalla.certificado);
}

function evaluarAnulacion() {
  const longitud = elemento('campo-motivo').value.trim().length;
  elemento('contador-motivo').textContent = `${longitud} / ${MOTIVO_MAXIMO} caracteres (mínimo ${MOTIVO_MINIMO}).`;
  const valido = longitud >= MOTIVO_MINIMO && longitud <= MOTIVO_MAXIMO;
  elemento('boton-confirmar-anulacion').disabled = !(valido && elemento('anular-confirmacion').checked);
}

async function anular(evento) {
  evento.preventDefault();
  const certificado = pantalla.certificado;
  const alertas = elemento('alertas-detalle');
  limpiarAlerta(alertas);
  const motivo = elemento('campo-motivo').value.trim();
  if (motivo.length < MOTIVO_MINIMO || motivo.length > MOTIVO_MAXIMO) {
    mostrarAlerta(alertas, 'danger', `El motivo debe tener entre ${MOTIVO_MINIMO} y ${MOTIVO_MAXIMO} caracteres.`);
    return;
  }
  if (!elemento('anular-confirmacion').checked) {
    mostrarAlerta(alertas, 'danger', 'Marque la casilla de confirmación de la anulación.');
    return;
  }
  const boton = elemento('boton-confirmar-anulacion');
  establecerCargando(boton, true, 'Anulando...');
  try {
    const anulado = await apiFetch(`/api/certificados/${certificado.id}/anulacion`, {
      metodo: 'PATCH',
      cuerpo: { motivo }
    });
    pantalla.cambios = true;
    olvidarClub(anulado.clubId);
    establecerCargando(boton, false);
    renderizarDetalle(anulado);
    mostrarAlerta(alertas, 'success',
      `El certificado ${anulado.codigoVerificacion} quedó anulado. Si necesita reemplazarlo, emita uno nuevo desde «Emitir certificado».`);
  } catch (error) {
    establecerCargando(boton, false);
    evaluarAnulacion();
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  }
}
