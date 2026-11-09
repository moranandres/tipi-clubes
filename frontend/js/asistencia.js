import { apiFetch, construirConsulta, ApiError } from './api.js';
import { cargarClubes, cargarCursosDelClub, cargarActividadesDelClub } from './catalogos.js';
import { confirmar } from './confirmacion.js';
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
const ROLES_DATOS_MINIMOS = ['COORDINADOR', 'CONSULTA'];

const ESTADOS_ASISTENCIA = [
  { codigo: 'PRESENTE', etiqueta: 'Presente', clase: 'btn-outline-success', insignia: 'text-bg-success' },
  { codigo: 'ATRASADO', etiqueta: 'Atrasado', clase: 'btn-outline-warning', insignia: 'text-bg-warning' },
  { codigo: 'AUSENTE', etiqueta: 'Ausente', clase: 'btn-outline-danger', insignia: 'text-bg-danger' },
  { codigo: 'JUSTIFICADO', etiqueta: 'Justificado', clase: 'btn-outline-info', insignia: 'text-bg-info' }
];

const ESTADOS_ACTIVIDAD = {
  PLANIFICADA: { etiqueta: 'Planificada', clase: 'text-bg-info' },
  EJECUTADA: { etiqueta: 'Ejecutada', clase: 'text-bg-success' },
  CANCELADA: { etiqueta: 'Cancelada', clase: 'text-bg-secondary' }
};

const sesion = exigirSesion();
const pantalla = {
  clubId: null,
  planilla: null,
  borrador: new Map(),
  solicitudSesiones: 0,
  solicitudPlanilla: 0,
  solicitudResumen: 0,
  guardando: false
};
const catalogo = { clubes: [], clubesPorId: new Map() };
let modalCorrecciones = null;

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

function vistaMinima() {
  return ROLES_DATOS_MINIMOS.includes(rolActual());
}

function mensajeDe(error) {
  return error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
}

function hhmm(texto) {
  return texto ? texto.slice(0, 5) : '';
}

function estadoAsistencia(codigo) {
  return ESTADOS_ASISTENCIA.find(estado => estado.codigo === codigo) || null;
}

function normalizar(texto) {
  const valor = (texto || '').trim();
  return valor === '' ? null : valor;
}

function textoPorcentaje(valor) {
  return valor === null || valor === undefined ? '—' : `${Number(valor).toLocaleString('es-EC', { maximumFractionDigits: 1 })} %`;
}

function nombreEstudiante(fila) {
  if (!fila.estudianteNombres && !fila.estudianteApellidos) {
    return null;
  }
  return `${fila.estudianteApellidos || ''} ${fila.estudianteNombres || ''}`.trim();
}

async function iniciar() {
  montarLayout(sesion, 'asistencia');
  modalCorrecciones = bootstrap.Modal.getOrCreateInstance(elemento('modal-correcciones'));

  const minima = vistaMinima();
  elemento('columna-estudiante').hidden = minima;
  elemento('columna-observacion').hidden = minima;
  elemento('columna-resumen-estudiante').hidden = minima;

  elemento('selector-club').addEventListener('change', cambiarClub);
  elemento('selector-actividad').addEventListener('change', cambiarActividad);
  elemento('formulario-asistencia').addEventListener('submit', guardarAsistencia);
  elemento('boton-todos-presentes').addEventListener('click', marcarPendientesPresentes);
  elemento('boton-deshacer').addEventListener('click', deshacerCambios);
  elemento('boton-correcciones').addEventListener('click', abrirCorrecciones);
  elemento('motivo-correccion').addEventListener('input', () => {
    elemento('contador-motivo-correccion').textContent = `${elemento('motivo-correccion').value.length} / 500`;
  });
  elemento('formulario-resumen').addEventListener('submit', evento => {
    evento.preventDefault();
    cargarResumen();
  });

  window.addEventListener('beforeunload', evento => {
    if (cambiosPendientes().total > 0 && !pantalla.guardando) {
      evento.preventDefault();
      evento.returnValue = '';
    }
  });

  await cargarCatalogos();
  await aplicarParametrosIniciales();
}

async function cargarCatalogos() {
  try {
    const clubes = await cargarClubes();
    catalogo.clubes = clubes.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    catalogo.clubesPorId = new Map(catalogo.clubes.map(club => [club.id, club]));
    llenarClubes();
    if (catalogo.clubes.length === 0) {
      elemento('ayuda-club').textContent = 'No tiene clubes asignados en su alcance.';
    }
  } catch (error) {
    mostrarAlerta(elemento('alertas'), 'danger', `No se pudieron cargar los clubes. ${mensajeDe(error)}`);
  }
}

