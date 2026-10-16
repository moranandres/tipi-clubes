import { apiFetch, construirConsulta, ApiError } from './api.js';
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
const REGLA_AMIE = /^[0-9]{2}[A-Za-z][0-9]{5}$/;
const ROLES_GLOBALES = ['ADMIN', 'COORDINADOR', 'CONSULTA'];

const CAMPOS = [
  'codigoAmie', 'nombre', 'zona', 'circuito', 'provincia', 'canton', 'direccion',
  'telefono', 'correoContacto', 'autoridadNombre', 'autoridadCargo',
  'estadoAdhesion', 'fechaAdhesion'
];
const CAMPOS_CONTACTO = ['direccion', 'telefono', 'correoContacto', 'autoridadNombre', 'autoridadCargo'];

const ESTADOS = {
  PENDIENTE: { etiqueta: 'Pendiente', clase: 'text-bg-warning' },
  ADHERIDA: { etiqueta: 'Adherida', clase: 'text-bg-success' },
  SUSPENDIDA: { etiqueta: 'Suspendida', clase: 'text-bg-secondary' },
  RETIRADA: { etiqueta: 'Retirada', clase: 'text-bg-danger' }
};

const TITULOS_MODAL = {
  crear: 'Nueva institución',
  editar: 'Editar institución',
  contacto: 'Actualizar datos de contacto',
  ver: 'Detalle de la institución'
};

const MENSAJES_EXITO = {
  crear: 'Institución creada correctamente.',
  editar: 'Institución actualizada correctamente.',
  contacto: 'Datos de contacto actualizados correctamente.'
};

const sesion = exigirSesion();
const pantalla = { pagina: 0, filtros: {}, modo: null, institucion: null };
let modalInstitucion = null;
let modalResponsable = null;

if (sesion) {
  iniciar();
}

function elemento(id) {
  return document.getElementById(id);
}

function iniciar() {
  montarLayout(sesion, 'instituciones');
  const rol = sesion.usuario.rol;

  elemento('boton-nueva').hidden = rol !== 'ADMIN';
  elemento('formulario-filtros').hidden = !ROLES_GLOBALES.includes(rol);
  elemento('campo-fechaAdhesion').max = hoyIso();

  modalInstitucion = bootstrap.Modal.getOrCreateInstance(elemento('modal-institucion'));
  modalResponsable = bootstrap.Modal.getOrCreateInstance(elemento('modal-responsable'));

  elemento('boton-nueva').addEventListener('click', () => abrirFormulario('crear', null));

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

  elemento('formulario-institucion').addEventListener('submit', guardarInstitucion);
  elemento('formulario-responsable').addEventListener('submit', guardarResponsable);

  cargarLista(0);
}

