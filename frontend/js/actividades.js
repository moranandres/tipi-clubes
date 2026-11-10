import { apiFetch, construirConsulta, ApiError } from './api.js';
import {
  cargarInstituciones,
  cargarClubes,
  cargarCursosDelClub,
  cargarDocentesActivos,
  cargarContenidos
} from './catalogos.js';
import { confirmar } from './confirmacion.js';
import { exigirSesion } from './guard.js';
import { montarLayout } from './layout.js';
import { renderizarPaginacion } from './paginacion.js';
import {
  crearElemento,
  formatearFecha,
  formatearFechaHora,
  mostrarAlerta,
  mostrarAlertaConEnlace,
  limpiarAlerta,
  establecerCargando,
  mensajesDeError
} from './ui.js';

const TAMANO_PAGINA = 10;
const MAXIMO_CONTENIDOS = 30;
const MAXIMO_MINUTOS = 480;
const ROLES_GLOBALES = ['ADMIN', 'COORDINADOR', 'CONSULTA'];
const ROLES_GESTION = ['ADMIN', 'RESP_INSTITUCIONAL', 'DOCENTE'];
const CLUB_PROGRAMABLE = ['PLANIFICADO', 'ACTIVO'];
const CURSO_ABIERTO = ['PLANIFICADO', 'EN_CURSO'];

const ESTADOS = {
  PLANIFICADA: { etiqueta: 'Planificada', clase: 'text-bg-info' },
  EJECUTADA: { etiqueta: 'Ejecutada', clase: 'text-bg-success' },
  CANCELADA: { etiqueta: 'Cancelada', clase: 'text-bg-secondary' }
};

const ESTADOS_CLUB = {
  PLANIFICADO: 'Planificado',
  ACTIVO: 'Activo',
  SUSPENDIDO: 'Suspendido',
  CERRADO: 'Cerrado'
};

const TIPOS_CONTENIDO = [
  { codigo: 'HERRAMIENTA', etiqueta: 'Herramientas', clase: 'text-bg-primary' },
  { codigo: 'LENGUAJE', etiqueta: 'Lenguajes', clase: 'text-bg-info' },
  { codigo: 'COMPONENTE', etiqueta: 'Componentes', clase: 'text-bg-warning' },
  { codigo: 'COMPETENCIA', etiqueta: 'Competencias', clase: 'text-bg-success' }
];

const sesion = exigirSesion();
const pantalla = {
  pagina: 0,
  filtros: {},
  modo: null,
  actividad: null,
  solicitudFormulario: 0,
  solicitudFiltroCursos: 0,
  solicitudDetalle: 0
};
const catalogo = { clubes: [], clubesPorId: new Map(), contenidos: [], instituciones: [] };
let modalActividad = null;
let modalEjecucion = null;
let modalCancelacion = null;
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

function rolGestiona() {
  return ROLES_GESTION.includes(rolActual());
}

function mensajeDe(error) {
  return error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
}

function hhmm(texto) {
  return texto ? texto.slice(0, 5) : '';
}

function hoy() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function sumarDias(texto, dias) {
  const [anio, mes, dia] = texto.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia + dias));
  return fecha.toISOString().slice(0, 10);
}

function minutosEntre(inicio, fin) {
  if (!inicio || !fin) {
    return null;
  }
  const [hi, mi] = inicio.split(':').map(Number);
  const [hf, mf] = fin.split(':').map(Number);
  return (hf * 60 + mf) - (hi * 60 + mi);
}

function textoDuracion(minutos) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) {
    return `${resto} min`;
  }
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

function textoHorario(fecha, inicio, fin) {
  return `${formatearFecha(fecha)} ${hhmm(inicio)}–${hhmm(fin)}`;
}

function vecesTexto(numero) {
  return numero === 1 ? '1 vez' : `${numero} veces`;
}

function clubDe(actividad) {
  return catalogo.clubesPorId.get(actividad.clubId) || null;
}

function puedeGestionar(actividad) {
  if (!rolGestiona()) {
    return false;
  }
  if (rolActual() === 'RESP_INSTITUCIONAL') {
    return actividad.institucionId === sesion.usuario.institucionId;
  }
  return true;
}

function clubAdmiteProgramar(actividad) {
  const club = clubDe(actividad);
  return !club || CLUB_PROGRAMABLE.includes(club.estado);
}

function clubActivo(actividad) {
  const club = clubDe(actividad);
  return !club || club.estado === 'ACTIVO';
}

function puedeEliminar(actividad) {
  return actividad.estado === 'PLANIFICADA' && actividad.fecha >= hoy() && actividad.reprogramaciones === 0;
}

function motivoNoEliminable(actividad) {
  if (actividad.estado !== 'PLANIFICADA') {
    return null;
  }
  if (actividad.fecha < hoy()) {
    return 'Esta actividad ya pasó y forma parte del seguimiento del club: no se elimina. Si no se realizó, cancélela indicando el motivo.';
  }
  if (actividad.reprogramaciones > 0) {
    return 'Esta actividad fue reprogramada y su historial forma parte del seguimiento del club: no se elimina. Si ya no se realizará, cancélela indicando el motivo.';
  }
  return null;
}