function textoClub(club) {
  return esGlobal() ? `${club.nombre} — ${club.institucionNombre}` : club.nombre;
}

function llenarClubes() {
  const opciones = [crearElemento('option', { texto: 'Seleccione un club', atributos: { value: '' } })];
  catalogo.clubes.forEach(club => {
    opciones.push(crearElemento('option', { texto: textoClub(club), atributos: { value: String(club.id) } }));
  });
  elemento('selector-club').replaceChildren(...opciones);
}

function asegurarOpcionClub(clubId, nombre) {
  const selector = elemento('selector-club');
  if (!selector.querySelector(`option[value="${clubId}"]`)) {
    selector.appendChild(crearElemento('option', { texto: nombre, atributos: { value: String(clubId) } }));
  }
  selector.value = String(clubId);
}

async function aplicarParametrosIniciales() {
  const parametros = new URLSearchParams(window.location.search);
  const actividadId = Number(parametros.get('actividadId'));
  if (Number.isInteger(actividadId) && actividadId > 0) {
    await abrirActividadDirecta(actividadId);
    return;
  }
  const clubId = Number(parametros.get('clubId'));
  if (clubId && catalogo.clubesPorId.has(clubId)) {
    elemento('selector-club').value = String(clubId);
    await seleccionarClub(clubId, null);
  } else if (catalogo.clubes.length === 1) {
    elemento('selector-club').value = String(catalogo.clubes[0].id);
    await seleccionarClub(catalogo.clubes[0].id, null);
  }
}

async function abrirActividadDirecta(actividadId) {
  try {
    const planilla = await apiFetch(`/api/actividades/${actividadId}/asistencia`);
    asegurarOpcionClub(planilla.clubId, planilla.clubNombre);
    await seleccionarClub(planilla.clubId, planilla);
  } catch (error) {
    mostrarAlerta(elemento('alertas'), 'danger', `No se pudo abrir la planilla solicitada. ${mensajeDe(error)}`);
  }
}

async function descartarCambios() {
  if (cambiosPendientes().total === 0) {
    return true;
  }
  return confirmar({
    titulo: 'Descartar cambios',
    mensaje: 'Tiene cambios de asistencia sin guardar en la sesión actual. Si continúa, se perderán.',
    textoAceptar: 'Descartar cambios'
  });
}

async function cambiarClub() {
  const nuevo = Number(elemento('selector-club').value) || null;
  if (!(await descartarCambios())) {
    elemento('selector-club').value = pantalla.clubId ? String(pantalla.clubId) : '';
    return;
  }
  await seleccionarClub(nuevo, null);
}

async function seleccionarClub(clubId, planillaInicial) {
  pantalla.clubId = clubId;
  limpiarAlerta(elemento('alertas'));
  elemento('enlace-actividades').href = clubId ? `actividades.html?clubId=${clubId}` : 'actividades.html';
  ocultarPlanilla();
  reiniciarResumen();
  if (!clubId) {
    const selector = elemento('selector-actividad');
    selector.replaceChildren(crearElemento('option', { texto: 'Seleccione primero un club', atributos: { value: '' } }));
    selector.disabled = true;
    return;
  }
  const enAlcance = catalogo.clubesPorId.has(clubId);
  const tareas = [cargarSesiones(clubId, planillaInicial)];
  if (enAlcance) {
    tareas.push(cargarCursosResumen(clubId));
  }
  await Promise.all(tareas);
  if (planillaInicial) {
    mostrarPlanilla(planillaInicial);
  }
  if (enAlcance) {
    cargarResumen();
  } else {
    elemento('resumen-vacio').textContent =
      'El resumen de asistencia está disponible para los clubes que coordina o administra. De este club solo puede ver las sesiones a su cargo.';
    elemento('boton-resumen').disabled = true;
  }
}

