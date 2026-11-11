import { apiFetch, construirConsulta, ApiError } from './api.js';
import { cargarClubes, cargarInstituciones, cargarPeriodos } from './catalogos.js';
import { exigirSesion } from './guard.js';
import { montarLayout } from './layout.js';
import {
  crearElemento,
  formatearFecha,
  formatearFechaHora,
  mostrarAlerta,
  limpiarAlerta,
  establecerCargando,
  mensajesDeError
} from './ui.js';

const ROLES_GLOBALES = ['ADMIN', 'COORDINADOR', 'CONSULTA'];
const NOMBRES_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre',
  'noviembre', 'diciembre'];

const SEMAFORO = {
  ADECUADO: { etiqueta: 'Adecuado', punto: 'semaforo-adecuado', borde: 'border-success', texto: 'text-success' },
  EN_RIESGO: { etiqueta: 'En riesgo', punto: 'semaforo-riesgo', borde: 'border-warning', texto: 'text-warning-emphasis' },
  CRITICO: { etiqueta: 'Crítico', punto: 'semaforo-critico', borde: 'border-danger', texto: 'text-danger' },
  SIN_DATOS: { etiqueta: 'Sin datos', punto: 'semaforo-sin-datos', borde: '', texto: 'text-body-secondary' }
};

const SITUACIONES = {
  EJECUTADA: { etiqueta: 'Ejecutada', clase: 'text-bg-success', fila: '' },
  POR_EJECUTAR: { etiqueta: 'Por ejecutar', clase: 'text-bg-info', fila: '' },
  POR_REGISTRAR: { etiqueta: 'Por registrar', clase: 'text-bg-warning', fila: 'fila-por-registrar' },
  VENCIDA: { etiqueta: 'Vencida', clase: 'text-bg-danger', fila: 'fila-vencida' },
  CANCELADA: { etiqueta: 'Cancelada', clase: 'text-bg-secondary', fila: 'fila-cancelada' }
};

const ESTADOS_CLUB = {
  PLANIFICADO: 'Planificado',
  ACTIVO: 'Activo',
  SUSPENDIDO: 'Suspendido',
  CERRADO: 'Cerrado'
};

const sesion = exigirSesion();
const pantalla = {
  resumen: null,
  club: null,
  parametros: null,
  resumenVigente: false,
  solicitudResumen: 0,
  solicitudClub: 0,
  solicitudReprogramaciones: 0
};
const catalogo = { clubes: [], clubesPorId: new Map(), instituciones: [], periodos: [], periodosPorId: new Map() };
let modalReprogramaciones = null;
let modalParametros = null;

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

function hhmm(texto) {
  return texto ? texto.slice(0, 5) : '';
}

function textoHorario(fecha, inicio, fin) {
  return `${formatearFecha(fecha)} ${hhmm(inicio)}–${hhmm(fin)}`;
}

function plural(cantidad, singular, varios) {
  return `${cantidad} ${cantidad === 1 ? singular : varios}`;
}

function numero(valor) {
  return Number(valor).toLocaleString('es-EC', { maximumFractionDigits: 1 });
}

function textoPorcentaje(valor) {
  return valor === null || valor === undefined ? '—' : `${numero(valor)} %`;
}

