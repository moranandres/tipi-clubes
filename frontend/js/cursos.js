import { apiFetch, construirConsulta, ApiError } from './api.js';
import { cargarInstituciones, cargarClubes, cargarPeriodos } from './catalogos.js';
import { confirmar } from './confirmacion.js';
import { exigirSesion } from './guard.js';
import { montarLayout } from './layout.js';
import { renderizarPaginacion } from './paginacion.js';
import {
  crearElemento,
  formatearFecha,
  mostrarAlerta,
  limpiarAlerta,
  establecerCargando,
  mensajesDeError
} from './ui.js';

const TAMANO_PAGINA = 10;
const CUPO_MAXIMO_PERMITIDO = 500;
const ROLES_GLOBALES = ['ADMIN', 'COORDINADOR', 'CONSULTA'];
const ROLES_DATOS_MINIMOS = ['COORDINADOR', 'CONSULTA'];
const ROLES_GESTION = ['ADMIN', 'RESP_INSTITUCIONAL'];
const ROLES_RESULTADOS = ['ADMIN', 'RESP_INSTITUCIONAL', 'DOCENTE'];
const ESTADOS_EDITABLES = ['PLANIFICADO', 'EN_CURSO'];
const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_CORTOS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const NIVELES = {
  PRINCIPIANTE: 'Principiante',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado'
};

const MODALIDADES = {
  PRESENCIAL: { etiqueta: 'Presencial', clase: 'text-bg-primary' },
  ONLINE: { etiqueta: 'En línea', clase: 'text-bg-info' },
  HIBRIDO: { etiqueta: 'Híbrida', clase: 'text-bg-warning' }
};

const SESIONES_POR_MODALIDAD = {
  PRESENCIAL: ['PRESENCIAL'],
  ONLINE: ['VIRTUAL'],
  HIBRIDO: ['PRESENCIAL', 'VIRTUAL']
};

const TIPOS_SESION = {
  PRESENCIAL: 'Presencial',
  VIRTUAL: 'Virtual'
};

const ESTADOS_CURSO = {
  PLANIFICADO: { etiqueta: 'Planificado', clase: 'text-bg-secondary' },
  EN_CURSO: { etiqueta: 'En curso', clase: 'text-bg-success' },
  FINALIZADO: { etiqueta: 'Finalizado', clase: 'text-bg-primary' },
  CANCELADO: { etiqueta: 'Cancelado', clase: 'text-bg-danger' }
};

const TRANSICIONES = {
  PLANIFICADO: ['EN_CURSO', 'CANCELADO'],
  EN_CURSO: ['FINALIZADO', 'CANCELADO'],
  FINALIZADO: [],
  CANCELADO: []
};

const ESTADOS_CLUB = {
  PLANIFICADO: 'Planificado',
  ACTIVO: 'Activo',
  SUSPENDIDO: 'Suspendido',
  CERRADO: 'Cerrado'
};

const ESTADOS_INSCRIPCION = {
  ACTIVA: { etiqueta: 'Activa', clase: 'text-bg-success' },
  FINALIZADA: { etiqueta: 'Finalizada', clase: 'text-bg-primary' },
  RETIRADA: { etiqueta: 'Retirada', clase: 'text-bg-secondary' }
};

const RESULTADOS = {
  APROBADO: { etiqueta: 'Aprobado', clase: 'text-bg-success' },
  NO_APROBADO: { etiqueta: 'No aprobado', clase: 'text-bg-danger' }
};

const TITULOS_MODAL = {
  crear: 'Nuevo curso',
  editar: 'Editar curso',
  ver: 'Detalle del curso'
};

const sesion = exigirSesion();
const pantalla = {
  pagina: 0,
  filtros: {},
  modo: null,
  curso: null,
  cursoHorarios: null,
  horarioEditando: null,
  horariosCambiaron: false,
  cursoEstado: null,
  cursoParticipantes: null,
  participantes: [],
  participantesCambiaron: false
};
const catalogo = { instituciones: [], clubes: [], periodos: new Map() };
let modalCurso = null;
let modalHorarios = null;
let modalEstado = null;
let modalParticipantes = null;

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

function enAlcance(curso) {
  return rolActual() === 'ADMIN' || curso.institucionId === sesion.usuario.institucionId;
}

function puedeCrear() {
  return ROLES_GESTION.includes(rolActual());
}

function puedeGestionar(curso) {
  return ROLES_GESTION.includes(rolActual()) && enAlcance(curso);
}

function puedeRegistrarResultados(curso) {
  if (!ROLES_RESULTADOS.includes(rolActual())) {
    return false;
  }
  return rolActual() === 'DOCENTE' || enAlcance(curso);
}

function esEditable(curso) {
  return ESTADOS_EDITABLES.includes(curso.estado);
}

function mensajeDe(error) {
  return error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
}

function insignia(mapa, codigo) {
  const datos = mapa[codigo] || { etiqueta: codigo || '—', clase: 'text-bg-light' };
  return crearElemento('span', { clase: `badge ${datos.clase}`, texto: datos.etiqueta });
}

function hhmm(hora) {
  return hora ? hora.substring(0, 5) : '';
}

function textoHorario(horario, corto = false) {
  const dia = corto ? DIAS_CORTOS[horario.diaSemana] : DIAS[horario.diaSemana];
  return `${dia} ${hhmm(horario.horaInicio)}–${hhmm(horario.horaFin)}`;
}

function textoDuracion(minutos) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) {
    return `${resto} min`;
  }
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

function textoHorasSemanales(horas) {
  return `${String(horas).replace('.', ',')} h`;
}

function buscarClub(id) {
  return catalogo.clubes.find(club => club.id === Number(id)) || null;
}

