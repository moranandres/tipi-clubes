import { apiFetch, construirConsulta, ApiError } from './api.js';
import { cargarInstituciones, cargarPeriodos, cargarDocentesActivos } from './catalogos.js';
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
const ROLES_GLOBALES = ['ADMIN', 'COORDINADOR', 'CONSULTA'];
const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const ESTADOS = {
  PLANIFICADO: { etiqueta: 'Planificado', clase: 'text-bg-info' },
  ACTIVO: { etiqueta: 'Activo', clase: 'text-bg-success' },
  SUSPENDIDO: { etiqueta: 'Suspendido', clase: 'text-bg-warning' },
  CERRADO: { etiqueta: 'Cerrado', clase: 'text-bg-secondary' }
};

const TRANSICIONES = {
  PLANIFICADO: ['ACTIVO', 'CERRADO'],
  ACTIVO: ['SUSPENDIDO', 'CERRADO'],
  SUSPENDIDO: ['ACTIVO', 'CERRADO'],
  CERRADO: ['ACTIVO']
};

const TITULOS_MODAL = {
  crear: 'Nuevo club',
  editar: 'Editar club',
  ver: 'Detalle del club'
};

const sesion = exigirSesion();
const pantalla = { pagina: 0, filtros: {}, modo: null, club: null, solicitudDocentes: 0 };
const catalogo = { periodos: [] };
let modalClub = null;
let modalEstado = null;

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

function puedeEscribir() {
  return rolActual() === 'ADMIN' || rolActual() === 'RESP_INSTITUCIONAL';
}

function puedeGestionar(club) {
  if (rolActual() === 'ADMIN') {
    return true;
  }
  return rolActual() === 'RESP_INSTITUCIONAL' && club.institucionId === sesion.usuario.institucionId;
}

function mensajeDe(error) {
  return error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
}

function hhmm(texto) {
  return texto ? texto.slice(0, 5) : '';
}

