import { apiFetch, construirConsulta, ApiError } from './api.js';
import { cargarInstituciones } from './catalogos.js';
import { confirmar } from './confirmacion.js';
import { exigirSesion } from './guard.js';
import { montarLayout } from './layout.js';
import { renderizarPaginacion } from './paginacion.js';
import {
  crearElemento,
  mostrarAlerta,
  limpiarAlerta,
  establecerCargando,
  mensajesDeError
} from './ui.js';

const TAMANO_PAGINA = 10;
const ROLES_GLOBALES = ['ADMIN', 'COORDINADOR', 'CONSULTA'];

const TITULOS_MODAL = {
  crear: 'Nuevo docente',
  editar: 'Editar docente',
  ver: 'Detalle del docente'
};

const sesion = exigirSesion();
const pantalla = { pagina: 0, filtros: {}, modo: null, docente: null, solicitudCuentas: 0 };
const catalogo = { nombresInstituciones: new Map() };
let modalDocente = null;

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

function puedeGestionar(docente) {
  if (rolActual() === 'ADMIN') {
    return true;
  }
  return rolActual() === 'RESP_INSTITUCIONAL' && docente.institucionId === sesion.usuario.institucionId;
}

function mensajeDe(error) {
  return error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
}

async function iniciar() {
  montarLayout(sesion, 'docentes');

  elemento('boton-nuevo').hidden = !puedeEscribir();
  elemento('formulario-filtros').hidden = rolActual() === 'DOCENTE';
  elemento('grupo-filtro-institucion').hidden = !esGlobal();

  modalDocente = bootstrap.Modal.getOrCreateInstance(elemento('modal-docente'));

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

  elemento('formulario-docente').addEventListener('submit', guardarDocente);
  elemento('campo-institucion').addEventListener('change', () => {
    if (pantalla.modo === 'crear') {
      cargarCuentas();
    }
  });

  await cargarCatalogos();
  await cargarLista(0);
}

function llenarSelect(selector, elementos, textoVacio) {
  const opciones = [crearElemento('option', { texto: textoVacio, atributos: { value: '' } })];
  elementos.forEach(institucion => {
    opciones.push(crearElemento('option', {
      texto: institucion.nombre,
      atributos: { value: String(institucion.id) }
    }));
  });
  selector.replaceChildren(...opciones);
}

async function cargarCatalogos() {
  try {
    const instituciones = await cargarInstituciones();
    instituciones.forEach(institucion => catalogo.nombresInstituciones.set(institucion.id, institucion.nombre));
    llenarSelect(elemento('filtro-institucion'), instituciones, 'Todas');
    llenarSelect(elemento('campo-institucion'), instituciones, 'Seleccione una institución');
  } catch (error) {
    mostrarAlerta(
      elemento('alertas'),
      'danger',
      `No se pudo cargar el catálogo de instituciones. ${mensajeDe(error)}`
    );
  }
}

