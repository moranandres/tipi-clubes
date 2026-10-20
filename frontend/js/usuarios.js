import { apiFetch, construirConsulta, ApiError } from './api.js';
import { cargarInstituciones, cargarRoles } from './catalogos.js';
import { confirmar } from './confirmacion.js';
import { ETIQUETAS_ROL } from './config.js';
import { exigirSesion, exigirRol } from './guard.js';
import { montarLayout } from './layout.js';
import { renderizarPaginacion } from './paginacion.js';
import { generarPasswordTemporal, REGLA_PASSWORD } from './passwords.js';
import {
  crearElemento,
  formatearFechaHora,
  mostrarAlerta,
  limpiarAlerta,
  establecerCargando,
  mensajesDeError
} from './ui.js';

const TAMANO_PAGINA = 10;
const REGLA_USERNAME = /^[A-Za-z0-9._-]{3,50}$/;
const ROLES_CON_INSTITUCION = ['RESP_INSTITUCIONAL', 'DOCENTE'];
const MENSAJE_PASSWORD = 'La contraseña temporal debe tener entre 10 y 128 caracteres, con mayúscula, minúscula y número.';

const sesion = exigirSesion();
const pantalla = { pagina: 0, filtros: {}, modo: null, usuario: null };
const catalogo = { nombresInstituciones: new Map() };
let modalUsuario = null;
let modalPassword = null;

if (sesion && exigirRol(sesion, ['ADMIN'])) {
  iniciar();
}

function elemento(id) {
  return document.getElementById(id);
}

function etiquetaRol(codigo) {
  return ETIQUETAS_ROL[codigo] || codigo;
}

function mensajeDe(error) {
  return error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
}

async function iniciar() {
  montarLayout(sesion, 'usuarios');

  modalUsuario = bootstrap.Modal.getOrCreateInstance(elemento('modal-usuario'));
  modalPassword = bootstrap.Modal.getOrCreateInstance(elemento('modal-password'));

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

  elemento('formulario-usuario').addEventListener('submit', guardarUsuario);
  elemento('campo-rol').addEventListener('change', actualizarCampoInstitucion);
  elemento('boton-generar').addEventListener('click', () => {
    elemento('campo-password').value = generarPasswordTemporal();
  });

  elemento('formulario-password').addEventListener('submit', guardarPassword);
  elemento('boton-generar-password').addEventListener('click', () => {
    elemento('password-temporal').value = generarPasswordTemporal();
  });

  await cargarCatalogos();
  await cargarLista(0);
  atenderParametros();
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
    const [roles, instituciones] = await Promise.all([cargarRoles(), cargarInstituciones()]);
    instituciones.forEach(institucion => catalogo.nombresInstituciones.set(institucion.id, institucion.nombre));

    llenarSelect(elemento('filtro-rol'), roles, 'Todos', rol => rol.codigo, rol => etiquetaRol(rol.codigo));
    llenarSelect(elemento('campo-rol'), roles, 'Seleccione un rol', rol => rol.codigo, rol => etiquetaRol(rol.codigo));
    llenarSelect(elemento('filtro-institucion'), instituciones, 'Todas', item => String(item.id), item => item.nombre);
    llenarSelect(elemento('campo-institucion'), instituciones, 'Seleccione una institución', item => String(item.id), item => item.nombre);
  } catch (error) {
    mostrarAlerta(
      elemento('alertas'),
      'danger',
      `No se pudieron cargar los catálogos de roles e instituciones. ${mensajeDe(error)}`
    );
  }
}

function leerFiltros() {
  return {
    q: elemento('filtro-q').value.trim(),
    rol: elemento('filtro-rol').value,
    institucionId: elemento('filtro-institucion').value,
    activo: elemento('filtro-activo').value
  };
}