function textoMes(codigo) {
  const [anio, mes] = codigo.split('-');
  const nombre = NOMBRES_MES[Number(mes) - 1] || mes;
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

function textoDesplazamiento(dias) {
  if (dias === 0) {
    return 'Mismo día';
  }
  const absoluto = Math.abs(dias);
  const unidad = absoluto === 1 ? 'día' : 'días';
  return dias > 0 ? `${absoluto} ${unidad} después` : `${absoluto} ${unidad} antes`;
}

function insignia(texto, clase, titulo) {
  const atributos = titulo ? { title: titulo } : undefined;
  return crearElemento('span', { clase: `badge ${clase}`, texto, atributos });
}

function semaforo(estado, conTexto = true) {
  const datos = SEMAFORO[estado] || SEMAFORO.SIN_DATOS;
  const hijos = [crearElemento('span', { clase: `punto-semaforo ${datos.punto}`, atributos: { 'aria-hidden': 'true' } })];
  hijos.push(crearElemento('span', { clase: conTexto ? 'small' : 'visually-hidden', texto: datos.etiqueta }));
  return crearElemento('span', { clase: 'd-inline-flex align-items-center gap-1 text-nowrap' }, hijos);
}

function barraCumplimiento(indicadores) {
  const valor = indicadores.porcentajeCumplimiento;
  if (valor === null || valor === undefined) {
    return crearElemento('span', { clase: 'small text-body-secondary', texto: 'Sin sesiones exigibles' });
  }
  const color = indicadores.estado === 'ADECUADO' ? 'bg-success'
    : indicadores.estado === 'EN_RIESGO' ? 'bg-warning' : 'bg-danger';
  const relleno = crearElemento('div', { clase: `progress-bar ${color}` });
  relleno.style.width = `${Math.min(100, Math.max(0, valor))}%`;
  return crearElemento('div', { clase: 'd-flex align-items-center gap-2' }, [
    crearElemento('div', {
      clase: 'progress barra-avance flex-grow-1',
      atributos: {
        role: 'progressbar',
        'aria-label': 'Cumplimiento',
        'aria-valuenow': String(valor),
        'aria-valuemin': '0',
        'aria-valuemax': '100'
      }
    }, [relleno]),
    crearElemento('span', { clase: 'small fw-semibold text-nowrap', texto: textoPorcentaje(valor) })
  ]);
}

function cifra(valor, texto, clase = '', detalle = '') {
  const hijos = [
    crearElemento('div', { clase: 'fs-5 fw-semibold lh-sm', texto: String(valor) }),
    crearElemento('div', { clase: 'small text-body-secondary', texto })
  ];
  if (detalle) {
    hijos.push(crearElemento('div', { clase: 'small text-body-secondary', texto: detalle }));
  }
  return crearElemento('div', { clase: 'col-6 col-md-4 col-xl' }, [
    crearElemento('div', { clase: `border rounded p-2 h-100 ${clase}` }, hijos)
  ]);
}

function cifraSemaforo(estado, cantidad) {
  const datos = SEMAFORO[estado];
  return crearElemento('div', { clase: 'col-6 col-md-3' }, [
    crearElemento('div', { clase: `border rounded p-2 h-100 tarjeta-semaforo ${datos.borde}` }, [
      crearElemento('div', { clase: 'd-flex align-items-center gap-2' }, [
        crearElemento('span', { clase: `punto-semaforo ${datos.punto}`, atributos: { 'aria-hidden': 'true' } }),
        crearElemento('span', { clase: 'fs-5 fw-semibold lh-sm', texto: String(cantidad) })
      ]),
      crearElemento('div', { clase: 'small text-body-secondary', texto: `${cantidad === 1 ? 'club' : 'clubes'} ${datos.etiqueta.toLowerCase()}` })
    ])
  ]);
}

function indicadoresGenerales(indicadores) {
  return [
    cifra(textoPorcentaje(indicadores.porcentajeCumplimiento), 'cumplimiento',
      `tarjeta-semaforo ${SEMAFORO[indicadores.estado] ? SEMAFORO[indicadores.estado].borde : ''}`,
      `${indicadores.ejecutadas} de ${indicadores.exigibles} exigibles`),
    cifra(textoPorcentaje(indicadores.porcentajeEjecucion), 'ejecución del plan', '',
      `${indicadores.ejecutadas} de ${indicadores.validas} válidas`),
    cifra(`${numero(indicadores.horasEjecutadas)} / ${numero(indicadores.horasPlanificadas)} h`, 'horas ejecutadas', '',
      textoPorcentaje(indicadores.porcentajeHoras)),
    cifra(indicadores.vencidas, indicadores.vencidas === 1 ? 'vencida' : 'vencidas', indicadores.vencidas > 0 ? 'border-danger' : '',
      `${indicadores.porRegistrar} por registrar · ${indicadores.porEjecutar} por ejecutar`),
    cifra(indicadores.reprogramadas, indicadores.reprogramadas === 1 ? 'reprogramada' : 'reprogramadas', '', textoPorcentaje(indicadores.porcentajeReprogramacion)),
    cifra(textoPorcentaje(indicadores.porcentajeApegoFecha), 'en su fecha original', '',
      `${indicadores.ejecutadasEnFechaOriginal} de ${indicadores.ejecutadas} ejecutadas`),
    cifra(textoPorcentaje(indicadores.porcentajeRegistroOportuno), 'registro oportuno', '',
      `${indicadores.registradasATiempo} a tiempo · ${plural(indicadores.canceladas, 'cancelada', 'canceladas')}`)
  ];
}

function llenarSelect(selector, elementos, textoVacio, obtenerValor, obtenerTexto) {
  const opciones = [crearElemento('option', { texto: textoVacio, atributos: { value: '' } })];
  elementos.forEach(item => {
    opciones.push(crearElemento('option', { texto: obtenerTexto(item), atributos: { value: obtenerValor(item) } }));
  });
  selector.replaceChildren(...opciones);
}

function textoClub(club) {
  return esGlobal() ? `${club.nombre} — ${club.institucionNombre}` : club.nombre;
}

function filaMensaje(texto, columnas) {
  return crearElemento('tr', {}, [
    crearElemento('td', { clase: 'text-center text-body-secondary py-4', texto, atributos: { colspan: String(columnas) } })
  ]);
}

function mostrarPestana(id) {
  bootstrap.Tab.getOrCreateInstance(elemento(id)).show();
}

async function iniciar() {
  montarLayout(sesion, 'seguimiento');

  modalReprogramaciones = bootstrap.Modal.getOrCreateInstance(elemento('modal-reprogramaciones'));
  modalParametros = bootstrap.Modal.getOrCreateInstance(elemento('modal-parametros'));

  elemento('grupo-resumen-institucion').hidden = !esGlobal();
  elemento('boton-parametros').hidden = rolActual() !== 'ADMIN';
  elemento('boton-parametros').addEventListener('click', abrirParametros);
  elemento('formulario-parametros').addEventListener('submit', guardarParametros);

  elemento('formulario-resumen').addEventListener('submit', evento => {
    evento.preventDefault();
    cargarResumen();
  });
  elemento('resumen-periodo').addEventListener('change', ajustarRangoResumen);
  elemento('solo-alertas').addEventListener('change', renderizarClubesResumen);

  elemento('formulario-club').addEventListener('submit', evento => {
    evento.preventDefault();
    const clubId = Number(elemento('selector-club').value) || null;
    if (!clubId) {
      mostrarAlerta(elemento('alertas-club'), 'warning', 'Seleccione un club.');
      return;
    }
    cargarClub(clubId);
  });
  elemento('selector-club').addEventListener('change', () => {
    elemento('club-desde').value = '';
    elemento('club-hasta').value = '';
    const clubId = Number(elemento('selector-club').value) || null;
    if (clubId) {
      cargarClub(clubId);
    }
  });
  elemento('filtro-situacion').addEventListener('change', renderizarActividades);

  await cargarCatalogos();
  await cargarParametros();
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

  const activo = periodos.find(periodo => periodo.activo);
  llenarSelect(elemento('resumen-periodo'), catalogo.periodos, activo ? 'Período activo' : 'Seleccione un período',
    periodo => String(periodo.id), periodo => (periodo.activo ? `${periodo.nombre} (activo)` : periodo.nombre));
  if (activo) {
    elemento('resumen-periodo').value = String(activo.id);
  }
  ajustarRangoResumen();
  if (esGlobal()) {
    llenarSelect(elemento('resumen-institucion'), instituciones, 'Todas', item => String(item.id), item => item.nombre);
  }
  const seguibles = catalogo.clubes.filter(club => club.estado !== 'PLANIFICADO');
  llenarSelect(elemento('selector-club'), seguibles, seguibles.length ? 'Seleccione un club' : 'No hay clubes para mostrar',
    club => String(club.id), textoClub);
}

function ajustarRangoResumen() {
  const periodo = catalogo.periodosPorId.get(Number(elemento('resumen-periodo').value));
  ['resumen-desde', 'resumen-hasta'].forEach(id => {
    const campo = elemento(id);
    if (periodo) {
      campo.min = periodo.fechaInicio;
      campo.max = periodo.fechaFin;
    } else {
      campo.removeAttribute('min');
      campo.removeAttribute('max');
    }
    if (periodo && campo.value && (campo.value < periodo.fechaInicio || campo.value > periodo.fechaFin)) {
      campo.value = '';
    }
  });
}

async function cargarParametros() {
  try {
    pantalla.parametros = await apiFetch('/api/seguimiento/parametros');
    renderizarParametros();
  } catch (error) {
    elemento('parametros-texto').textContent = `No se pudieron cargar los parámetros. ${mensajeDe(error)}`;
  }
}

function renderizarParametros() {
  const parametros = pantalla.parametros;
  const texto = elemento('parametros-texto');
  const partes = [
    crearElemento('i', { clase: 'bi bi-sliders me-1', atributos: { 'aria-hidden': 'true' } }),
    document.createTextNode(`Gracia para registrar: ${plural(parametros.diasGraciaRegistro, 'día', 'días')} · Adecuado desde ${numero(parametros.umbralAdecuado)} % · Mínimo ${numero(parametros.umbralMinimo)} %`)
  ];
  if (parametros.actualizadoPorNombre) {
    partes.push(crearElemento('span', {
      clase: 'text-body-secondary',
      texto: ` · actualizado por ${parametros.actualizadoPorNombre} el ${formatearFechaHora(parametros.actualizadoEn)}`
    }));
  }
  texto.replaceChildren(...partes);
  elemento('leyenda-adecuado').textContent = `Adecuado (≥ ${numero(parametros.umbralAdecuado)} %)`;
  elemento('leyenda-riesgo').textContent = `En riesgo (${numero(parametros.umbralMinimo)} a ${numero(parametros.umbralAdecuado)} %)`;
  elemento('leyenda-critico').textContent = `Crítico (< ${numero(parametros.umbralMinimo)} %)`;
}

function aplicarParametrosIniciales() {
  const parametros = new URLSearchParams(window.location.search);
  const clubId = Number(parametros.get('clubId')) || null;
  if (clubId) {
    if (catalogo.clubesPorId.has(clubId)) {
      elemento('selector-club').value = String(clubId);
    }
    mostrarPestana('pestana-club');
    cargarClub(clubId);
    return;
  }
  cargarResumen();
}

async function cargarResumen() {
  const solicitud = ++pantalla.solicitudResumen;
  const desde = elemento('resumen-desde').value;
  const hasta = elemento('resumen-hasta').value;
  const alertas = elemento('alertas-resumen');
  if (desde && hasta && hasta < desde) {
    mostrarAlerta(alertas, 'danger', 'La fecha «hasta» no puede ser anterior a «desde».');
    return;
  }
  limpiarAlerta(alertas);
  const boton = elemento('boton-resumen');
  establecerCargando(boton, true, 'Calculando...');
  try {
    const resumen = await apiFetch(`/api/seguimiento/resumen${construirConsulta({
      periodoId: elemento('resumen-periodo').value,
      institucionId: esGlobal() ? elemento('resumen-institucion').value : '',
      desde,
      hasta
    })}`);
    if (solicitud !== pantalla.solicitudResumen) {
      return;
    }
    pantalla.resumen = resumen;
    pantalla.parametros = resumen.parametros;
    renderizarParametros();
    renderizarResumen();
  } catch (error) {
    if (solicitud === pantalla.solicitudResumen) {
      elemento('resumen').hidden = true;
      mostrarAlerta(alertas, 'danger', mensajeDe(error));
    }
  } finally {
    establecerCargando(boton, false);
  }
}

function renderizarResumen() {
  const resumen = pantalla.resumen;
  elemento('resumen').hidden = false;
  const institucion = resumen.institucionId && esGlobal()
    ? catalogo.instituciones.find(item => item.id === resumen.institucionId)
    : null;
  elemento('resumen-titulo').textContent = `Período ${resumen.periodoNombre}${institucion ? ` · ${institucion.nombre}` : ''} · del ${formatearFecha(resumen.desde)} al ${formatearFecha(resumen.hasta)} · corte al ${formatearFecha(resumen.fechaCorte)}. Son exigibles las sesiones planificadas hasta el ${formatearFecha(resumen.exigibleHasta)} (${plural(resumen.parametros.diasGraciaRegistro, 'día', 'días')} de gracia).`;
  elemento('resumen-semaforo').replaceChildren(
    cifraSemaforo('ADECUADO', resumen.clubesAdecuados),
    cifraSemaforo('EN_RIESGO', resumen.clubesEnRiesgo),
    cifraSemaforo('CRITICO', resumen.clubesCriticos),
    cifraSemaforo('SIN_DATOS', resumen.clubesSinDatos)
  );
  elemento('resumen-indicadores').replaceChildren(...indicadoresGenerales(resumen.totales));

  const mostrarInstituciones = esGlobal() && resumen.instituciones.length > 1;
  elemento('grupo-instituciones').hidden = !mostrarInstituciones;
  if (mostrarInstituciones) {
    elemento('cuerpo-instituciones').replaceChildren(...resumen.instituciones.map(item => crearElemento('tr', {}, [
      crearElemento('td', {}, [
        crearElemento('div', { clase: 'd-flex align-items-center gap-2' }, [semaforo(item.indicadores.estado, false),
          crearElemento('span', { texto: item.institucionNombre })])
      ]),
      crearElemento('td', { clase: 'text-end', texto: String(item.clubes) }),
      crearElemento('td', { clase: 'text-end', texto: `${item.indicadores.ejecutadas} / ${item.indicadores.exigibles}` }),
      crearElemento('td', {}, [barraCumplimiento(item.indicadores)]),
      crearElemento('td', { clase: 'text-end', texto: String(item.indicadores.vencidas) }),
      crearElemento('td', { clase: 'text-end', texto: String(item.indicadores.reprogramadas) })
    ])));
  }
  renderizarClubesResumen();
  renderizarMeses(elemento('cuerpo-meses'), resumen.meses);
}

function renderizarClubesResumen() {
  const resumen = pantalla.resumen;
  if (!resumen) {
    return;
  }
  const soloAlertas = elemento('solo-alertas').checked;
  const orden = { CRITICO: 0, EN_RIESGO: 1, ADECUADO: 2, SIN_DATOS: 3 };
  const clubes = resumen.clubes
    .filter(club => !soloAlertas || club.indicadores.estado === 'CRITICO' || club.indicadores.estado === 'EN_RIESGO')
    .slice()
    .sort((a, b) => (orden[a.indicadores.estado] - orden[b.indicadores.estado])
      || ((a.indicadores.porcentajeCumplimiento ?? 101) - (b.indicadores.porcentajeCumplimiento ?? 101))
      || a.clubNombre.localeCompare(b.clubNombre, 'es'));
  const cuerpo = elemento('cuerpo-clubes');
  if (clubes.length === 0) {
    cuerpo.replaceChildren(filaMensaje(soloAlertas ? 'Ningún club está en riesgo ni en estado crítico.' : 'No hay clubes en el período.', 10));
    return;
  }
  cuerpo.replaceChildren(...clubes.map(club => {
    const indicadores = club.indicadores;
    const nombre = [crearElemento('div', { texto: club.clubNombre })];
    const detalle = esGlobal() ? `${club.institucionNombre} · ${club.docenteNombre || '—'}` : club.docenteNombre || '—';
    nombre.push(crearElemento('div', { clase: 'small text-body-secondary', texto: detalle }));
    if (club.estadoClub !== 'ACTIVO') {
      nombre.push(insignia(ESTADOS_CLUB[club.estadoClub] || club.estadoClub, 'text-bg-secondary'));
    }
    const fechas = crearElemento('div', { clase: 'small text-nowrap' }, [
      crearElemento('div', { texto: `Última: ${club.ultimaEjecucion ? formatearFecha(club.ultimaEjecucion) : '—'}` }),
      crearElemento('div', { clase: 'text-body-secondary', texto: `Próxima: ${club.proximaActividad ? formatearFecha(club.proximaActividad) : '—'}` })
    ]);
    const ver = crearElemento('button', {
      clase: 'btn btn-sm btn-outline-primary',
      atributos: { type: 'button', title: 'Ver detalle', 'aria-label': `Ver detalle: ${club.clubNombre}` }
    }, [crearElemento('i', { clase: 'bi bi-list-check', atributos: { 'aria-hidden': 'true' } })]);
    ver.addEventListener('click', () => {
      if (catalogo.clubesPorId.has(club.clubId)) {
        elemento('selector-club').value = String(club.clubId);
      }
      elemento('club-desde').value = pantalla.resumen.desde;
      elemento('club-hasta').value = pantalla.resumen.hasta;
      mostrarPestana('pestana-club');
      cargarClub(club.clubId);
    });
    const vencidas = crearElemento('td', { clase: 'text-end', texto: String(indicadores.vencidas) });
    if (indicadores.vencidas > 0) {
      vencidas.classList.add('text-danger', 'fw-semibold');
    }
    return crearElemento('tr', {}, [
      crearElemento('td', {}, [semaforo(indicadores.estado)]),
      crearElemento('td', {}, nombre),
      crearElemento('td', { clase: 'text-end', texto: `${indicadores.ejecutadas} / ${indicadores.exigibles}` }),
      crearElemento('td', {}, [barraCumplimiento(indicadores)]),
      vencidas,
      crearElemento('td', { clase: 'text-end', texto: String(indicadores.porRegistrar) }),
      crearElemento('td', { clase: 'text-end', texto: String(indicadores.reprogramadas) }),
      crearElemento('td', { clase: 'text-end text-nowrap', texto: `${numero(indicadores.horasEjecutadas)} / ${numero(indicadores.horasPlanificadas)}` }),
      crearElemento('td', {}, [fechas]),
      crearElemento('td', { clase: 'text-end' }, [ver])
    ]);
  }));
}

function renderizarMeses(cuerpo, meses) {
  const conDatos = meses.filter(mes => mes.indicadores.planificadas > 0);
  if (conDatos.length === 0) {
    cuerpo.replaceChildren(filaMensaje('No hay actividades planificadas en el rango.', 6));
    return;
  }
  cuerpo.replaceChildren(...conDatos.map(mes => crearElemento('tr', {}, [
    crearElemento('td', { clase: 'text-nowrap', texto: textoMes(mes.mes) }),
    crearElemento('td', { clase: 'text-end', texto: String(mes.indicadores.planificadas) }),
    crearElemento('td', { clase: 'text-end', texto: String(mes.indicadores.ejecutadas) }),
    crearElemento('td', { clase: 'text-end', texto: String(mes.indicadores.vencidas) }),
    crearElemento('td', { clase: 'text-end', texto: String(mes.indicadores.canceladas) }),
    crearElemento('td', {}, [crearElemento('div', { clase: 'd-flex align-items-center gap-2' }, [
      semaforo(mes.indicadores.estado, false),
      barraCumplimiento(mes.indicadores)
    ])])
  ])));
}

async function cargarClub(clubId) {
  const solicitud = ++pantalla.solicitudClub;
  const desde = elemento('club-desde').value;
  const hasta = elemento('club-hasta').value;
  const alertas = elemento('alertas-club');
  if (desde && hasta && hasta < desde) {
    mostrarAlerta(alertas, 'danger', 'La fecha «hasta» no puede ser anterior a «desde».');
    return;
  }
  limpiarAlerta(alertas);
  const boton = elemento('boton-club');
  establecerCargando(boton, true, 'Cargando...');
  try {
    const datos = await apiFetch(`/api/seguimiento/clubes/${clubId}${construirConsulta({ desde, hasta })}`);
    if (solicitud !== pantalla.solicitudClub) {
      return;
    }
    pantalla.club = datos;
    pantalla.parametros = datos.parametros;
    renderizarParametros();
    renderizarClub();
  } catch (error) {
    if (solicitud === pantalla.solicitudClub) {
      pantalla.club = null;
      elemento('club').hidden = true;
      elemento('club-vacio').hidden = false;
      mostrarAlerta(alertas, 'danger', mensajeDe(error));
    }
  } finally {
    establecerCargando(boton, false);
  }
}

function renderizarClub() {
  const datos = pantalla.club;
  elemento('club-vacio').hidden = true;
  elemento('club').hidden = false;
  elemento('club-nombre').textContent = datos.clubNombre;
  elemento('club-semaforo').replaceChildren(semaforo(datos.indicadores.estado));
  const partes = [];
  if (esGlobal()) {
    partes.push(datos.institucionNombre);
  }
  partes.push(`Docente: ${datos.docenteNombre || '—'}`);
  partes.push(`Club ${(ESTADOS_CLUB[datos.estadoClub] || datos.estadoClub).toLowerCase()}`);
  partes.push(`Período ${datos.periodoNombre}: del ${formatearFecha(datos.desde)} al ${formatearFecha(datos.hasta)}`);
  partes.push(`exigibles hasta el ${formatearFecha(datos.exigibleHasta)}`);
  elemento('club-datos').textContent = partes.join(' · ');
  if (!elemento('club-desde').value && !elemento('club-hasta').value) {
    elemento('club-desde').min = datos.desde;
    elemento('club-hasta').max = datos.hasta;
  }
  elemento('enlace-actividades').href = `actividades.html?clubId=${datos.clubId}`;
  elemento('club-indicadores').replaceChildren(...indicadoresGenerales(datos.indicadores));
  renderizarMeses(elemento('cuerpo-club-meses'), datos.meses);
  renderizarActividades();
}

function textoRegistro(actividad) {
  switch (actividad.situacion) {
    case 'EJECUTADA': {
      const hijos = [];
      if (actividad.diasHastaRegistro !== null && actividad.diasHastaRegistro !== undefined) {
        const dias = actividad.diasHastaRegistro;
        hijos.push(document.createTextNode(dias === 0 ? 'Registrada el mismo día ' : `Registrada ${plural(dias, 'día', 'días')} después `));
        hijos.push(actividad.registroOportuno
          ? insignia('A tiempo', 'text-bg-success')
          : insignia('Tardía', 'text-bg-warning', 'Se registró después de los días de gracia'));
      } else {
        hijos.push(document.createTextNode('Ejecutada'));
      }
      return hijos;
    }
    case 'VENCIDA':
      return [document.createTextNode(`Sin registrar hace ${plural(actividad.diasDeAtraso, 'día', 'días')}; se pasó el plazo de gracia.`)];
    case 'POR_REGISTRAR':
      return [document.createTextNode(`Pasó hace ${plural(actividad.diasDeAtraso, 'día', 'días')}; aún está dentro del plazo para registrarla.`)];
    case 'POR_EJECUTAR':
      return [document.createTextNode('Programada a futuro.')];
    case 'CANCELADA':
      return [document.createTextNode(`Cancelada: ${actividad.motivoCancelacion || '—'}`)];
    default:
      return [document.createTextNode('—')];
  }
}

function renderizarActividades() {
  const datos = pantalla.club;
  if (!datos) {
    return;
  }
  const filtro = elemento('filtro-situacion').value;
  const actividades = datos.actividades.filter(actividad => !filtro
    || (filtro === 'REPROGRAMADA' ? actividad.reprogramaciones > 0 : actividad.situacion === filtro));
  const cuerpo = elemento('cuerpo-actividades');
  if (actividades.length === 0) {
    cuerpo.replaceChildren(filaMensaje(filtro ? 'No hay actividades con esa situación.' : 'El club no tiene actividades en el rango.', 6));
    return;
  }
  cuerpo.replaceChildren(...actividades.map(actividad => {
    const situacion = SITUACIONES[actividad.situacion] || { etiqueta: actividad.situacion, clase: 'text-bg-light', fila: '' };
    const fecha = [crearElemento('div', { clase: 'text-nowrap', texto: textoHorario(actividad.fecha, actividad.horaInicio, actividad.horaFin) })];
    if (actividad.reprogramaciones > 0) {
      fecha.push(crearElemento('div', {
        clase: 'small text-body-secondary text-nowrap',
        texto: `Original: ${textoHorario(actividad.fechaOriginal, actividad.horaInicioOriginal, actividad.horaFinOriginal)}`
      }));
    }
    const tema = [crearElemento('div', { texto: actividad.tema })];
    if (actividad.cursoNombre) {
      tema.push(crearElemento('div', { clase: 'small text-body-secondary', texto: `Curso: ${actividad.cursoNombre}` }));
    }
    const etiquetas = [insignia(situacion.etiqueta, situacion.clase)];
    if (actividad.reprogramaciones > 0) {
      const boton = crearElemento('button', {
        clase: 'btn btn-link btn-sm p-0 ms-2 align-baseline',
        texto: `Reprogramada ${actividad.reprogramaciones === 1 ? '1 vez' : `${actividad.reprogramaciones} veces`}`,
        atributos: { type: 'button' }
      });
      boton.addEventListener('click', () => abrirReprogramaciones(actividad));
      etiquetas.push(boton);
    }
    const ver = crearElemento('a', {
      clase: 'btn btn-sm btn-outline-secondary',
      atributos: { href: `actividades.html?id=${actividad.id}`, title: 'Ver actividad', 'aria-label': `Ver actividad: ${actividad.tema}` }
    }, [crearElemento('i', { clase: 'bi bi-eye', atributos: { 'aria-hidden': 'true' } })]);
    const fila = crearElemento('tr', {}, [
      crearElemento('td', {}, fecha),
      crearElemento('td', {}, tema),
      crearElemento('td', { clase: 'small', texto: actividad.responsableNombre || '—' }),
      crearElemento('td', { clase: 'text-nowrap' }, etiquetas),
      crearElemento('td', { clase: 'small' }, textoRegistro(actividad)),
      crearElemento('td', { clase: 'text-end' }, [ver])
    ]);
    if (situacion.fila) {
      fila.classList.add(situacion.fila);
    }
    return fila;
  }));
}

async function abrirReprogramaciones(actividad) {
  const solicitud = ++pantalla.solicitudReprogramaciones;
  limpiarAlerta(elemento('alertas-reprogramaciones'));
  elemento('reprogramaciones-tema').textContent = actividad.tema;
  elemento('reprogramaciones-datos').textContent =
    `Fecha original ${textoHorario(actividad.fechaOriginal, actividad.horaInicioOriginal, actividad.horaFinOriginal)} · fecha vigente ${textoHorario(actividad.fecha, actividad.horaInicio, actividad.horaFin)}`;
  const cuerpo = elemento('cuerpo-reprogramaciones');
  cuerpo.replaceChildren(filaMensaje('Cargando historial...', 6));
  modalReprogramaciones.show();
  try {
    const lista = await apiFetch(`/api/actividades/${actividad.id}/reprogramaciones`);
    if (solicitud !== pantalla.solicitudReprogramaciones) {
      return;
    }
    cuerpo.replaceChildren(...(lista.length === 0
      ? [filaMensaje('La actividad no tiene reprogramaciones.', 6)]
      : lista.map((item, indice) => crearElemento('tr', {}, [
        crearElemento('td', { texto: String(indice + 1) }),
        crearElemento('td', { clase: 'text-nowrap', texto: textoHorario(item.fechaAnterior, item.horaInicioAnterior, item.horaFinAnterior) }),
        crearElemento('td', { clase: 'text-nowrap', texto: textoHorario(item.fechaNueva, item.horaInicioNueva, item.horaFinNueva) }),
        crearElemento('td', { clase: 'text-nowrap', texto: textoDesplazamiento(item.diasDeDesplazamiento) }),
        crearElemento('td', { clase: 'texto-preformateado', texto: item.motivo }),
        crearElemento('td', { clase: 'small' }, [
          crearElemento('div', { texto: item.registradoPorNombre || '—' }),
          crearElemento('div', { clase: 'text-body-secondary', texto: formatearFechaHora(item.fechaRegistro) })
        ])
      ]))));
  } catch (error) {
    if (solicitud === pantalla.solicitudReprogramaciones) {
      cuerpo.replaceChildren();
      mostrarAlerta(elemento('alertas-reprogramaciones'), 'danger', mensajeDe(error));
    }
  }
}

function abrirParametros() {
  const parametros = pantalla.parametros;
  limpiarAlerta(elemento('alertas-parametros'));
  elemento('campo-gracia').value = parametros ? String(parametros.diasGraciaRegistro) : '';
  elemento('campo-adecuado').value = parametros ? String(parametros.umbralAdecuado) : '';
  elemento('campo-minimo').value = parametros ? String(parametros.umbralMinimo) : '';
  modalParametros.show();
}

function decimalValido(texto) {
  return /^\d{1,3}(\.\d)?$/.test(texto);
}

async function guardarParametros(evento) {
  evento.preventDefault();
  const gracia = elemento('campo-gracia').value.trim();
  const adecuado = elemento('campo-adecuado').value.trim();
  const minimo = elemento('campo-minimo').value.trim();
  const problemas = [];
  if (!/^\d+$/.test(gracia) || Number(gracia) > 15) {
    problemas.push('Los días de gracia van de 0 a 15.');
  }
  if (!decimalValido(adecuado) || Number(adecuado) <= 0 || Number(adecuado) > 100) {
    problemas.push('El umbral adecuado debe ser mayor que 0 y no superar 100, con un decimal como máximo.');
  }
  if (!decimalValido(minimo) || Number(minimo) <= 0 || Number(minimo) > 100) {
    problemas.push('El umbral mínimo debe ser mayor que 0 y no superar 100, con un decimal como máximo.');
  }
  if (problemas.length === 0 && Number(minimo) >= Number(adecuado)) {
    problemas.push('El umbral mínimo debe ser menor que el umbral adecuado.');
  }
  if (problemas.length > 0) {
    mostrarAlerta(elemento('alertas-parametros'), 'danger', 'Revise los parámetros:', problemas);
    return;
  }
  const boton = elemento('boton-guardar-parametros');
  establecerCargando(boton, true, 'Guardando...');
  try {
    pantalla.parametros = await apiFetch('/api/seguimiento/parametros', {
      metodo: 'PUT',
      cuerpo: { diasGraciaRegistro: Number(gracia), umbralAdecuado: Number(adecuado), umbralMinimo: Number(minimo) }
    });
    modalParametros.hide();
    renderizarParametros();
    mostrarAlerta(elemento('alertas'), 'success', 'Parámetros actualizados. El semáforo se recalculó con los nuevos valores.');
    await cargarResumen();
    if (pantalla.club) {
      await cargarClub(pantalla.club.clubId);
    }
  } catch (error) {
    mostrarAlerta(elemento('alertas-parametros'), 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}