async function iniciar() {
  montarLayout(sesion, 'actividades');

  elemento('boton-nueva').hidden = !rolGestiona();
  elemento('grupo-filtro-institucion').hidden = !esGlobal();

  modalActividad = bootstrap.Modal.getOrCreateInstance(elemento('modal-actividad'));
  modalEjecucion = bootstrap.Modal.getOrCreateInstance(elemento('modal-ejecucion'));
  modalCancelacion = bootstrap.Modal.getOrCreateInstance(elemento('modal-cancelacion'));
  modalDetalle = bootstrap.Modal.getOrCreateInstance(elemento('modal-detalle'));

  elemento('boton-nueva').addEventListener('click', () => abrirFormulario('crear', null));

  elemento('formulario-filtros').addEventListener('submit', evento => {
    evento.preventDefault();
    const problema = validarRangoFiltros();
    if (problema) {
      mostrarAlerta(elemento('alertas'), 'danger', problema);
      return;
    }
    limpiarAlerta(elemento('alertas'));
    pantalla.filtros = leerFiltros();
    cargarLista(0);
  });
  elemento('formulario-filtros').addEventListener('reset', () => {
    setTimeout(() => {
      llenarFiltroClubes();
      cargarFiltroCursos();
      pantalla.filtros = {};
      cargarLista(0);
    }, 0);
  });
  elemento('filtro-institucion').addEventListener('change', () => {
    llenarFiltroClubes();
    cargarFiltroCursos();
  });
  elemento('filtro-club').addEventListener('change', cargarFiltroCursos);

  elemento('formulario-actividad').addEventListener('submit', guardarActividad);
  elemento('campo-club').addEventListener('change', () => {
    if (pantalla.modo === 'crear') {
      limpiarAlerta(elemento('alertas-modal'));
      prepararDependenciasDelClub(null);
    }
  });
  ['campo-fecha', 'campo-horaInicio', 'campo-horaFin'].forEach(id => {
    elemento(id).addEventListener('input', evaluarReprogramacion);
    elemento(id).addEventListener('change', evaluarReprogramacion);
  });
  elemento('campo-motivoReprogramacion').addEventListener('input', () => {
    actualizarContador('campo-motivoReprogramacion', 'contador-motivoReprogramacion', 500);
  });

  elemento('formulario-ejecucion').addEventListener('submit', guardarEjecucion);
  elemento('ejecucion-resumen').addEventListener('input', () => {
    actualizarContador('ejecucion-resumen', 'contador-ejecucion-resumen', 4000);
  });

  elemento('formulario-cancelacion').addEventListener('submit', confirmarCancelacion);
  elemento('cancelacion-motivo').addEventListener('input', () => {
    actualizarContador('cancelacion-motivo', 'contador-cancelacion-motivo', 500);
  });

  await cargarCatalogos();
  aplicarParametrosIniciales();
  await Promise.all([cargarLista(0), cargarIndicadores()]);

  const parametros = new URLSearchParams(window.location.search);
  const idInicial = Number(parametros.get('id'));
  if (Number.isInteger(idInicial) && idInicial > 0) {
    abrirDetalle({ id: idInicial });
  }
}

function actualizarContador(idCampo, idContador, maximo) {
  elemento(idContador).textContent = `${elemento(idCampo).value.length} / ${maximo}`;
}

function llenarSelect(selector, elementos, textoVacio, obtenerValor, obtenerTexto) {
  const opciones = [crearElemento('option', { texto: textoVacio, atributos: { value: '' } })];
  elementos.forEach(item => {
    opciones.push(crearElemento('option', {
      texto: obtenerTexto(item),
      atributos: { value: obtenerValor(item) }
    }));
  });
  selector.replaceChildren(...opciones);
}

function textoClub(club) {
  const base = esGlobal() || rolActual() === 'ADMIN' ? `${club.nombre} — ${club.institucionNombre}` : club.nombre;
  return club.estado === 'ACTIVO' ? base : `${base} (${ESTADOS_CLUB[club.estado] || club.estado})`;
}

async function cargarCatalogos() {
  const tareas = [cargarClubes(), cargarContenidos()];
  if (esGlobal()) {
    tareas.push(cargarInstituciones());
  }
  try {
    const [clubes, contenidos, instituciones] = await Promise.all(tareas);
    catalogo.clubes = clubes.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    catalogo.clubesPorId = new Map(catalogo.clubes.map(club => [club.id, club]));
    catalogo.contenidos = contenidos;
    if (instituciones) {
      catalogo.instituciones = instituciones;
      llenarSelect(elemento('filtro-institucion'), instituciones, 'Todas', item => String(item.id), item => item.nombre);
    }
    llenarFiltroClubes();
  } catch (error) {
    mostrarAlerta(
      elemento('alertas'),
      'danger',
      `No se pudieron cargar los catálogos de clubes y contenidos. ${mensajeDe(error)}`
    );
  }
}

function llenarFiltroClubes() {
  const institucionId = Number(elemento('filtro-institucion').value) || null;
  const clubes = catalogo.clubes.filter(club => !institucionId || club.institucionId === institucionId);
  const anterior = elemento('filtro-club').value;
  llenarSelect(elemento('filtro-club'), clubes, 'Todos', club => String(club.id), textoClub);
  if (clubes.some(club => String(club.id) === anterior)) {
    elemento('filtro-club').value = anterior;
  }
}

async function cargarFiltroCursos() {
  const selector = elemento('filtro-curso');
  const clubId = elemento('filtro-club').value;
  const solicitud = ++pantalla.solicitudFiltroCursos;
  const anterior = selector.value;
  selector.replaceChildren(crearElemento('option', { texto: 'Todos', atributos: { value: '' } }));
  selector.disabled = true;
  if (!clubId) {
    return;
  }
  try {
    const cursos = await cargarCursosDelClub(clubId);
    if (solicitud !== pantalla.solicitudFiltroCursos) {
      return;
    }
    cursos.forEach(curso => selector.appendChild(crearElemento('option', {
      texto: curso.nombre,
      atributos: { value: String(curso.id) }
    })));
    if (cursos.some(curso => String(curso.id) === anterior)) {
      selector.value = anterior;
    }
    selector.disabled = cursos.length === 0;
  } catch (error) {
    selector.disabled = true;
  }
}

function aplicarParametrosIniciales() {
  const parametros = new URLSearchParams(window.location.search);
  const clubId = parametros.get('clubId');
  if (clubId && catalogo.clubesPorId.has(Number(clubId))) {
    elemento('filtro-club').value = clubId;
    cargarFiltroCursos();
  }
  const estado = parametros.get('estado');
  if (estado && ESTADOS[estado]) {
    elemento('filtro-estado').value = estado;
  }
  if (parametros.get('pendientes') === '1') {
    elemento('filtro-pendientes').checked = true;
  }
  pantalla.filtros = leerFiltros();
}

function validarRangoFiltros() {
  const desde = elemento('filtro-desde').value;
  const hasta = elemento('filtro-hasta').value;
  if (desde && hasta && hasta < desde) {
    return 'La fecha «hasta» no puede ser anterior a «desde».';
  }
  return null;
}