function hoyIso() {
  const fecha = new Date();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function leerFiltros() {
  return {
    q: elemento('filtro-q').value.trim(),
    provincia: elemento('filtro-provincia').value.trim(),
    canton: elemento('filtro-canton').value.trim(),
    estado: elemento('filtro-estado').value
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
  cuerpo.replaceChildren(filaMensaje('Cargando instituciones...'));
  try {
    const ruta = `/api/instituciones${construirConsulta({ ...pantalla.filtros, pagina, tamano: TAMANO_PAGINA })}`;
    const respuesta = await apiFetch(ruta);
    pantalla.pagina = respuesta.pagina;
    pintarTabla(respuesta.contenido);
    elemento('resumen-resultados').textContent = resumen(respuesta);
    renderizarPaginacion(elemento('paginacion'), respuesta, cargarLista);
  } catch (error) {
    cuerpo.replaceChildren(filaMensaje('No se pudo cargar el listado.'));
    elemento('resumen-resultados').textContent = '';
    elemento('paginacion').replaceChildren();
    const mensaje = error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
    mostrarAlerta(elemento('alertas'), 'danger', mensaje);
  }
}

function pintarTabla(instituciones) {
  const cuerpo = elemento('cuerpo-tabla');
  if (instituciones.length === 0) {
    cuerpo.replaceChildren(filaMensaje('No se encontraron instituciones.'));
    return;
  }
  cuerpo.replaceChildren(...instituciones.map(crearFila));
}

function crearFila(institucion) {
  const estado = ESTADOS[institucion.estadoAdhesion]
    || { etiqueta: institucion.estadoAdhesion, clase: 'text-bg-light' };
  const insignia = crearElemento('span', { clase: `badge ${estado.clase}`, texto: estado.etiqueta });

  return crearElemento('tr', {}, [
    crearElemento('td', { clase: 'font-monospace', texto: institucion.codigoAmie }),
    crearElemento('td', { texto: institucion.nombre }),
    crearElemento('td', { texto: `${institucion.canton}, ${institucion.provincia}` }),
    crearElemento('td', { texto: institucion.autoridadNombre || '—' }),
    crearElemento('td', {}, [insignia]),
    crearElemento('td', { texto: formatearFecha(institucion.fechaAdhesion) }),
    crearElemento('td', { clase: 'text-end text-nowrap' }, crearAcciones(institucion))
  ]);
}

function crearAcciones(institucion) {
  const rol = sesion.usuario.rol;
  const acciones = [
    crearBoton('bi-eye', 'Ver detalle', institucion, () => abrirFormulario('ver', institucion))
  ];
  if (rol === 'ADMIN') {
    acciones.push(crearBoton('bi-pencil', 'Editar', institucion, () => abrirFormulario('editar', institucion)));
    acciones.push(crearBoton('bi-person-badge', 'Asignar responsable', institucion, () => abrirResponsable(institucion)));
  } else if (rol === 'RESP_INSTITUCIONAL' && institucion.id === sesion.usuario.institucionId) {
    acciones.push(crearBoton('bi-telephone', 'Actualizar contacto', institucion, () => abrirFormulario('contacto', institucion)));
  }
  return acciones;
}

function crearBoton(icono, etiqueta, institucion, accion) {
  const marca = crearElemento('i', { clase: `bi ${icono}`, atributos: { 'aria-hidden': 'true' } });
  const boton = crearElemento('button', {
    clase: 'btn btn-sm btn-outline-secondary ms-1',
    atributos: {
      type: 'button',
      title: etiqueta,
      'aria-label': `${etiqueta}: ${institucion.nombre}`
    }
  }, [marca]);
  boton.addEventListener('click', accion);
  return boton;
}

function leerCampo(nombre) {
  const valor = elemento(`campo-${nombre}`).value.trim();
  return valor === '' ? null : valor;
}

function abrirFormulario(modo, institucion) {
  pantalla.modo = modo;
  pantalla.institucion = institucion;
  limpiarAlerta(elemento('alertas-modal'));
  elemento('titulo-modal-institucion').textContent = TITULOS_MODAL[modo];

  let editables = [];
  if (modo === 'crear' || modo === 'editar') {
    editables = CAMPOS;
  } else if (modo === 'contacto') {
    editables = CAMPOS_CONTACTO;
  }

  CAMPOS.forEach(nombre => {
    const campo = elemento(`campo-${nombre}`);
    const valor = institucion ? institucion[nombre] : null;
    campo.value = valor === null || valor === undefined ? '' : valor;
    campo.disabled = !editables.includes(nombre);
  });
  if (!institucion) {
    elemento('campo-estadoAdhesion').value = 'PENDIENTE';
  }

  const boton = elemento('boton-guardar');
  boton.hidden = modo === 'ver';
  boton.disabled = false;
  modalInstitucion.show();
}

function validarFormulario(modo) {
  const problemas = [];
  if (modo === 'crear' || modo === 'editar') {
    const amie = leerCampo('codigoAmie');
    if (!amie || !REGLA_AMIE.test(amie)) {
      problemas.push('El código AMIE debe tener 8 caracteres: 2 dígitos, 1 letra y 5 dígitos (por ejemplo 09H00001).');
    }
    if (!leerCampo('nombre')) {
      problemas.push('El nombre de la institución es obligatorio.');
    }
    if (!leerCampo('provincia')) {
      problemas.push('La provincia es obligatoria.');
    }
    if (!leerCampo('canton')) {
      problemas.push('El cantón es obligatorio.');
    }
    const fecha = leerCampo('fechaAdhesion');
    if (fecha && fecha > hoyIso()) {
      problemas.push('La fecha de adhesión no puede ser futura.');
    }
    if (leerCampo('estadoAdhesion') === 'ADHERIDA' && !fecha) {
      problemas.push('La fecha de adhesión es obligatoria cuando el estado es Adherida.');
    }
  }
  if (elemento('campo-correoContacto').validity.typeMismatch) {
    problemas.push('El correo electrónico no tiene un formato válido.');
  }
  return problemas;
}

function construirCuerpoCompleto() {
  const cuerpo = {};
  CAMPOS.forEach(nombre => {
    cuerpo[nombre] = leerCampo(nombre);
  });
  cuerpo.codigoAmie = cuerpo.codigoAmie ? cuerpo.codigoAmie.toUpperCase() : null;
  return cuerpo;
}

function construirCuerpoContacto() {
  const cuerpo = {};
  CAMPOS_CONTACTO.forEach(nombre => {
    cuerpo[nombre] = leerCampo(nombre);
  });
  return cuerpo;
}

function enviar(modo) {
  if (modo === 'crear') {
    return apiFetch('/api/instituciones', { metodo: 'POST', cuerpo: construirCuerpoCompleto() });
  }
  const id = pantalla.institucion.id;
  if (modo === 'editar') {
    return apiFetch(`/api/instituciones/${id}`, { metodo: 'PUT', cuerpo: construirCuerpoCompleto() });
  }
  return apiFetch(`/api/instituciones/${id}/contacto`, { metodo: 'PUT', cuerpo: construirCuerpoContacto() });
}

async function guardarInstitucion(evento) {
  evento.preventDefault();
  const modo = pantalla.modo;
  if (modo === 'ver') {
    return;
  }
  const alertas = elemento('alertas-modal');
  limpiarAlerta(alertas);

  const problemas = validarFormulario(modo);
  if (problemas.length > 0) {
    mostrarAlerta(alertas, 'danger', 'Revise los datos ingresados:', problemas);
    return;
  }

  const boton = elemento('boton-guardar');
  establecerCargando(boton, true, 'Guardando...');
  try {
    await enviar(modo);
    modalInstitucion.hide();
    mostrarAlerta(elemento('alertas'), 'success', MENSAJES_EXITO[modo]);
    await cargarLista(modo === 'crear' ? 0 : pantalla.pagina);
  } catch (error) {
    const mensaje = error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
    mostrarAlerta(alertas, 'danger', mensaje, mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}

async function abrirResponsable(institucion) {
  pantalla.institucion = institucion;
  const alertas = elemento('alertas-responsable');
  const selector = elemento('responsable-usuario');
  const botonGuardar = elemento('boton-guardar-responsable');
  const textoActual = elemento('responsable-actual');

  limpiarAlerta(alertas);
  elemento('responsable-institucion').textContent = institucion.nombre;
  selector.replaceChildren();
  selector.disabled = true;
  botonGuardar.disabled = true;
  textoActual.textContent = 'Cargando usuarios...';
  modalResponsable.show();

  try {
    const consulta = construirConsulta({
      rol: 'RESP_INSTITUCIONAL',
      institucionId: institucion.id,
      activo: true,
      tamano: 100
    });
    const respuesta = await apiFetch(`/api/usuarios${consulta}`);
    const usuarios = respuesta.contenido;

    if (usuarios.length === 0) {
      textoActual.textContent = 'No hay usuarios activos con rol Responsable institucional en esta institución.';
      mostrarAlerta(alertas, 'info', 'Cree primero un usuario con rol Responsable institucional para esta institución.');
      return;
    }

    usuarios.forEach(usuario => {
      selector.appendChild(crearElemento('option', {
        texto: `${usuario.apellidos} ${usuario.nombres} (${usuario.username})`,
        atributos: { value: String(usuario.id) }
      }));
    });

    const asignado = usuarios.find(usuario => usuario.id === institucion.responsableId);
    if (asignado) {
      selector.value = String(asignado.id);
      textoActual.textContent = `Responsable actual: ${asignado.apellidos} ${asignado.nombres}`;
    } else if (institucion.responsableId) {
      textoActual.textContent = 'La institución tiene un responsable que no figura entre los usuarios activos.';
    } else {
      textoActual.textContent = 'La institución no tiene responsable asignado.';
    }
    selector.disabled = false;
    botonGuardar.disabled = false;
  } catch (error) {
    textoActual.textContent = '';
    const mensaje = error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
    mostrarAlerta(alertas, 'danger', mensaje);
  }
}

async function guardarResponsable(evento) {
  evento.preventDefault();
  const alertas = elemento('alertas-responsable');
  limpiarAlerta(alertas);

  const usuarioId = Number(elemento('responsable-usuario').value);
  if (!usuarioId) {
    mostrarAlerta(alertas, 'danger', 'Seleccione un usuario.');
    return;
  }

  const boton = elemento('boton-guardar-responsable');
  establecerCargando(boton, true, 'Guardando...');
  try {
    await apiFetch(`/api/instituciones/${pantalla.institucion.id}/responsable`, {
      metodo: 'PUT',
      cuerpo: { usuarioId }
    });
    modalResponsable.hide();
    mostrarAlerta(elemento('alertas'), 'success', 'Responsable institucional asignado correctamente.');
    await cargarLista(pantalla.pagina);
  } catch (error) {
    const mensaje = error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
    mostrarAlerta(alertas, 'danger', mensaje, mensajesDeError(error));
  } finally {
    establecerCargando(boton, false);
  }
}