async function cargarSesiones(clubId, planillaInicial) {
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
    if (planillaInicial && !selector.querySelector(`option[value="${planillaInicial.actividadId}"]`)) {
      const estado = ESTADOS_ACTIVIDAD[planillaInicial.estadoActividad];
      selector.appendChild(crearElemento('option', {
        texto: `${formatearFecha(planillaInicial.fecha)} ${hhmm(planillaInicial.horaInicio)} · ${planillaInicial.actividadTema} (${estado ? estado.etiqueta : planillaInicial.estadoActividad})`,
        atributos: { value: String(planillaInicial.actividadId) }
      }));
    }
    if (planillaInicial) {
      selector.value = String(planillaInicial.actividadId);
    }
    selector.disabled = selector.options.length <= 1;
  } catch (error) {
    if (solicitud === pantalla.solicitudSesiones) {
      selector.replaceChildren(crearElemento('option', { texto: 'No se pudieron cargar las sesiones', atributos: { value: '' } }));
      mostrarAlerta(elemento('alertas'), 'danger', mensajeDe(error));
    }
  }
}

async function cambiarActividad() {
  const actividadId = Number(elemento('selector-actividad').value) || null;
  const actual = pantalla.planilla ? pantalla.planilla.actividadId : null;
  if (!(await descartarCambios())) {
    elemento('selector-actividad').value = actual ? String(actual) : '';
    return;
  }
  if (!actividadId) {
    ocultarPlanilla();
    return;
  }
  await cargarPlanilla(actividadId);
}

async function cargarPlanilla(actividadId) {
  const solicitud = ++pantalla.solicitudPlanilla;
  limpiarAlerta(elemento('alertas-planilla'));
  try {
    const planilla = await apiFetch(`/api/actividades/${actividadId}/asistencia`);
    if (solicitud !== pantalla.solicitudPlanilla) {
      return;
    }
    mostrarPlanilla(planilla);
  } catch (error) {
    if (solicitud === pantalla.solicitudPlanilla) {
      ocultarPlanilla();
      mostrarAlerta(elemento('alertas-planilla'), 'danger', mensajeDe(error));
    }
  }
}

function ocultarPlanilla() {
  pantalla.planilla = null;
  pantalla.borrador = new Map();
  elemento('planilla').hidden = true;
  elemento('planilla-vacia').hidden = false;
  limpiarAlerta(elemento('alertas-guardado'));
}

function cifra(valor, texto, clase = '') {
  return crearElemento('div', { clase: 'col-6 col-md-3 col-xl' }, [
    crearElemento('div', { clase: `border rounded p-2 h-100 ${clase}` }, [
      crearElemento('div', { clase: 'fs-5 fw-semibold lh-sm', texto: String(valor) }),
      crearElemento('div', { clase: 'small text-body-secondary', texto })
    ])
  ]);
}

function mostrarPlanilla(planilla) {
  pantalla.planilla = planilla;
  pantalla.borrador = new Map();
  planilla.estudiantes.forEach(fila => {
    pantalla.borrador.set(fila.estudianteId, {
      estado: fila.estado || null,
      observacion: fila.observacion || ''
    });
  });

  elemento('planilla-vacia').hidden = true;
  elemento('planilla').hidden = false;
  limpiarAlerta(elemento('alertas-guardado'));

  const estado = ESTADOS_ACTIVIDAD[planilla.estadoActividad] || { etiqueta: planilla.estadoActividad, clase: 'text-bg-light' };
  elemento('planilla-tema').textContent = planilla.actividadTema;
  elemento('planilla-estado').replaceChildren(crearElemento('span', { clase: `badge ${estado.clase}`, texto: estado.etiqueta }));
  const partes = [
    `${formatearFecha(planilla.fecha)} ${hhmm(planilla.horaInicio)}–${hhmm(planilla.horaFin)}`,
    planilla.clubNombre,
    planilla.cursoNombre ? `Curso: ${planilla.cursoNombre}` : 'Sesión general del club'
  ];
  if (planilla.responsableNombre) {
    partes.push(`Responsable: ${planilla.responsableNombre}`);
  }
  if (esGlobal() && planilla.institucionNombre) {
    partes.push(planilla.institucionNombre);
  }
  elemento('planilla-datos').textContent = partes.join(' · ');
  elemento('enlace-actividad').href = `actividades.html?id=${planilla.actividadId}`;

  elemento('planilla-cifras').replaceChildren(
    cifra(planilla.totalEstudiantes, 'integrantes en la sesión'),
    cifra(planilla.registrados, 'registrados'),
    cifra(planilla.pendientes, 'sin registro', planilla.pendientes > 0 && planilla.editable ? 'border-warning' : ''),
    cifra(planilla.conteo.presentes, 'presentes'),
    cifra(planilla.conteo.atrasados, 'atrasados'),
    cifra(planilla.conteo.ausentes, 'ausentes'),
    cifra(planilla.conteo.justificados, 'justificados'),
    cifra(textoPorcentaje(planilla.porcentajeAsistencia), 'asistencia')
  );

  const bloqueo = elemento('planilla-bloqueo');
  if (planilla.editable) {
    bloqueo.replaceChildren();
  } else {
    mostrarAlerta(bloqueo, 'info', planilla.motivoNoEditable || 'La planilla de esta sesión es de solo lectura.');
  }

  elemento('barra-edicion').hidden = !planilla.editable;
  elemento('grupo-guardar').hidden = !planilla.editable;
  elemento('boton-todos-presentes').disabled = planilla.pendientes === 0;
  elemento('motivo-correccion').value = '';
  elemento('contador-motivo-correccion').textContent = '0 / 500';

  renderizarFilas();
  actualizarEstadoEdicion();
}