function filaMensaje(texto) {
  const celda = crearElemento('td', {
    clase: 'text-center text-body-secondary py-4',
    texto,
    atributos: { colspan: '7' }
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
  cuerpo.replaceChildren(filaMensaje('Cargando usuarios...'));
  try {
    const ruta = `/api/usuarios${construirConsulta({ ...pantalla.filtros, pagina, tamano: TAMANO_PAGINA })}`;
    const respuesta = await apiFetch(ruta);
    pantalla.pagina = respuesta.pagina;
    if (respuesta.contenido.length === 0) {
      cuerpo.replaceChildren(filaMensaje('No se encontraron usuarios.'));
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

function estaBloqueado(usuario) {
  return Boolean(usuario.bloqueadoHasta) && new Date(usuario.bloqueadoHasta) > new Date();
}

function crearInsignias(usuario) {
  const insignias = [
    usuario.activo
      ? crearElemento('span', { clase: 'badge text-bg-success', texto: 'Activo' })
      : crearElemento('span', { clase: 'badge text-bg-secondary', texto: 'Inactivo' })
  ];
  if (estaBloqueado(usuario)) {
    insignias.push(crearElemento('span', { clase: 'badge text-bg-danger', texto: 'Bloqueado' }));
  }
  if (usuario.debeCambiarPassword) {
    insignias.push(crearElemento('span', { clase: 'badge text-bg-info', texto: 'Contraseña temporal' }));
  }
  return crearElemento('div', { clase: 'd-flex flex-wrap gap-1' }, insignias);
}

function crearFila(usuario) {
  const esPropio = usuario.id === sesion.usuario.id;

  const nombreUsuario = crearElemento('div', { clase: 'fw-semibold', texto: usuario.username });
  if (esPropio) {
    nombreUsuario.appendChild(crearElemento('span', { clase: 'badge text-bg-primary ms-2', texto: 'Usted' }));
  }

  const institucion = usuario.institucionId === null || usuario.institucionId === undefined
    ? '—'
    : catalogo.nombresInstituciones.get(usuario.institucionId) || `Institución ${usuario.institucionId}`;

  return crearElemento('tr', {}, [
    crearElemento('td', {}, [
      nombreUsuario,
      crearElemento('div', { clase: 'small text-body-secondary', texto: usuario.email })
    ]),
    crearElemento('td', { texto: `${usuario.apellidos} ${usuario.nombres}` }),
    crearElemento('td', { texto: etiquetaRol(usuario.rol) }),
    crearElemento('td', { texto: institucion }),
    crearElemento('td', {}, [crearInsignias(usuario)]),
    crearElemento('td', { texto: formatearFechaHora(usuario.ultimoAcceso) }),
    crearElemento('td', { clase: 'text-end text-nowrap' }, crearAcciones(usuario))
  ]);
}

function crearAcciones(usuario) {
  const acciones = [
    crearBoton('bi-pencil', 'Editar', usuario, () => abrirFormulario('editar', usuario))
  ];
  if (usuario.id !== sesion.usuario.id) {
    acciones.push(crearBoton(
      usuario.activo ? 'bi-person-dash' : 'bi-person-check',
      usuario.activo ? 'Desactivar' : 'Activar',
      usuario,
      () => cambiarEstado(usuario)
    ));
    acciones.push(crearBoton('bi-key', 'Restablecer contraseña', usuario, () => abrirRestablecer(usuario)));
  }
  return acciones;
}

function crearBoton(icono, etiqueta, usuario, accion) {
  const marca = crearElemento('i', { clase: `bi ${icono}`, atributos: { 'aria-hidden': 'true' } });
  const boton = crearElemento('button', {
    clase: 'btn btn-sm btn-outline-secondary ms-1',
    atributos: {
      type: 'button',
      title: etiqueta,
      'aria-label': `${etiqueta}: ${usuario.username}`
    }
  }, [marca]);
  boton.addEventListener('click', accion);
  return boton;
}

function leerCampo(nombre) {
  const valor = elemento(`campo-${nombre}`).value.trim();
  return valor === '' ? null : valor;
}

function actualizarCampoInstitucion() {
  const requiere = ROLES_CON_INSTITUCION.includes(elemento('campo-rol').value);
  elemento('grupo-institucion').hidden = !requiere;
  if (!requiere) {
    elemento('campo-institucion').value = '';
  }
}

function abrirFormulario(modo, usuario, predefinidos = {}) {
  pantalla.modo = modo;
  pantalla.usuario = usuario;
  const esCrear = modo === 'crear';
  const esPropio = !esCrear && usuario.id === sesion.usuario.id;

  limpiarAlerta(elemento('alertas-modal'));
  elemento('titulo-modal-usuario').textContent = esCrear ? 'Nuevo usuario' : 'Editar usuario';

  elemento('campo-username').value = usuario ? usuario.username : '';
  elemento('campo-username').disabled = !esCrear;
  elemento('campo-email').value = usuario ? usuario.email : '';
  elemento('campo-nombres').value = usuario ? usuario.nombres : '';
  elemento('campo-apellidos').value = usuario ? usuario.apellidos : '';

  elemento('campo-rol').value = usuario ? usuario.rol : (predefinidos.rol || '');
  elemento('campo-rol').disabled = esPropio;

  let institucionInicial = '';
  if (usuario && usuario.institucionId !== null && usuario.institucionId !== undefined) {
    institucionInicial = String(usuario.institucionId);
  } else if (predefinidos.institucionId) {
    institucionInicial = String(predefinidos.institucionId);
  }
  elemento('campo-institucion').value = institucionInicial;
  elemento('campo-institucion').disabled = esPropio;
  elemento('ayuda-rol').hidden = !esPropio;

  elemento('grupo-password').hidden = !esCrear;
  elemento('campo-password').value = '';

  actualizarCampoInstitucion();
  elemento('boton-guardar').disabled = false;
  modalUsuario.show();
}

function validarFormulario() {
  const problemas = [];
  const esCrear = pantalla.modo === 'crear';

  if (esCrear) {
    const username = leerCampo('username');
    if (!username || !REGLA_USERNAME.test(username)) {
      problemas.push('El usuario debe tener entre 3 y 50 caracteres: letras, números, punto, guion o guion bajo.');
    }
  }
  if (!leerCampo('email')) {
    problemas.push('El correo electrónico es obligatorio.');
  } else if (elemento('campo-email').validity.typeMismatch) {
    problemas.push('El correo electrónico no tiene un formato válido.');
  }
  if (!leerCampo('nombres')) {
    problemas.push('Los nombres son obligatorios.');
  }
  if (!leerCampo('apellidos')) {
    problemas.push('Los apellidos son obligatorios.');
  }

  const rol = elemento('campo-rol').value;
  if (!rol) {
    problemas.push('Seleccione un rol.');
  }
  if (ROLES_CON_INSTITUCION.includes(rol) && !elemento('campo-institucion').value) {
    problemas.push('Seleccione la institución: este rol requiere una institución asignada.');
  }
  if (esCrear && !REGLA_PASSWORD.test(elemento('campo-password').value)) {
    problemas.push(MENSAJE_PASSWORD);
  }
  return problemas;
}

function construirCuerpo(esCrear) {
  const rol = elemento('campo-rol').value;
  const requiere = ROLES_CON_INSTITUCION.includes(rol);
  const cuerpo = {
    email: leerCampo('email'),
    nombres: leerCampo('nombres'),
    apellidos: leerCampo('apellidos'),
    rolCodigo: rol,
    institucionId: requiere ? Number(elemento('campo-institucion').value) : null
  };
  if (esCrear) {
    cuerpo.username = leerCampo('username');
    cuerpo.passwordTemporal = elemento('campo-password').value;
  }
  return cuerpo;
}

async function guardarUsuario(evento) {
  evento.preventDefault();
  const alertas = elemento('alertas-modal');
  limpiarAlerta(alertas);

  const problemas = validarFormulario();
  if (problemas.length > 0) {
    mostrarAlerta(alertas, 'danger', 'Revise los datos ingresados:', problemas);
    return;
  }

  const esCrear = pantalla.modo === 'crear';
  const ruta = esCrear ? '/api/usuarios' : `/api/usuarios/${pantalla.usuario.id}`;
  const boton = elemento('boton-guardar');
  establecerCargando(boton, true, 'Guardando...');
  try {
    await apiFetch(ruta, { metodo: esCrear ? 'POST' : 'PUT', cuerpo: construirCuerpo(esCrear) });
    modalUsuario.hide();
    mostrarAlerta(
      elemento('alertas'),
      'success',
      esCrear
        ? 'Usuario creado correctamente. Entregue la contraseña temporal al usuario.'
        : 'Usuario actualizado correctamente.'
    );
    await cargarLista(esCrear ? 0 : pantalla.pagina);
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

async function cambiarEstado(usuario) {
  const activar = !usuario.activo;
  const nombre = `${usuario.nombres} ${usuario.apellidos}`;
  const aceptado = await confirmar({
    titulo: activar ? 'Activar usuario' : 'Desactivar usuario',
    mensaje: activar
      ? `¿Desea activar la cuenta de ${nombre}?`
      : `¿Desea desactivar la cuenta de ${nombre}? No podrá iniciar sesión y perderá el acceso de inmediato.`,
    textoAceptar: activar ? 'Activar' : 'Desactivar'
  });
  if (!aceptado) {
    return;
  }
  try {
    await apiFetch(`/api/usuarios/${usuario.id}/estado`, { metodo: 'PATCH', cuerpo: { activo: activar } });
    mostrarAlerta(
      elemento('alertas'),
      'success',
      activar ? `La cuenta de ${nombre} fue activada.` : `La cuenta de ${nombre} fue desactivada.`
    );
    await cargarLista(pantalla.pagina);
  } catch (error) {
    mostrarAlerta(elemento('alertas'), 'danger', mensajeDe(error));
  }
}

function abrirRestablecer(usuario) {
  pantalla.usuario = usuario;
  limpiarAlerta(elemento('alertas-password'));
  elemento('password-usuario').textContent = `${usuario.apellidos} ${usuario.nombres} (${usuario.username})`;
  elemento('password-temporal').value = '';
  elemento('boton-guardar-password').disabled = false;
  modalPassword.show();
}

async function guardarPassword(evento) {
  evento.preventDefault();
  const alertas = elemento('alertas-password');
  limpiarAlerta(alertas);

  const passwordTemporal = elemento('password-temporal').value;
  if (!REGLA_PASSWORD.test(passwordTemporal)) {
    mostrarAlerta(alertas, 'danger', MENSAJE_PASSWORD);
    return;
  }

  const boton = elemento('boton-guardar-password');
  establecerCargando(boton, true, 'Guardando...');
  try {
    await apiFetch(`/api/usuarios/${pantalla.usuario.id}/restablecer-password`, {
      metodo: 'POST',
      cuerpo: { passwordTemporal }
    });
    modalPassword.hide();
    mostrarAlerta(
      elemento('alertas'),
      'success',
      'Contraseña restablecida. La cuenta quedó desbloqueada y el usuario deberá cambiarla en su próximo acceso.'
    );
    await cargarLista(pantalla.pagina);
  } catch (error) {
    mostrarAlerta(alertas, 'danger', mensajeDe(error), mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

function atenderParametros() {
  const parametros = new URLSearchParams(window.location.search);
  const rol = parametros.get('crear');
  if (rol) {
    abrirFormulario('crear', null, { rol, institucionId: parametros.get('institucionId') });
    window.history.replaceState(null, '', 'usuarios.html');
  }
}