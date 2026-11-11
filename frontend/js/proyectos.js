import { apiFetch, construirConsulta, ApiError } from './api.js';
import {
  cargarClubes,
  cargarInstituciones,
  cargarPeriodos,
  cargarDocentesActivos,
  cargarInscripcionesActivasDelClub,
  cargarEvidenciasDelClub
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
const MAXIMO_INTEGRANTES = 30;
const MAXIMO_EVIDENCIAS = 30;
const ROLES_GLOBALES = ['ADMIN', 'COORDINADOR', 'CONSULTA'];
const ROLES_GESTION = ['ADMIN', 'RESP_INSTITUCIONAL', 'DOCENTE'];
const MOTIVO_FINALIZADO = 'El proyecto ya fue finalizado; solo se pueden ajustar sus evidencias vinculadas.';

const TIPOS = {
  PROTOTIPO: { etiqueta: 'Prototipo', icono: 'bi-cpu', clase: 'text-bg-primary' },
  SOFTWARE: { etiqueta: 'Software', icono: 'bi-code-slash', clase: 'text-bg-info' },
  OTRO: { etiqueta: 'Otro', icono: 'bi-lightbulb', clase: 'text-bg-light border' }
};

const ESTADOS = {
  EN_DESARROLLO: { etiqueta: 'En desarrollo', clase: 'text-bg-warning' },
  FINALIZADO: { etiqueta: 'Finalizado', clase: 'text-bg-success' },
  CANCELADO: { etiqueta: 'Cancelado', clase: 'text-bg-secondary' }
};

const TIPOS_EVIDENCIA = {
  FOTOGRAFIA: { etiqueta: 'Fotografía', icono: 'bi-camera' },
  DOCUMENTO: { etiqueta: 'Informe', icono: 'bi-file-earmark-pdf' },
  ENLACE: { etiqueta: 'Enlace', icono: 'bi-link-45deg' },
  PRODUCTO: { etiqueta: 'Producto', icono: 'bi-box-seam' }
};

const sesion = exigirSesion();
const pantalla = {
  pagina: 0,
  filtros: {},
  estudianteId: null,
  proyectos: new Map(),
  modo: null,
  proyecto: null,
  candidatos: [],
  seleccion: new Set(),
  evidencias: [],
  seleccionEvidencias: new Set(),
  solicitudLista: 0,
  solicitudClub: 0,
  solicitudDetalle: 0,
  solicitudEvidencias: 0
};
const catalogo = { clubes: [], clubesPorId: new Map(), instituciones: [], periodos: [], periodosPorId: new Map() };
let modalProyecto = null;
let modalFinalizar = null;
let modalCancelar = null;
let modalEvidencias = null;
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

function menorFecha(a, b) {
  return a <= b ? a : b;
}

function plural(cantidad, singular, varios) {
  return `${cantidad} ${cantidad === 1 ? singular : varios}`;
}

function nombrePersona(item) {
  if (!item.estudianteNombres && !item.estudianteApellidos) {
    return null;
  }
  return `${item.estudianteNombres || ''} ${item.estudianteApellidos || ''}`.trim();
}

function textoIntegrante(item) {
  const nombre = nombrePersona(item);
  return nombre ? `${nombre} (${item.estudianteCodigo})` : item.estudianteCodigo;
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

function insigniaEstado(estado) {
  const datos = ESTADOS[estado] || { etiqueta: estado, clase: 'text-bg-light' };
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

function botonIcono(icono, etiqueta, contexto, accion, clase = 'btn-outline-secondary') {
  const boton = crearElemento('button', {
    clase: `btn btn-sm ${clase} ms-1`,
    atributos: { type: 'button', title: etiqueta, 'aria-label': `${etiqueta}: ${contexto}` }
  }, [crearElemento('i', { clase: `bi ${icono}`, atributos: { 'aria-hidden': 'true' } })]);
  boton.addEventListener('click', accion);
  return boton;
}

function enlaceIcono(icono, etiqueta, contexto, href, clase = 'btn-outline-secondary') {
  return crearElemento('a', {
    clase: `btn btn-sm ${clase} ms-1`,
    atributos: { href, title: etiqueta, 'aria-label': `${etiqueta}: ${contexto}` }
  }, [crearElemento('i', { clase: `bi ${icono}`, atributos: { 'aria-hidden': 'true' } })]);
}

function barraAvance(porcentaje, estado) {
  if (porcentaje === null || porcentaje === undefined) {
    return crearElemento('span', { clase: 'small text-body-secondary', texto: 'Sin avances' });
  }
  const clase = estado === 'FINALIZADO' ? 'bg-success' : estado === 'CANCELADO' ? 'bg-secondary' : 'bg-primary';
  const barra = crearElemento('div', { clase: `progress-bar ${clase}` });
  barra.style.width = `${Math.min(100, Math.max(0, porcentaje))}%`;
  const contenedor = crearElemento('div', {
    clase: 'progress barra-avance flex-grow-1',
    atributos: {
      role: 'progressbar',
      'aria-label': 'Avance del proyecto',
      'aria-valuenow': String(porcentaje),
      'aria-valuemin': '0',
      'aria-valuemax': '100'
    }
  }, [barra]);
  return crearElemento('div', { clase: 'd-flex align-items-center gap-2' }, [
    contenedor,
    crearElemento('span', { clase: 'small fw-semibold', texto: `${porcentaje} %` })
  ]);
}

function puedeVincular(proyecto) {
  return puedeGestionarRol()
    && (proyecto.editable || (proyecto.estado === 'FINALIZADO' && proyecto.motivoNoEditable === MOTIVO_FINALIZADO));
}

function contarCaracteres(campo, contador, maximo) {
  elemento(campo).addEventListener('input', () => {
    elemento(contador).textContent = `${elemento(campo).value.length} / ${maximo}`;
  });
}

async function iniciar() {
  montarLayout(sesion, 'proyectos');

  modalProyecto = bootstrap.Modal.getOrCreateInstance(elemento('modal-proyecto'));
  modalFinalizar = bootstrap.Modal.getOrCreateInstance(elemento('modal-finalizar'));
  modalCancelar = bootstrap.Modal.getOrCreateInstance(elemento('modal-cancelar'));
  modalEvidencias = bootstrap.Modal.getOrCreateInstance(elemento('modal-evidencias'));
  modalDetalle = bootstrap.Modal.getOrCreateInstance(elemento('modal-detalle'));

  elemento('grupo-filtro-institucion').hidden = !esGlobal();
  elemento('boton-nuevo').hidden = !puedeGestionarRol();
  elemento('boton-nuevo').addEventListener('click', () => abrirFormulario('crear', null));

  elemento('formulario-filtros').addEventListener('submit', evento => {
    evento.preventDefault();
    pantalla.filtros = leerFiltros();
    cargarProyectos(0);
  });
  elemento('formulario-filtros').addEventListener('reset', () => {
    setTimeout(() => {
      llenarClubesFiltro();
      pantalla.estudianteId = null;
      elemento('aviso-estudiante').hidden = true;
      pantalla.filtros = leerFiltros();
      cargarProyectos(0);
    }, 0);
  });
  elemento('filtro-institucion').addEventListener('change', llenarClubesFiltro);

  elemento('campo-club').addEventListener('change', () => alCambiarClub(null));
  elemento('campo-inicio').addEventListener('change', actualizarLimitesFechas);
  elemento('filtro-integrantes').addEventListener('input', renderizarIntegrantes);
  elemento('formulario-proyecto').addEventListener('submit', guardarProyecto);
  contarCaracteres('campo-objetivo', 'contador-objetivo', 1000);
  contarCaracteres('campo-descripcion', 'contador-descripcion', 4000);

  elemento('formulario-finalizar').addEventListener('submit', confirmarFinalizar);
  contarCaracteres('finalizar-resultado', 'contador-finalizar-resultado', 2000);
  elemento('formulario-cancelar').addEventListener('submit', confirmarCancelar);
  contarCaracteres('cancelar-motivo', 'contador-cancelar-motivo', 500);
  elemento('formulario-evidencias').addEventListener('submit', guardarEvidencias);

  await cargarCatalogos();
  aplicarParametrosIniciales();
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
  catalogo.periodos = periodos.slice().sort((a, b) => (b.fechaInicio || '').localeCompare(a.fechaInicio || ''));
  catalogo.periodosPorId = new Map(periodos.map(periodo => [periodo.id, periodo]));
  catalogo.instituciones = instituciones;

  if (esGlobal()) {
    llenarSelect(elemento('filtro-institucion'), instituciones, 'Todas', item => String(item.id), item => item.nombre);
  }
  llenarClubesFiltro();
  llenarSelect(elemento('filtro-periodo'), catalogo.periodos, 'Todos', periodo => String(periodo.id),
    periodo => (periodo.activo ? `${periodo.nombre} (activo)` : periodo.nombre));
}

function llenarClubesFiltro() {
  const institucionId = Number(elemento('filtro-institucion').value) || null;
  const clubes = catalogo.clubes.filter(club => !institucionId || club.institucionId === institucionId);
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
    estado: elemento('filtro-estado').value,
    tipo: elemento('filtro-tipo').value,
    periodoId: elemento('filtro-periodo').value,
    estudianteId: pantalla.estudianteId || ''
  };
}

function aplicarParametrosIniciales() {
  const parametros = new URLSearchParams(window.location.search);
  const clubId = parametros.get('clubId');
  if (clubId && catalogo.clubesPorId.has(Number(clubId))) {
    elemento('filtro-club').value = clubId;
  }
  const estado = parametros.get('estado');
  if (estado && ESTADOS[estado]) {
    elemento('filtro-estado').value = estado;
  }
  const estudianteId = Number(parametros.get('estudianteId'));
  if (estudianteId > 0) {
    pantalla.estudianteId = estudianteId;
    const aviso = elemento('aviso-estudiante');
    aviso.replaceChildren(crearElemento('div', { clase: 'alert alert-info py-2 small d-flex flex-wrap gap-2' }, [
      document.createTextNode('Se muestran solo los proyectos en los que participa el estudiante seleccionado.'),
      crearElemento('a', { clase: 'alert-link', texto: 'Ver todos los proyectos', atributos: { href: 'proyectos.html' } })
    ]));
    aviso.hidden = false;
  }
  pantalla.filtros = leerFiltros();
  cargarProyectos(0);

  const id = Number(parametros.get('id'));
  if (id > 0) {
    abrirDetalle(id);
  } else if (parametros.get('nuevo') === '1' && puedeGestionarRol()) {
    abrirFormulario('crear', null, Number(clubId) || null);
  }
}

function filaMensaje(texto) {
  return crearElemento('tr', {}, [
    crearElemento('td', { clase: 'text-center text-body-secondary py-4', texto, atributos: { colspan: '7' } })
  ]);
}

async function cargarProyectos(pagina) {
  const solicitud = ++pantalla.solicitudLista;
  const cuerpo = elemento('cuerpo-proyectos');
  cuerpo.replaceChildren(filaMensaje('Cargando proyectos...'));
  try {
    const respuesta = await apiFetch(`/api/proyectos${construirConsulta({
      ...pantalla.filtros,
      pagina,
      tamano: TAMANO_PAGINA
    })}`);
    if (solicitud !== pantalla.solicitudLista) {
      return;
    }
    pantalla.pagina = respuesta.pagina;
    pantalla.proyectos = new Map(respuesta.contenido.map(proyecto => [proyecto.id, proyecto]));
    if (respuesta.contenido.length === 0) {
      cuerpo.replaceChildren(filaMensaje('No hay proyectos con los filtros seleccionados.'));
    } else {
      cuerpo.replaceChildren(...respuesta.contenido.map(filaProyecto));
    }
    elemento('resumen-proyectos').textContent = resumenPagina(respuesta);
    renderizarPaginacion(elemento('paginacion-proyectos'), respuesta, cargarProyectos);
  } catch (error) {
    if (solicitud !== pantalla.solicitudLista) {
      return;
    }
    cuerpo.replaceChildren(filaMensaje('No se pudieron cargar los proyectos.'));
    elemento('resumen-proyectos').textContent = '';
    elemento('paginacion-proyectos').replaceChildren();
    mostrarAlerta(elemento('alertas'), 'danger', mensajeDe(error));
  }
}

function resumenPagina(respuesta) {
  if (respuesta.totalElementos === 0) {
    return 'Sin resultados';
  }
  const desde = respuesta.pagina * respuesta.tamano + 1;
  const hasta = desde + respuesta.contenido.length - 1;
  return `Mostrando ${desde}–${hasta} de ${respuesta.totalElementos}`;
}

function chipsIntegrantes(integrantes) {
  if (integrantes.length === 0) {
    return [crearElemento('span', { clase: 'small text-body-secondary', texto: 'Sin integrantes' })];
  }
  const visibles = integrantes.slice(0, 3).map(item => {
    const nombre = nombrePersona(item);
    const texto = nombre ? item.estudianteNombres : item.estudianteCodigo;
    const chip = crearElemento('span', {
      clase: 'chip-estudiante small',
      texto,
      atributos: { title: textoIntegrante(item) }
    });
    if (!item.integranteActivoDelClub) {
      chip.classList.add('text-body-secondary', 'text-decoration-line-through');
      chip.title = `${textoIntegrante(item)} · ya no es integrante activo del club`;
    }
    return chip;
  });
  if (integrantes.length > 3) {
    visibles.push(crearElemento('span', { clase: 'small text-body-secondary', texto: `+${integrantes.length - 3}` }));
  }
  return [crearElemento('div', { clase: 'd-flex flex-wrap gap-1' }, visibles)];
}

function filaProyecto(proyecto) {
  const titulo = crearElemento('div', { clase: 'fw-semibold', texto: proyecto.titulo });
  const tipo = crearElemento('div', { clase: 'mt-1' }, [insigniaTipo(proyecto.tipo)]);
  const club = [crearElemento('div', { texto: proyecto.clubNombre })];
  if (esGlobal()) {
    club.push(crearElemento('div', { clase: 'small text-body-secondary', texto: proyecto.institucionNombre }));
  }
  const avance = [barraAvance(proyecto.porcentajeAvance, proyecto.estado)];
  if (proyecto.avancesRegistrados > 0) {
    avance.push(crearElemento('div', {
      clase: 'small text-body-secondary',
      texto: `${plural(proyecto.avancesRegistrados, 'avance', 'avances')} · último ${formatearFecha(proyecto.fechaUltimoAvance)}`
    }));
  }

  const acciones = [botonIcono('bi-eye', 'Ver detalle', proyecto.titulo, () => abrirDetalle(proyecto.id))];
  if (proyecto.editable) {
    acciones.push(enlaceIcono('bi-graph-up-arrow', 'Registrar avance', proyecto.titulo,
      `avances.html?nuevo=PROYECTO&proyectoId=${proyecto.id}`, 'btn-outline-primary'));
    acciones.push(botonIcono('bi-pencil', 'Editar', proyecto.titulo, () => abrirFormulario('editar', proyecto)));
  }
  if (puedeVincular(proyecto)) {
    acciones.push(botonIcono('bi-paperclip', 'Evidencias vinculadas', proyecto.titulo, () => abrirEvidencias(proyecto)));
  }
  if (proyecto.editable) {
    acciones.push(botonIcono('bi-check2-circle', 'Finalizar', proyecto.titulo, () => abrirFinalizar(proyecto),
      'btn-outline-success'));
    acciones.push(botonIcono('bi-x-circle', 'Cancelar proyecto', proyecto.titulo, () => abrirCancelar(proyecto),
      'btn-outline-danger'));
  }

  const estado = [insigniaEstado(proyecto.estado)];
  if (proyecto.estado === 'EN_DESARROLLO' && proyecto.fechaFinPrevista && proyecto.fechaFinPrevista < hoy()) {
    estado.push(crearElemento('div', {
      clase: 'small text-danger mt-1',
      texto: `Fin previsto vencido (${formatearFecha(proyecto.fechaFinPrevista)})`
    }));
  } else if (proyecto.estado === 'FINALIZADO') {
    estado.push(crearElemento('div', { clase: 'small text-body-secondary', texto: formatearFecha(proyecto.fechaFinalizacion) }));
  }

  return crearElemento('tr', {}, [
    crearElemento('td', {}, [titulo, tipo]),
    crearElemento('td', {}, club),
    crearElemento('td', { clase: 'small', texto: proyecto.docenteNombre || '—' }),
    crearElemento('td', {}, chipsIntegrantes(proyecto.integrantes)),
    crearElemento('td', {}, avance),
    crearElemento('td', {}, estado),
    crearElemento('td', { clase: 'text-end text-nowrap' }, acciones)
  ]);
}

function clubesParaRegistrar() {
  return catalogo.clubes.filter(club => club.estado === 'ACTIVO');
}

function abrirFormulario(modo, proyecto, clubInicial = null) {
  pantalla.modo = modo;
  pantalla.proyecto = proyecto;
  pantalla.candidatos = [];
  pantalla.seleccion = new Set(proyecto ? proyecto.integrantes.map(item => item.estudianteId) : []);
  limpiarAlerta(elemento('alertas-proyecto'));
  elemento('titulo-modal-proyecto').textContent = modo === 'crear' ? 'Nuevo proyecto' : 'Editar proyecto';
  elemento('filtro-integrantes').value = '';

  const selector = elemento('campo-club');
  if (modo === 'crear') {
    const clubes = clubesParaRegistrar();
    llenarSelect(selector, clubes, clubes.length ? 'Seleccione un club' : 'No tiene clubes activos',
      club => String(club.id), textoClub);
    selector.disabled = false;
    if (clubInicial && clubes.some(club => club.id === clubInicial)) {
      selector.value = String(clubInicial);
    }
    elemento('campo-tipo').value = '';
    elemento('campo-titulo').value = '';
    elemento('campo-objetivo').value = '';
    elemento('campo-descripcion').value = '';
    elemento('campo-inicio').value = hoy();
    elemento('campo-fin').value = '';
  } else {
    llenarSelect(selector, [{ id: proyecto.clubId, nombre: proyecto.clubNombre, institucionNombre: proyecto.institucionNombre }],
      null, club => String(club.id), textoClub);
    selector.disabled = true;
    elemento('campo-tipo').value = proyecto.tipo;
    elemento('campo-titulo').value = proyecto.titulo;
    elemento('campo-objetivo').value = proyecto.objetivo;
    elemento('campo-descripcion').value = proyecto.descripcion || '';
    elemento('campo-inicio').value = proyecto.fechaInicio;
    elemento('campo-fin').value = proyecto.fechaFinPrevista || '';
  }
  elemento('contador-objetivo').textContent = `${elemento('campo-objetivo').value.length} / 1000`;
  elemento('contador-descripcion').textContent = `${elemento('campo-descripcion').value.length} / 4000`;
  alCambiarClub(proyecto);
  modalProyecto.show();
}

function clubDelFormulario() {
  const clubId = Number(elemento('campo-club').value) || null;
  if (!clubId) {
    return null;
  }
  if (catalogo.clubesPorId.has(clubId)) {
    return catalogo.clubesPorId.get(clubId);
  }
  const proyecto = pantalla.proyecto;
  return proyecto && proyecto.clubId === clubId
    ? { id: proyecto.clubId, nombre: proyecto.clubNombre, institucionId: proyecto.institucionId, periodoId: null, docenteId: null }
    : null;
}

function periodoDelClub(club) {
  return club && club.periodoId ? catalogo.periodosPorId.get(club.periodoId) || null : null;
}

function actualizarLimitesFechas() {
  const club = clubDelFormulario();
  const periodo = periodoDelClub(club);
  const inicio = elemento('campo-inicio');
  const fin = elemento('campo-fin');
  const ayuda = elemento('ayuda-fechas');
  if (!periodo) {
    inicio.max = hoy();
    inicio.removeAttribute('min');
    fin.min = inicio.value || '';
    fin.removeAttribute('max');
    ayuda.textContent = 'La fecha de inicio no puede ser posterior a hoy.';
    return;
  }
  inicio.min = periodo.fechaInicio;
  inicio.max = menorFecha(periodo.fechaFin, hoy());
  fin.min = inicio.value || periodo.fechaInicio;
  fin.max = periodo.fechaFin;
  ayuda.textContent = `Período ${periodo.nombre}: del ${formatearFecha(periodo.fechaInicio)} al ${formatearFecha(periodo.fechaFin)}. El inicio no puede ser posterior a hoy y el fin previsto no puede superar el fin del período.`;
}

async function alCambiarClub(proyecto) {
  const solicitud = ++pantalla.solicitudClub;
  const club = clubDelFormulario();
  const tutor = elemento('campo-tutor');
  actualizarLimitesFechas();
  if (!club) {
    llenarSelect(tutor, [], 'Seleccione primero el club', () => '', () => '');
    pantalla.candidatos = [];
    renderizarIntegrantes();
    return;
  }
  if (!proyecto) {
    pantalla.seleccion.clear();
  }
  llenarSelect(tutor, [], 'Cargando docentes...', () => '', () => '');
  elemento('lista-integrantes').replaceChildren(
    crearElemento('p', { clase: 'small text-body-secondary mb-0', texto: 'Cargando integrantes del club...' })
  );

  const [docentes, inscripciones] = await Promise.all([
    cargarDocentesActivos(club.institucionId).catch(() => null),
    cargarInscripcionesActivasDelClub(club.id).catch(() => [])
  ]);
  if (solicitud !== pantalla.solicitudClub) {
    return;
  }

  const listaDocentes = (docentes || []).slice()
    .sort((a, b) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, 'es'));
  const tutorActual = proyecto ? proyecto.docenteId : club.docenteId;
  if (proyecto && !listaDocentes.some(docente => docente.id === proyecto.docenteId)) {
    listaDocentes.unshift({ id: proyecto.docenteId, apellidos: proyecto.docenteNombre || 'Tutor actual', nombres: '', activo: false });
  }
  llenarSelect(tutor, listaDocentes, 'Seleccione el tutor', docente => String(docente.id),
    docente => `${docente.apellidos} ${docente.nombres}`.trim() + (docente.activo === false ? ' (actual)' : ''));
  if (tutorActual && listaDocentes.some(docente => docente.id === tutorActual)) {
    tutor.value = String(tutorActual);
  }
  if (docentes === null) {
    mostrarAlerta(elemento('alertas-proyecto'), 'warning', 'No se pudo cargar la lista de docentes de la institución.');
  }

  const candidatos = new Map();
  inscripciones.forEach(inscripcion => {
    candidatos.set(inscripcion.estudianteId, {
      estudianteId: inscripcion.estudianteId,
      estudianteCodigo: inscripcion.estudianteCodigo,
      estudianteNombres: inscripcion.estudianteNombres,
      estudianteApellidos: inscripcion.estudianteApellidos,
      activo: true,
      actual: false
    });
  });
  if (proyecto) {
    proyecto.integrantes.forEach(item => {
      const existente = candidatos.get(item.estudianteId);
      if (existente) {
        existente.actual = true;
      } else {
        candidatos.set(item.estudianteId, { ...item, activo: item.integranteActivoDelClub, actual: true });
      }
    });
  }
  pantalla.candidatos = Array.from(candidatos.values()).sort((a, b) =>
    `${a.estudianteApellidos || ''} ${a.estudianteNombres || ''} ${a.estudianteCodigo}`
      .localeCompare(`${b.estudianteApellidos || ''} ${b.estudianteNombres || ''} ${b.estudianteCodigo}`, 'es'));

  const ayuda = elemento('ayuda-integrantes');
  if (inscripciones.length === 0 && proyecto && !catalogo.clubesPorId.has(club.id)) {
    ayuda.textContent = 'Usted es tutor de este proyecto, pero no coordina el club: puede quitar integrantes, y para sumar a otros estudiantes pida al docente coordinador del club o al responsable institucional que los agregue.';
  } else if (inscripciones.length === 0) {
    ayuda.textContent = 'El club no tiene integrantes activos; inscriba estudiantes antes de registrar el proyecto.';
  } else {
    ayuda.textContent = `Solo los integrantes activos del club se suman a un proyecto (máximo ${MAXIMO_INTEGRANTES}).`;
  }
  renderizarIntegrantes();
}

function renderizarIntegrantes() {
  const lista = elemento('lista-integrantes');
  const filtro = elemento('filtro-integrantes').value.trim().toLowerCase();
  const visibles = pantalla.candidatos.filter(item => !filtro || textoIntegrante(item).toLowerCase().includes(filtro));
  elemento('contador-integrantes').textContent = `${pantalla.seleccion.size} seleccionados de ${MAXIMO_INTEGRANTES} posibles`;
  if (pantalla.candidatos.length === 0) {
    lista.replaceChildren(crearElemento('p', { clase: 'small text-body-secondary mb-0', texto: 'No hay estudiantes para mostrar.' }));
    return;
  }
  if (visibles.length === 0) {
    lista.replaceChildren(crearElemento('p', { clase: 'small text-body-secondary mb-0', texto: 'Ningún estudiante coincide con el filtro.' }));
    return;
  }
  lista.replaceChildren(...visibles.map(item => {
    const id = `integrante-${item.estudianteId}`;
    const casilla = crearElemento('input', { clase: 'form-check-input', atributos: { type: 'checkbox', id } });
    casilla.checked = pantalla.seleccion.has(item.estudianteId);
    casilla.disabled = !item.activo && !casilla.checked;
    casilla.addEventListener('change', () => {
      if (casilla.checked) {
        pantalla.seleccion.add(item.estudianteId);
      } else {
        pantalla.seleccion.delete(item.estudianteId);
      }
      renderizarIntegrantes();
    });
    const etiqueta = crearElemento('label', { clase: 'form-check-label', atributos: { for: id } }, [
      document.createTextNode(textoIntegrante(item))
    ]);
    if (!item.activo) {
      etiqueta.appendChild(document.createTextNode(' '));
      etiqueta.appendChild(insignia('Ya no es integrante activo', 'text-bg-light border', 'Puede mantenerlo o quitarlo, pero no volver a agregarlo'));
    }
    return crearElemento('div', { clase: 'form-check' }, [casilla, etiqueta]);
  }));
}

function validarFormulario() {
  const problemas = [];
  const club = clubDelFormulario();
  if (!club) {
    problemas.push('Seleccione el club del proyecto.');
  }
  if (!elemento('campo-tipo').value) {
    problemas.push('Seleccione el tipo de proyecto.');
  }
  if (!elemento('campo-titulo').value.trim()) {
    problemas.push('Indique el título del proyecto.');
  }
  if (!elemento('campo-objetivo').value.trim()) {
    problemas.push('Indique el objetivo del proyecto.');
  }
  if (!elemento('campo-tutor').value) {
    problemas.push('Seleccione el docente tutor.');
  }
  const inicio = elemento('campo-inicio').value;
  const fin = elemento('campo-fin').value;
  const periodo = periodoDelClub(club);
  if (!inicio) {
    problemas.push('Indique la fecha de inicio.');
  } else if (inicio > hoy()) {
    problemas.push('La fecha de inicio no puede ser posterior a hoy.');
  } else if (periodo && (inicio < periodo.fechaInicio || inicio > periodo.fechaFin)) {
    problemas.push(`La fecha de inicio debe estar dentro del período ${periodo.nombre}.`);
  }
  if (fin && inicio && fin < inicio) {
    problemas.push('El fin previsto no puede ser anterior a la fecha de inicio.');
  } else if (fin && periodo && fin > periodo.fechaFin) {
    problemas.push(`El fin previsto no puede superar el fin del período (${formatearFecha(periodo.fechaFin)}).`);
  }
  if (pantalla.seleccion.size === 0) {
    problemas.push('Marque al menos un estudiante integrante del proyecto.');
  } else if (pantalla.seleccion.size > MAXIMO_INTEGRANTES) {
    problemas.push(`Un proyecto admite máximo ${MAXIMO_INTEGRANTES} integrantes.`);
  }
  return problemas;
}

async function guardarProyecto(evento) {
  evento.preventDefault();
  const alertas = elemento('alertas-proyecto');
  const problemas = validarFormulario();
  if (problemas.length > 0) {
    mostrarAlerta(alertas, 'danger', 'Revise los datos ingresados:', problemas);
    return;
  }
  const cuerpo = {
    tipo: elemento('campo-tipo').value,
    titulo: elemento('campo-titulo').value.trim(),
    objetivo: elemento('campo-objetivo').value.trim(),
    descripcion: elemento('campo-descripcion').value.trim() || null,
    docenteId: Number(elemento('campo-tutor').value),
    fechaInicio: elemento('campo-inicio').value,
    fechaFinPrevista: elemento('campo-fin').value || null,
    estudianteIds: Array.from(pantalla.seleccion)
  };
  const boton = elemento('boton-guardar-proyecto');
  establecerCargando(boton, true, 'Guardando...');
  try {
    let guardado;
    if (pantalla.modo === 'crear') {
      cuerpo.clubId = Number(elemento('campo-club').value);
      guardado = await apiFetch('/api/proyectos', { metodo: 'POST', cuerpo });
    } else {
      guardado = await apiFetch(`/api/proyectos/${pantalla.proyecto.id}`, { metodo: 'PUT', cuerpo });
    }
    modalProyecto.hide();
    mostrarAlerta(elemento('alertas'), 'success', pantalla.modo === 'crear'
      ? `Proyecto «${guardado.titulo}» registrado en el club ${guardado.clubNombre}.`
      : `Proyecto «${guardado.titulo}» actualizado.`);
    await cargarProyectos(pantalla.modo === 'crear' ? 0 : pantalla.pagina);
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

function datosCabecera(proyecto) {
  return `${proyecto.clubNombre} · ${TIPOS[proyecto.tipo] ? TIPOS[proyecto.tipo].etiqueta : proyecto.tipo} · inicio ${formatearFecha(proyecto.fechaInicio)} · ${plural(proyecto.integrantes.length, 'integrante', 'integrantes')}`;
}

async function cargarEvidenciasDelProyecto(proyecto, contenedor, alAlternar) {
  const solicitud = ++pantalla.solicitudEvidencias;
  pantalla.seleccionEvidencias = new Set(proyecto.evidencias.map(item => item.evidenciaId));
  contenedor.replaceChildren(crearElemento('p', { clase: 'small text-body-secondary mb-0', texto: 'Cargando evidencias del club...' }));
  const activas = await cargarEvidenciasDelClub(proyecto.clubId, 'ACTIVA').catch(() => []);
  if (solicitud !== pantalla.solicitudEvidencias) {
    return;
  }
  const opciones = new Map();
  activas.forEach(evidencia => {
    opciones.set(evidencia.id, {
      evidenciaId: evidencia.id,
      titulo: evidencia.titulo,
      tipo: evidencia.tipo,
      fechaEvidencia: evidencia.fechaEvidencia,
      actividadTema: evidencia.actividadTema,
      estado: evidencia.estado
    });
  });
  proyecto.evidencias.forEach(item => {
    if (!opciones.has(item.evidenciaId)) {
      opciones.set(item.evidenciaId, { ...item, actividadTema: null });
    }
  });
  pantalla.evidencias = Array.from(opciones.values())
    .sort((a, b) => (b.fechaEvidencia || '').localeCompare(a.fechaEvidencia || '') || b.evidenciaId - a.evidenciaId);
  renderizarEvidencias(contenedor, alAlternar);
}

function renderizarEvidencias(contenedor, alAlternar) {
  if (pantalla.evidencias.length === 0) {
    contenedor.replaceChildren(crearElemento('p', {
      clase: 'small text-body-secondary mb-0',
      texto: 'El club aún no tiene evidencias activas que pueda vincular.'
    }));
    alAlternar();
    return;
  }
  contenedor.replaceChildren(...pantalla.evidencias.map(item => {
    const id = `${contenedor.id}-${item.evidenciaId}`;
    const casilla = crearElemento('input', { clase: 'form-check-input', atributos: { type: 'checkbox', id } });
    casilla.checked = pantalla.seleccionEvidencias.has(item.evidenciaId);
    casilla.disabled = item.estado !== 'ACTIVA' && !casilla.checked;
    casilla.addEventListener('change', () => {
      if (casilla.checked) {
        pantalla.seleccionEvidencias.add(item.evidenciaId);
      } else {
        pantalla.seleccionEvidencias.delete(item.evidenciaId);
      }
      alAlternar();
    });
    const tipo = TIPOS_EVIDENCIA[item.tipo] || { etiqueta: item.tipo, icono: 'bi-question' };
    const partes = [
      crearElemento('i', { clase: `bi ${tipo.icono} me-1`, atributos: { 'aria-hidden': 'true', title: tipo.etiqueta } }),
      document.createTextNode(item.titulo),
      crearElemento('span', {
        clase: 'text-body-secondary',
        texto: ` · ${formatearFecha(item.fechaEvidencia)}${item.actividadTema ? ` · ${item.actividadTema}` : ''}`
      })
    ];
    if (item.estado !== 'ACTIVA') {
      partes.push(document.createTextNode(' '));
      partes.push(insignia('Retirada', 'text-bg-secondary'));
    }
    const etiqueta = crearElemento('label', { clase: 'form-check-label small', atributos: { for: id } }, partes);
    return crearElemento('div', { clase: 'form-check' }, [casilla, etiqueta]);
  }));
  alAlternar();
}

function abrirFinalizar(proyecto) {
  pantalla.proyecto = proyecto;
  limpiarAlerta(elemento('alertas-finalizar'));
  elemento('finalizar-titulo').textContent = proyecto.titulo;
  elemento('finalizar-datos').textContent = datosCabecera(proyecto);
  elemento('finalizar-resultado').value = '';
  elemento('contador-finalizar-resultado').textContent = '0 / 2000';
  const fecha = elemento('finalizar-fecha');
  fecha.value = hoy();
  fecha.min = proyecto.fechaInicio;
  fecha.max = hoy();
  elemento('ayuda-finalizar-fecha').textContent = `Entre el ${formatearFecha(proyecto.fechaInicio)} (inicio) y hoy.`;
  cargarEvidenciasDelProyecto(proyecto, elemento('finalizar-evidencias'), () => {});
  modalFinalizar.show();
}

async function confirmarFinalizar(evento) {
  evento.preventDefault();
  const proyecto = pantalla.proyecto;
  const alertas = elemento('alertas-finalizar');
  const resultado = elemento('finalizar-resultado').value.trim();
  const fecha = elemento('finalizar-fecha').value;
  const problemas = [];
  if (!resultado) {
    problemas.push('Describa el resultado final del proyecto.');
  }
  if (!fecha) {
    problemas.push('Indique la fecha de finalización.');
  } else if (fecha < proyecto.fechaInicio || fecha > hoy()) {
    problemas.push('La fecha de finalización debe estar entre la fecha de inicio del proyecto y hoy.');
  }
  if (pantalla.seleccionEvidencias.size > MAXIMO_EVIDENCIAS) {
    problemas.push(`Un proyecto admite máximo ${MAXIMO_EVIDENCIAS} evidencias vinculadas.`);
  }
  if (problemas.length > 0) {
    mostrarAlerta(alertas, 'danger', 'Revise los datos ingresados:', problemas);
    return;
  }
  const boton = elemento('boton-confirmar-finalizar');
  establecerCargando(boton, true, 'Finalizando...');
  try {
    const finalizado = await apiFetch(`/api/proyectos/${proyecto.id}/finalizacion`, {
      metodo: 'POST',
      cuerpo: {
        resultadoFinal: resultado,
        fechaFinalizacion: fecha,
        evidenciaIds: Array.from(pantalla.seleccionEvidencias)
      }
    });
    modalFinalizar.hide();
    mostrarAlerta(elemento('alertas'), 'success',
      `Proyecto «${finalizado.titulo}» finalizado el ${formatearFecha(finalizado.fechaFinalizacion)} con ${plural(finalizado.evidencias.length, 'evidencia vinculada', 'evidencias vinculadas')}.`);
    await cargarProyectos(pantalla.pagina);
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

function abrirCancelar(proyecto) {
  pantalla.proyecto = proyecto;
  limpiarAlerta(elemento('alertas-cancelar'));
  elemento('cancelar-titulo').textContent = proyecto.titulo;
  elemento('cancelar-datos').textContent = datosCabecera(proyecto);
  elemento('cancelar-motivo').value = '';
  elemento('contador-cancelar-motivo').textContent = '0 / 500';
  modalCancelar.show();
}

async function confirmarCancelar(evento) {
  evento.preventDefault();
  const proyecto = pantalla.proyecto;
  const motivo = elemento('cancelar-motivo').value.trim();
  if (!motivo) {
    mostrarAlerta(elemento('alertas-cancelar'), 'danger', 'Indique el motivo de la cancelación.');
    return;
  }
  const boton = elemento('boton-confirmar-cancelar');
  establecerCargando(boton, true, 'Cancelando...');
  try {
    const cancelado = await apiFetch(`/api/proyectos/${proyecto.id}/cancelacion`, { metodo: 'POST', cuerpo: { motivo } });
    modalCancelar.hide();
    mostrarAlerta(elemento('alertas'), 'success', `Proyecto «${cancelado.titulo}» cancelado. Queda en el historial del club con su motivo.`);
    await cargarProyectos(pantalla.pagina);
  } catch (error) {
    mostrarAlerta(elemento('alertas-cancelar'), 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

function actualizarContadorEvidencias() {
  elemento('contador-evidencias').textContent =
    `${pantalla.seleccionEvidencias.size} de ${MAXIMO_EVIDENCIAS} evidencias seleccionadas`;
}

function abrirEvidencias(proyecto) {
  pantalla.proyecto = proyecto;
  limpiarAlerta(elemento('alertas-evidencias'));
  elemento('evidencias-titulo').textContent = proyecto.titulo;
  elemento('evidencias-datos').textContent = datosCabecera(proyecto);
  cargarEvidenciasDelProyecto(proyecto, elemento('lista-evidencias'), actualizarContadorEvidencias);
  modalEvidencias.show();
}

async function guardarEvidencias(evento) {
  evento.preventDefault();
  const proyecto = pantalla.proyecto;
  if (pantalla.seleccionEvidencias.size > MAXIMO_EVIDENCIAS) {
    mostrarAlerta(elemento('alertas-evidencias'), 'danger', `Un proyecto admite máximo ${MAXIMO_EVIDENCIAS} evidencias vinculadas.`);
    return;
  }
  const boton = elemento('boton-guardar-evidencias');
  establecerCargando(boton, true, 'Guardando...');
  try {
    const actualizado = await apiFetch(`/api/proyectos/${proyecto.id}/evidencias`, {
      metodo: 'PUT',
      cuerpo: { evidenciaIds: Array.from(pantalla.seleccionEvidencias) }
    });
    modalEvidencias.hide();
    mostrarAlerta(elemento('alertas'), 'success',
      `El proyecto «${actualizado.titulo}» quedó con ${plural(actualizado.evidencias.length, 'evidencia vinculada', 'evidencias vinculadas')}.`);
    await cargarProyectos(pantalla.pagina);
  } catch (error) {
    mostrarAlerta(elemento('alertas-evidencias'), 'danger', mensajeDe(error), mensajesDeError(error));
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
  elemento('detalle-bloqueo').hidden = true;
  elemento('detalle-datos').replaceChildren();
  elemento('detalle-integrantes').replaceChildren();
  elemento('detalle-evidencias').replaceChildren();
  elemento('detalle-avances').replaceChildren();
  elemento('grupo-detalle-resultado').hidden = true;
  elemento('grupo-detalle-cancelacion').hidden = true;
  elemento('enlace-detalle-avance').hidden = true;
  elemento('detalle-registro').textContent = '';
  modalDetalle.show();
  try {
    const proyecto = await apiFetch(`/api/proyectos/${id}`);
    if (solicitud !== pantalla.solicitudDetalle) {
      return;
    }
    renderizarDetalle(proyecto);
    const avances = await apiFetch(`/api/avances${construirConsulta({ proyectoId: id, tamano: 100 })}`);
    if (solicitud !== pantalla.solicitudDetalle) {
      return;
    }
    renderizarAvancesDelProyecto(avances.contenido);
  } catch (error) {
    if (solicitud !== pantalla.solicitudDetalle) {
      return;
    }
    elemento('detalle-titulo').textContent = 'Proyecto';
    mostrarAlerta(elemento('alertas-detalle'), 'danger', mensajeDe(error));
  }
}

function renderizarDetalle(proyecto) {
  elemento('detalle-titulo').textContent = proyecto.titulo;
  elemento('detalle-insignias').replaceChildren(insigniaTipo(proyecto.tipo), document.createTextNode(' '),
    insigniaEstado(proyecto.estado));
  elemento('detalle-club').textContent = esGlobal()
    ? `${proyecto.clubNombre} · ${proyecto.institucionNombre}`
    : proyecto.clubNombre;
  if (proyecto.motivoNoEditable) {
    elemento('detalle-bloqueo').textContent = proyecto.motivoNoEditable;
    elemento('detalle-bloqueo').hidden = false;
  }

  const datos = [];
  datos.push(...filaDato('Objetivo', proyecto.objetivo));
  datos.push(...filaDato('Descripción', proyecto.descripcion));
  datos.push(...filaDato('Docente tutor', proyecto.docenteNombre));
  datos.push(...filaDato('Inicio', formatearFecha(proyecto.fechaInicio)));
  datos.push(...filaDato('Fin previsto', proyecto.fechaFinPrevista ? formatearFecha(proyecto.fechaFinPrevista) : 'Sin fecha prevista'));
  const avance = proyecto.porcentajeAvance === null
    ? 'Sin avances registrados'
    : `${proyecto.porcentajeAvance} % · ${plural(proyecto.avancesRegistrados, 'avance', 'avances')}${proyecto.fechaUltimoAvance ? ` · último ${formatearFecha(proyecto.fechaUltimoAvance)}` : ''}`;
  datos.push(...filaDato('Avance', avance));
  elemento('detalle-datos').replaceChildren(...datos);

  if (proyecto.estado === 'FINALIZADO') {
    elemento('detalle-resultado').textContent = proyecto.resultadoFinal;
    elemento('detalle-finalizado').textContent =
      `Finalizado el ${formatearFecha(proyecto.fechaFinalizacion)} por ${proyecto.finalizadoPorNombre || '—'}`;
    elemento('grupo-detalle-resultado').hidden = false;
  }
  if (proyecto.estado === 'CANCELADO') {
    elemento('detalle-motivo-cancelacion').textContent = proyecto.motivoCancelacion;
    elemento('detalle-cancelado').textContent =
      `Cancelado por ${proyecto.canceladoPorNombre || '—'} el ${formatearFechaHora(proyecto.fechaCancelacion)}`;
    elemento('grupo-detalle-cancelacion').hidden = false;
  }

  elemento('detalle-integrantes').replaceChildren(...(proyecto.integrantes.length === 0
    ? [crearElemento('li', { clase: 'text-body-secondary', texto: 'Sin integrantes' })]
    : proyecto.integrantes.map(item => {
      const partes = [
        crearElemento('i', { clase: 'bi bi-person me-1', atributos: { 'aria-hidden': 'true' } }),
        document.createTextNode(textoIntegrante(item))
      ];
      if (!item.integranteActivoDelClub) {
        partes.push(document.createTextNode(' '));
        partes.push(insignia('Ya no es integrante activo', 'text-bg-light border'));
      }
      return crearElemento('li', { clase: 'mb-1' }, partes);
    })));

  elemento('detalle-evidencias').replaceChildren(...(proyecto.evidencias.length === 0
    ? [crearElemento('li', { clase: 'text-body-secondary', texto: 'Sin evidencias vinculadas' })]
    : proyecto.evidencias.map(item => {
      const tipo = TIPOS_EVIDENCIA[item.tipo] || { etiqueta: item.tipo, icono: 'bi-question' };
      const enlace = crearElemento('a', {
        texto: item.titulo,
        atributos: { href: `evidencias.html?actividadId=${item.actividadId}` }
      });
      const partes = [
        crearElemento('i', { clase: `bi ${tipo.icono} me-1`, atributos: { 'aria-hidden': 'true', title: tipo.etiqueta } }),
        enlace,
        crearElemento('span', { clase: 'text-body-secondary', texto: ` · ${formatearFecha(item.fechaEvidencia)}` })
      ];
      if (item.estado !== 'ACTIVA') {
        partes.push(document.createTextNode(' '));
        partes.push(insignia('Retirada', 'text-bg-secondary'));
      }
      return crearElemento('li', { clase: 'mb-1' }, partes);
    })));

  const registrar = elemento('enlace-detalle-avance');
  registrar.href = `avances.html?nuevo=PROYECTO&proyectoId=${proyecto.id}`;
  registrar.hidden = !proyecto.editable;
  elemento('enlace-detalle-avances').href = `avances.html?proyectoId=${proyecto.id}`;
  elemento('detalle-registro').textContent =
    `Registrado por ${proyecto.creadoPorNombre || '—'} el ${formatearFechaHora(proyecto.fechaRegistro)} · última actualización ${formatearFechaHora(proyecto.actualizadoEn)}`;
}

function renderizarAvancesDelProyecto(avances) {
  const contenedor = elemento('detalle-avances');
  if (avances.length === 0) {
    contenedor.replaceChildren(crearElemento('p', { clase: 'small text-body-secondary mb-0', texto: 'El proyecto aún no tiene avances registrados.' }));
    return;
  }
  contenedor.replaceChildren(...avances.map(avance => {
    const cabecera = crearElemento('div', { clase: 'd-flex flex-wrap align-items-center gap-2 mb-1' }, [
      crearElemento('span', { clase: 'fw-semibold', texto: formatearFecha(avance.fecha) }),
      insignia(`${avance.porcentajeAvance} %`, 'text-bg-primary'),
      crearElemento('span', { clase: 'small text-body-secondary', texto: `Registró ${avance.registradoPorNombre || '—'}` })
    ]);
    if (avance.actividadTema) {
      cabecera.appendChild(crearElemento('span', {
        clase: 'small text-body-secondary',
        texto: `· Sesión «${avance.actividadTema}» del ${formatearFecha(avance.actividadFecha)}`
      }));
    }
    const cuerpo = [cabecera, crearElemento('p', { clase: 'small mb-1 texto-preformateado', texto: avance.resultados })];
    [['Logros', avance.logros], ['Dificultades', avance.dificultades], ['Próximos pasos', avance.proximosPasos]]
      .filter(([, valor]) => valor)
      .forEach(([titulo, valor]) => {
        cuerpo.push(crearElemento('p', { clase: 'small mb-1 texto-preformateado' }, [
          crearElemento('span', { clase: 'fw-semibold', texto: `${titulo}: ` }),
          document.createTextNode(valor)
        ]));
      });
    return crearElemento('div', { clase: 'avance-proyecto ps-3 mb-3' }, cuerpo);
  }));
}