function renderizarFilas() {
  const planilla = pantalla.planilla;
  const cuerpo = elemento('cuerpo-planilla');
  if (planilla.estudiantes.length === 0) {
    const celda = crearElemento('td', {
      clase: 'text-center text-body-secondary py-4',
      texto: planilla.estadoActividad === 'CANCELADA'
        ? 'La sesión fue cancelada y no lleva asistencia.'
        : 'No hay integrantes del club inscritos a la fecha de esta sesión.',
      atributos: { colspan: '5' }
    });
    cuerpo.replaceChildren(crearElemento('tr', {}, [celda]));
    return;
  }
  cuerpo.replaceChildren(...planilla.estudiantes.map(crearFila));
}

function crearSelectorEstado(fila, borrador) {
  const grupo = crearElemento('div', {
    clase: 'btn-group btn-group-sm flex-wrap',
    atributos: { role: 'group', 'aria-label': `Asistencia de ${nombreEstudiante(fila) || fila.estudianteCodigo}` }
  });
  ESTADOS_ASISTENCIA.forEach(estado => {
    const id = `estado-${fila.estudianteId}-${estado.codigo}`;
    const opcion = crearElemento('input', {
      clase: 'btn-check',
      atributos: { type: 'radio', name: `estado-${fila.estudianteId}`, id, value: estado.codigo, autocomplete: 'off' }
    });
    opcion.checked = borrador.estado === estado.codigo;
    opcion.addEventListener('change', () => {
      borrador.estado = estado.codigo;
      actualizarFila(fila.estudianteId);
      actualizarEstadoEdicion();
    });
    const etiqueta = crearElemento('label', { clase: `btn ${estado.clase}`, texto: estado.etiqueta, atributos: { for: id } });
    grupo.append(opcion, etiqueta);
  });
  return grupo;
}

function crearCampoObservacion(fila, borrador) {
  const campo = crearElemento('input', {
    clase: 'form-control form-control-sm',
    atributos: {
      type: 'text',
      maxlength: '500',
      id: `observacion-${fila.estudianteId}`,
      'aria-label': `Observación de ${nombreEstudiante(fila) || fila.estudianteCodigo}`
    }
  });
  campo.value = borrador.observacion;
  campo.addEventListener('input', () => {
    borrador.observacion = campo.value;
    actualizarFila(fila.estudianteId);
    actualizarEstadoEdicion();
  });
  return campo;
}

function insigniaRegistrada(codigo) {
  const estado = estadoAsistencia(codigo);
  if (!estado) {
    return crearElemento('span', { clase: 'badge text-bg-light border', texto: 'Sin registro' });
  }
  return crearElemento('span', { clase: `badge ${estado.insignia}`, texto: estado.etiqueta });
}

function celdaRegistro(fila) {
  const partes = [];
  if (!fila.asistenciaId) {
    partes.push(crearElemento('span', { clase: 'small text-body-secondary', texto: 'Pendiente' }));
    return partes;
  }
  const quien = fila.registradoPorNombre ? `${fila.registradoPorNombre} · ` : '';
  partes.push(crearElemento('div', { clase: 'small', texto: `${quien}${formatearFechaHora(fila.fechaRegistro)}` }));
  if (fila.corregida) {
    const detalle = fila.motivoCorreccion
      ? `Corregida por ${fila.corregidoPorNombre || '—'} el ${formatearFechaHora(fila.fechaCorreccion)}: ${fila.motivoCorreccion}`
      : 'La asistencia de este estudiante fue corregida.';
    partes.push(crearElemento('span', {
      clase: 'badge text-bg-warning',
      texto: 'Corregida',
      atributos: { title: detalle }
    }));
  }
  return partes;
}