function leerFiltros() {
  return {
    q: elemento('filtro-q').value.trim(),
    institucionId: esGlobal() ? elemento('filtro-institucion').value : '',
    clubId: elemento('filtro-club').value,
    cursoId: elemento('filtro-curso').value,
    estado: elemento('filtro-estado').value,
    desde: elemento('filtro-desde').value,
    hasta: elemento('filtro-hasta').value,
    pendientes: elemento('filtro-pendientes').checked ? 'true' : '',
    ascendente: elemento('filtro-orden').value === 'true' ? 'true' : ''
  };
}

function tarjetaIndicador(valor, texto, detalle, alPulsar, clase) {
  const boton = crearElemento('button', {
    clase: `card card-body shadow-sm text-start w-100 h-100 border-0 ${clase}`,
    atributos: { type: 'button' }
  }, [
    crearElemento('div', { clase: 'indicador-valor', texto: String(valor) }),
    crearElemento('div', { clase: 'fw-semibold', texto }),
    crearElemento('div', { clase: 'small text-body-secondary', texto: detalle })
  ]);
  boton.addEventListener('click', alPulsar);
  return crearElemento('div', { clase: 'col-sm-6 col-xl-4' }, [boton]);
}

async function cargarIndicadores() {
  const contenedor = elemento('indicadores');
  const fechaHoy = hoy();
  const enUnaSemana = sumarDias(fechaHoy, 7);
  try {
    const [pendientes, proximas] = await Promise.all([
      apiFetch(`/api/actividades${construirConsulta({ pendientes: 'true', tamano: 1 })}`),
      apiFetch(`/api/actividades${construirConsulta({
        estado: 'PLANIFICADA',
        desde: fechaHoy,
        hasta: enUnaSemana,
        tamano: 1
      })}`)
    ]);
    contenedor.replaceChildren(
      tarjetaIndicador(
        pendientes.totalElementos,
        'Sesiones sin ejecución registrada',
        'Planificadas con fecha de hoy o anterior. Regístrelas o cancélelas.',
        () => aplicarFiltroRapido({ pendientes: true }),
        pendientes.totalElementos > 0 ? 'tarjeta-alerta' : ''
      ),
      tarjetaIndicador(
        proximas.totalElementos,
        'Sesiones de los próximos 7 días',
        `Planificadas del ${formatearFecha(fechaHoy)} al ${formatearFecha(enUnaSemana)}.`,
        () => aplicarFiltroRapido({ estado: 'PLANIFICADA', desde: fechaHoy, hasta: enUnaSemana, ascendente: true }),
        ''
      )
    );
  } catch (error) {
    contenedor.replaceChildren();
  }
}

function aplicarFiltroRapido({ pendientes = false, estado = '', desde = '', hasta = '', ascendente = false }) {
  elemento('formulario-filtros').reset();
  setTimeout(() => {
    elemento('filtro-pendientes').checked = pendientes;
    elemento('filtro-estado').value = estado;
    elemento('filtro-desde').value = desde;
    elemento('filtro-hasta').value = hasta;
    elemento('filtro-orden').value = ascendente ? 'true' : 'false';
    pantalla.filtros = leerFiltros();
    cargarLista(0);
  }, 0);
}

