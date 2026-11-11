import { apiFetch, construirConsulta, ApiError } from './api.js';
import {
  cargarClubes,
  cargarInstituciones,
  cargarPeriodos,
  cargarContenidos,
  cargarActividadesDelClub,
  cargarInscripcionesDelClub,
  cargarProyectos
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
const MAXIMO_COMPETENCIAS = 15;
const ROLES_GLOBALES = ['ADMIN', 'COORDINADOR', 'CONSULTA'];
const ROLES_DATOS_MINIMOS = ['COORDINADOR', 'CONSULTA'];
const ROLES_GESTION = ['ADMIN', 'RESP_INSTITUCIONAL', 'DOCENTE'];

const ALCANCES = {
  CLUB: { etiqueta: 'Club', icono: 'bi-people', clase: 'text-bg-primary' },
  ESTUDIANTE: { etiqueta: 'Estudiante', icono: 'bi-person', clase: 'text-bg-info' },
  PROYECTO: { etiqueta: 'Proyecto', icono: 'bi-kanban', clase: 'text-bg-warning' }
};

const NIVELES = {
  INICIAL: { etiqueta: 'Inicial', clase: 'text-bg-secondary', color: 'bg-secondary' },
  EN_PROCESO: { etiqueta: 'En proceso', clase: 'text-bg-warning', color: 'bg-warning' },
  LOGRADO: { etiqueta: 'Logrado', clase: 'text-bg-success', color: 'bg-success' },
  DESTACADO: { etiqueta: 'Destacado', clase: 'text-bg-primary', color: 'bg-primary' }
};

const ESTADOS_PROYECTO = {
  EN_DESARROLLO: { etiqueta: 'En desarrollo', clase: 'text-bg-warning' },
  FINALIZADO: { etiqueta: 'Finalizado', clase: 'text-bg-success' },
  CANCELADO: { etiqueta: 'Cancelado', clase: 'text-bg-secondary' }
};

const AVISOS_PROGRESO = {
  CLUBES_DEL_DOCENTE: 'Como docente, ve los avances registrados en los clubes que coordina, en los proyectos de los que es tutor y en las sesiones de las que es responsable.',
  VISTA_MINIMA: 'Vista de supervisión: el estudiante se identifica solo por su código EST-.'
};

const sesion = exigirSesion();
const pantalla = {
  filtros: { estado: 'ACTIVO' },
  fijos: {},
  pagina: 0,
  avances: new Map(),
  modo: null,
  avance: null,
  inicial: {},
  inscripciones: [],
  actividades: [],
  niveles: new Map(),
  filtrosEstudiantes: {},
  paginaEstudiantes: 0,
  estudiantesVigente: false,
  estudianteId: null,
  resultadosVigente: false,
  solicitudLista: 0,
  solicitudClub: 0,
  solicitudEstudiantes: 0,
  solicitudProgreso: 0,
  solicitudResultados: 0,
  solicitudDetalle: 0
};
const catalogo = {
  clubes: [],
  clubesPorId: new Map(),
  instituciones: [],
  periodos: [],
  periodosPorId: new Map(),
  proyectos: [],
  proyectosPorId: new Map(),
  competencias: []
};
let modalAvance = null;
let modalAnular = null;
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

function puedeGestionarRol() {
  return ROLES_GESTION.includes(rolActual());
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

function mayorFecha(...fechas) {
  return fechas.filter(Boolean).reduce((a, b) => (a >= b ? a : b), '');
}

function menorFecha(...fechas) {
  return fechas.filter(Boolean).reduce((a, b) => (a <= b ? a : b));
}

function plural(cantidad, singular, varios) {
  return `${cantidad} ${rotulo(cantidad, singular, varios)}`;
}

function rotulo(cantidad, singular, varios) {
  return Number(cantidad) === 1 ? singular : varios;
}

function textoPorcentaje(valor) {
  return valor === null || valor === undefined
    ? '—'
    : `${Number(valor).toLocaleString('es-EC', { maximumFractionDigits: 1 })} %`;
}

function textoEstudiante(estudiante) {
  if (!estudiante) {
    return '—';
  }
  if (estudiante.estudianteNombres || estudiante.estudianteApellidos) {
    return `${estudiante.estudianteNombres || ''} ${estudiante.estudianteApellidos || ''}`.trim() + ` (${estudiante.estudianteCodigo})`;
  }
  return estudiante.estudianteCodigo;
}

function insignia(texto, clase, titulo) {
  const atributos = titulo ? { title: titulo } : undefined;
  return crearElemento('span', { clase: `badge ${clase}`, texto, atributos });
}

function insigniaAlcance(alcance) {
  const datos = ALCANCES[alcance] || { etiqueta: alcance, icono: 'bi-question', clase: 'text-bg-light' };
  return crearElemento('span', { clase: `badge ${datos.clase}` }, [
    crearElemento('i', { clase: `bi ${datos.icono} me-1`, atributos: { 'aria-hidden': 'true' } }),
    document.createTextNode(datos.etiqueta)
  ]);
}

function insigniaNivel(nivel) {
  const datos = NIVELES[nivel] || { etiqueta: nivel || '—', clase: 'text-bg-light' };
  return insignia(datos.etiqueta, datos.clase);
}

function textoClub(club) {
  return esGlobal() ? `${club.nombre} — ${club.institucionNombre}` : club.nombre;
}

function llenarSelect(selector, elementos, textoVacio, obtenerValor, obtenerTexto) {
  const opciones = [];
  if (textoVacio !== null) {
    opciones.push(crearElemento('option', { texto: textoVacio, atributos: { value: '' } }));
  }
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

function enlaceIcono(icono, etiqueta, contexto, href) {
  return crearElemento('a', {
    clase: 'btn btn-sm btn-outline-secondary ms-1',
    atributos: { href, title: etiqueta, 'aria-label': `${etiqueta}: ${contexto}` }
  }, [crearElemento('i', { clase: `bi ${icono}`, atributos: { 'aria-hidden': 'true' } })]);
}

function contarCaracteres(campo, contador, maximo) {
  elemento(campo).addEventListener('input', () => {
    elemento(contador).textContent = `${elemento(campo).value.length} / ${maximo}`;
  });
}

function mostrarPestana(id) {
  bootstrap.Tab.getOrCreateInstance(elemento(id)).show();
}

async function iniciar() {
  montarLayout(sesion, 'avances');

  modalAvance = bootstrap.Modal.getOrCreateInstance(elemento('modal-avance'));
  modalAnular = bootstrap.Modal.getOrCreateInstance(elemento('modal-anular'));
  modalDetalle = bootstrap.Modal.getOrCreateInstance(elemento('modal-detalle'));

  elemento('grupo-filtro-institucion').hidden = !esGlobal();
  elemento('grupo-estudiante-institucion').hidden = !esGlobal();
  elemento('grupo-resultados-institucion').hidden = !esGlobal();
  elemento('boton-nuevo').hidden = !puedeGestionarRol();
  if (soloDatosMinimos()) {
    elemento('etiqueta-estudiante-q').textContent = 'Código EST-';
    elemento('columna-nombre').hidden = true;
  }

  elemento('boton-nuevo').addEventListener('click', () => abrirFormulario('crear', null, {}));
  elemento('formulario-filtros').addEventListener('submit', evento => {
    evento.preventDefault();
    const desde = elemento('filtro-desde').value;
    const hasta = elemento('filtro-hasta').value;
    if (desde && hasta && hasta < desde) {
      mostrarAlerta(elemento('alertas-avances'), 'danger', 'La fecha «hasta» no puede ser anterior a «desde».');
      return;
    }
    limpiarAlerta(elemento('alertas-avances'));
    pantalla.filtros = leerFiltros();
    cargarAvances(0);
  });
  elemento('formulario-filtros').addEventListener('reset', () => {
    setTimeout(() => {
      pantalla.fijos = {};
      elemento('aviso-filtro').hidden = true;
      llenarClubesFiltro();
      limpiarAlerta(elemento('alertas-avances'));
      pantalla.filtros = leerFiltros();
      cargarAvances(0);
    }, 0);
  });
  elemento('filtro-institucion').addEventListener('change', llenarClubesFiltro);

  document.querySelectorAll('input[name="alcance"]').forEach(radio => {
    radio.addEventListener('change', () => aplicarAlcance(true));
  });
  elemento('campo-club').addEventListener('change', () => alCambiarClub(null));
  elemento('campo-proyecto').addEventListener('change', actualizarLimitesFecha);
  elemento('campo-actividad').addEventListener('change', alCambiarActividad);
  elemento('campo-fecha').addEventListener('change', () => {
    actualizarLimitesFecha();
    renderizarEstudiantes();
  });
  elemento('rango-porcentaje').addEventListener('input', () => {
    elemento('campo-porcentaje').value = elemento('rango-porcentaje').value;
  });
  elemento('campo-porcentaje').addEventListener('input', () => {
    elemento('rango-porcentaje').value = elemento('campo-porcentaje').value || '0';
  });
  contarCaracteres('campo-resultados', 'contador-resultados', 2000);
  elemento('formulario-avance').addEventListener('submit', guardarAvance);
  elemento('formulario-anular').addEventListener('submit', confirmarAnulacion);
  contarCaracteres('anular-motivo', 'contador-anular-motivo', 500);

  elemento('formulario-estudiantes').addEventListener('submit', evento => {
    evento.preventDefault();
    pantalla.filtrosEstudiantes = {
      q: elemento('estudiante-q').value.trim(),
      institucionId: esGlobal() ? elemento('estudiante-institucion').value : ''
    };
    mostrarBusquedaEstudiantes();
    buscarEstudiantes(0);
  });
  elemento('boton-otro-estudiante').addEventListener('click', () => {
    mostrarBusquedaEstudiantes();
    if (!pantalla.estudiantesVigente) {
      buscarEstudiantes(0);
    }
  });
  elemento('progreso-periodo').addEventListener('change', () => {
    if (pantalla.estudianteId) {
      cargarProgreso(pantalla.estudianteId);
    }
  });
  elemento('pestana-progreso').addEventListener('shown.bs.tab', () => {
    if (!pantalla.estudianteId && !pantalla.estudiantesVigente) {
      buscarEstudiantes(0);
    }
  });

  elemento('formulario-resultados').addEventListener('submit', evento => {
    evento.preventDefault();
    cargarResultados();
  });
  elemento('pestana-resultados').addEventListener('shown.bs.tab', () => {
    if (!pantalla.resultadosVigente) {
      cargarResultados();
    }
  });

  await cargarCatalogos();
  aplicarParametrosIniciales();
}

async function cargarCatalogos() {
  const [clubes, periodos, instituciones, proyectos, competencias] = await Promise.all([
    cargarClubes().catch(error => {
      mostrarAlerta(elemento('alertas'), 'danger', `No se pudieron cargar los clubes. ${mensajeDe(error)}`);
      return [];
    }),
    cargarPeriodos().catch(() => []),
    esGlobal() ? cargarInstituciones().catch(() => []) : Promise.resolve([]),
    puedeGestionarRol() ? cargarProyectos({ estado: 'EN_DESARROLLO' }).catch(() => []) : Promise.resolve([]),
    puedeGestionarRol() ? cargarContenidos({ tipo: 'COMPETENCIA', activo: true }).catch(() => []) : Promise.resolve([])
  ]);
  catalogo.clubes = clubes.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  catalogo.clubesPorId = new Map(catalogo.clubes.map(club => [club.id, club]));
  catalogo.periodos = periodos.slice().sort((a, b) => (b.fechaInicio || '').localeCompare(a.fechaInicio || ''));
  catalogo.periodosPorId = new Map(periodos.map(periodo => [periodo.id, periodo]));
  catalogo.instituciones = instituciones;
  catalogo.proyectos = proyectos.filter(proyecto => proyecto.editable);
  catalogo.proyectosPorId = new Map(catalogo.proyectos.map(proyecto => [proyecto.id, proyecto]));
  catalogo.competencias = competencias.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  if (esGlobal()) {
    llenarSelect(elemento('filtro-institucion'), instituciones, 'Todas', item => String(item.id), item => item.nombre);
    llenarSelect(elemento('estudiante-institucion'), instituciones, 'Todas', item => String(item.id), item => item.nombre);
    llenarSelect(elemento('resultados-institucion'), instituciones, 'Todas', item => String(item.id), item => item.nombre);
  }
  llenarClubesFiltro();

  const activo = periodos.find(periodo => periodo.activo);
  llenarSelect(elemento('resultados-periodo'), catalogo.periodos, activo ? 'Período activo' : 'Seleccione un período',
    periodo => String(periodo.id), periodo => (periodo.activo ? `${periodo.nombre} (activo)` : periodo.nombre));
  if (activo) {
    elemento('resultados-periodo').value = String(activo.id);
  }
  llenarSelect(elemento('progreso-periodo'), catalogo.periodos, 'Todos los períodos', periodo => String(periodo.id),
    periodo => (periodo.activo ? `${periodo.nombre} (activo)` : periodo.nombre));
}

function llenarClubesFiltro() {
  const institucionId = Number(elemento('filtro-institucion').value) || null;
  const clubes = catalogo.clubes.filter(club => club.estado !== 'PLANIFICADO'
    && (!institucionId || club.institucionId === institucionId));
  const anterior = elemento('filtro-club').value;
  llenarSelect(elemento('filtro-club'), clubes, 'Todos', club => String(club.id), textoClub);
  if (clubes.some(club => String(club.id) === anterior)) {
    elemento('filtro-club').value = anterior;
  }
}

function leerFiltros() {
  return {
    institucionId: esGlobal() ? elemento('filtro-institucion').value : '',
    clubId: elemento('filtro-club').value,
    alcance: elemento('filtro-alcance').value,
    estado: elemento('filtro-estado').value,
    desde: elemento('filtro-desde').value,
    hasta: elemento('filtro-hasta').value,
    ...pantalla.fijos
  };
}

function mostrarAvisoFiltro(texto) {
  const aviso = elemento('aviso-filtro');
  aviso.replaceChildren(crearElemento('div', { clase: 'alert alert-info py-2 small d-flex flex-wrap gap-2' }, [
    document.createTextNode(texto),
    crearElemento('a', { clase: 'alert-link', texto: 'Ver todos los avances', atributos: { href: 'avances.html' } })
  ]));
  aviso.hidden = false;
}

function aplicarParametrosIniciales() {
  const parametros = new URLSearchParams(window.location.search);
  const clubId = Number(parametros.get('clubId')) || null;
  const proyectoId = Number(parametros.get('proyectoId')) || null;
  const estudianteId = Number(parametros.get('estudianteId')) || null;
  const pestana = parametros.get('pestana');
  const nuevo = parametros.get('nuevo');

  if (clubId && catalogo.clubesPorId.has(clubId)) {
    elemento('filtro-club').value = String(clubId);
  }
  if (proyectoId) {
    pantalla.fijos = { proyectoId };
    mostrarAvisoFiltro('Se muestran solo los avances del proyecto seleccionado.');
  } else if (estudianteId && pestana !== 'progreso') {
    pantalla.fijos = { estudianteId };
    mostrarAvisoFiltro('Se muestran solo los avances individuales del estudiante seleccionado.');
  }
  pantalla.filtros = leerFiltros();
  cargarAvances(0);

  if (pestana === 'progreso') {
    mostrarPestana('pestana-progreso');
    if (estudianteId) {
      cargarProgreso(estudianteId);
    }
  } else if (pestana === 'resultados') {
    mostrarPestana('pestana-resultados');
  }

  if (nuevo && ALCANCES[nuevo] && puedeGestionarRol()) {
    abrirFormulario('crear', null, { alcance: nuevo, clubId, proyectoId, estudianteId });
  }
}

function filaMensaje(texto, columnas) {
  return crearElemento('tr', {}, [
    crearElemento('td', { clase: 'text-center text-body-secondary py-4', texto, atributos: { colspan: String(columnas) } })
  ]);
}

function resumenPagina(respuesta) {
  if (respuesta.totalElementos === 0) {
    return 'Sin resultados';
  }
  const desde = respuesta.pagina * respuesta.tamano + 1;
  const hasta = desde + respuesta.contenido.length - 1;
  return `Mostrando ${desde}–${hasta} de ${respuesta.totalElementos}`;
}

async function cargarAvances(pagina) {
  const solicitud = ++pantalla.solicitudLista;
  const cuerpo = elemento('cuerpo-avances');
  cuerpo.replaceChildren(filaMensaje('Cargando avances...', 6));
  try {
    const respuesta = await apiFetch(`/api/avances${construirConsulta({ ...pantalla.filtros, pagina, tamano: TAMANO_PAGINA })}`);
    if (solicitud !== pantalla.solicitudLista) {
      return;
    }
    pantalla.pagina = respuesta.pagina;
    pantalla.avances = new Map(respuesta.contenido.map(avance => [avance.id, avance]));
    cuerpo.replaceChildren(...(respuesta.contenido.length === 0
      ? [filaMensaje('No hay avances con los filtros seleccionados.', 6)]
      : respuesta.contenido.map(filaAvance)));
    elemento('resumen-avances').textContent = resumenPagina(respuesta);
    renderizarPaginacion(elemento('paginacion-avances'), respuesta, cargarAvances);
  } catch (error) {
    if (solicitud !== pantalla.solicitudLista) {
      return;
    }
    cuerpo.replaceChildren(filaMensaje('No se pudieron cargar los avances.', 6));
    elemento('resumen-avances').textContent = '';
    elemento('paginacion-avances').replaceChildren();
    mostrarAlerta(elemento('alertas-avances'), 'danger', mensajeDe(error));
  }
}

function sujetoAvance(avance) {
  const partes = [insigniaAlcance(avance.alcance)];
  if (avance.alcance === 'ESTUDIANTE' && avance.estudiante) {
    const enlace = crearElemento('a', {
      clase: 'd-block small mt-1',
      texto: textoEstudiante(avance.estudiante),
      atributos: {
        href: `avances.html?pestana=progreso&estudianteId=${avance.estudiante.estudianteId}`,
        title: 'Ver el progreso del estudiante'
      }
    });
    partes.push(enlace);
  } else if (avance.alcance === 'PROYECTO') {
    partes.push(crearElemento('a', {
      clase: 'd-block small mt-1',
      texto: avance.proyectoTitulo,
      atributos: { href: `proyectos.html?id=${avance.proyectoId}` }
    }));
    partes.push(crearElemento('span', { clase: 'small fw-semibold', texto: `${avance.porcentajeAvance} %` }));
  }
  return partes;
}

function competenciasCortas(competencias) {
  if (competencias.length === 0) {
    return [crearElemento('span', { clase: 'small text-body-secondary', texto: '—' })];
  }
  return [crearElemento('ul', { clase: 'list-unstyled small mb-0' }, competencias.map(item =>
    crearElemento('li', { clase: 'mb-1' }, [
      document.createTextNode(`${item.nombre} `),
      insigniaNivel(item.nivel)
    ])))];
}

function avanceGestionable(avance) {
  if (!puedeGestionarRol() || avance.estado !== 'ACTIVO') {
    return false;
  }
  const club = catalogo.clubesPorId.get(avance.clubId);
  if (club && (club.estado === 'CERRADO' || club.estado === 'PLANIFICADO')) {
    return false;
  }
  if (avance.alcance === 'PROYECTO') {
    return catalogo.proyectosPorId.has(avance.proyectoId);
  }
  return Boolean(club) || rolActual() !== 'DOCENTE';
}

function filaAvance(avance) {
  const fecha = [crearElemento('div', { clase: 'text-nowrap', texto: formatearFecha(avance.fecha) })];
  if (avance.estado === 'ANULADO') {
    fecha.push(insignia('Anulado', 'text-bg-secondary'));
  }
  const club = [crearElemento('div', { texto: avance.clubNombre })];
  if (esGlobal()) {
    club.push(crearElemento('div', { clase: 'small text-body-secondary', texto: avance.institucionNombre }));
  }
  const resultados = [];
  if (avance.contenidoReservado) {
    resultados.push(crearElemento('span', { clase: 'small text-body-secondary fst-italic', texto: 'Contenido reservado a la institución' }));
  } else {
    resultados.push(crearElemento('div', { clase: 'small texto-recortado detalle-truncado', texto: avance.resultados }));
  }
  if (avance.actividadTema) {
    resultados.push(crearElemento('div', {
      clase: 'small text-body-secondary',
      texto: `Sesión: ${avance.actividadTema} (${formatearFecha(avance.actividadFecha)})`
    }));
  }
  const acciones = [botonIcono('bi-eye', 'Ver detalle', formatearFecha(avance.fecha), () => abrirDetalle(avance.id))];
  if (avanceGestionable(avance)) {
    acciones.push(botonIcono('bi-pencil', 'Editar', formatearFecha(avance.fecha), () => abrirFormulario('editar', avance, {})));
    acciones.push(botonIcono('bi-x-octagon', 'Anular', formatearFecha(avance.fecha), () => abrirAnulacion(avance), 'btn-outline-danger'));
  }
  const fila = crearElemento('tr', {}, [
    crearElemento('td', {}, fecha),
    crearElemento('td', {}, sujetoAvance(avance)),
    crearElemento('td', {}, club),
    crearElemento('td', {}, resultados),
    crearElemento('td', {}, competenciasCortas(avance.competencias)),
    crearElemento('td', { clase: 'text-end text-nowrap' }, acciones)
  ]);
  if (avance.estado === 'ANULADO') {
    fila.classList.add('fila-cancelada');
  }
  return fila;
}

function alcanceSeleccionado() {
  const marcado = document.querySelector('input[name="alcance"]:checked');
  return marcado ? marcado.value : null;
}

function clubesDelFormulario(alcance) {
  const mapa = new Map();
  catalogo.clubes.filter(club => club.estado === 'ACTIVO' || club.estado === 'SUSPENDIDO')
    .forEach(club => mapa.set(club.id, club));
  if (alcance === 'PROYECTO') {
    catalogo.proyectos.forEach(proyecto => {
      if (!mapa.has(proyecto.clubId)) {
        mapa.set(proyecto.clubId, {
          id: proyecto.clubId,
          nombre: proyecto.clubNombre,
          institucionId: proyecto.institucionId,
          institucionNombre: proyecto.institucionNombre,
          periodoId: null,
          estado: 'ACTIVO'
        });
      }
    });
  }
  return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

function abrirFormulario(modo, avance, inicial) {
  pantalla.modo = modo;
  pantalla.avance = avance;
  pantalla.niveles = new Map(avance ? avance.competencias.map(item => [item.contenidoId, item.nivel]) : []);
  limpiarAlerta(elemento('alertas-avance'));
  elemento('titulo-modal-avance').textContent = modo === 'crear' ? 'Registrar avance' : 'Editar avance';
  const radios = Array.from(document.querySelectorAll('input[name="alcance"]'));
  radios.forEach(radio => {
    const sinClubes = modo === 'crear' && clubesDelFormulario(radio.value).length === 0;
    radio.checked = !sinClubes && (avance ? radio.value === avance.alcance : radio.value === inicial.alcance);
    radio.disabled = modo === 'editar' || sinClubes;
  });
  const habilitados = radios.filter(radio => !radio.disabled);
  if (modo === 'crear' && !alcanceSeleccionado() && habilitados.length === 1) {
    habilitados[0].checked = true;
  }

  elemento('campo-resultados').value = avance ? avance.resultados || '' : '';
  elemento('campo-logros').value = avance ? avance.logros || '' : '';
  elemento('campo-dificultades').value = avance ? avance.dificultades || '' : '';
  elemento('campo-pasos').value = avance ? avance.proximosPasos || '' : '';
  elemento('contador-resultados').textContent = `${elemento('campo-resultados').value.length} / 2000`;
  const porcentaje = avance && avance.porcentajeAvance !== null ? String(avance.porcentajeAvance) : '';
  elemento('campo-porcentaje').value = porcentaje;
  elemento('rango-porcentaje').value = porcentaje || '0';
  elemento('campo-fecha').value = avance ? avance.fecha : hoy();
  pantalla.inicial = inicial;
  aplicarAlcance(false);
  modalAvance.show();
}

function aplicarAlcance(cambioManual) {
  const alcance = alcanceSeleccionado();
  elemento('campos-avance').hidden = !alcance;
  if (!alcance) {
    return;
  }
  elemento('grupo-estudiante').hidden = alcance !== 'ESTUDIANTE';
  elemento('grupo-proyecto').hidden = alcance !== 'PROYECTO';
  elemento('grupo-porcentaje').hidden = alcance !== 'PROYECTO';
  elemento('grupo-competencias').hidden = alcance !== 'ESTUDIANTE';

  const selector = elemento('campo-club');
  const avance = pantalla.avance;
  if (pantalla.modo === 'editar') {
    llenarSelect(selector, [{ id: avance.clubId, nombre: avance.clubNombre, institucionNombre: avance.institucionNombre }],
      null, club => String(club.id), textoClub);
    selector.disabled = true;
  } else {
    const anterior = cambioManual ? selector.value : '';
    const clubes = clubesDelFormulario(alcance);
    llenarSelect(selector, clubes, clubes.length ? 'Seleccione un club' : 'No tiene clubes para registrar avances',
      club => String(club.id), textoClub);
    selector.disabled = false;
    const inicial = pantalla.inicial || {};
    let deseado = anterior ? Number(anterior) : inicial.clubId;
    if (!deseado && inicial.proyectoId && catalogo.proyectosPorId.has(inicial.proyectoId)) {
      deseado = catalogo.proyectosPorId.get(inicial.proyectoId).clubId;
    }
    if (deseado && clubes.some(club => club.id === deseado)) {
      selector.value = String(deseado);
    } else if (clubes.length === 1) {
      selector.value = String(clubes[0].id);
    }
  }
  renderizarCompetencias();
  alCambiarClub(avance);
}

function clubDelFormulario() {
  const clubId = Number(elemento('campo-club').value) || null;
  if (!clubId) {
    return null;
  }
  return catalogo.clubesPorId.get(clubId) || clubesDelFormulario('PROYECTO').find(club => club.id === clubId) || {
    id: clubId,
    periodoId: null
  };
}

async function alCambiarClub(avance) {
  const solicitud = ++pantalla.solicitudClub;
  const club = clubDelFormulario();
  const alcance = alcanceSeleccionado();
  llenarProyectos(club, avance);
  if (!club) {
    pantalla.inscripciones = [];
    pantalla.actividades = [];
    llenarSelect(elemento('campo-actividad'), [], 'Seleccione primero el club', () => '', () => '');
    renderizarEstudiantes();
    actualizarLimitesFecha();
    return;
  }
  llenarSelect(elemento('campo-actividad'), [], 'Cargando sesiones...', () => '', () => '');
  if (alcance === 'ESTUDIANTE' && !avance) {
    llenarSelect(elemento('campo-estudiante'), [], 'Cargando integrantes...', () => '', () => '');
  }
  const [actividades, inscripciones] = await Promise.all([
    cargarActividadesDelClub(club.id, 'EJECUTADA').catch(() => []),
    alcance === 'ESTUDIANTE' && !avance ? cargarInscripcionesDelClub(club.id).catch(() => []) : Promise.resolve([])
  ]);
  if (solicitud !== pantalla.solicitudClub) {
    return;
  }
  pantalla.actividades = actividades.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (avance && avance.actividadId && !pantalla.actividades.some(item => item.id === avance.actividadId)) {
    pantalla.actividades.unshift({ id: avance.actividadId, tema: avance.actividadTema, fecha: avance.actividadFecha });
  }
  llenarSelect(elemento('campo-actividad'), pantalla.actividades, 'Sin sesión relacionada', item => String(item.id),
    item => `${formatearFecha(item.fecha)} · ${item.tema}`);
  if (avance && avance.actividadId) {
    elemento('campo-actividad').value = String(avance.actividadId);
  }
  pantalla.inscripciones = inscripciones;
  renderizarEstudiantes();
  actualizarLimitesFecha();
}

function llenarProyectos(club, avance) {
  const selector = elemento('campo-proyecto');
  if (avance && avance.alcance === 'PROYECTO') {
    llenarSelect(selector, [{ id: avance.proyectoId, titulo: avance.proyectoTitulo }], null, item => String(item.id), item => item.titulo);
    selector.disabled = true;
    actualizarAyudaProyecto();
    return;
  }
  selector.disabled = false;
  const proyectos = club ? catalogo.proyectos.filter(proyecto => proyecto.clubId === club.id) : [];
  llenarSelect(selector, proyectos, proyectos.length ? 'Seleccione el proyecto' : 'El club no tiene proyectos en desarrollo a su cargo',
    item => String(item.id), item => item.titulo);
  const inicial = pantalla.inicial || {};
  if (inicial.proyectoId && proyectos.some(proyecto => proyecto.id === inicial.proyectoId)) {
    selector.value = String(inicial.proyectoId);
  }
  actualizarAyudaProyecto();
}

function proyectoSeleccionado() {
  const id = Number(elemento('campo-proyecto').value) || null;
  return id ? catalogo.proyectosPorId.get(id) || null : null;
}

function actualizarAyudaProyecto() {
  const proyecto = proyectoSeleccionado();
  const ayuda = elemento('ayuda-proyecto');
  if (!proyecto) {
    ayuda.textContent = '';
    return;
  }
  ayuda.textContent = proyecto.porcentajeAvance === null
    ? `Inicio ${formatearFecha(proyecto.fechaInicio)} · aún sin avances.`
    : `Inicio ${formatearFecha(proyecto.fechaInicio)} · avance actual ${proyecto.porcentajeAvance} %.`;
  if (pantalla.modo === 'crear' && elemento('campo-porcentaje').value === '' && proyecto.porcentajeAvance !== null) {
    elemento('campo-porcentaje').value = String(proyecto.porcentajeAvance);
    elemento('rango-porcentaje').value = String(proyecto.porcentajeAvance);
  }
}

function alCambiarActividad() {
  const id = Number(elemento('campo-actividad').value) || null;
  const actividad = pantalla.actividades.find(item => item.id === id);
  if (actividad && (!elemento('campo-fecha').value || elemento('campo-fecha').value < actividad.fecha)) {
    elemento('campo-fecha').value = actividad.fecha;
  }
  actualizarLimitesFecha();
  renderizarEstudiantes();
}

function limitesFecha() {
  const club = clubDelFormulario();
  const periodo = club && club.periodoId ? catalogo.periodosPorId.get(club.periodoId) : null;
  const proyecto = alcanceSeleccionado() === 'PROYECTO' ? proyectoSeleccionado() : null;
  const actividadId = Number(elemento('campo-actividad').value) || null;
  const actividad = pantalla.actividades.find(item => item.id === actividadId);
  const minimo = mayorFecha(periodo ? periodo.fechaInicio : '', proyecto ? proyecto.fechaInicio : '',
    actividad ? actividad.fecha : '');
  const maximo = periodo ? menorFecha(periodo.fechaFin, hoy()) : hoy();
  return { minimo, maximo, periodo, proyecto, actividad };
}

function actualizarLimitesFecha() {
  actualizarAyudaProyecto();
  const { minimo, maximo, periodo, proyecto, actividad } = limitesFecha();
  const campo = elemento('campo-fecha');
  if (minimo) {
    campo.min = minimo;
  } else {
    campo.removeAttribute('min');
  }
  campo.max = maximo;
  const partes = [];
  if (periodo) {
    partes.push(`Dentro del período ${periodo.nombre}`);
  }
  if (proyecto) {
    partes.push(`desde el inicio del proyecto (${formatearFecha(proyecto.fechaInicio)})`);
  }
  if (actividad) {
    partes.push(`no antes de la sesión (${formatearFecha(actividad.fecha)})`);
  }
  partes.push('y no posterior a hoy.');
  elemento('ayuda-fecha').textContent = partes.join(', ').replace(', y no', ' y no');
}

function integranteEnFecha(inscripcion, fecha) {
  return inscripcion.fechaIngreso <= fecha && (!inscripcion.fechaRetiro || inscripcion.fechaRetiro >= fecha);
}

function renderizarEstudiantes() {
  const selector = elemento('campo-estudiante');
  const avance = pantalla.avance;
  if (alcanceSeleccionado() !== 'ESTUDIANTE') {
    return;
  }
  if (avance) {
    llenarSelect(selector, [avance.estudiante], null, item => String(item.estudianteId), textoEstudiante);
    selector.disabled = true;
    elemento('ayuda-estudiante').textContent = 'El estudiante de un avance no cambia; si se equivocó, anúlelo y registre otro.';
    return;
  }
  selector.disabled = false;
  const fecha = elemento('campo-fecha').value || hoy();
  const anterior = selector.value || (pantalla.inicial && pantalla.inicial.estudianteId ? String(pantalla.inicial.estudianteId) : '');
  const porEstudiante = new Map();
  pantalla.inscripciones.filter(item => integranteEnFecha(item, fecha)).forEach(item => {
    porEstudiante.set(item.estudianteId, item);
  });
  const candidatos = Array.from(porEstudiante.values()).sort((a, b) =>
    `${a.estudianteApellidos || ''} ${a.estudianteNombres || ''}`.localeCompare(`${b.estudianteApellidos || ''} ${b.estudianteNombres || ''}`, 'es'));
  llenarSelect(selector, candidatos, candidatos.length ? 'Seleccione el estudiante' : 'Nadie era integrante del club en esa fecha',
    item => String(item.estudianteId), textoEstudiante);
  if (candidatos.some(item => String(item.estudianteId) === anterior)) {
    selector.value = anterior;
  }
  elemento('ayuda-estudiante').textContent = `Integrantes del club el ${formatearFecha(fecha)} (${candidatos.length}).`;
}

function renderizarCompetencias() {
  const lista = elemento('lista-competencias');
  const opciones = new Map(catalogo.competencias.map(item => [item.id, item.nombre]));
  if (pantalla.avance) {
    pantalla.avance.competencias.forEach(item => {
      if (!opciones.has(item.contenidoId)) {
        opciones.set(item.contenidoId, `${item.nombre} (inactiva en el catálogo)`);
      }
    });
  }
  if (opciones.size === 0) {
    lista.replaceChildren(crearElemento('p', { clase: 'small text-body-secondary mb-0', texto: 'No hay competencias activas en el catálogo de contenidos.' }));
    actualizarContadorCompetencias();
    return;
  }
  lista.replaceChildren(...Array.from(opciones.entries()).map(([id, nombre]) => {
    const campoId = `nivel-${id}`;
    const selector = crearElemento('select', { clase: 'form-select form-select-sm selector-nivel', atributos: { id: campoId } });
    llenarSelect(selector, Object.entries(NIVELES), 'No evaluada', ([codigo]) => codigo, ([, datos]) => datos.etiqueta);
    selector.value = pantalla.niveles.get(id) || '';
    selector.addEventListener('change', () => {
      if (selector.value) {
        pantalla.niveles.set(id, selector.value);
      } else {
        pantalla.niveles.delete(id);
      }
      actualizarContadorCompetencias();
    });
    return crearElemento('div', { clase: 'd-flex flex-wrap justify-content-between align-items-center gap-2 py-1 border-bottom' }, [
      crearElemento('label', { clase: 'small', texto: nombre, atributos: { for: campoId } }),
      selector
    ]);
  }));
  actualizarContadorCompetencias();
}

function actualizarContadorCompetencias() {
  elemento('contador-competencias').textContent = `${pantalla.niveles.size} de ${MAXIMO_COMPETENCIAS} competencias evaluadas`;
}

function validarAvance() {
  const problemas = [];
  const alcance = alcanceSeleccionado();
  if (!alcance) {
    return ['Elija si el avance es del club, de un estudiante o de un proyecto.'];
  }
  if (!elemento('campo-club').value) {
    problemas.push('Seleccione el club.');
  }
  if (alcance === 'ESTUDIANTE' && !elemento('campo-estudiante').value) {
    problemas.push('Seleccione el estudiante.');
  }
  if (alcance === 'PROYECTO' && !elemento('campo-proyecto').value) {
    problemas.push('Seleccione el proyecto.');
  }
  const fecha = elemento('campo-fecha').value;
  const { minimo, maximo } = limitesFecha();
  if (!fecha) {
    problemas.push('Indique la fecha del avance.');
  } else if (fecha > maximo) {
    problemas.push('La fecha del avance no puede ser posterior a hoy ni al fin del período.');
  } else if (minimo && fecha < minimo) {
    problemas.push(`La fecha del avance no puede ser anterior al ${formatearFecha(minimo)}.`);
  }
  if (!elemento('campo-resultados').value.trim()) {
    problemas.push('Describa los resultados obtenidos.');
  }
  if (alcance === 'PROYECTO') {
    const texto = elemento('campo-porcentaje').value;
    const valor = Number(texto);
    if (texto === '' || !Number.isInteger(valor) || valor < 0 || valor > 100) {
      problemas.push('Indique el porcentaje de avance del proyecto, de 0 a 100.');
    }
  }
  if (alcance === 'ESTUDIANTE' && pantalla.niveles.size > MAXIMO_COMPETENCIAS) {
    problemas.push(`Evalúe máximo ${MAXIMO_COMPETENCIAS} competencias por avance.`);
  }
  return problemas;
}

async function guardarAvance(evento) {
  evento.preventDefault();
  const alertas = elemento('alertas-avance');
  const problemas = validarAvance();
  if (problemas.length > 0) {
    mostrarAlerta(alertas, 'danger', 'Revise los datos ingresados:', problemas);
    return;
  }
  const alcance = alcanceSeleccionado();
  const cuerpo = {
    actividadId: Number(elemento('campo-actividad').value) || null,
    fecha: elemento('campo-fecha').value,
    resultados: elemento('campo-resultados').value.trim(),
    logros: elemento('campo-logros').value.trim() || null,
    dificultades: elemento('campo-dificultades').value.trim() || null,
    proximosPasos: elemento('campo-pasos').value.trim() || null,
    porcentajeAvance: alcance === 'PROYECTO' ? Number(elemento('campo-porcentaje').value) : null,
    competencias: alcance === 'ESTUDIANTE'
      ? Array.from(pantalla.niveles.entries()).map(([contenidoId, nivel]) => ({ contenidoId, nivel }))
      : []
  };
  const boton = elemento('boton-guardar-avance');
  establecerCargando(boton, true, 'Guardando...');
  try {
    let guardado;
    if (pantalla.modo === 'crear') {
      guardado = await apiFetch('/api/avances', {
        metodo: 'POST',
        cuerpo: {
          ...cuerpo,
          clubId: Number(elemento('campo-club').value),
          alcance,
          estudianteId: alcance === 'ESTUDIANTE' ? Number(elemento('campo-estudiante').value) : null,
          proyectoId: alcance === 'PROYECTO' ? Number(elemento('campo-proyecto').value) : null
        }
      });
    } else {
      guardado = await apiFetch(`/api/avances/${pantalla.avance.id}`, { metodo: 'PUT', cuerpo });
    }
    modalAvance.hide();
    mostrarAlerta(elemento('alertas'), 'success', `${pantalla.modo === 'crear' ? 'Avance registrado' : 'Avance actualizado'}: ${descripcionAvance(guardado)}.`);
    if (guardado.alcance === 'PROYECTO') {
      const proyectos = await cargarProyectos({ estado: 'EN_DESARROLLO' }).catch(() => null);
      if (proyectos) {
        catalogo.proyectos = proyectos.filter(proyecto => proyecto.editable);
        catalogo.proyectosPorId = new Map(catalogo.proyectos.map(proyecto => [proyecto.id, proyecto]));
      }
    }
    pantalla.resultadosVigente = false;
    await cargarAvances(pantalla.modo === 'crear' ? 0 : pantalla.pagina);
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

function descripcionAvance(avance) {
  if (avance.alcance === 'PROYECTO') {
    return `proyecto «${avance.proyectoTitulo}» al ${avance.porcentajeAvance} % el ${formatearFecha(avance.fecha)}`;
  }
  if (avance.alcance === 'ESTUDIANTE') {
    return `${textoEstudiante(avance.estudiante)} el ${formatearFecha(avance.fecha)}, ${plural(avance.competencias.length, 'competencia evaluada', 'competencias evaluadas')}`;
  }
  return `club ${avance.clubNombre} el ${formatearFecha(avance.fecha)}`;
}

function abrirAnulacion(avance) {
  pantalla.avance = avance;
  limpiarAlerta(elemento('alertas-anular'));
  elemento('anular-titulo').textContent = `Avance del ${formatearFecha(avance.fecha)}`;
  elemento('anular-datos').textContent = `${ALCANCES[avance.alcance].etiqueta} · ${descripcionAvance(avance)}`;
  elemento('anular-motivo').value = '';
  elemento('contador-anular-motivo').textContent = '0 / 500';
  modalAnular.show();
}

async function confirmarAnulacion(evento) {
  evento.preventDefault();
  const motivo = elemento('anular-motivo').value.trim();
  if (!motivo) {
    mostrarAlerta(elemento('alertas-anular'), 'danger', 'Indique el motivo de la anulación.');
    return;
  }
  const boton = elemento('boton-confirmar-anular');
  establecerCargando(boton, true, 'Anulando...');
  try {
    const anulado = await apiFetch(`/api/avances/${pantalla.avance.id}/anulacion`, { metodo: 'POST', cuerpo: { motivo } });
    modalAnular.hide();
    mostrarAlerta(elemento('alertas'), 'success', `Avance del ${formatearFecha(anulado.fecha)} anulado. Sigue visible con el filtro «Anulados».`);
    pantalla.resultadosVigente = false;
    await cargarAvances(pantalla.pagina);
  } catch (error) {
    mostrarAlerta(elemento('alertas-anular'), 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

function filaDato(termino, valor) {
  return [
    crearElemento('dt', { clase: 'col-sm-4 text-body-secondary fw-normal', texto: termino }),
    crearElemento('dd', { clase: 'col-sm-8 texto-preformateado', texto: valor || '—' })
  ];
}

async function abrirDetalle(id) {
  const solicitud = ++pantalla.solicitudDetalle;
  limpiarAlerta(elemento('alertas-detalle'));
  elemento('detalle-titulo').textContent = 'Cargando...';
  elemento('detalle-insignias').replaceChildren();
  elemento('detalle-club').textContent = '';
  elemento('detalle-datos').replaceChildren();
  elemento('detalle-reservado').hidden = true;
  elemento('grupo-detalle-competencias').hidden = true;
  elemento('grupo-detalle-anulacion').hidden = true;
  elemento('detalle-registro').textContent = '';
  modalDetalle.show();
  try {
    const avance = await apiFetch(`/api/avances/${id}`);
    if (solicitud !== pantalla.solicitudDetalle) {
      return;
    }
    renderizarDetalle(avance);
  } catch (error) {
    if (solicitud === pantalla.solicitudDetalle) {
      elemento('detalle-titulo').textContent = 'Avance';
      mostrarAlerta(elemento('alertas-detalle'), 'danger', mensajeDe(error));
    }
  }
}

function renderizarDetalle(avance) {
  elemento('detalle-titulo').textContent = `Avance del ${formatearFecha(avance.fecha)}`;
  const insignias = [insigniaAlcance(avance.alcance)];
  if (avance.estado === 'ANULADO') {
    insignias.push(document.createTextNode(' '), insignia('Anulado', 'text-bg-secondary'));
  }
  elemento('detalle-insignias').replaceChildren(...insignias);
  elemento('detalle-club').textContent = esGlobal() ? `${avance.clubNombre} · ${avance.institucionNombre}` : avance.clubNombre;
  elemento('detalle-reservado').hidden = !avance.contenidoReservado;

  const datos = [];
  if (avance.alcance === 'ESTUDIANTE') {
    datos.push(...filaDato('Estudiante', textoEstudiante(avance.estudiante)));
  }
  if (avance.alcance === 'PROYECTO') {
    datos.push(...filaDato('Proyecto', avance.proyectoTitulo));
    datos.push(...filaDato('Porcentaje de avance', `${avance.porcentajeAvance} %`));
  }
  datos.push(...filaDato('Sesión relacionada', avance.actividadTema
    ? `${avance.actividadTema} (${formatearFecha(avance.actividadFecha)})`
    : 'Sin sesión relacionada'));
  if (!avance.contenidoReservado) {
    datos.push(...filaDato('Resultados', avance.resultados));
    datos.push(...filaDato('Logros', avance.logros));
    datos.push(...filaDato('Dificultades', avance.dificultades));
    datos.push(...filaDato('Próximos pasos', avance.proximosPasos));
  }
  elemento('detalle-datos').replaceChildren(...datos);

  if (avance.competencias.length > 0) {
    elemento('detalle-competencias').replaceChildren(...avance.competencias.map(item =>
      crearElemento('li', { clase: 'mb-1' }, [document.createTextNode(`${item.nombre} `), insigniaNivel(item.nivel)])));
    elemento('grupo-detalle-competencias').hidden = false;
  }
  if (avance.estado === 'ANULADO') {
    elemento('detalle-motivo-anulacion').textContent = avance.motivoAnulacion || 'Motivo reservado a la institución';
    elemento('detalle-anulado').textContent = `Anulado por ${avance.anuladoPorNombre || '—'} el ${formatearFechaHora(avance.fechaAnulacion)}`;
    elemento('grupo-detalle-anulacion').hidden = false;
  }
  elemento('detalle-registro').textContent =
    `Registrado por ${avance.registradoPorNombre || '—'} el ${formatearFechaHora(avance.fechaRegistro)} · última actualización ${formatearFechaHora(avance.actualizadoEn)}`;
}

function mostrarBusquedaEstudiantes() {
  elemento('busqueda-estudiantes').hidden = false;
  elemento('progreso').hidden = true;
  pantalla.estudianteId = null;
}

async function buscarEstudiantes(pagina) {
  const solicitud = ++pantalla.solicitudEstudiantes;
  const columnas = soloDatosMinimos() ? 3 : 4;
  const cuerpo = elemento('cuerpo-estudiantes');
  cuerpo.replaceChildren(filaMensaje('Cargando estudiantes...', columnas));
  try {
    const respuesta = await apiFetch(`/api/estudiantes${construirConsulta({ ...pantalla.filtrosEstudiantes, pagina, tamano: TAMANO_PAGINA })}`);
    if (solicitud !== pantalla.solicitudEstudiantes) {
      return;
    }
    pantalla.estudiantesVigente = true;
    pantalla.paginaEstudiantes = respuesta.pagina;
    cuerpo.replaceChildren(...(respuesta.contenido.length === 0
      ? [filaMensaje('No se encontraron estudiantes.', columnas)]
      : respuesta.contenido.map(estudiante => {
        const celdas = [crearElemento('td', { clase: 'text-nowrap', texto: estudiante.codigoInterno })];
        if (!soloDatosMinimos()) {
          celdas.push(crearElemento('td', { texto: `${estudiante.apellidos || ''} ${estudiante.nombres || ''}`.trim() }));
        }
        celdas.push(crearElemento('td', { clase: 'small', texto: estudiante.institucionNombre || '—' }));
        celdas.push(crearElemento('td', { clase: 'text-end' }, [
          botonIcono('bi-graph-up-arrow', 'Ver progreso', estudiante.codigoInterno, () => cargarProgreso(estudiante.id), 'btn-outline-primary')
        ]));
        return crearElemento('tr', {}, celdas);
      })));
    elemento('resumen-estudiantes').textContent = resumenPagina(respuesta);
    renderizarPaginacion(elemento('paginacion-estudiantes'), respuesta, buscarEstudiantes);
  } catch (error) {
    if (solicitud === pantalla.solicitudEstudiantes) {
      cuerpo.replaceChildren(filaMensaje('No se pudo buscar estudiantes.', columnas));
      mostrarAlerta(elemento('alertas-progreso'), 'danger', mensajeDe(error));
    }
  }
}

async function cargarProgreso(estudianteId) {
  const solicitud = ++pantalla.solicitudProgreso;
  limpiarAlerta(elemento('alertas-progreso'));
  pantalla.estudianteId = estudianteId;
  try {
    const progreso = await apiFetch(`/api/estudiantes/${estudianteId}/progreso${construirConsulta({
      periodoId: elemento('progreso-periodo').value
    })}`);
    if (solicitud !== pantalla.solicitudProgreso) {
      return;
    }
    renderizarProgreso(progreso);
  } catch (error) {
    if (solicitud === pantalla.solicitudProgreso) {
      mostrarBusquedaEstudiantes();
      mostrarAlerta(elemento('alertas-progreso'), 'danger', mensajeDe(error));
      if (!pantalla.estudiantesVigente) {
        buscarEstudiantes(0);
      }
    }
  }
}

function textoVariacion(variacion, evaluaciones) {
  if (evaluaciones < 2) {
    return crearElemento('span', { clase: 'small text-body-secondary', texto: 'Una sola evaluación' });
  }
  if (variacion > 0) {
    return crearElemento('span', { clase: 'small text-success fw-semibold' }, [
      crearElemento('i', { clase: 'bi bi-arrow-up-right me-1', atributos: { 'aria-hidden': 'true' } }),
      document.createTextNode(`Subió ${plural(variacion, 'nivel', 'niveles')}`)
    ]);
  }
  if (variacion < 0) {
    return crearElemento('span', { clase: 'small text-danger fw-semibold' }, [
      crearElemento('i', { clase: 'bi bi-arrow-down-right me-1', atributos: { 'aria-hidden': 'true' } }),
      document.createTextNode(`Bajó ${plural(-variacion, 'nivel', 'niveles')}`)
    ]);
  }
  return crearElemento('span', { clase: 'small text-body-secondary', texto: 'Se mantiene' });
}

function renderizarProgreso(progreso) {
  elemento('busqueda-estudiantes').hidden = true;
  elemento('progreso').hidden = false;
  elemento('progreso-nombre').textContent = textoEstudiante(progreso.estudiante);
  const periodo = progreso.periodoId ? catalogo.periodosPorId.get(progreso.periodoId) : null;
  elemento('progreso-datos').textContent = periodo ? `Período ${periodo.nombre}` : 'Todos los períodos';
  elemento('enlace-historial').href = `historial.html?id=${progreso.estudiante.estudianteId}`;
  const aviso = AVISOS_PROGRESO[progreso.alcance];
  elemento('progreso-aviso').replaceChildren(...(aviso
    ? [crearElemento('div', { clase: 'alert alert-secondary py-2 small', texto: aviso })]
    : []));
  elemento('progreso-cifras').replaceChildren(
    cifra(progreso.avancesRegistrados, rotulo(progreso.avancesRegistrados, 'avance individual', 'avances individuales')),
    cifra(progreso.fechaUltimoAvance ? formatearFecha(progreso.fechaUltimoAvance) : '—', 'último avance'),
    cifra(progreso.competenciasEvaluadas, rotulo(progreso.competenciasEvaluadas, 'competencia evaluada', 'competencias evaluadas')),
    cifra(progreso.competenciasLogradas, rotulo(progreso.competenciasLogradas, 'lograda o destacada', 'logradas o destacadas'), 'border-success'),
    cifra(progreso.proyectos.length, rotulo(progreso.proyectos.length, 'proyecto', 'proyectos'))
  );

  const cuerpo = elemento('cuerpo-progreso');
  if (progreso.competencias.length === 0) {
    cuerpo.replaceChildren(filaMensaje('El estudiante aún no tiene competencias evaluadas en sus avances.', 5));
  } else {
    cuerpo.replaceChildren(...progreso.competencias.map(item => {
      const historial = crearElemento('div', { clase: 'small text-body-secondary' },
        [document.createTextNode(item.historial.map(evaluacion =>
          `${formatearFecha(evaluacion.fecha)} ${NIVELES[evaluacion.nivel] ? NIVELES[evaluacion.nivel].etiqueta : evaluacion.nivel}`).join(' → '))]);
      return crearElemento('tr', {}, [
        crearElemento('td', {}, [crearElemento('div', { texto: item.nombre }), historial]),
        crearElemento('td', {}, [insigniaNivel(item.nivelInicial)]),
        crearElemento('td', {}, [insigniaNivel(item.nivelActual)]),
        crearElemento('td', {}, [textoVariacion(item.variacionNiveles, item.evaluaciones)]),
        crearElemento('td', { clase: 'small', texto: `${item.evaluaciones} · ${formatearFecha(item.fechaPrimeraEvaluacion)} a ${formatearFecha(item.fechaUltimaEvaluacion)}` })
      ]);
    }));
  }

  elemento('progreso-proyectos').replaceChildren(...(progreso.proyectos.length === 0
    ? [crearElemento('li', { clase: 'text-body-secondary', texto: 'No participa en proyectos visibles para usted.' })]
    : progreso.proyectos.map(proyecto => {
      const estado = ESTADOS_PROYECTO[proyecto.estado] || { etiqueta: proyecto.estado, clase: 'text-bg-light' };
      return crearElemento('li', { clase: 'mb-1' }, [
        crearElemento('a', { texto: proyecto.titulo, atributos: { href: `proyectos.html?id=${proyecto.proyectoId}` } }),
        crearElemento('span', { clase: 'text-body-secondary', texto: ` · ${proyecto.clubNombre} · desde ${formatearFecha(proyecto.fechaInicio)} ` }),
        insignia(estado.etiqueta, estado.clase)
      ]);
    })));
}

async function cargarResultados() {
  const solicitud = ++pantalla.solicitudResultados;
  const boton = elemento('boton-resultados');
  limpiarAlerta(elemento('alertas-resultados'));
  establecerCargando(boton, true, 'Calculando...');
  try {
    const resumen = await apiFetch(`/api/resultados/resumen${construirConsulta({
      periodoId: elemento('resultados-periodo').value,
      institucionId: esGlobal() ? elemento('resultados-institucion').value : ''
    })}`);
    if (solicitud !== pantalla.solicitudResultados) {
      return;
    }
    pantalla.resultadosVigente = true;
    renderizarResultados(resumen);
  } catch (error) {
    if (solicitud === pantalla.solicitudResultados) {
      elemento('resultados').hidden = true;
      mostrarAlerta(elemento('alertas-resultados'), 'danger', mensajeDe(error));
    }
  } finally {
    establecerCargando(boton, false);
  }
}

function barraNiveles(niveles) {
  const total = niveles.inicial + niveles.enProceso + niveles.logrado + niveles.destacado;
  if (total === 0) {
    return crearElemento('span', { clase: 'small text-body-secondary', texto: 'Sin evaluaciones' });
  }
  const tramos = [
    ['INICIAL', niveles.inicial],
    ['EN_PROCESO', niveles.enProceso],
    ['LOGRADO', niveles.logrado],
    ['DESTACADO', niveles.destacado]
  ].filter(([, cantidad]) => cantidad > 0).map(([codigo, cantidad]) => {
    const tramo = crearElemento('div', {
      clase: `progress-bar ${NIVELES[codigo].color}`,
      atributos: { title: `${NIVELES[codigo].etiqueta}: ${cantidad}` }
    });
    tramo.style.width = `${(cantidad * 100) / total}%`;
    return tramo;
  });
  const texto = `Inicial ${niveles.inicial}, en proceso ${niveles.enProceso}, logrado ${niveles.logrado}, destacado ${niveles.destacado}`;
  return crearElemento('div', {}, [
    crearElemento('div', { clase: 'progress-stacked barra-niveles', atributos: { role: 'img', 'aria-label': texto } }, tramos),
    crearElemento('div', { clase: 'small text-body-secondary', texto: `${niveles.inicial} / ${niveles.enProceso} / ${niveles.logrado} / ${niveles.destacado}` })
  ]);
}

function renderizarResultados(resumen) {
  elemento('resultados').hidden = false;
  const institucion = resumen.institucionId
    ? catalogo.instituciones.find(item => item.id === resumen.institucionId)
    : null;
  elemento('resultados-titulo').textContent = `Período ${resumen.periodoNombre}${institucion ? ` · ${institucion.nombre}` : ''} · ${plural(resumen.totalClubes, 'club', 'clubes')}`;
  const proyectos = resumen.proyectos;
  elemento('resultados-cifras').replaceChildren(
    cifra(resumen.participantesUnicos, rotulo(resumen.participantesUnicos, 'participante único', 'participantes únicos')),
    cifra(`${proyectos.enDesarrollo + proyectos.finalizados}`, `${rotulo(proyectos.enDesarrollo + proyectos.finalizados, 'proyecto', 'proyectos')} (${proyectos.enDesarrollo} en desarrollo)`),
    cifra(proyectos.finalizados, `${rotulo(proyectos.finalizados, 'finalizado', 'finalizados')} · ${textoPorcentaje(resumen.porcentajeFinalizacion)}`, 'border-success'),
    cifra(proyectos.prototiposFinalizados, rotulo(proyectos.prototiposFinalizados, 'prototipo finalizado', 'prototipos finalizados')),
    cifra(resumen.estudiantesEnProyectosUnicos, `en proyectos · ${textoPorcentaje(resumen.porcentajeParticipantesEnProyectos)}`),
    cifra(resumen.avances.deClub + resumen.avances.deEstudiantes + resumen.avances.deProyectos,
      `${rotulo(resumen.avances.deClub + resumen.avances.deEstudiantes + resumen.avances.deProyectos, 'avance', 'avances')} (${resumen.avances.deClub} club, ${resumen.avances.deEstudiantes} estudiante, ${resumen.avances.deProyectos} proyecto)`),
    cifra(resumen.estudiantesConAvanceUnicos, `con avance individual · ${textoPorcentaje(resumen.porcentajeEstudiantesConAvance)}`)
  );

  const competencias = elemento('cuerpo-competencias');
  competencias.replaceChildren(...(resumen.competencias.length === 0
    ? [filaMensaje('No hay competencias trabajadas ni evaluadas en el período.', 6)]
    : resumen.competencias.map(item => crearElemento('tr', {}, [
      crearElemento('td', { texto: item.nombre }),
      crearElemento('td', { clase: 'text-end', texto: String(item.sesionesTrabajadas) }),
      crearElemento('td', { clase: 'text-end', texto: String(item.clubesQueLaTrabajaron) }),
      crearElemento('td', { clase: 'text-end', texto: String(item.estudiantesEvaluados) }),
      crearElemento('td', {}, [barraNiveles(item.nivelesActuales)]),
      crearElemento('td', { clase: 'text-end', texto: textoPorcentaje(item.porcentajeLogrado) })
    ]))));

  const clubes = elemento('cuerpo-clubes');
  clubes.replaceChildren(...(resumen.clubes.length === 0
    ? [filaMensaje('No hay clubes en el período.', 9)]
    : resumen.clubes.map(club => {
      const nombre = [crearElemento('div', { texto: club.clubNombre })];
      if (esGlobal()) {
        nombre.push(crearElemento('div', { clase: 'small text-body-secondary', texto: club.institucionNombre }));
      }
      if (club.estadoClub !== 'ACTIVO') {
        nombre.push(insignia(club.estadoClub === 'CERRADO' ? 'Cerrado' : 'Suspendido', 'text-bg-secondary'));
      }
      const avances = club.avances.deClub + club.avances.deEstudiantes + club.avances.deProyectos;
      return crearElemento('tr', {}, [
        crearElemento('td', {}, nombre),
        crearElemento('td', { clase: 'text-end', texto: String(club.participantes) }),
        crearElemento('td', {
          clase: 'small',
          texto: `${club.proyectos.enDesarrollo} en desarrollo · ${plural(club.proyectos.finalizados, 'finalizado', 'finalizados')}${club.proyectos.cancelados ? ` · ${plural(club.proyectos.cancelados, 'cancelado', 'cancelados')}` : ''}`
        }),
        crearElemento('td', { clase: 'text-end', texto: textoPorcentaje(club.porcentajeFinalizacion) }),
        crearElemento('td', { clase: 'text-end', texto: String(club.estudiantesEnProyectos) }),
        crearElemento('td', { clase: 'text-end', texto: String(avances) }),
        crearElemento('td', { clase: 'text-end', texto: `${club.estudiantesConAvance} · ${textoPorcentaje(club.porcentajeEstudiantesConAvance)}` }),
        crearElemento('td', { clase: 'text-end', texto: String(club.competenciasTrabajadas) }),
        crearElemento('td', { clase: 'text-end text-nowrap' }, [
          enlaceIcono('bi-kanban', 'Proyectos del club', club.clubNombre, `proyectos.html?clubId=${club.clubId}`),
          enlaceIcono('bi-journal-text', 'Avances del club', club.clubNombre, `avances.html?clubId=${club.clubId}`)
        ])
      ]);
    })));
}