function crearFila(fila) {
  const planilla = pantalla.planilla;
  const borrador = pantalla.borrador.get(fila.estudianteId);
  const minima = vistaMinima();

  const celdas = [crearElemento('td', { clase: 'text-nowrap fw-semibold', texto: fila.estudianteCodigo })];
  if (!minima) {
    celdas.push(crearElemento('td', { texto: nombreEstudiante(fila) || '—' }));
  }
  if (planilla.editable) {
    celdas.push(crearElemento('td', {}, [crearSelectorEstado(fila, borrador)]));
  } else {
    celdas.push(crearElemento('td', {}, [insigniaRegistrada(fila.estado)]));
  }
  if (!minima) {
    if (planilla.editable) {
      celdas.push(crearElemento('td', { clase: 'celda-observacion' }, [crearCampoObservacion(fila, borrador)]));
    } else {
      celdas.push(crearElemento('td', { clase: 'small texto-preformateado', texto: fila.observacion || '—' }));
    }
  }
  celdas.push(crearElemento('td', {}, celdaRegistro(fila)));
  return crearElemento('tr', { atributos: { id: `fila-${fila.estudianteId}` } }, celdas);
}

function tipoCambio(fila) {
  const borrador = pantalla.borrador.get(fila.estudianteId);
  if (!borrador || !borrador.estado) {
    return null;
  }
  if (!fila.asistenciaId) {
    return 'nuevo';
  }
  const mismaObservacion = normalizar(borrador.observacion) === normalizar(fila.observacion);
  if (borrador.estado !== fila.estado || !mismaObservacion) {
    return 'correccion';
  }
  return null;
}

function cambiosPendientes() {
  const planilla = pantalla.planilla;
  const resultado = { nuevos: [], correcciones: [], total: 0 };
  if (!planilla || !planilla.editable) {
    return resultado;
  }
  planilla.estudiantes.forEach(fila => {
    const tipo = tipoCambio(fila);
    if (tipo === 'nuevo') {
      resultado.nuevos.push(fila);
    } else if (tipo === 'correccion') {
      resultado.correcciones.push(fila);
    }
  });
  resultado.total = resultado.nuevos.length + resultado.correcciones.length;
  return resultado;
}

function actualizarFila(estudianteId) {
  const fila = pantalla.planilla.estudiantes.find(item => item.estudianteId === estudianteId);
  const tr = elemento(`fila-${estudianteId}`);
  if (!fila || !tr) {
    return;
  }
  const tipo = tipoCambio(fila);
  tr.classList.toggle('fila-nueva', tipo === 'nuevo');
  tr.classList.toggle('fila-corregida', tipo === 'correccion');
  const campo = elemento(`observacion-${estudianteId}`);
  if (campo) {
    const borrador = pantalla.borrador.get(estudianteId);
    const exige = borrador.estado === 'JUSTIFICADO';
    campo.placeholder = exige ? 'Justificación obligatoria' : '';
    campo.classList.toggle('is-invalid', exige && !normalizar(borrador.observacion) && tipo !== null);
  }
}

function actualizarEstadoEdicion() {
  const planilla = pantalla.planilla;
  if (!planilla || !planilla.editable) {
    return;
  }
  const cambios = cambiosPendientes();
  const partes = [];
  if (cambios.nuevos.length > 0) {
    partes.push(cambios.nuevos.length === 1 ? '1 registro nuevo' : `${cambios.nuevos.length} registros nuevos`);
  }
  if (cambios.correcciones.length > 0) {
    partes.push(cambios.correcciones.length === 1 ? '1 corrección' : `${cambios.correcciones.length} correcciones`);
  }
  elemento('contador-cambios').textContent = partes.length > 0 ? `Sin guardar: ${partes.join(' y ')}` : 'Sin cambios pendientes';
  elemento('boton-guardar').disabled = cambios.total === 0;
  elemento('boton-deshacer').disabled = cambios.total === 0;

  const pendientesSinMarcar = planilla.estudiantes.filter(fila => {
    const borrador = pantalla.borrador.get(fila.estudianteId);
    return !fila.asistenciaId && !borrador.estado;
  }).length;
  elemento('boton-todos-presentes').disabled = pendientesSinMarcar === 0;

  const grupoMotivo = elemento('grupo-motivo-correccion');
  if (cambios.correcciones.length > 0) {
    const codigos = cambios.correcciones.map(fila => fila.estudianteCodigo).join(', ');
    elemento('aviso-correccion').textContent = cambios.correcciones.length === 1
      ? `Está corrigiendo una asistencia ya registrada (${codigos}). La corrección queda en el historial con su motivo.`
      : `Está corrigiendo ${cambios.correcciones.length} asistencias ya registradas (${codigos}). Cada corrección queda en el historial con el mismo motivo.`;
    grupoMotivo.hidden = false;
  } else {
    grupoMotivo.hidden = true;
  }
}