async function iniciar() {
  montarLayout(sesion, 'clubes');

  elemento('boton-nuevo').hidden = !puedeEscribir();
  elemento('grupo-filtro-institucion').hidden = !esGlobal();

  modalClub = bootstrap.Modal.getOrCreateInstance(elemento('modal-club'));
  modalEstado = bootstrap.Modal.getOrCreateInstance(elemento('modal-estado'));

  elemento('boton-nuevo').addEventListener('click', () => abrirFormulario('crear', null));

  elemento('formulario-filtros').addEventListener('submit', evento => {
    evento.preventDefault();
    pantalla.filtros = leerFiltros();
    cargarLista(0);
  });
  elemento('formulario-filtros').addEventListener('reset', () => {
    setTimeout(() => {
      pantalla.filtros = {};
      cargarLista(0);
    }, 0);
  });

  elemento('formulario-club').addEventListener('submit', guardarClub);
  elemento('campo-institucion').addEventListener('change', () => {
    if (pantalla.modo === 'crear') {
      limpiarAlerta(elemento('alertas-modal'));
      cargarDocentes();
    }
  });

  elemento('formulario-estado').addEventListener('submit', guardarEstado);
  elemento('estado-nuevo').addEventListener('change', actualizarCamposEstado);

  await cargarCatalogos();
  await cargarLista(0);
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

async function cargarCatalogos() {
  try {
    const [instituciones, periodos] = await Promise.all([cargarInstituciones(), cargarPeriodos()]);
    catalogo.periodos = periodos;

    const textoPeriodo = periodo => (periodo.activo ? `${periodo.nombre} (activo)` : periodo.nombre);
    llenarSelect(elemento('filtro-institucion'), instituciones, 'Todas', item => String(item.id), item => item.nombre);
    llenarSelect(elemento('campo-institucion'), instituciones, 'Seleccione una institución', item => String(item.id), item => item.nombre);
    llenarSelect(elemento('filtro-periodo'), periodos, 'Todos', item => String(item.id), textoPeriodo);
    llenarSelect(elemento('campo-periodo'), periodos, 'Seleccione un período', item => String(item.id), textoPeriodo);
  } catch (error) {
    mostrarAlerta(
      elemento('alertas'),
      'danger',
      `No se pudieron cargar los catálogos de instituciones y períodos. ${mensajeDe(error)}`
    );
  }
}

function leerFiltros() {
  return {
    q: elemento('filtro-q').value.trim(),
    institucionId: esGlobal() ? elemento('filtro-institucion').value : '',
    periodoId: elemento('filtro-periodo').value,
    estado: elemento('filtro-estado').value
  };
}

function filaMensaje(texto) {
  const celda = crearElemento('td', {
    clase: 'text-center text-body-secondary py-4',
    texto,
    atributos: { colspan: '8' }
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
  cuerpo.replaceChildren(filaMensaje('Cargando clubes...'));
  try {
    const ruta = `/api/clubes${construirConsulta({ ...pantalla.filtros, pagina, tamano: TAMANO_PAGINA })}`;
    const respuesta = await apiFetch(ruta);
    pantalla.pagina = respuesta.pagina;
    if (respuesta.contenido.length === 0) {
      cuerpo.replaceChildren(filaMensaje('No se encontraron clubes.'));
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

function crearHorario(club) {
  if (!club.diaSemana) {
    return [crearElemento('span', { clase: 'text-body-secondary', texto: 'Sin horario' })];
  }
  const partes = [
    crearElemento('div', {
      texto: `${DIAS[club.diaSemana]} ${hhmm(club.horaInicio)}–${hhmm(club.horaFin)}`
    })
  ];
  if (club.lugar) {
    partes.push(crearElemento('div', { clase: 'small text-body-secondary', texto: club.lugar }));
  }
  return partes;
}

function crearCupos(club) {
  const porcentaje = club.cupoMaximo > 0
    ? Math.min(100, Math.round((club.integrantesActivos * 100) / club.cupoMaximo))
    : 0;

  let colorBarra = 'progress-bar';
  if (porcentaje >= 100) {
    colorBarra = 'progress-bar bg-danger';
  } else if (porcentaje >= 80) {
    colorBarra = 'progress-bar bg-warning';
  }

  const relleno = crearElemento('div', {
    clase: colorBarra,
    atributos: { style: `width: ${porcentaje}%` }
  });
  const barra = crearElemento('div', {
    clase: 'progress',
    atributos: {
      style: 'height: 6px',
      role: 'progressbar',
      'aria-label': `Ocupación del club ${club.nombre}`,
      'aria-valuenow': String(club.integrantesActivos),
      'aria-valuemin': '0',
      'aria-valuemax': String(club.cupoMaximo)
    }
  }, [relleno]);

  return [
    crearElemento('div', { clase: 'small', texto: `${club.integrantesActivos} de ${club.cupoMaximo}` }),
    barra,
    crearElemento('div', { clase: 'small text-body-secondary', texto: `${club.cuposDisponibles} disponibles` })
  ];
}

function crearFila(club) {
  const estado = ESTADOS[club.estado] || { etiqueta: club.estado, clase: 'text-bg-light' };
  const insignia = crearElemento('span', { clase: `badge ${estado.clase}`, texto: estado.etiqueta });

  return crearElemento('tr', {}, [
    crearElemento('td', { clase: 'fw-semibold', texto: club.nombre }),
    crearElemento('td', { texto: club.institucionNombre || '—' }),
    crearElemento('td', { texto: club.periodoNombre || '—' }),
    crearElemento('td', { texto: club.docenteNombre || '—' }),
    crearElemento('td', {}, crearHorario(club)),
    crearElemento('td', { clase: 'cupos-club' }, crearCupos(club)),
    crearElemento('td', {}, [insignia]),
    crearElemento('td', { clase: 'text-end text-nowrap' }, crearAcciones(club))
  ]);
}

function transicionesPermitidas(club) {
  if (club.estado === 'CERRADO' && rolActual() !== 'ADMIN') {
    return [];
  }
  return TRANSICIONES[club.estado] || [];
}

function crearAcciones(club) {
  const acciones = [
    crearBoton('bi-eye', 'Ver detalle', club, () => abrirFormulario('ver', club))
  ];
  if (puedeGestionar(club)) {
    if (club.estado !== 'CERRADO') {
      acciones.push(crearBoton('bi-pencil', 'Editar', club, () => abrirFormulario('editar', club)));
    }
    if (transicionesPermitidas(club).length > 0) {
      acciones.push(crearBoton(
        'bi-arrow-repeat',
        club.estado === 'CERRADO' ? 'Reabrir club' : 'Cambiar estado',
        club,
        () => abrirEstado(club)
      ));
    }
  }
  return acciones;
}

function crearBoton(icono, etiqueta, club, accion) {
  const marca = crearElemento('i', { clase: `bi ${icono}`, atributos: { 'aria-hidden': 'true' } });
  const boton = crearElemento('button', {
    clase: 'btn btn-sm btn-outline-secondary ms-1',
    atributos: {
      type: 'button',
      title: etiqueta,
      'aria-label': `${etiqueta}: ${club.nombre}`
    }
  }, [marca]);
  boton.addEventListener('click', accion);
  return boton;
}

function leerCampo(nombre) {
  const valor = elemento(`campo-${nombre}`).value.trim();
  return valor === '' ? null : valor;
}

async function cargarDocentes() {
  const selector = elemento('campo-docente');
  const institucionId = elemento('campo-institucion').value;
  const club = pantalla.club;
  const solicitud = ++pantalla.solicitudDocentes;

  if (pantalla.modo === 'ver') {
    selector.replaceChildren(crearElemento('option', {
      texto: club.docenteNombre || '—',
      atributos: { value: String(club.docenteId) }
    }));
    selector.value = String(club.docenteId);
    selector.disabled = true;
    return;
  }

  selector.replaceChildren(crearElemento('option', { texto: 'Seleccione un docente', atributos: { value: '' } }));
  selector.disabled = true;
  if (!institucionId) {
    return;
  }

  try {
    const docentes = await cargarDocentesActivos(institucionId);
    if (solicitud !== pantalla.solicitudDocentes) {
      return;
    }
    docentes.forEach(docente => {
      selector.appendChild(crearElemento('option', {
        texto: `${docente.apellidos} ${docente.nombres}`,
        atributos: { value: String(docente.id) }
      }));
    });
    if (club && String(club.institucionId) === institucionId) {
      selector.value = String(club.docenteId);
    }
    selector.disabled = false;
    if (docentes.length === 0) {
      mostrarAlerta(
        elemento('alertas-modal'),
        'info',
        'La institución no tiene docentes activos. Registre uno en el módulo Docentes antes de crear el club.'
      );
    }
  } catch (error) {
    if (solicitud === pantalla.solicitudDocentes) {
      mostrarAlerta(
        elemento('alertas-modal'),
        'warning',
        `No se pudieron cargar los docentes. ${mensajeDe(error)}`
      );
    }
  }
}

function abrirFormulario(modo, club) {
  pantalla.modo = modo;
  pantalla.club = club;
  const esCrear = modo === 'crear';
  const esVer = modo === 'ver';

  limpiarAlerta(elemento('alertas-modal'));
  elemento('titulo-modal-club').textContent = TITULOS_MODAL[modo];

  let institucionInicial = '';
  if (club) {
    institucionInicial = String(club.institucionId);
  } else if (rolActual() === 'RESP_INSTITUCIONAL' && sesion.usuario.institucionId) {
    institucionInicial = String(sesion.usuario.institucionId);
  }
  elemento('campo-institucion').value = institucionInicial;
  elemento('campo-institucion').disabled = !(esCrear && rolActual() === 'ADMIN');

  let periodoInicial = '';
  if (club) {
    periodoInicial = String(club.periodoId);
  } else {
    const activo = catalogo.periodos.find(periodo => periodo.activo);
    periodoInicial = activo ? String(activo.id) : '';
  }
  elemento('campo-periodo').value = periodoInicial;
  elemento('campo-periodo').disabled = !esCrear;

  elemento('campo-nombre').value = club ? club.nombre : '';
  elemento('campo-objetivo').value = club ? club.objetivo : '';
  elemento('campo-dia').value = club && club.diaSemana ? String(club.diaSemana) : '';
  elemento('campo-horaInicio').value = club ? hhmm(club.horaInicio) : '';
  elemento('campo-horaFin').value = club ? hhmm(club.horaFin) : '';
  elemento('campo-lugar').value = club && club.lugar ? club.lugar : '';
  elemento('campo-cupo').value = club ? String(club.cupoMaximo) : '';

  ['nombre', 'objetivo', 'dia', 'horaInicio', 'horaFin', 'lugar', 'cupo'].forEach(nombre => {
    elemento(`campo-${nombre}`).disabled = esVer;
  });

  const ayudaCupo = elemento('ayuda-cupo');
  ayudaCupo.hidden = modo !== 'editar';
  if (modo === 'editar') {
    ayudaCupo.textContent = `No puede ser menor que los integrantes activos actuales (${club.integrantesActivos}).`;
  }

  elemento('grupo-info-club').hidden = esCrear;
  if (club) {
    elemento('info-club').textContent =
      `Creado el ${formatearFecha(club.fechaCreacion)} · Integrantes activos: ${club.integrantesActivos} de ${club.cupoMaximo}`;
  }

  const botonGuardar = elemento('boton-guardar');
  botonGuardar.hidden = esVer;
  botonGuardar.disabled = false;

  modalClub.show();
  cargarDocentes();
}

function validarFormulario() {
  const problemas = [];
  const esCrear = pantalla.modo === 'crear';

  if (esCrear && !elemento('campo-institucion').value) {
    problemas.push('Seleccione la institución del club.');
  }
  if (esCrear && !elemento('campo-periodo').value) {
    problemas.push('Seleccione el período del club.');
  }
  if (!elemento('campo-docente').value) {
    problemas.push('Seleccione el docente responsable.');
  }
  if (!leerCampo('nombre')) {
    problemas.push('El nombre del club es obligatorio.');
  }
  if (!leerCampo('objetivo')) {
    problemas.push('El objetivo del club es obligatorio.');
  }

  const dia = elemento('campo-dia').value;
  const inicio = leerCampo('horaInicio');
  const fin = leerCampo('horaFin');
  const algunoPresente = Boolean(dia || inicio || fin);
  const algunoFaltante = !dia || !inicio || !fin;
  if (algunoPresente && algunoFaltante) {
    problemas.push('El horario requiere día, hora de inicio y hora de fin, o dejar los tres campos vacíos.');
  } else if (inicio && fin && hhmm(fin) <= hhmm(inicio)) {
    problemas.push('La hora de fin debe ser posterior a la hora de inicio.');
  }

  const cupo = Number(elemento('campo-cupo').value);
  if (!Number.isInteger(cupo) || cupo < 1 || cupo > 500) {
    problemas.push('El cupo máximo debe ser un número entero entre 1 y 500.');
  } else if (pantalla.modo === 'editar' && cupo < pantalla.club.integrantesActivos) {
    problemas.push(
      `El cupo máximo no puede ser menor que los integrantes activos actuales (${pantalla.club.integrantesActivos}).`
    );
  }
  return problemas;
}

function construirCuerpo(esCrear) {
  const dia = elemento('campo-dia').value;
  const cuerpo = {
    docenteId: Number(elemento('campo-docente').value),
    nombre: leerCampo('nombre'),
    objetivo: leerCampo('objetivo'),
    diaSemana: dia ? Number(dia) : null,
    horaInicio: leerCampo('horaInicio'),
    horaFin: leerCampo('horaFin'),
    lugar: leerCampo('lugar'),
    cupoMaximo: Number(elemento('campo-cupo').value)
  };
  if (esCrear) {
    cuerpo.institucionId = Number(elemento('campo-institucion').value);
    cuerpo.periodoId = Number(elemento('campo-periodo').value);
  }
  return cuerpo;
}

async function guardarClub(evento) {
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
  const ruta = esCrear ? '/api/clubes' : `/api/clubes/${pantalla.club.id}`;
  const boton = elemento('boton-guardar');
  establecerCargando(boton, true, 'Guardando...');
  try {
    await apiFetch(ruta, { metodo: esCrear ? 'POST' : 'PUT', cuerpo: construirCuerpo(esCrear) });
    modalClub.hide();
    mostrarAlerta(
      elemento('alertas'),
      'success',
      esCrear ? 'Club creado correctamente.' : 'Club actualizado correctamente.'
    );
    await cargarLista(esCrear ? 0 : pantalla.pagina);
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

function etiquetaDestino(actual, destino) {
  if (actual === 'CERRADO' && destino === 'ACTIVO') {
    return 'Reabrir como Activo';
  }
  return ESTADOS[destino].etiqueta;
}

function motivoObligatorio(actual, nuevo) {
  return nuevo === 'SUSPENDIDO' || nuevo === 'CERRADO' || actual === 'CERRADO';
}

function actualizarCamposEstado() {
  const club = pantalla.club;
  const nuevo = elemento('estado-nuevo').value;
  elemento('etiqueta-motivo').textContent = motivoObligatorio(club.estado, nuevo)
    ? 'Motivo *'
    : 'Motivo (opcional)';
  elemento('aviso-estado').hidden = nuevo !== 'CERRADO';
}

function abrirEstado(club) {
  pantalla.club = club;
  limpiarAlerta(elemento('alertas-estado'));
  elemento('estado-club').textContent = club.nombre;
  elemento('estado-actual').textContent = ESTADOS[club.estado].etiqueta;

  const opciones = transicionesPermitidas(club).map(destino => crearElemento('option', {
    texto: etiquetaDestino(club.estado, destino),
    atributos: { value: destino }
  }));
  elemento('estado-nuevo').replaceChildren(...opciones);
  elemento('estado-motivo').value = '';
  elemento('boton-guardar-estado').disabled = false;
  actualizarCamposEstado();
  modalEstado.show();
}

async function guardarEstado(evento) {
  evento.preventDefault();
  const alertas = elemento('alertas-estado');
  limpiarAlerta(alertas);

  const club = pantalla.club;
  const nuevo = elemento('estado-nuevo').value;
  const motivo = elemento('estado-motivo').value.trim();

  if (!nuevo) {
    mostrarAlerta(alertas, 'danger', 'Seleccione el nuevo estado.');
    return;
  }
  if (motivoObligatorio(club.estado, nuevo) && !motivo) {
    mostrarAlerta(alertas, 'danger', 'Debe indicar el motivo del cambio de estado.');
    return;
  }

  const boton = elemento('boton-guardar-estado');
  establecerCargando(boton, true, 'Guardando...');
  try {
    await apiFetch(`/api/clubes/${club.id}/estado`, {
      metodo: 'PATCH',
      cuerpo: { estado: nuevo, motivo: motivo || null }
    });
    modalEstado.hide();
    mostrarAlerta(
      elemento('alertas'),
      'success',
      `El club «${club.nombre}» ahora está en estado ${ESTADOS[nuevo].etiqueta}.`
    );
    await cargarLista(pantalla.pagina);
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}