async function iniciar() {
  montarLayout(sesion, 'cursos');

  const minima = soloDatosMinimos();
  elemento('boton-nuevo').hidden = !puedeCrear();
  elemento('aviso-datos-minimos').hidden = !minima;
  elemento('aviso-docente').hidden = rolActual() !== 'DOCENTE';
  elemento('grupo-filtro-institucion').hidden = !esGlobal();

  modalCurso = bootstrap.Modal.getOrCreateInstance(elemento('modal-curso'));
  modalHorarios = bootstrap.Modal.getOrCreateInstance(elemento('modal-horarios'));
  modalEstado = bootstrap.Modal.getOrCreateInstance(elemento('modal-estado'));
  modalParticipantes = bootstrap.Modal.getOrCreateInstance(elemento('modal-participantes'));

  elemento('boton-nuevo').addEventListener('click', () => abrirFormulario('crear', null));

  elemento('formulario-filtros').addEventListener('submit', evento => {
    evento.preventDefault();
    pantalla.filtros = leerFiltros();
    cargarLista(0);
  });
  elemento('formulario-filtros').addEventListener('reset', () => {
    setTimeout(() => {
      llenarFiltroClubes();
      pantalla.filtros = {};
      cargarLista(0);
    }, 0);
  });
  elemento('filtro-institucion').addEventListener('change', llenarFiltroClubes);

  elemento('formulario-curso').addEventListener('submit', guardarCurso);
  elemento('campo-modalidad').addEventListener('change', actualizarCamposModalidad);
  elemento('campo-club').addEventListener('change', actualizarAyudaClub);

  elemento('formulario-horario').addEventListener('submit', guardarHorario);
  elemento('boton-cancelar-horario').addEventListener('click', reiniciarFormularioHorario);
  elemento('modal-horarios').addEventListener('hidden.bs.modal', () => {
    if (pantalla.horariosCambiaron) {
      pantalla.horariosCambiaron = false;
      cargarLista(pantalla.pagina);
    }
  });

  elemento('formulario-estado').addEventListener('submit', guardarEstado);
  elemento('estado-nuevo').addEventListener('change', actualizarAvisoEstado);

  elemento('modal-participantes').addEventListener('hidden.bs.modal', () => {
    if (pantalla.participantesCambiaron) {
      pantalla.participantesCambiaron = false;
      cargarLista(pantalla.pagina);
    }
  });

  await cargarCatalogos();
  aplicarFiltroInicial();
  await cargarLista(0);
}