function marcarPendientesPresentes() {
  const planilla = pantalla.planilla;
  planilla.estudiantes.forEach(fila => {
    const borrador = pantalla.borrador.get(fila.estudianteId);
    if (!fila.asistenciaId && !borrador.estado) {
      borrador.estado = 'PRESENTE';
      const opcion = elemento(`estado-${fila.estudianteId}-PRESENTE`);
      if (opcion) {
        opcion.checked = true;
      }
      actualizarFila(fila.estudianteId);
    }
  });
  actualizarEstadoEdicion();
}

function deshacerCambios() {
  const planilla = pantalla.planilla;
  if (!planilla) {
    return;
  }
  mostrarPlanilla(planilla);
}

function validarCambios(cambios) {
  const problemas = [];
  [...cambios.nuevos, ...cambios.correcciones].forEach(fila => {
    const borrador = pantalla.borrador.get(fila.estudianteId);
    if (borrador.estado === 'JUSTIFICADO' && !normalizar(borrador.observacion)) {
      problemas.push(`Indique en la observación la justificación de ${nombreEstudiante(fila) || fila.estudianteCodigo}.`);
    }
  });
  if (cambios.correcciones.length > 0 && !normalizar(elemento('motivo-correccion').value)) {
    problemas.push('Indique el motivo de la corrección de las asistencias ya registradas.');
  }
  return problemas;
}

async function guardarAsistencia(evento) {
  evento.preventDefault();
  const planilla = pantalla.planilla;
  const alertas = elemento('alertas-guardado');
  limpiarAlerta(alertas);
  if (!planilla || !planilla.editable) {
    return;
  }
  const cambios = cambiosPendientes();
  if (cambios.total === 0) {
    mostrarAlerta(alertas, 'info', 'No hay cambios por guardar.');
    return;
  }
  const problemas = validarCambios(cambios);
  if (problemas.length > 0) {
    mostrarAlerta(alertas, 'danger', 'Revise la planilla:', problemas);
    return;
  }

  const registros = [...cambios.nuevos, ...cambios.correcciones].map(fila => {
    const borrador = pantalla.borrador.get(fila.estudianteId);
    return {
      estudianteId: fila.estudianteId,
      estado: borrador.estado,
      observacion: normalizar(borrador.observacion)
    };
  });
  const cuerpo = { registros };
  if (cambios.correcciones.length > 0) {
    cuerpo.motivoCorreccion = normalizar(elemento('motivo-correccion').value);
  }

  const boton = elemento('boton-guardar');
  pantalla.guardando = true;
  establecerCargando(boton, true, 'Guardando...');
  try {
    const actualizada = await apiFetch(`/api/actividades/${planilla.actividadId}/asistencia`, { metodo: 'PUT', cuerpo });
    mostrarPlanilla(actualizada);
    const partes = [];
    if (cambios.nuevos.length > 0) {
      partes.push(cambios.nuevos.length === 1 ? '1 asistencia registrada' : `${cambios.nuevos.length} asistencias registradas`);
    }
    if (cambios.correcciones.length > 0) {
      partes.push(cambios.correcciones.length === 1 ? '1 corrección guardada' : `${cambios.correcciones.length} correcciones guardadas`);
    }
    const pendientes = actualizada.pendientes > 0
      ? ` Quedan ${actualizada.pendientes} integrantes sin registro.`
      : ' La planilla de la sesión está completa.';
    mostrarAlerta(alertas, 'success', `${partes.join(' y ')}.${pendientes}`);
    cargarResumen();
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    pantalla.guardando = false;
    establecerCargando(boton, false);
    actualizarEstadoEdicion();
  }
}