function filaMensaje(texto) {
  const celda = crearElemento('td', {
    clase: 'text-center text-body-secondary py-4',
    texto,
    atributos: { colspan: '6' }
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
  cuerpo.replaceChildren(filaMensaje('Cargando actividades...'));
  try {
    const ruta = `/api/actividades${construirConsulta({ ...pantalla.filtros, pagina, tamano: TAMANO_PAGINA })}`;
    const respuesta = await apiFetch(ruta);
    pantalla.pagina = respuesta.pagina;
    if (respuesta.contenido.length === 0) {
      cuerpo.replaceChildren(filaMensaje('No se encontraron actividades con los filtros indicados.'));
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

function insigniaEstado(actividad) {
  const estado = ESTADOS[actividad.estado] || { etiqueta: actividad.estado, clase: 'text-bg-light' };
  const partes = [crearElemento('span', { clase: `badge ${estado.clase}`, texto: estado.etiqueta })];
  if (actividad.pendienteDeRegistro) {
    partes.push(crearElemento('span', {
      clase: 'badge text-bg-warning ms-1',
      texto: 'Sin registro',
      atributos: { title: 'La fecha ya llegó y la ejecución no está registrada' }
    }));
  }
  return partes;
}

function celdaFecha(actividad) {
  const partes = [
    crearElemento('div', { clase: 'fw-semibold text-nowrap', texto: formatearFecha(actividad.fecha) }),
    crearElemento('div', {
      clase: 'small text-nowrap',
      texto: `${hhmm(actividad.horaInicio)}–${hhmm(actividad.horaFin)} · ${textoDuracion(actividad.duracionMinutos)}`
    })
  ];
  if (actividad.reprogramaciones > 0) {
    partes.push(crearElemento('div', {
      clase: 'small text-warning-emphasis',
      texto: `Reprogramada ${vecesTexto(actividad.reprogramaciones)} · original ${formatearFecha(actividad.fechaOriginal)}`
    }));
  }
  return partes;
}

function celdaTema(actividad) {
  const partes = [crearElemento('div', { clase: 'fw-semibold', texto: actividad.tema })];
  partes.push(crearElemento('div', {
    clase: 'small text-body-secondary',
    texto: actividad.cursoNombre ? `Curso: ${actividad.cursoNombre}` : 'Sesión general del club'
  }));
  return partes;
}

function celdaClub(actividad) {
  const partes = [crearElemento('div', { texto: actividad.clubNombre || '—' })];
  if (esGlobal() || rolActual() === 'ADMIN') {
    partes.push(crearElemento('div', { clase: 'small text-body-secondary', texto: actividad.institucionNombre || '—' }));
  }
  return partes;
}

function crearFila(actividad) {
  return crearElemento('tr', {}, [
    crearElemento('td', {}, celdaFecha(actividad)),
    crearElemento('td', {}, celdaTema(actividad)),
    crearElemento('td', {}, celdaClub(actividad)),
    crearElemento('td', { texto: actividad.responsableNombre || '—' }),
    crearElemento('td', {}, insigniaEstado(actividad)),
    crearElemento('td', { clase: 'text-end text-nowrap' }, crearAcciones(actividad))
  ]);
}

function crearBoton(icono, etiqueta, actividad, accion, clase = 'btn-outline-secondary') {
  const marca = crearElemento('i', { clase: `bi ${icono}`, atributos: { 'aria-hidden': 'true' } });
  const boton = crearElemento('button', {
    clase: `btn btn-sm ${clase} ms-1`,
    atributos: {
      type: 'button',
      title: etiqueta,
      'aria-label': `${etiqueta}: ${actividad.tema}`
    }
  }, [marca]);
  boton.addEventListener('click', accion);
  return boton;
}

function crearEnlaceAsistencia(actividad) {
  const marca = crearElemento('i', { clase: 'bi bi-clipboard-check', atributos: { 'aria-hidden': 'true' } });
  return crearElemento('a', {
    clase: 'btn btn-sm btn-outline-primary ms-1',
    atributos: {
      href: `asistencia.html?actividadId=${actividad.id}`,
      title: 'Asistencia de la sesión',
      'aria-label': `Asistencia de la sesión: ${actividad.tema}`
    }
  }, [marca]);
}

function crearEnlaceEvidencias(actividad) {
  const marca = crearElemento('i', { clase: 'bi bi-images', atributos: { 'aria-hidden': 'true' } });
  return crearElemento('a', {
    clase: 'btn btn-sm btn-outline-primary ms-1',
    atributos: {
      href: `evidencias.html?actividadId=${actividad.id}`,
      title: 'Evidencias de la sesión',
      'aria-label': `Evidencias de la sesión: ${actividad.tema}`
    }
  }, [marca]);
}

function crearAcciones(actividad) {
  const acciones = [crearBoton('bi-eye', 'Ver detalle', actividad, () => abrirDetalle(actividad))];
  const gestiona = puedeGestionar(actividad);
  if (actividad.estado === 'PLANIFICADA' && gestiona) {
    if (clubAdmiteProgramar(actividad)) {
      acciones.push(crearBoton('bi-pencil', 'Editar o reprogramar', actividad, () => abrirFormulario('editar', actividad)));
    }
    if (actividad.fecha <= hoy() && clubActivo(actividad)) {
      acciones.push(crearBoton('bi-check2-square', 'Registrar ejecución', actividad,
        () => abrirEjecucion(actividad), 'btn-outline-success'));
    }
    acciones.push(crearBoton('bi-x-circle', 'Cancelar actividad', actividad,
      () => abrirCancelacion(actividad), 'btn-outline-danger'));
    if (puedeEliminar(actividad)) {
      acciones.push(crearBoton('bi-trash', 'Eliminar', actividad, () => eliminarActividad(actividad), 'btn-outline-danger'));
    }
  }
  if (actividad.estado === 'EJECUTADA') {
    if (gestiona) {
      acciones.push(crearBoton('bi-pencil-square', 'Corregir ejecución', actividad, () => abrirEjecucion(actividad)));
    }
    acciones.push(crearEnlaceAsistencia(actividad));
    acciones.push(crearEnlaceEvidencias(actividad));
  }
  return acciones;
}

function crearListaContenidos(contenedor, prefijo, seleccionados) {
  const marcados = new Set(seleccionados);
  const grupos = [];
  TIPOS_CONTENIDO.forEach(tipo => {
    const disponibles = catalogo.contenidos
      .filter(contenido => contenido.tipo === tipo.codigo && (contenido.activo || marcados.has(contenido.id)))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    if (disponibles.length === 0) {
      return;
    }
    const opciones = disponibles.map(contenido => {
      const id = `${prefijo}-${contenido.id}`;
      const casilla = crearElemento('input', {
        clase: 'form-check-input',
        atributos: { type: 'checkbox', id, value: String(contenido.id) }
      });
      casilla.checked = marcados.has(contenido.id);
      const texto = contenido.activo ? contenido.nombre : `${contenido.nombre} (inactivo)`;
      const etiqueta = crearElemento('label', { clase: 'form-check-label', texto, atributos: { for: id } });
      if (contenido.descripcion) {
        etiqueta.title = contenido.descripcion;
      }
      return crearElemento('div', { clase: 'form-check form-check-inline me-3' }, [casilla, etiqueta]);
    });
    grupos.push(crearElemento('div', { clase: 'mb-2' }, [
      crearElemento('div', { clase: 'small fw-semibold text-body-secondary mb-1', texto: tipo.etiqueta }),
      crearElemento('div', {}, opciones)
    ]));
  });
  if (grupos.length === 0) {
    grupos.push(crearElemento('p', {
      clase: 'small text-body-secondary mb-0',
      texto: 'El catálogo de contenidos no tiene elementos activos.'
    }));
  }
  contenedor.replaceChildren(...grupos);
}

function contenidosMarcados(contenedor) {
  return Array.from(contenedor.querySelectorAll('input[type="checkbox"]:checked')).map(casilla => Number(casilla.value));
}

function opcionUnica(selector, texto, valor) {
  selector.replaceChildren(crearElemento('option', { texto, atributos: { value: valor } }));
  selector.value = valor;
}

function abrirFormulario(modo, actividad) {
  pantalla.modo = modo;
  pantalla.actividad = actividad;
  const esCrear = modo === 'crear';

  limpiarAlerta(elemento('alertas-modal'));
  elemento('titulo-modal-actividad').textContent = esCrear ? 'Nueva actividad' : 'Editar o reprogramar actividad';

  const selectorClub = elemento('campo-club');
  if (esCrear) {
    const programables = catalogo.clubes.filter(club => CLUB_PROGRAMABLE.includes(club.estado));
    llenarSelect(selectorClub, programables, 'Seleccione un club', club => String(club.id), textoClub);
    const filtrado = elemento('filtro-club').value;
    if (programables.some(club => String(club.id) === filtrado)) {
      selectorClub.value = filtrado;
    } else if (programables.length === 1) {
      selectorClub.value = String(programables[0].id);
    }
    selectorClub.disabled = false;
    if (programables.length === 0) {
      mostrarAlerta(
        elemento('alertas-modal'),
        'info',
        'No tiene clubes planificados o activos en los que pueda programar actividades.'
      );
    }
  } else {
    opcionUnica(selectorClub, actividad.clubNombre || 'Club', String(actividad.clubId));
    selectorClub.disabled = true;
  }

  elemento('campo-fecha').value = actividad ? actividad.fecha : '';
  elemento('campo-horaInicio').value = actividad ? hhmm(actividad.horaInicio) : '';
  elemento('campo-horaFin').value = actividad ? hhmm(actividad.horaFin) : '';
  elemento('campo-tema').value = actividad ? actividad.tema : '';
  elemento('campo-objetivo').value = actividad ? actividad.objetivo : '';
  elemento('campo-descripcion').value = actividad && actividad.descripcion ? actividad.descripcion : '';
  elemento('campo-lugar').value = actividad && actividad.lugar ? actividad.lugar : '';
  elemento('campo-motivoReprogramacion').value = '';
  actualizarContador('campo-motivoReprogramacion', 'contador-motivoReprogramacion', 500);
  elemento('ayuda-lugar').hidden = !esCrear;

  crearListaContenidos(
    elemento('contenidos-actividad'),
    'contenido-planificado',
    actividad ? actividad.contenidos.map(contenido => contenido.id) : []
  );

  elemento('boton-guardar').disabled = false;
  evaluarReprogramacion();
  modalActividad.show();
  prepararDependenciasDelClub(actividad);
}

async function prepararDependenciasDelClub(actividad) {
  const selectorCurso = elemento('campo-curso');
  const selectorResponsable = elemento('campo-responsable');
  const clubId = actividad ? actividad.clubId : Number(elemento('campo-club').value) || null;
  const club = clubId ? catalogo.clubesPorId.get(clubId) : null;
  const solicitud = ++pantalla.solicitudFormulario;

  selectorCurso.replaceChildren(crearElemento('option', { texto: 'Sesión general del club', atributos: { value: '' } }));
  selectorCurso.disabled = true;
  selectorResponsable.replaceChildren(crearElemento('option', {
    texto: club && club.docenteNombre ? `Docente del club (${club.docenteNombre})` : 'Docente del club',
    atributos: { value: '' }
  }));
  selectorResponsable.disabled = true;
  elemento('campo-lugar').placeholder = club && club.lugar ? club.lugar : '';

  if (!actividad && club) {
    if (!elemento('campo-horaInicio').value && club.horaInicio) {
      elemento('campo-horaInicio').value = hhmm(club.horaInicio);
    }
    if (!elemento('campo-horaFin').value && club.horaFin) {
      elemento('campo-horaFin').value = hhmm(club.horaFin);
    }
  }
  if (!clubId) {
    return;
  }

  const institucionId = actividad ? actividad.institucionId : club ? club.institucionId : null;
  const [cursos, docentes] = await Promise.all([
    cargarCursosDelClub(clubId).catch(() => null),
    institucionId ? cargarDocentesActivos(institucionId).catch(() => null) : Promise.resolve(null)
  ]);
  if (solicitud !== pantalla.solicitudFormulario) {
    return;
  }

  const avisos = [];
  if (cursos === null) {
    avisos.push('No se pudieron cargar los cursos del club.');
  } else {
    cursos
      .filter(curso => CURSO_ABIERTO.includes(curso.estado) || (actividad && curso.id === actividad.cursoId))
      .forEach(curso => {
        const rango = curso.fechaInicio && curso.fechaFin
          ? ` (${formatearFecha(curso.fechaInicio)} a ${formatearFecha(curso.fechaFin)})`
          : '';
        selectorCurso.appendChild(crearElemento('option', {
          texto: `${curso.nombre}${rango}`,
          atributos: { value: String(curso.id) }
        }));
      });
  }
  if (actividad && actividad.cursoId && !selectorCurso.querySelector(`option[value="${actividad.cursoId}"]`)) {
    selectorCurso.appendChild(crearElemento('option', {
      texto: actividad.cursoNombre || 'Curso actual',
      atributos: { value: String(actividad.cursoId) }
    }));
  }
  selectorCurso.value = actividad && actividad.cursoId ? String(actividad.cursoId) : '';
  selectorCurso.disabled = selectorCurso.options.length <= 1;

  const lista = docentes || [];
  lista.forEach(docente => {
    selectorResponsable.appendChild(crearElemento('option', {
      texto: `${docente.apellidos} ${docente.nombres}`,
      atributos: { value: String(docente.id) }
    }));
  });
  if (actividad && actividad.responsableId
      && !selectorResponsable.querySelector(`option[value="${actividad.responsableId}"]`)) {
    selectorResponsable.appendChild(crearElemento('option', {
      texto: actividad.responsableNombre || 'Responsable actual',
      atributos: { value: String(actividad.responsableId) }
    }));
  }
  selectorResponsable.value = actividad && actividad.responsableId ? String(actividad.responsableId) : '';
  selectorResponsable.disabled = selectorResponsable.options.length <= 1;
  if (docentes === null) {
    avisos.push('No se pudieron cargar los docentes; la sesión quedará a cargo del docente del club.');
  }
  if (avisos.length > 0) {
    mostrarAlerta(elemento('alertas-modal'), 'warning', avisos.join(' '));
  }
}

function esReprogramacion() {
  const actividad = pantalla.actividad;
  if (pantalla.modo !== 'editar' || !actividad) {
    return false;
  }
  const fecha = elemento('campo-fecha').value;
  const inicio = elemento('campo-horaInicio').value;
  const fin = elemento('campo-horaFin').value;
  if (!fecha || !inicio || !fin) {
    return false;
  }
  return fecha !== actividad.fecha || inicio !== hhmm(actividad.horaInicio) || fin !== hhmm(actividad.horaFin);
}

function evaluarReprogramacion() {
  const grupo = elemento('grupo-reprogramacion');
  const minutos = minutosEntre(elemento('campo-horaInicio').value, elemento('campo-horaFin').value);
  const ayuda = elemento('ayuda-duracion');
  if (minutos === null) {
    ayuda.textContent = 'Una sesión dura como máximo 8 horas.';
  } else if (minutos <= 0) {
    ayuda.textContent = 'La hora de fin debe ser posterior a la hora de inicio.';
  } else {
    ayuda.textContent = `Duración: ${textoDuracion(minutos)}. Una sesión dura como máximo 8 horas.`;
  }

  if (!esReprogramacion()) {
    grupo.hidden = true;
    return;
  }
  const actividad = pantalla.actividad;
  const antes = textoHorario(actividad.fecha, actividad.horaInicio, actividad.horaFin);
  const despues = textoHorario(
    elemento('campo-fecha').value,
    elemento('campo-horaInicio').value,
    elemento('campo-horaFin').value
  );
  let texto = `Pasa del ${antes} al ${despues}.`;
  if (actividad.reprogramaciones > 0) {
    texto += ` Ya se reprogramó ${vecesTexto(actividad.reprogramaciones)}; la fecha original era el ${formatearFecha(actividad.fechaOriginal)}.`;
  }
  elemento('texto-reprogramacion').textContent = texto;
  grupo.hidden = false;
}

function leerCampo(nombre) {
  const valor = elemento(`campo-${nombre}`).value.trim();
  return valor === '' ? null : valor;
}

function validarFormulario() {
  const problemas = [];
  if (pantalla.modo === 'crear' && !elemento('campo-club').value) {
    problemas.push('Seleccione el club de la actividad.');
  }
  if (!elemento('campo-fecha').value) {
    problemas.push('La fecha es obligatoria.');
  }
  const inicio = elemento('campo-horaInicio').value;
  const fin = elemento('campo-horaFin').value;
  if (!inicio || !fin) {
    problemas.push('Indique la hora de inicio y la hora de fin.');
  } else {
    const minutos = minutosEntre(inicio, fin);
    if (minutos <= 0) {
      problemas.push('La hora de fin debe ser posterior a la hora de inicio.');
    } else if (minutos > MAXIMO_MINUTOS) {
      problemas.push('Una actividad puede durar como máximo 8 horas.');
    }
  }
  if (!leerCampo('tema')) {
    problemas.push('El tema es obligatorio.');
  }
  if (!leerCampo('objetivo')) {
    problemas.push('El objetivo de la sesión es obligatorio.');
  }
  if (contenidosMarcados(elemento('contenidos-actividad')).length > MAXIMO_CONTENIDOS) {
    problemas.push(`Marque como máximo ${MAXIMO_CONTENIDOS} contenidos.`);
  }
  if (esReprogramacion() && !leerCampo('motivoReprogramacion')) {
    problemas.push('Indique el motivo de la reprogramación.');
  }
  return problemas;
}

function construirCuerpo() {
  const curso = elemento('campo-curso').value;
  const responsable = elemento('campo-responsable').value;
  const cuerpo = {
    cursoId: curso ? Number(curso) : null,
    responsableId: responsable ? Number(responsable) : null,
    fecha: elemento('campo-fecha').value,
    horaInicio: elemento('campo-horaInicio').value,
    horaFin: elemento('campo-horaFin').value,
    tema: leerCampo('tema'),
    objetivo: leerCampo('objetivo'),
    descripcion: leerCampo('descripcion'),
    lugar: leerCampo('lugar'),
    contenidoIds: contenidosMarcados(elemento('contenidos-actividad'))
  };
  if (pantalla.modo === 'crear') {
    cuerpo.clubId = Number(elemento('campo-club').value);
  } else if (esReprogramacion()) {
    cuerpo.motivoReprogramacion = leerCampo('motivoReprogramacion');
  }
  return cuerpo;
}

async function guardarActividad(evento) {
  evento.preventDefault();
  const alertas = elemento('alertas-modal');
  limpiarAlerta(alertas);

  const problemas = validarFormulario();
  if (problemas.length > 0) {
    mostrarAlerta(alertas, 'danger', 'Revise los datos ingresados:', problemas);
    return;
  }

  const esCrear = pantalla.modo === 'crear';
  const reprograma = esReprogramacion();
  const ruta = esCrear ? '/api/actividades' : `/api/actividades/${pantalla.actividad.id}`;
  const boton = elemento('boton-guardar');
  establecerCargando(boton, true, 'Guardando...');
  try {
    const guardada = await apiFetch(ruta, { metodo: esCrear ? 'POST' : 'PUT', cuerpo: construirCuerpo() });
    modalActividad.hide();
    let mensaje = `Actividad «${guardada.tema}» programada para el ${textoHorario(guardada.fecha, guardada.horaInicio, guardada.horaFin)}.`;
    if (!esCrear) {
      mensaje = reprograma
        ? `Actividad «${guardada.tema}» reprogramada al ${textoHorario(guardada.fecha, guardada.horaInicio, guardada.horaFin)}. El cambio quedó en su historial.`
        : `Actividad «${guardada.tema}» actualizada correctamente.`;
    }
    mostrarAlerta(elemento('alertas'), 'success', mensaje);
    await Promise.all([cargarLista(esCrear ? 0 : pantalla.pagina), cargarIndicadores()]);
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

function abrirEjecucion(actividad) {
  pantalla.actividad = actividad;
  const corrige = actividad.estado === 'EJECUTADA';
  limpiarAlerta(elemento('alertas-ejecucion'));
  elemento('titulo-modal-ejecucion').textContent = corrige ? 'Corregir datos de la ejecución' : 'Registrar ejecución';
  elemento('ejecucion-tema').textContent = actividad.tema;
  elemento('ejecucion-datos').textContent =
    `${actividad.clubNombre} · ${textoHorario(actividad.fecha, actividad.horaInicio, actividad.horaFin)}`
    + (actividad.cursoNombre ? ` · Curso: ${actividad.cursoNombre}` : '');
  elemento('aviso-ejecucion').hidden = !corrige;
  elemento('ejecucion-resumen').value = actividad.resumenEjecucion || '';
  elemento('ejecucion-observaciones').value = actividad.observaciones || '';
  actualizarContador('ejecucion-resumen', 'contador-ejecucion-resumen', 4000);
  crearListaContenidos(
    elemento('contenidos-ejecucion'),
    'contenido-ejecutado',
    actividad.contenidos.map(contenido => contenido.id)
  );
  const boton = elemento('boton-guardar-ejecucion');
  boton.textContent = corrige ? 'Guardar corrección' : 'Registrar ejecución';
  boton.disabled = false;
  modalEjecucion.show();
}

async function guardarEjecucion(evento) {
  evento.preventDefault();
  const alertas = elemento('alertas-ejecucion');
  limpiarAlerta(alertas);
  const actividad = pantalla.actividad;
  const primera = actividad.estado === 'PLANIFICADA';

  const resumenTexto = elemento('ejecucion-resumen').value.trim();
  const observaciones = elemento('ejecucion-observaciones').value.trim();
  const contenidos = contenidosMarcados(elemento('contenidos-ejecucion'));
  const problemas = [];
  if (!resumenTexto) {
    problemas.push('Describa los contenidos impartidos en la sesión.');
  }
  if (contenidos.length === 0) {
    problemas.push('Marque al menos una herramienta, lenguaje, componente o competencia trabajada.');
  } else if (contenidos.length > MAXIMO_CONTENIDOS) {
    problemas.push(`Marque como máximo ${MAXIMO_CONTENIDOS} contenidos.`);
  }
  if (problemas.length > 0) {
    mostrarAlerta(alertas, 'danger', 'Revise los datos ingresados:', problemas);
    return;
  }

  const boton = elemento('boton-guardar-ejecucion');
  establecerCargando(boton, true, 'Guardando...');
  try {
    const guardada = await apiFetch(`/api/actividades/${actividad.id}/ejecucion`, {
      metodo: 'PUT',
      cuerpo: { resumen: resumenTexto, observaciones: observaciones || null, contenidoIds: contenidos }
    });
    modalEjecucion.hide();
    if (primera) {
      mostrarAlertaConEnlace(
        elemento('alertas'),
        'success',
        `La sesión «${guardada.tema}» quedó registrada como ejecutada.`,
        'Tomar la asistencia ahora',
        `asistencia.html?actividadId=${guardada.id}`
      );
    } else {
      mostrarAlerta(elemento('alertas'), 'success', `Se corrigieron los datos de la ejecución de «${guardada.tema}».`);
    }
    await Promise.all([cargarLista(pantalla.pagina), cargarIndicadores()]);
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

function abrirCancelacion(actividad) {
  pantalla.actividad = actividad;
  limpiarAlerta(elemento('alertas-cancelacion'));
  elemento('cancelacion-tema').textContent = actividad.tema;
  elemento('cancelacion-datos').textContent =
    `${actividad.clubNombre} · ${textoHorario(actividad.fecha, actividad.horaInicio, actividad.horaFin)}`;
  elemento('cancelacion-motivo').value = '';
  actualizarContador('cancelacion-motivo', 'contador-cancelacion-motivo', 500);
  elemento('boton-confirmar-cancelacion').disabled = false;
  modalCancelacion.show();
}

async function confirmarCancelacion(evento) {
  evento.preventDefault();
  const alertas = elemento('alertas-cancelacion');
  limpiarAlerta(alertas);
  const actividad = pantalla.actividad;
  const motivo = elemento('cancelacion-motivo').value.trim();
  if (!motivo) {
    mostrarAlerta(alertas, 'danger', 'Debe indicar el motivo de la cancelación.');
    return;
  }
  const boton = elemento('boton-confirmar-cancelacion');
  establecerCargando(boton, true, 'Cancelando...');
  try {
    await apiFetch(`/api/actividades/${actividad.id}/cancelacion`, { metodo: 'PATCH', cuerpo: { motivo } });
    modalCancelacion.hide();
    mostrarAlerta(elemento('alertas'), 'success', `La actividad «${actividad.tema}» quedó cancelada.`);
    await Promise.all([cargarLista(pantalla.pagina), cargarIndicadores()]);
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

async function eliminarActividad(actividad) {
  const aceptado = await confirmar({
    titulo: 'Eliminar actividad',
    mensaje: `Se eliminará la actividad «${actividad.tema}» del ${textoHorario(actividad.fecha, actividad.horaInicio, actividad.horaFin)}. Solo se eliminan sesiones futuras que nunca se reprogramaron; esta acción no se puede deshacer.`,
    textoAceptar: 'Eliminar'
  });
  if (!aceptado) {
    return;
  }
  try {
    await apiFetch(`/api/actividades/${actividad.id}`, { metodo: 'DELETE' });
    mostrarAlerta(elemento('alertas'), 'success', `La actividad «${actividad.tema}» fue eliminada.`);
    await Promise.all([cargarLista(pantalla.pagina), cargarIndicadores()]);
  } catch (error) {
    mostrarAlerta(elemento('alertas'), 'danger', mensajeDe(error));
    await cargarLista(pantalla.pagina);
  }
}

function filaDato(termino, valor, preformateado = false) {
  return [
    crearElemento('dt', { clase: 'col-sm-4 text-body-secondary', texto: termino }),
    crearElemento('dd', { clase: `col-sm-8${preformateado ? ' texto-preformateado' : ''}`, texto: valor || '—' })
  ];
}

function insigniaContenido(contenido) {
  const tipo = TIPOS_CONTENIDO.find(item => item.codigo === contenido.tipo);
  const texto = contenido.activo ? contenido.nombre : `${contenido.nombre} (inactivo)`;
  return crearElemento('span', {
    clase: `badge ${tipo ? tipo.clase : 'text-bg-light'}`,
    texto,
    atributos: { title: tipo ? tipo.etiqueta : contenido.tipo }
  });
}

function textoDesplazamiento(dias) {
  if (dias === 0) {
    return 'Mismo día';
  }
  const absoluto = Math.abs(dias);
  const unidad = absoluto === 1 ? 'día' : 'días';
  return dias > 0 ? `${absoluto} ${unidad} después` : `${absoluto} ${unidad} antes`;
}

function filaReprogramacion(reprogramacion, indice) {
  return crearElemento('tr', {}, [
    crearElemento('td', { texto: String(indice + 1) }),
    crearElemento('td', {
      clase: 'text-nowrap',
      texto: textoHorario(reprogramacion.fechaAnterior, reprogramacion.horaInicioAnterior, reprogramacion.horaFinAnterior)
    }),
    crearElemento('td', {
      clase: 'text-nowrap',
      texto: textoHorario(reprogramacion.fechaNueva, reprogramacion.horaInicioNueva, reprogramacion.horaFinNueva)
    }),
    crearElemento('td', { clase: 'text-nowrap', texto: textoDesplazamiento(reprogramacion.diasDeDesplazamiento) }),
    crearElemento('td', { clase: 'texto-preformateado', texto: reprogramacion.motivo }),
    crearElemento('td', {}, [
      crearElemento('div', { texto: reprogramacion.registradoPorNombre || '—' }),
      crearElemento('div', { clase: 'text-body-secondary', texto: formatearFechaHora(reprogramacion.fechaRegistro) })
    ])
  ]);
}

async function abrirDetalle(resumenActividad) {
  const solicitud = ++pantalla.solicitudDetalle;
  limpiarAlerta(elemento('alertas-detalle'));
  elemento('detalle-tema').textContent = resumenActividad.tema || 'Cargando...';
  elemento('detalle-estado').replaceChildren();
  elemento('detalle-club').textContent = '';
  elemento('detalle-datos').replaceChildren();
  elemento('detalle-contenidos').replaceChildren();
  elemento('grupo-detalle-ejecucion').hidden = true;
  elemento('grupo-detalle-cancelacion').hidden = true;
  elemento('grupo-detalle-reprogramaciones').hidden = true;
  elemento('detalle-nota-eliminar').hidden = true;
  elemento('enlace-detalle-asistencia').hidden = true;
  elemento('enlace-detalle-evidencias').hidden = true;
  elemento('detalle-registro').textContent = '';
  modalDetalle.show();

  try {
    const actividad = await apiFetch(`/api/actividades/${resumenActividad.id}`);
    if (solicitud !== pantalla.solicitudDetalle) {
      return;
    }
    renderizarDetalle(actividad);
    if (actividad.reprogramaciones > 0) {
      const lista = await apiFetch(`/api/actividades/${actividad.id}/reprogramaciones`);
      if (solicitud !== pantalla.solicitudDetalle) {
        return;
      }
      elemento('detalle-fecha-original').textContent =
        `Programación original: ${textoHorario(actividad.fechaOriginal, actividad.horaInicioOriginal, actividad.horaFinOriginal)}. `
        + 'Este historial es inmutable: no se edita ni se borra.';
      elemento('detalle-reprogramaciones').replaceChildren(...lista.map(filaReprogramacion));
      elemento('grupo-detalle-reprogramaciones').hidden = false;
    }
  } catch (error) {
    if (solicitud === pantalla.solicitudDetalle) {
      elemento('detalle-tema').textContent = 'Actividad no disponible';
      mostrarAlerta(elemento('alertas-detalle'), 'danger', mensajeDe(error));
    }
  }
}

function renderizarDetalle(actividad) {
  elemento('detalle-tema').textContent = actividad.tema;
  elemento('detalle-estado').replaceChildren(...insigniaEstado(actividad));
  elemento('detalle-club').textContent = `${actividad.clubNombre} · ${actividad.institucionNombre}`;

  const datos = [
    ...filaDato('Fecha', formatearFecha(actividad.fecha)),
    ...filaDato('Horario', `${hhmm(actividad.horaInicio)}–${hhmm(actividad.horaFin)} (${textoDuracion(actividad.duracionMinutos)})`),
    ...filaDato('Curso', actividad.cursoNombre || 'Sesión general del club'),
    ...filaDato('Responsable', actividad.responsableNombre),
    ...filaDato('Lugar', actividad.lugar),
    ...filaDato('Objetivo', actividad.objetivo, true),
    ...filaDato('Descripción', actividad.descripcion, true)
  ];
  if (actividad.reprogramaciones > 0) {
    datos.push(...filaDato('Reprogramaciones', `${vecesTexto(actividad.reprogramaciones)} (fecha original ${formatearFecha(actividad.fechaOriginal)})`));
  }
  elemento('detalle-datos').replaceChildren(...datos);

  if (actividad.contenidos.length > 0) {
    elemento('detalle-contenidos').replaceChildren(...actividad.contenidos.map(insigniaContenido));
  } else {
    elemento('detalle-contenidos').replaceChildren(crearElemento('span', {
      clase: 'small text-body-secondary',
      texto: 'Sin contenidos asignados.'
    }));
  }

  if (actividad.estado === 'EJECUTADA') {
    elemento('detalle-resumen').textContent = actividad.resumenEjecucion || '';
    elemento('detalle-observaciones').textContent = actividad.observaciones ? `Observaciones: ${actividad.observaciones}` : '';
    elemento('detalle-observaciones').hidden = !actividad.observaciones;
    elemento('detalle-ejecutada').textContent =
      `Registrada por ${actividad.ejecutadaPorNombre || '—'} el ${formatearFechaHora(actividad.fechaRegistroEjecucion)}`;
    elemento('grupo-detalle-ejecucion').hidden = false;
    const enlace = elemento('enlace-detalle-asistencia');
    enlace.href = `asistencia.html?actividadId=${actividad.id}`;
    enlace.hidden = false;
    const evidencias = elemento('enlace-detalle-evidencias');
    evidencias.href = `evidencias.html?actividadId=${actividad.id}`;
    evidencias.hidden = false;
  }

  if (actividad.estado === 'CANCELADA') {
    elemento('detalle-motivo-cancelacion').textContent = `Motivo: ${actividad.motivoCancelacion || '—'}`;
    elemento('detalle-cancelada').textContent =
      `Cancelada por ${actividad.canceladaPorNombre || '—'} el ${formatearFechaHora(actividad.fechaCancelacion)}`;
    elemento('grupo-detalle-cancelacion').hidden = false;
  }

  const nota = puedeGestionar(actividad) ? motivoNoEliminable(actividad) : null;
  elemento('detalle-nota-eliminar').textContent = nota || '';
  elemento('detalle-nota-eliminar').hidden = !nota;

  let registro = `Creada por ${actividad.creadoPorNombre || '—'} el ${formatearFechaHora(actividad.createdAt)}`;
  if (actividad.actualizadoEn) {
    registro += ` · Última actualización: ${formatearFechaHora(actividad.actualizadoEn)}`;
  }
  elemento('detalle-registro').textContent = registro;
}