async function cargarCatalogos() {
  const tareas = [cargarClubes(), cargarPeriodos(), esGlobal() ? cargarInstituciones() : Promise.resolve([])];
  const [clubes, periodos, instituciones] = await Promise.allSettled(tareas);
  const problemas = [];
  if (clubes.status === 'fulfilled') {
    catalogo.clubes = clubes.value.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  } else {
    problemas.push(`Clubes: ${mensajeDe(clubes.reason)}`);
  }
  if (periodos.status === 'fulfilled') {
    catalogo.periodos = new Map(periodos.value.map(periodo => [periodo.id, periodo]));
  } else {
    problemas.push(`Períodos: ${mensajeDe(periodos.reason)}`);
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

function aplicarFiltroInicial() {
  const clubId = new URLSearchParams(window.location.search).get('clubId');
  if (!clubId || !buscarClub(clubId)) {
    return;
  }
  elemento('filtro-club').value = String(clubId);
  pantalla.filtros = leerFiltros();
}

function leerFiltros() {
  return {
    q: elemento('filtro-q').value.trim(),
    institucionId: esGlobal() ? elemento('filtro-institucion').value : '',
    clubId: elemento('filtro-club').value,
    nivel: elemento('filtro-nivel').value,
    modalidad: elemento('filtro-modalidad').value,
    estado: elemento('filtro-estado').value
  };
}

function filaMensaje(texto, columnas = 8) {
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

async function cargarLista(pagina) {
  const cuerpo = elemento('cuerpo-tabla');
  cuerpo.replaceChildren(filaMensaje('Cargando cursos...'));
  try {
    const ruta = `/api/cursos${construirConsulta({ ...pantalla.filtros, pagina, tamano: TAMANO_PAGINA })}`;
    const respuesta = await apiFetch(ruta);
    pantalla.pagina = respuesta.pagina;
    if (respuesta.contenido.length === 0) {
      cuerpo.replaceChildren(filaMensaje('No se encontraron cursos.'));
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

function celdaHorarios(curso) {
  if (curso.horarios.length === 0) {
    const clase = esEditable(curso) ? 'small text-warning-emphasis' : 'small text-body-secondary';
    return crearElemento('td', {}, [crearElemento('span', { clase, texto: 'Sin horarios' })]);
  }
  const lineas = curso.horarios.map(horario => crearElemento('div', {
    clase: 'small text-nowrap',
    texto: textoHorario(horario, true)
  }));
  lineas.push(crearElemento('div', {
    clase: 'small text-body-secondary',
    texto: `${textoHorasSemanales(curso.horasSemanales)} por semana`
  }));
  return crearElemento('td', {}, lineas);
}

function celdaCupo(curso) {
  const porcentaje = curso.cupoMaximo > 0 ? Math.min(100, Math.round(curso.inscritosActivos * 100 / curso.cupoMaximo)) : 0;
  const color = porcentaje >= 100 ? 'bg-danger' : porcentaje >= 80 ? 'bg-warning' : 'bg-success';
  const barra = crearElemento('div', { clase: `progress-bar ${color}` });
  barra.style.width = `${porcentaje}%`;
  const progreso = crearElemento('div', {
    clase: 'progress barra-ocupacion mt-1',
    atributos: {
      role: 'progressbar',
      'aria-label': `Ocupación del curso ${curso.nombre}`,
      'aria-valuenow': String(porcentaje),
      'aria-valuemin': '0',
      'aria-valuemax': '100'
    }
  }, [barra]);
  return crearElemento('td', { clase: 'text-nowrap' }, [
    crearElemento('div', { clase: 'small', texto: `${curso.inscritosActivos} / ${curso.cupoMaximo}` }),
    progreso
  ]);
}

function crearFila(curso) {
  const celdaCurso = crearElemento('td', {}, [
    crearElemento('div', { clase: 'fw-semibold', texto: curso.nombre }),
    crearElemento('div', { clase: 'small text-body-secondary', texto: NIVELES[curso.nivel] || curso.nivel })
  ]);

  const club = [crearElemento('div', { texto: curso.clubNombre || `Club ${curso.clubId}` })];
  if (esGlobal()) {
    club.push(crearElemento('div', { clase: 'small text-body-secondary', texto: curso.institucionNombre }));
  }

  const modalidad = [insignia(MODALIDADES, curso.modalidad)];
  if (curso.lugar) {
    modalidad.push(crearElemento('div', { clase: 'small text-body-secondary mt-1', texto: curso.lugar }));
  }
  if (curso.tieneEnlaceVirtual) {
    modalidad.push(crearElemento('div', { clase: 'small text-body-secondary mt-1', texto: 'Sala virtual' }));
  }

  const fechas = [
    crearElemento('div', { clase: 'small text-nowrap', texto: `${formatearFecha(curso.fechaInicio)} – ${formatearFecha(curso.fechaFin)}` })
  ];
  if (curso.duracionHoras) {
    fechas.push(crearElemento('div', { clase: 'small text-body-secondary', texto: `${curso.duracionHoras} h en total` }));
  }

  return crearElemento('tr', {}, [
    celdaCurso,
    crearElemento('td', {}, club),
    crearElemento('td', {}, modalidad),
    crearElemento('td', {}, fechas),
    celdaHorarios(curso),
    celdaCupo(curso),
    crearElemento('td', {}, [insignia(ESTADOS_CURSO, curso.estado)]),
    crearElemento('td', { clase: 'text-end text-nowrap' }, crearAcciones(curso))
  ]);
}

function crearAcciones(curso) {
  const acciones = [crearBoton('bi-eye', 'Ver detalle', curso, () => abrirFormulario('ver', curso))];
  const gestiona = puedeGestionar(curso);
  if (gestiona && esEditable(curso)) {
    acciones.push(crearBoton('bi-pencil', 'Editar', curso, () => abrirFormulario('editar', curso)));
  }
  if (gestiona) {
    acciones.push(crearBoton('bi-clock', 'Horarios', curso, () => abrirHorarios(curso)));
  }
  if (gestiona && TRANSICIONES[curso.estado].length > 0) {
    acciones.push(crearBoton('bi-arrow-left-right', 'Cambiar estado', curso, () => abrirCambioEstado(curso)));
  }
  acciones.push(crearBoton('bi-people', 'Participantes y resultados', curso, () => abrirParticipantes(curso)));
  if (gestiona && curso.estado === 'PLANIFICADO') {
    acciones.push(crearBoton('bi-trash', 'Eliminar', curso, () => eliminarCurso(curso), true));
  }
  return acciones;
}

function crearBoton(icono, etiqueta, curso, accion, peligro = false) {
  const marca = crearElemento('i', { clase: `bi ${icono}`, atributos: { 'aria-hidden': 'true' } });
  const boton = crearElemento('button', {
    clase: `btn btn-sm ${peligro ? 'btn-outline-danger' : 'btn-outline-secondary'} ms-1`,
    atributos: { type: 'button', title: etiqueta, 'aria-label': `${etiqueta}: ${curso.nombre}` }
  }, [marca]);
  boton.addEventListener('click', accion);
  return boton;
}

function llenarSelectClubFormulario(curso) {
  const selector = elemento('campo-club');
  const opciones = [crearElemento('option', { texto: 'Seleccione un club', atributos: { value: '' } })];
  let clubes = catalogo.clubes;
  if (!curso) {
    clubes = clubes.filter(club => club.estado !== 'CERRADO'
      && (rolActual() === 'ADMIN' || club.institucionId === sesion.usuario.institucionId));
  } else {
    clubes = clubes.filter(club => club.id === curso.clubId);
  }
  clubes.forEach(club => {
    opciones.push(crearElemento('option', {
      texto: etiquetaClub(club, rolActual() === 'ADMIN' || esGlobal()),
      atributos: { value: String(club.id) }
    }));
  });
  if (curso && clubes.length === 0) {
    opciones.push(crearElemento('option', {
      texto: curso.clubNombre || `Club ${curso.clubId}`,
      atributos: { value: String(curso.clubId) }
    }));
  }
  selector.replaceChildren(...opciones);
}

function actualizarAyudaClub() {
  const ayuda = elemento('ayuda-club');
  const club = buscarClub(elemento('campo-club').value);
  const inicio = elemento('campo-fecha-inicio');
  const fin = elemento('campo-fecha-fin');
  const cupo = elemento('campo-cupo');
  inicio.removeAttribute('min');
  inicio.removeAttribute('max');
  fin.removeAttribute('min');
  fin.removeAttribute('max');
  cupo.max = String(CUPO_MAXIMO_PERMITIDO);
  if (!club) {
    ayuda.textContent = '';
    return;
  }
  const periodo = catalogo.periodos.get(club.periodoId);
  const partes = [];
  if (periodo) {
    partes.push(`Período ${periodo.nombre}: del ${formatearFecha(periodo.fechaInicio)} al ${formatearFecha(periodo.fechaFin)}.`);
    [inicio, fin].forEach(campo => {
      campo.min = periodo.fechaInicio;
      campo.max = periodo.fechaFin;
    });
  } else if (club.periodoNombre) {
    partes.push(`Período ${club.periodoNombre}.`);
  }
  partes.push(`Cupo del club: ${club.cupoMaximo} integrantes.`);
  partes.push('Las fechas del curso deben estar dentro del período y su cupo no puede superar el del club.');
  if (club.estado !== 'ACTIVO') {
    partes.push(`El club está ${(ESTADOS_CLUB[club.estado] || club.estado).toLowerCase()}: el curso podrá iniciarse cuando el club esté activo.`);
  }
  cupo.max = String(Math.min(CUPO_MAXIMO_PERMITIDO, club.cupoMaximo));
  ayuda.textContent = partes.join(' ');
}

function actualizarCamposModalidad() {
  const modalidad = elemento('campo-modalidad').value;
  elemento('grupo-lugar').hidden = !['PRESENCIAL', 'HIBRIDO'].includes(modalidad);
  elemento('grupo-enlace').hidden = !['ONLINE', 'HIBRIDO'].includes(modalidad);
}

function mostrarDetalle(curso) {
  elemento('detalle-estado').replaceChildren(insignia(ESTADOS_CURSO, curso.estado));
  elemento('detalle-institucion').textContent = curso.institucionNombre || `Institución ${curso.institucionId}`;
  elemento('detalle-cupo').textContent = `${curso.inscritosActivos} inscritos de ${curso.cupoMaximo} (${curso.cuposDisponibles} cupos disponibles)`;
  elemento('detalle-horas').textContent = curso.horarios.length > 0 ? textoHorasSemanales(curso.horasSemanales) : '—';

  if (curso.horarios.length === 0) {
    elemento('detalle-horarios').textContent = 'Sin horarios registrados';
  } else {
    elemento('detalle-horarios').replaceChildren(...curso.horarios.map(horario => crearElemento('div', {
      texto: `${textoHorario(horario)} · ${TIPOS_SESION[horario.tipoSesion] || horario.tipoSesion}`
    })));
  }

  const enlace = elemento('detalle-enlace');
  if (curso.enlaceVirtual) {
    enlace.replaceChildren(crearElemento('a', {
      texto: curso.enlaceVirtual,
      clase: 'text-break',
      atributos: { href: curso.enlaceVirtual, target: '_blank', rel: 'noopener noreferrer' }
    }));
  } else if (curso.tieneEnlaceVirtual) {
    enlace.textContent = 'Registrado (no visible para su rol)';
  } else {
    enlace.textContent = 'No aplica';
  }
}

function abrirFormulario(modo, curso) {
  pantalla.modo = modo;
  pantalla.curso = curso;
  const esCrear = modo === 'crear';
  const esVer = modo === 'ver';

  limpiarAlerta(elemento('alertas-modal'));
  elemento('titulo-modal-curso').textContent = esVer && curso ? curso.nombre : TITULOS_MODAL[modo];
  elemento('grupo-detalle').hidden = !esVer;
  if (esVer) {
    mostrarDetalle(curso);
  }

  llenarSelectClubFormulario(esCrear ? null : curso);
  elemento('campo-club').value = curso ? String(curso.clubId) : '';
  elemento('campo-club').disabled = !esCrear;
  elemento('campo-nombre').value = curso ? curso.nombre : '';
  elemento('campo-nivel').value = curso ? curso.nivel : '';
  elemento('campo-descripcion').value = curso && curso.descripcion ? curso.descripcion : '';
  elemento('campo-modalidad').value = curso ? curso.modalidad : '';
  elemento('campo-lugar').value = curso && curso.lugar ? curso.lugar : '';
  elemento('campo-enlace').value = curso && curso.enlaceVirtual ? curso.enlaceVirtual : '';
  elemento('campo-fecha-inicio').value = curso ? curso.fechaInicio : '';
  elemento('campo-fecha-fin').value = curso ? curso.fechaFin : '';
  elemento('campo-duracion').value = curso && curso.duracionHoras ? String(curso.duracionHoras) : '';
  elemento('campo-cupo').value = curso ? String(curso.cupoMaximo) : '';

  ['nombre', 'nivel', 'descripcion', 'modalidad', 'lugar', 'enlace', 'fecha-inicio', 'fecha-fin', 'duracion', 'cupo']
    .forEach(nombre => {
      elemento(`campo-${nombre}`).disabled = esVer;
    });

  actualizarCamposModalidad();
  if (esVer && curso && !curso.enlaceVirtual) {
    elemento('grupo-enlace').hidden = true;
  }
  actualizarAyudaClub();
  if (esVer) {
    elemento('ayuda-club').textContent = '';
  }
  elemento('grupo-ayuda-registro').hidden = !esCrear;

  const boton = elemento('boton-guardar');
  boton.hidden = esVer;
  boton.disabled = false;
  boton.textContent = esCrear ? 'Crear curso' : 'Guardar cambios';

  modalCurso.show();
}

function leerCampo(nombre) {
  const valor = elemento(`campo-${nombre}`).value.trim();
  return valor === '' ? null : valor;
}

function leerEntero(nombre) {
  const valor = leerCampo(nombre);
  return valor === null ? null : Number(valor);
}

function validarFormulario() {
  const problemas = [];
  const modalidad = elemento('campo-modalidad').value;
  const club = buscarClub(elemento('campo-club').value);
  if (pantalla.modo === 'crear' && !elemento('campo-club').value) {
    problemas.push('Seleccione el club del curso.');
  }
  if (!leerCampo('nombre')) {
    problemas.push('El nombre del curso es obligatorio.');
  }
  if (!elemento('campo-nivel').value) {
    problemas.push('Seleccione el nivel del curso.');
  }
  if (!modalidad) {
    problemas.push('Seleccione la modalidad del curso.');
  }
  if (['PRESENCIAL', 'HIBRIDO'].includes(modalidad) && !leerCampo('lugar')) {
    problemas.push('Indique el lugar donde se dicta el curso.');
  }
  if (['ONLINE', 'HIBRIDO'].includes(modalidad)) {
    const enlace = leerCampo('enlace');
    if (!enlace) {
      problemas.push('Indique el enlace de la sala virtual.');
    } else if (!/^https:\/\/[^\s<>"]+$/.test(enlace)) {
      problemas.push('El enlace de la sala virtual debe empezar con https:// y no tener espacios.');
    }
  }
  const inicio = leerCampo('fecha-inicio');
  const fin = leerCampo('fecha-fin');
  if (!inicio || !fin) {
    problemas.push('Las fechas de inicio y de fin son obligatorias.');
  } else if (fin < inicio) {
    problemas.push('La fecha de fin no puede ser anterior a la fecha de inicio.');
  } else if (club) {
    const periodo = catalogo.periodos.get(club.periodoId);
    if (periodo && (inicio < periodo.fechaInicio || fin > periodo.fechaFin)) {
      problemas.push(`Las fechas deben estar dentro del período ${periodo.nombre} (${formatearFecha(periodo.fechaInicio)} a ${formatearFecha(periodo.fechaFin)}).`);
    }
  }
  const duracion = leerEntero('duracion');
  if (duracion !== null && (!Number.isInteger(duracion) || duracion < 1 || duracion > 500)) {
    problemas.push('La duración total debe ser un número entero entre 1 y 500 horas.');
  }
  const cupo = leerEntero('cupo');
  if (cupo === null || !Number.isInteger(cupo) || cupo < 1 || cupo > CUPO_MAXIMO_PERMITIDO) {
    problemas.push('El cupo máximo debe ser un número entero entre 1 y 500.');
  } else if (club && cupo > club.cupoMaximo) {
    problemas.push(`El cupo del curso no puede superar el cupo del club (${club.cupoMaximo}).`);
  }
  return problemas;
}

function construirCuerpo(esCrear) {
  const modalidad = elemento('campo-modalidad').value;
  const cuerpo = {
    nombre: leerCampo('nombre'),
    descripcion: leerCampo('descripcion'),
    nivel: elemento('campo-nivel').value,
    modalidad,
    lugar: ['PRESENCIAL', 'HIBRIDO'].includes(modalidad) ? leerCampo('lugar') : null,
    enlaceVirtual: ['ONLINE', 'HIBRIDO'].includes(modalidad) ? leerCampo('enlace') : null,
    fechaInicio: leerCampo('fecha-inicio'),
    fechaFin: leerCampo('fecha-fin'),
    duracionHoras: leerEntero('duracion'),
    cupoMaximo: leerEntero('cupo')
  };
  if (esCrear) {
    cuerpo.clubId = Number(elemento('campo-club').value);
  }
  return cuerpo;
}

async function guardarCurso(evento) {
  evento.preventDefault();
  if (pantalla.modo === 'ver') {
    return;
  }
  const alertas = elemento('alertas-modal');
  limpiarAlerta(alertas);

  const problemas = validarFormulario();
  if (problemas.length > 0) {
    mostrarAlerta(alertas, 'danger', 'Revise los datos ingresados:', problemas);
    return;
  }

  const esCrear = pantalla.modo === 'crear';
  const ruta = esCrear ? '/api/cursos' : `/api/cursos/${pantalla.curso.id}`;
  const boton = elemento('boton-guardar');
  establecerCargando(boton, true, 'Guardando...');
  try {
    const guardado = await apiFetch(ruta, { metodo: esCrear ? 'POST' : 'PUT', cuerpo: construirCuerpo(esCrear) });
    modalCurso.hide();
    mostrarAlerta(
      elemento('alertas'),
      'success',
      esCrear
        ? `Curso «${guardado.nombre}» creado en estado Planificado. Registre ahora sus horarios con el botón del reloj.`
        : `Curso «${guardado.nombre}» actualizado correctamente.`
    );
    await cargarLista(esCrear ? 0 : pantalla.pagina);
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

async function eliminarCurso(curso) {
  const aceptado = await confirmar({
    titulo: 'Eliminar curso',
    mensaje: `¿Desea eliminar el curso «${curso.nombre}»? Use esta opción solo para cursos creados por error: `
      + 'también se eliminan sus horarios. Si el curso ya tiene inscripciones o solicitudes no podrá eliminarse; '
      + 'en ese caso cámbielo a Cancelado.',
    textoAceptar: 'Eliminar'
  });
  if (!aceptado) {
    return;
  }
  try {
    await apiFetch(`/api/cursos/${curso.id}`, { metodo: 'DELETE' });
    mostrarAlerta(elemento('alertas'), 'success', `Curso «${curso.nombre}» eliminado.`);
    await cargarLista(pantalla.pagina);
  } catch (error) {
    mostrarAlerta(elemento('alertas'), 'danger', mensajeDe(error), mensajesDeError(error));
  }
}

function abrirHorarios(curso) {
  pantalla.cursoHorarios = curso;
  pantalla.horariosCambiaron = false;
  limpiarAlerta(elemento('alertas-horarios'));
  elemento('subtitulo-horarios').textContent = `${curso.nombre} · ${curso.clubNombre} · Modalidad ${MODALIDADES[curso.modalidad].etiqueta.toLowerCase()}`;

  const opciones = SESIONES_POR_MODALIDAD[curso.modalidad].map(tipo => crearElemento('option', {
    texto: TIPOS_SESION[tipo],
    atributos: { value: tipo }
  }));
  elemento('horario-tipo').replaceChildren(...opciones);

  const editable = esEditable(curso);
  elemento('formulario-horario').hidden = !editable;
  elemento('aviso-horarios-cerrados').hidden = editable;
  reiniciarFormularioHorario();
  renderizarHorarios();
  modalHorarios.show();
}

function reiniciarFormularioHorario() {
  pantalla.horarioEditando = null;
  const club = pantalla.cursoHorarios ? buscarClub(pantalla.cursoHorarios.clubId) : null;
  elemento('horario-dia').value = club && club.diaSemana ? String(club.diaSemana) : '1';
  elemento('horario-inicio').value = club && club.horaInicio ? hhmm(club.horaInicio) : '';
  elemento('horario-fin').value = club && club.horaFin ? hhmm(club.horaFin) : '';
  elemento('horario-tipo').selectedIndex = 0;
  elemento('titulo-formulario-horario').textContent = 'Agregar horario';
  elemento('boton-guardar-horario').textContent = 'Agregar';
  elemento('boton-cancelar-horario').hidden = true;
}

function renderizarHorarios() {
  const curso = pantalla.cursoHorarios;
  const cuerpo = elemento('cuerpo-horarios');
  if (curso.horarios.length === 0) {
    cuerpo.replaceChildren(filaMensaje('El curso aún no tiene horarios.', 5));
    elemento('total-horas').textContent = curso.estado === 'PLANIFICADO'
      ? 'Registre al menos un horario para poder iniciar el curso.'
      : '';
    return;
  }
  cuerpo.replaceChildren(...curso.horarios.map(horario => crearFilaHorario(curso, horario)));
  elemento('total-horas').textContent = `Total semanal: ${textoHorasSemanales(curso.horasSemanales)}.`;
}

function crearFilaHorario(curso, horario) {
  const acciones = crearElemento('td', { clase: 'text-end text-nowrap' });
  if (esEditable(curso)) {
    mostrarAccionesHorario(acciones, horario);
  }
  return crearElemento('tr', {}, [
    crearElemento('td', { texto: DIAS[horario.diaSemana] }),
    crearElemento('td', { clase: 'text-nowrap', texto: `${hhmm(horario.horaInicio)}–${hhmm(horario.horaFin)}` }),
    crearElemento('td', { texto: textoDuracion(horario.duracionMinutos) }),
    crearElemento('td', { texto: TIPOS_SESION[horario.tipoSesion] || horario.tipoSesion }),
    acciones
  ]);
}

function botonPequeno(texto, clase, etiqueta, accion, icono = null) {
  const hijos = icono ? [crearElemento('i', { clase: `bi ${icono}`, atributos: { 'aria-hidden': 'true' } })] : [];
  const boton = crearElemento('button', {
    clase: `btn btn-sm ${clase} ms-1`,
    texto: icono ? undefined : texto,
    atributos: { type: 'button', title: etiqueta, 'aria-label': etiqueta }
  }, hijos);
  boton.addEventListener('click', accion);
  return boton;
}

function mostrarAccionesHorario(celda, horario) {
  const descripcion = textoHorario(horario);
  celda.replaceChildren(
    botonPequeno('', 'btn-outline-secondary', `Editar horario ${descripcion}`, () => editarHorario(horario), 'bi-pencil'),
    botonPequeno('', 'btn-outline-danger', `Eliminar horario ${descripcion}`, () => pedirEliminarHorario(celda, horario), 'bi-trash')
  );
}

function pedirEliminarHorario(celda, horario) {
  const pregunta = crearElemento('span', { clase: 'small me-1', texto: '¿Eliminar?' });
  celda.replaceChildren(
    pregunta,
    botonPequeno('Sí', 'btn-danger', `Confirmar eliminación del horario ${textoHorario(horario)}`, () => eliminarHorario(horario)),
    botonPequeno('No', 'btn-outline-secondary', 'Cancelar eliminación', () => mostrarAccionesHorario(celda, horario))
  );
}

function editarHorario(horario) {
  pantalla.horarioEditando = horario.id;
  elemento('horario-dia').value = String(horario.diaSemana);
  elemento('horario-inicio').value = hhmm(horario.horaInicio);
  elemento('horario-fin').value = hhmm(horario.horaFin);
  elemento('horario-tipo').value = horario.tipoSesion;
  elemento('titulo-formulario-horario').textContent = `Editar horario: ${textoHorario(horario)}`;
  elemento('boton-guardar-horario').textContent = 'Actualizar';
  elemento('boton-cancelar-horario').hidden = false;
  elemento('horario-inicio').focus();
}

function validarHorario() {
  const inicio = elemento('horario-inicio').value;
  const fin = elemento('horario-fin').value;
  if (!inicio || !fin) {
    return 'Indique la hora de inicio y la hora de fin.';
  }
  if (fin <= inicio) {
    return 'La hora de fin debe ser posterior a la hora de inicio.';
  }
  const [hi, mi] = inicio.split(':').map(Number);
  const [hf, mf] = fin.split(':').map(Number);
  const minutos = (hf * 60 + mf) - (hi * 60 + mi);
  if (minutos < 15 || minutos > 360) {
    return 'Cada sesión debe durar entre 15 minutos y 6 horas.';
  }
  if (!elemento('horario-tipo').value) {
    return 'Seleccione el tipo de sesión.';
  }
  return null;
}

async function refrescarCursoHorarios() {
  pantalla.cursoHorarios = await apiFetch(`/api/cursos/${pantalla.cursoHorarios.id}`);
  renderizarHorarios();
}

async function guardarHorario(evento) {
  evento.preventDefault();
  const alertas = elemento('alertas-horarios');
  limpiarAlerta(alertas);
  const problema = validarHorario();
  if (problema) {
    mostrarAlerta(alertas, 'danger', problema);
    return;
  }
  const curso = pantalla.cursoHorarios;
  const editando = pantalla.horarioEditando;
  const ruta = editando ? `/api/cursos/${curso.id}/horarios/${editando}` : `/api/cursos/${curso.id}/horarios`;
  const cuerpo = {
    diaSemana: Number(elemento('horario-dia').value),
    horaInicio: elemento('horario-inicio').value,
    horaFin: elemento('horario-fin').value,
    tipoSesion: elemento('horario-tipo').value
  };
  const boton = elemento('boton-guardar-horario');
  establecerCargando(boton, true, 'Guardando...');
  try {
    const guardado = await apiFetch(ruta, { metodo: editando ? 'PUT' : 'POST', cuerpo });
    pantalla.horariosCambiaron = true;
    establecerCargando(boton, false);
    reiniciarFormularioHorario();
    await refrescarCursoHorarios();
    const texto = `Horario ${textoHorario(guardado)} ${editando ? 'actualizado' : 'agregado'}.`;
    if (guardado.advertencias && guardado.advertencias.length > 0) {
      mostrarAlerta(alertas, 'warning', `${texto} Revise estos cruces con otros cursos del club:`, guardado.advertencias);
    } else {
      mostrarAlerta(alertas, 'success', texto);
    }
  } catch (error) {
    establecerCargando(boton, false);
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  }
}

async function eliminarHorario(horario) {
  const alertas = elemento('alertas-horarios');
  limpiarAlerta(alertas);
  const curso = pantalla.cursoHorarios;
  try {
    await apiFetch(`/api/cursos/${curso.id}/horarios/${horario.id}`, { metodo: 'DELETE' });
    pantalla.horariosCambiaron = true;
    if (pantalla.horarioEditando === horario.id) {
      reiniciarFormularioHorario();
    }
    await refrescarCursoHorarios();
    mostrarAlerta(alertas, 'success', `Horario ${textoHorario(horario)} eliminado.`);
  } catch (error) {
    renderizarHorarios();
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  }
}

function abrirCambioEstado(curso) {
  pantalla.cursoEstado = curso;
  limpiarAlerta(elemento('alertas-estado'));
  elemento('estado-curso').textContent = `${curso.nombre} · ${curso.clubNombre}`;
  elemento('estado-actual').replaceChildren(insignia(ESTADOS_CURSO, curso.estado));
  const opciones = TRANSICIONES[curso.estado].map(codigo => crearElemento('option', {
    texto: ESTADOS_CURSO[codigo].etiqueta,
    atributos: { value: codigo }
  }));
  elemento('estado-nuevo').replaceChildren(...opciones);
  elemento('estado-motivo').value = '';
  actualizarAvisoEstado();
  elemento('boton-guardar-estado').disabled = false;
  modalEstado.show();
}

function actualizarAvisoEstado() {
  const curso = pantalla.cursoEstado;
  const nuevo = elemento('estado-nuevo').value;
  const aviso = elemento('aviso-estado');
  const inscritos = curso.inscritosActivos;
  let texto = '';
  if (nuevo === 'EN_CURSO') {
    texto = 'Para iniciar el curso, su club debe estar activo y el curso debe tener al menos un horario.';
    if (curso.horarios.length === 0) {
      texto += ' Este curso todavía no tiene horarios: regístrelos antes de iniciarlo.';
    }
  } else if (nuevo === 'FINALIZADO') {
    texto = `Las ${inscritos} inscripciones activas pasarán a Finalizada. Después podrá registrar el resultado `
      + '(aprobado o no aprobado) de cada participante. Un curso finalizado ya no se puede editar ni reabrir.';
  } else if (nuevo === 'CANCELADO') {
    texto = `Las ${inscritos} inscripciones activas pasarán a Retirada y se liberarán sus cupos. `
      + 'Un curso cancelado ya no se puede editar ni reabrir.';
  }
  aviso.textContent = texto;
  aviso.hidden = texto === '';

  const cancelar = nuevo === 'CANCELADO';
  elemento('grupo-motivo').hidden = !['FINALIZADO', 'CANCELADO'].includes(nuevo);
  elemento('etiqueta-motivo').textContent = cancelar ? 'Motivo de la cancelación *' : 'Observación (opcional)';
  elemento('estado-motivo').required = cancelar;
}

async function guardarEstado(evento) {
  evento.preventDefault();
  const curso = pantalla.cursoEstado;
  const nuevo = elemento('estado-nuevo').value;
  const motivo = elemento('estado-motivo').value.trim();
  const alertas = elemento('alertas-estado');
  limpiarAlerta(alertas);
  if (!nuevo) {
    mostrarAlerta(alertas, 'danger', 'Seleccione el nuevo estado.');
    return;
  }
  if (nuevo === 'CANCELADO' && !motivo) {
    mostrarAlerta(alertas, 'danger', 'Indique el motivo de la cancelación.');
    return;
  }
  const boton = elemento('boton-guardar-estado');
  establecerCargando(boton, true, 'Guardando...');
  try {
    const cuerpo = { estado: nuevo, motivo: ['FINALIZADO', 'CANCELADO'].includes(nuevo) && motivo ? motivo : null };
    await apiFetch(`/api/cursos/${curso.id}/estado`, { metodo: 'PATCH', cuerpo });
    modalEstado.hide();
    let mensaje = `El curso «${curso.nombre}» ahora está ${ESTADOS_CURSO[nuevo].etiqueta.toLowerCase()}.`;
    if (nuevo === 'FINALIZADO') {
      mensaje += ' Ya puede registrar los resultados desde el botón de participantes.';
    }
    mostrarAlerta(elemento('alertas'), 'success', mensaje);
    await cargarLista(pantalla.pagina);
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

function textoAvisoResultados(curso) {
  if (!puedeRegistrarResultados(curso)) {
    return 'Consulta de solo lectura. Los resultados los registran el Administrador, el Responsable institucional y el Docente del club.';
  }
  if (curso.estado === 'FINALIZADO') {
    return 'Registre el resultado de cada participante que terminó el curso. Si un estudiante ya tiene un certificado '
      + 'de aprobación vigente de este curso, anúlelo antes de cambiar su resultado.';
  }
  if (curso.estado === 'CANCELADO') {
    return 'El curso fue cancelado: sus participantes quedaron retirados y no se registran resultados.';
  }
  return 'Los resultados se registran cuando el curso pasa a Finalizado; entonces las inscripciones activas quedan '
    + 'como Finalizada y aparece aquí la opción para registrar Aprobado o No aprobado.';
}

async function abrirParticipantes(curso) {
  pantalla.cursoParticipantes = curso;
  pantalla.participantesCambiaron = false;
  limpiarAlerta(elemento('alertas-participantes'));
  elemento('subtitulo-participantes').textContent = `${curso.nombre} · ${curso.clubNombre} · ${ESTADOS_CURSO[curso.estado].etiqueta}`;
  elemento('aviso-resultados').textContent = textoAvisoResultados(curso);
  document.querySelectorAll('#modal-participantes .columna-completa').forEach(columna => {
    columna.hidden = soloDatosMinimos();
  });
  const columnas = soloDatosMinimos() ? 6 : 7;
  elemento('cuerpo-participantes').replaceChildren(filaMensaje('Cargando participantes...', columnas));
  elemento('resumen-participantes').textContent = '';
  modalParticipantes.show();

  try {
    const participantes = await apiFetch(`/api/cursos/${curso.id}/participantes`);
    renderizarParticipantes(participantes);
  } catch (error) {
    elemento('cuerpo-participantes').replaceChildren(filaMensaje('No se pudo cargar la lista.', columnas));
    mostrarAlerta(elemento('alertas-participantes'), 'danger', mensajeDe(error));
  }
}

function renderizarParticipantes(participantes) {
  const columnas = soloDatosMinimos() ? 6 : 7;
  const cuerpo = elemento('cuerpo-participantes');
  if (participantes.length === 0) {
    cuerpo.replaceChildren(filaMensaje('El curso no tiene participantes inscritos.', columnas));
  } else {
    cuerpo.replaceChildren(...participantes.map(crearFilaParticipante));
  }
  elemento('resumen-participantes').textContent = resumenParticipantes(participantes);
  pantalla.participantes = participantes;
}

function resumenParticipantes(participantes) {
  if (participantes.length === 0) {
    return '';
  }
  const contar = condicion => participantes.filter(condicion).length;
  const finalizados = contar(p => p.estado === 'FINALIZADA');
  const partes = [
    `${participantes.length} participantes`,
    `${contar(p => p.estado === 'ACTIVA')} activos`,
    `${finalizados} finalizados`,
    `${contar(p => p.estado === 'RETIRADA')} retirados`
  ];
  let texto = partes.join(' · ');
  if (finalizados > 0) {
    texto += `. Resultados: ${contar(p => p.resultado === 'APROBADO')} aprobados, `
      + `${contar(p => p.resultado === 'NO_APROBADO')} no aprobados y `
      + `${contar(p => p.estado === 'FINALIZADA' && !p.resultado)} sin registrar.`;
  }
  return texto;
}

function nombreParticipante(participante) {
  return `${participante.estudianteApellidos} ${participante.estudianteNombres}`;
}

function identificarParticipante(participante) {
  return soloDatosMinimos() ? participante.estudianteCodigo : `${nombreParticipante(participante)} (${participante.estudianteCodigo})`;
}

function crearFilaParticipante(participante) {
  const curso = pantalla.cursoParticipantes;
  const celdas = [
    crearElemento('td', { clase: 'text-nowrap font-monospace small', texto: participante.estudianteCodigo })
  ];
  if (!soloDatosMinimos()) {
    celdas.push(crearElemento('td', { clase: 'fw-semibold', texto: nombreParticipante(participante) }));
  }
  celdas.push(crearElemento('td', {}, [insignia(ESTADOS_INSCRIPCION, participante.estado)]));
  celdas.push(crearElemento('td', { clase: 'text-nowrap', texto: formatearFecha(participante.fechaIngreso) }));
  celdas.push(crearElemento('td', { clase: 'text-nowrap', texto: formatearFecha(participante.fechaFin) }));

  const editable = puedeRegistrarResultados(curso) && participante.estado === 'FINALIZADA';
  celdas.push(editable ? celdaResultadoEditable(participante) : celdaResultado(participante));

  const certificados = participante.certificadosVigentes || [];
  celdas.push(crearElemento('td', {}, certificados.length === 0
    ? [crearElemento('span', { clase: 'text-body-secondary', texto: '—' })]
    : certificados.map(certificado => crearElemento('div', {
      clase: 'small font-monospace text-nowrap',
      texto: certificado.codigoVerificacion
    }))));
  return crearElemento('tr', {}, celdas);
}

function celdaResultado(participante) {
  if (participante.resultado) {
    return crearElemento('td', {}, [insignia(RESULTADOS, participante.resultado)]);
  }
  const texto = participante.estado === 'FINALIZADA' ? 'Sin registrar' : '—';
  return crearElemento('td', {}, [crearElemento('span', { clase: 'small text-body-secondary', texto })]);
}

function celdaResultadoEditable(participante) {
  const etiqueta = `Resultado de ${identificarParticipante(participante)}`;
  const selector = crearElemento('select', {
    clase: 'form-select form-select-sm',
    atributos: { 'aria-label': etiqueta }
  }, [
    crearElemento('option', { texto: 'Sin registrar', atributos: { value: '' } }),
    crearElemento('option', { texto: RESULTADOS.APROBADO.etiqueta, atributos: { value: 'APROBADO' } }),
    crearElemento('option', { texto: RESULTADOS.NO_APROBADO.etiqueta, atributos: { value: 'NO_APROBADO' } })
  ]);
  selector.value = participante.resultado || '';

  const boton = crearElemento('button', {
    clase: 'btn btn-sm btn-primary',
    texto: 'Guardar',
    atributos: { type: 'button', 'aria-label': `Guardar resultado de ${identificarParticipante(participante)}` }
  });
  boton.disabled = true;
  selector.addEventListener('change', () => {
    boton.disabled = selector.value === (participante.resultado || '');
  });
  boton.addEventListener('click', () => guardarResultado(participante, selector, boton));

  const grupo = crearElemento('div', { clase: 'input-group input-group-sm flex-nowrap' }, [selector, boton]);
  return crearElemento('td', {}, [grupo]);
}

async function guardarResultado(participante, selector, boton) {
  const alertas = elemento('alertas-participantes');
  limpiarAlerta(alertas);
  const valor = selector.value || null;
  establecerCargando(boton, true, '...');
  try {
    const actualizado = await apiFetch(`/api/inscripciones-curso/${participante.inscripcionCursoId}/resultado`, {
      metodo: 'PATCH',
      cuerpo: { resultado: valor }
    });
    pantalla.participantesCambiaron = true;
    const lista = pantalla.participantes.map(p => (p.inscripcionCursoId === actualizado.inscripcionCursoId ? actualizado : p));
    renderizarParticipantes(lista);
    const texto = valor ? RESULTADOS[valor].etiqueta : 'Sin registrar';
    const avisos = actualizado.avisos || [];
    mostrarAlerta(alertas, avisos.length > 0 ? 'info' : 'success',
      `Resultado de ${identificarParticipante(actualizado)}: ${texto}.`, avisos);
  } catch (error) {
    establecerCargando(boton, false);
    selector.value = participante.resultado || '';
    boton.disabled = true;
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  }
}