function textoCambio(correccion) {
  const antes = estadoAsistencia(correccion.estadoAnterior);
  const despues = estadoAsistencia(correccion.estadoNuevo);
  const partes = [crearElemento('div', {
    clase: 'text-nowrap',
    texto: `${antes ? antes.etiqueta : correccion.estadoAnterior} → ${despues ? despues.etiqueta : correccion.estadoNuevo}`
  })];
  if (!vistaMinima() && (correccion.observacionAnterior || correccion.observacionNueva)
      && correccion.observacionAnterior !== correccion.observacionNueva) {
    partes.push(crearElemento('div', {
      clase: 'small text-body-secondary',
      texto: `Observación: «${correccion.observacionAnterior || '—'}» → «${correccion.observacionNueva || '—'}»`
    }));
  }
  return partes;
}

async function abrirCorrecciones() {
  const planilla = pantalla.planilla;
  if (!planilla) {
    return;
  }
  limpiarAlerta(elemento('alertas-correcciones'));
  elemento('correcciones-sesion').textContent =
    `${planilla.actividadTema} · ${formatearFecha(planilla.fecha)} ${hhmm(planilla.horaInicio)}. Estas correcciones no se modifican ni se eliminan.`;
  const cuerpo = elemento('cuerpo-correcciones');
  const mensaje = texto => crearElemento('tr', {}, [crearElemento('td', {
    clase: 'text-center text-body-secondary py-3',
    texto,
    atributos: { colspan: '5' }
  })]);
  cuerpo.replaceChildren(mensaje('Cargando correcciones...'));
  modalCorrecciones.show();
  try {
    const lista = await apiFetch(`/api/actividades/${planilla.actividadId}/asistencia/correcciones`);
    if (lista.length === 0) {
      cuerpo.replaceChildren(mensaje('La asistencia de esta sesión no tiene correcciones.'));
      return;
    }
    cuerpo.replaceChildren(...lista.map(correccion => {
      const nombre = nombreEstudiante(correccion);
      return crearElemento('tr', {}, [
        crearElemento('td', { clase: 'text-nowrap small', texto: formatearFechaHora(correccion.fecha) }),
        crearElemento('td', {}, [
          crearElemento('div', { clase: 'fw-semibold', texto: correccion.estudianteCodigo }),
          crearElemento('div', { clase: 'small text-body-secondary', texto: nombre || '' })
        ]),
        crearElemento('td', {}, textoCambio(correccion)),
        crearElemento('td', { clase: 'small texto-preformateado', texto: correccion.motivo }),
        crearElemento('td', { clase: 'small', texto: correccion.corregidoPorNombre || '—' })
      ]);
    }));
  } catch (error) {
    cuerpo.replaceChildren();
    mostrarAlerta(elemento('alertas-correcciones'), 'danger', mensajeDe(error));
  }
}

function reiniciarResumen() {
  elemento('resumen').hidden = true;
  elemento('resumen-vacio').hidden = false;
  elemento('resumen-vacio').textContent = 'Seleccione un club para calcular su resumen de asistencia.';
  limpiarAlerta(elemento('alertas-resumen'));
  elemento('boton-resumen').disabled = !pantalla.clubId;
}

async function cargarCursosResumen(clubId) {
  const selector = elemento('resumen-curso');
  selector.replaceChildren(crearElemento('option', { texto: 'Todo el club', atributos: { value: '' } }));
  selector.disabled = true;
  try {
    const cursos = await cargarCursosDelClub(clubId);
    if (pantalla.clubId !== clubId) {
      return;
    }
    cursos.forEach(curso => selector.appendChild(crearElemento('option', {
      texto: curso.nombre,
      atributos: { value: String(curso.id) }
    })));
    selector.disabled = cursos.length === 0;
  } catch (error) {
    selector.disabled = true;
  }
}

function barraPorcentaje(valor, etiqueta) {
  if (valor === null || valor === undefined) {
    return crearElemento('span', { clase: 'small text-body-secondary', texto: 'Sin datos' });
  }
  const relleno = crearElemento('div', { clase: 'progress-bar' });
  relleno.style.width = `${Math.min(100, Math.max(0, valor))}%`;
  return crearElemento('div', { clase: 'd-flex align-items-center gap-2' }, [
    crearElemento('div', {
      clase: 'progress barra-ocupacion flex-grow-1 barra-asistencia',
      atributos: {
        role: 'progressbar',
        'aria-label': etiqueta,
        'aria-valuenow': String(valor),
        'aria-valuemin': '0',
        'aria-valuemax': '100'
      }
    }, [relleno]),
    crearElemento('span', { clase: 'small text-nowrap', texto: textoPorcentaje(valor) })
  ]);
}