function leerFiltros() {
  return {
    q: elemento('filtro-q').value.trim(),
    institucionId: esGlobal() ? elemento('filtro-institucion').value : '',
    activo: elemento('filtro-activo').value
  };
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
  cuerpo.replaceChildren(filaMensaje('Cargando docentes...'));
  try {
    const ruta = `/api/docentes${construirConsulta({ ...pantalla.filtros, pagina, tamano: TAMANO_PAGINA })}`;
    const respuesta = await apiFetch(ruta);
    pantalla.pagina = respuesta.pagina;
    if (respuesta.contenido.length === 0) {
      cuerpo.replaceChildren(filaMensaje('No se encontraron docentes.'));
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

function crearFila(docente) {
  const institucion = catalogo.nombresInstituciones.get(docente.institucionId)
    || `Institución ${docente.institucionId}`;

  const cuenta = docente.usuarioId
    ? crearElemento('span', { clase: 'badge text-bg-success', texto: 'Vinculada' })
    : crearElemento('span', { clase: 'badge text-bg-warning', texto: 'Sin cuenta' });

  const estado = docente.activo
    ? crearElemento('span', { clase: 'badge text-bg-success', texto: 'Activo' })
    : crearElemento('span', { clase: 'badge text-bg-secondary', texto: 'Inactivo' });

  return crearElemento('tr', {}, [
    crearElemento('td', { clase: 'fw-semibold', texto: `${docente.apellidos} ${docente.nombres}` }),
    crearElemento('td', { texto: institucion }),
    crearElemento('td', {}, [
      crearElemento('div', { texto: docente.correo || '—' }),
      crearElemento('div', { clase: 'small text-body-secondary', texto: docente.telefono || '' })
    ]),
    crearElemento('td', {}, [cuenta]),
    crearElemento('td', {}, [estado]),
    crearElemento('td', { clase: 'text-end text-nowrap' }, crearAcciones(docente))
  ]);
}

function crearAcciones(docente) {
  const acciones = [
    crearBoton('bi-eye', 'Ver detalle', docente, () => abrirFormulario('ver', docente))
  ];
  if (puedeGestionar(docente)) {
    acciones.push(crearBoton('bi-pencil', 'Editar', docente, () => abrirFormulario('editar', docente)));
    acciones.push(crearBoton(
      docente.activo ? 'bi-person-dash' : 'bi-person-check',
      docente.activo ? 'Desactivar' : 'Activar',
      docente,
      () => cambiarEstado(docente)
    ));
  }
  return acciones;
}

function crearBoton(icono, etiqueta, docente, accion) {
  const marca = crearElemento('i', { clase: `bi ${icono}`, atributos: { 'aria-hidden': 'true' } });
  const boton = crearElemento('button', {
    clase: 'btn btn-sm btn-outline-secondary ms-1',
    atributos: {
      type: 'button',
      title: etiqueta,
      'aria-label': `${etiqueta}: ${docente.apellidos} ${docente.nombres}`
    }
  }, [marca]);
  boton.addEventListener('click', accion);
  return boton;
}

function leerCampo(nombre) {
  const valor = elemento(`campo-${nombre}`).value.trim();
  return valor === '' ? null : valor;
}

function actualizarEnlaceCuenta(institucionId) {
  const enlace = elemento('enlace-crear-cuenta');
  enlace.hidden = rolActual() !== 'ADMIN';
  const base = 'usuarios.html?crear=DOCENTE';
  enlace.href = institucionId ? `${base}&institucionId=${institucionId}` : base;
}

async function cargarCuentas() {
  const selector = elemento('campo-cuenta');
  const institucionId = elemento('campo-institucion').value;
  const docente = pantalla.docente;
  const solicitud = ++pantalla.solicitudCuentas;

  actualizarEnlaceCuenta(institucionId);
  selector.replaceChildren(crearElemento('option', {
    texto: 'Sin cuenta vinculada',
    atributos: { value: '' }
  }));
  selector.disabled = true;

  if (!institucionId) {
    return;
  }

  try {
    const consulta = construirConsulta({ institucionId, docenteId: docente ? docente.id : '' });
    const cuentas = await apiFetch(`/api/docentes/cuentas-disponibles${consulta}`);
    if (solicitud !== pantalla.solicitudCuentas) {
      return;
    }

    cuentas.forEach(cuenta => {
      selector.appendChild(crearElemento('option', {
        texto: `${cuenta.apellidos} ${cuenta.nombres} (${cuenta.username})`,
        atributos: { value: String(cuenta.id) }
      }));
    });

    if (docente && docente.usuarioId) {
      const vinculada = String(docente.usuarioId);
      const existe = cuentas.some(cuenta => String(cuenta.id) === vinculada);
      if (!existe) {
        selector.appendChild(crearElemento('option', {
          texto: 'Cuenta vinculada actual (no figura entre las cuentas activas)',
          atributos: { value: vinculada }
        }));
      }
      selector.value = vinculada;
    }
    selector.disabled = false;
  } catch (error) {
    if (solicitud === pantalla.solicitudCuentas) {
      mostrarAlerta(
        elemento('alertas-modal'),
        'warning',
        `No se pudieron cargar las cuentas disponibles. ${mensajeDe(error)}`
      );
    }
  }
}

function abrirFormulario(modo, docente) {
  pantalla.modo = modo;
  pantalla.docente = docente;
  const esCrear = modo === 'crear';
  const esVer = modo === 'ver';

  limpiarAlerta(elemento('alertas-modal'));
  elemento('titulo-modal-docente').textContent = TITULOS_MODAL[modo];

  let institucionInicial = '';
  if (docente) {
    institucionInicial = String(docente.institucionId);
  } else if (rolActual() === 'RESP_INSTITUCIONAL' && sesion.usuario.institucionId) {
    institucionInicial = String(sesion.usuario.institucionId);
  }
  elemento('campo-institucion').value = institucionInicial;
  elemento('campo-institucion').disabled = !esCrear || rolActual() !== 'ADMIN';

  elemento('campo-nombres').value = docente ? docente.nombres : '';
  elemento('campo-apellidos').value = docente ? docente.apellidos : '';
  elemento('campo-correo').value = docente && docente.correo ? docente.correo : '';
  elemento('campo-telefono').value = docente && docente.telefono ? docente.telefono : '';
  ['nombres', 'apellidos', 'correo', 'telefono'].forEach(nombre => {
    elemento(`campo-${nombre}`).disabled = esVer;
  });

  elemento('grupo-cuenta').hidden = esVer;
  elemento('grupo-cuenta-estado').hidden = !esVer;
  if (esVer) {
    elemento('texto-cuenta-estado').textContent = docente.usuarioId
      ? 'Tiene una cuenta de usuario vinculada.'
      : 'No tiene una cuenta de usuario vinculada.';
  }

  const boton = elemento('boton-guardar');
  boton.hidden = esVer;
  boton.disabled = false;

  if (!esVer) {
    cargarCuentas();
  }
  modalDocente.show();
}

function validarFormulario() {
  const problemas = [];
  if (pantalla.modo === 'crear' && !elemento('campo-institucion').value) {
    problemas.push('Seleccione la institución del docente.');
  }
  if (!leerCampo('nombres')) {
    problemas.push('Los nombres son obligatorios.');
  }
  if (!leerCampo('apellidos')) {
    problemas.push('Los apellidos son obligatorios.');
  }
  if (elemento('campo-correo').validity.typeMismatch) {
    problemas.push('El correo electrónico no tiene un formato válido.');
  }
  return problemas;
}

function construirCuerpo(esCrear) {
  const cuenta = elemento('campo-cuenta').value;
  const cuerpo = {
    nombres: leerCampo('nombres'),
    apellidos: leerCampo('apellidos'),
    correo: leerCampo('correo'),
    telefono: leerCampo('telefono'),
    usuarioId: cuenta ? Number(cuenta) : null
  };
  if (esCrear) {
    cuerpo.institucionId = Number(elemento('campo-institucion').value);
  }
  return cuerpo;
}

async function guardarDocente(evento) {
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
  const ruta = esCrear ? '/api/docentes' : `/api/docentes/${pantalla.docente.id}`;
  const boton = elemento('boton-guardar');
  establecerCargando(boton, true, 'Guardando...');
  try {
    await apiFetch(ruta, { metodo: esCrear ? 'POST' : 'PUT', cuerpo: construirCuerpo(esCrear) });
    modalDocente.hide();
    mostrarAlerta(
      elemento('alertas'),
      'success',
      esCrear ? 'Docente creado correctamente.' : 'Docente actualizado correctamente.'
    );
    await cargarLista(esCrear ? 0 : pantalla.pagina);
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

async function cambiarEstado(docente) {
  const activar = !docente.activo;
  const nombre = `${docente.nombres} ${docente.apellidos}`;
  const aceptado = await confirmar({
    titulo: activar ? 'Activar docente' : 'Desactivar docente',
    mensaje: activar
      ? `¿Desea activar el registro de ${nombre}?`
      : `¿Desea desactivar el registro de ${nombre}? No podrá desactivarse si es responsable de clubes que no estén cerrados.`,
    textoAceptar: activar ? 'Activar' : 'Desactivar'
  });
  if (!aceptado) {
    return;
  }
  try {
    await apiFetch(`/api/docentes/${docente.id}/estado`, { metodo: 'PATCH', cuerpo: { activo: activar } });
    mostrarAlerta(
      elemento('alertas'),
      'success',
      activar ? `El docente ${nombre} fue activado.` : `El docente ${nombre} fue desactivado.`
    );
    await cargarLista(pantalla.pagina);
  } catch (error) {
    mostrarAlerta(elemento('alertas'), 'danger', mensajeDe(error));
  }
}