async function cargarResumen() {
  const clubId = pantalla.clubId;
  if (!clubId) {
    reiniciarResumen();
    return;
  }
  if (!catalogo.clubesPorId.has(clubId)) {
    return;
  }
  const alertas = elemento('alertas-resumen');
  limpiarAlerta(alertas);
  const desde = elemento('resumen-desde').value;
  const hasta = elemento('resumen-hasta').value;
  if (desde && hasta && hasta < desde) {
    mostrarAlerta(alertas, 'danger', 'La fecha «hasta» no puede ser anterior a «desde».');
    return;
  }
  const solicitud = ++pantalla.solicitudResumen;
  const boton = elemento('boton-resumen');
  establecerCargando(boton, true, 'Calculando...');
  try {
    const resumen = await apiFetch(`/api/asistencias/resumen${construirConsulta({
      clubId,
      cursoId: elemento('resumen-curso').value,
      desde,
      hasta
    })}`);
    if (solicitud !== pantalla.solicitudResumen) {
      return;
    }
    renderizarResumen(resumen);
  } catch (error) {
    if (solicitud === pantalla.solicitudResumen) {
      elemento('resumen').hidden = true;
      elemento('resumen-vacio').hidden = true;
      mostrarAlerta(alertas, 'danger', mensajeDe(error));
    }
  } finally {
    establecerCargando(boton, false);
    boton.disabled = !pantalla.clubId || !catalogo.clubesPorId.has(pantalla.clubId);
  }
}

function renderizarResumen(resumen) {
  elemento('resumen-vacio').hidden = true;
  elemento('resumen').hidden = false;
  elemento('resumen-titulo').textContent =
    `${resumen.clubNombre}${resumen.cursoNombre ? ` · Curso: ${resumen.cursoNombre}` : ''} · del ${formatearFecha(resumen.desde)} al ${formatearFecha(resumen.hasta)}`;
  elemento('resumen-cifras').replaceChildren(
    cifra(resumen.sesionesEjecutadas, 'sesiones ejecutadas'),
    cifra(`${resumen.registrosTomados} / ${resumen.registrosEsperados}`, 'registros tomados / esperados'),
    cifra(resumen.registrosPendientes, 'registros pendientes', resumen.registrosPendientes > 0 ? 'border-warning' : ''),
    cifra(textoPorcentaje(resumen.porcentajeCompletitud), 'completitud del registro'),
    cifra(textoPorcentaje(resumen.porcentajeAsistencia), 'asistencia del club')
  );

  const cuerpo = elemento('cuerpo-resumen');
  if (resumen.estudiantes.length === 0) {
    cuerpo.replaceChildren(crearElemento('tr', {}, [crearElemento('td', {
      clase: 'text-center text-body-secondary py-4',
      texto: 'No hay estudiantes con sesiones esperadas en el rango indicado.',
      atributos: { colspan: '9' }
    })]));
    return;
  }
  const minima = vistaMinima();
  cuerpo.replaceChildren(...resumen.estudiantes.map(fila => {
    const enlace = crearElemento('a', {
      texto: fila.estudianteCodigo,
      atributos: { href: `historial.html?id=${fila.estudianteId}`, title: 'Ver historial del estudiante' }
    });
    const celdas = [crearElemento('td', { clase: 'text-nowrap fw-semibold' }, [enlace])];
    if (!minima) {
      celdas.push(crearElemento('td', { texto: nombreEstudiante(fila) || '—' }));
    }
    celdas.push(
      crearElemento('td', { clase: 'text-end', texto: `${fila.registradas} / ${fila.sesionesEsperadas}` }),
      crearElemento('td', { clase: 'text-end', texto: String(fila.conteo.presentes) }),
      crearElemento('td', { clase: 'text-end', texto: String(fila.conteo.atrasados) }),
      crearElemento('td', { clase: 'text-end', texto: String(fila.conteo.ausentes) }),
      crearElemento('td', { clase: 'text-end', texto: String(fila.conteo.justificados) }),
      crearElemento('td', { clase: `text-end${fila.sinRegistro > 0 ? ' text-warning-emphasis fw-semibold' : ''}`, texto: String(fila.sinRegistro) }),
      crearElemento('td', {}, [barraPorcentaje(fila.porcentajeAsistencia, `Asistencia de ${fila.estudianteCodigo}`)])
    );
    return crearElemento('tr', {}, celdas);
  }));
}
