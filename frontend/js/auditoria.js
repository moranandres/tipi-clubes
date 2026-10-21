import { apiFetch, construirConsulta, ApiError } from './api.js';
import { exigirSesion, exigirRol } from './guard.js';
import { montarLayout } from './layout.js';
import { renderizarPaginacion } from './paginacion.js';
import { crearElemento, mostrarAlerta, limpiarAlerta } from './ui.js';

const TAMANO_PAGINA = 20;
const ROLES_PAGINA = ['ADMIN', 'CONSULTA'];
const ZONA_HORARIA = 'America/Guayaquil';

const ACCIONES = [
  'LOGIN_EXITOSO', 'LOGIN_FALLIDO', 'CUENTA_BLOQUEADA', 'PASSWORD_CAMBIADA', 'PASSWORD_RESTABLECIDA',
  'USUARIO_CREADO', 'USUARIO_ACTUALIZADO', 'USUARIO_ACTIVADO', 'USUARIO_DESACTIVADO',
  'INSTITUCION_CREADA', 'INSTITUCION_ACTUALIZADA', 'INSTITUCION_CONTACTO_ACTUALIZADO',
  'INSTITUCION_RESPONSABLE_ASIGNADO',
  'PERIODO_CREADO', 'PERIODO_ACTUALIZADO', 'PERIODO_ACTIVADO',
  'DOCENTE_CREADO', 'DOCENTE_ACTUALIZADO', 'DOCENTE_ACTIVADO', 'DOCENTE_DESACTIVADO',
  'CLUB_CREADO', 'CLUB_ACTUALIZADO', 'CLUB_ESTADO_CAMBIADO'
];

const ENTIDADES = ['USUARIO', 'INSTITUCION', 'PERIODO', 'DOCENTE', 'CLUB'];

const sesion = exigirSesion();
const pantalla = { pagina: 0, filtros: {}, evento: null };
let modalDetalle = null;

if (sesion && exigirRol(sesion, ROLES_PAGINA)) {
  iniciar();
}

function elemento(id) {
  return document.getElementById(id);
}

function mensajeDe(error) {
  return error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
}

function iniciar() {
  montarLayout(sesion, 'auditoria');
  modalDetalle = bootstrap.Modal.getOrCreateInstance(elemento('modal-detalle'));

  llenarSugerencias(elemento('sugerencias-acciones'), ACCIONES);
  llenarSugerencias(elemento('sugerencias-entidades'), ENTIDADES);

  elemento('formulario-filtros').addEventListener('submit', evento => {
    evento.preventDefault();
    buscar();
  });
  elemento('formulario-filtros').addEventListener('reset', () => {
    setTimeout(() => {
      limpiarAlerta(elemento('alertas'));
      pantalla.filtros = {};
      cargarLista(0);
    }, 0);
  });
  elemento('boton-historial-registro').addEventListener('click', verHistorialDelRegistro);

  cargarLista(0);
}

function llenarSugerencias(lista, valores) {
  lista.replaceChildren(...valores.map(valor => crearElemento('option', { atributos: { value: valor } })));
}

function leerValor(id) {
  return elemento(id).value.trim();
}

function leerFiltros() {
  return {
    usuario: leerValor('filtro-usuario'),
    accion: leerValor('filtro-accion').toUpperCase(),
    entidad: leerValor('filtro-entidad').toUpperCase(),
    entidadId: leerValor('filtro-registro'),
    desde: leerValor('filtro-desde'),
    hasta: leerValor('filtro-hasta')
  };
}

function buscar() {
  const alertas = elemento('alertas');
  limpiarAlerta(alertas);
  const filtros = leerFiltros();

  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    mostrarAlerta(alertas, 'danger', 'La fecha «Desde» no puede ser posterior a la fecha «Hasta».');
    return;
  }
  if (filtros.entidadId && (!Number.isInteger(Number(filtros.entidadId)) || Number(filtros.entidadId) < 1)) {
    mostrarAlerta(alertas, 'danger', 'El número de registro debe ser un entero positivo.');
    return;
  }
  pantalla.filtros = filtros;
  cargarLista(0);
}

function formatearMarcaTiempo(texto) {
  if (!texto) {
    return '—';
  }
  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) {
    return texto;
  }
  return fecha.toLocaleString('es-EC', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: ZONA_HORARIA
  });
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
  cuerpo.replaceChildren(filaMensaje('Cargando eventos...'));
  try {
    const ruta = `/api/auditoria${construirConsulta({ ...pantalla.filtros, pagina, tamano: TAMANO_PAGINA })}`;
    const respuesta = await apiFetch(ruta);
    pantalla.pagina = respuesta.pagina;
    if (respuesta.contenido.length === 0) {
      cuerpo.replaceChildren(filaMensaje('No se encontraron eventos con los filtros indicados.'));
    } else {
      cuerpo.replaceChildren(...respuesta.contenido.map(crearFila));
    }
    elemento('resumen-resultados').textContent = resumen(respuesta);
    renderizarPaginacion(elemento('paginacion'), respuesta, cargarLista);
  } catch (error) {
    cuerpo.replaceChildren(filaMensaje('No se pudo cargar el registro de auditoría.'));
    elemento('resumen-resultados').textContent = '';
    elemento('paginacion').replaceChildren();
    mostrarAlerta(elemento('alertas'), 'danger', mensajeDe(error));
  }
}

function claseAccion(accion) {
  if (accion === 'LOGIN_FALLIDO' || accion === 'CUENTA_BLOQUEADA') {
    return 'text-bg-danger';
  }
  if (accion === 'LOGIN_EXITOSO') {
    return 'text-bg-success';
  }
  if (accion.includes('DESACTIVADO')) {
    return 'text-bg-secondary';
  }
  if (accion.includes('PASSWORD')) {
    return 'text-bg-warning';
  }
  if (accion.includes('CREAD')) {
    return 'text-bg-primary';
  }
  return 'text-bg-info';
}

function descripcionRegistro(evento) {
  if (!evento.entidad) {
    return '—';
  }
  return evento.entidadId ? `${evento.entidad} #${evento.entidadId}` : evento.entidad;
}

function crearFila(evento) {
  const usuario = [crearElemento('div', { texto: evento.identificador || 'Sin identificar' })];
  if (evento.usuarioId) {
    usuario.push(crearElemento('div', { clase: 'small text-body-secondary', texto: `ID ${evento.usuarioId}` }));
  } else if (evento.identificador) {
    usuario.push(crearElemento('div', { clase: 'small text-body-secondary', texto: 'Cuenta no registrada' }));
  }

  const resumenDetalle = crearElemento('div', {
    clase: 'small text-truncate',
    texto: evento.detalle || '—',
    atributos: { style: 'max-width: 260px', title: evento.detalle || '' }
  });

  const marca = crearElemento('i', { clase: 'bi bi-eye', atributos: { 'aria-hidden': 'true' } });
  const boton = crearElemento('button', {
    clase: 'btn btn-sm btn-outline-secondary',
    atributos: {
      type: 'button',
      title: 'Ver detalle',
      'aria-label': `Ver detalle del evento ${evento.id}: ${evento.accion}`
    }
  }, [marca]);
  boton.addEventListener('click', () => abrirDetalle(evento));

  return crearElemento('tr', {}, [
    crearElemento('td', { clase: 'text-nowrap', texto: formatearMarcaTiempo(evento.fecha) }),
    crearElemento('td', {}, usuario),
    crearElemento('td', {}, [crearElemento('span', {
      clase: `badge ${claseAccion(evento.accion)}`,
      texto: evento.accion
    })]),
    crearElemento('td', { texto: descripcionRegistro(evento) }),
    crearElemento('td', { clase: 'font-monospace small', texto: evento.ip || '—' }),
    crearElemento('td', {}, [resumenDetalle]),
    crearElemento('td', { clase: 'text-end' }, [boton])
  ]);
}

function formatearValor(valor) {
  return valor === '' || valor === 'null' ? '(vacío)' : valor;
}

function leerPares(texto) {
  const pares = new Map();
  texto.split(/, (?=\w+=)/).forEach(parte => {
    const indice = parte.indexOf('=');
    if (indice > 0) {
      pares.set(parte.slice(0, indice), parte.slice(indice + 1));
    }
  });
  return pares;
}

function compararBloques(textoAntes, textoDespues) {
  const antes = leerPares(textoAntes);
  const despues = leerPares(textoDespues);
  const cambios = [];
  despues.forEach((valor, campo) => {
    const previo = antes.has(campo) ? antes.get(campo) : '';
    if (previo !== valor) {
      cambios.push({ campo, antes: previo, despues: valor });
    }
  });
  return cambios;
}

function extraerCambios(detalle) {
  if (!detalle) {
    return [];
  }
  const bloques = detalle.match(/^antes: \[([\s\S]*)\] -> despues: \[([\s\S]*)\]$/);
  if (bloques) {
    return compararBloques(bloques[1], bloques[2]);
  }
  const cambios = [];
  for (const coincidencia of detalle.matchAll(/(\w+): '([^']*)' -> '([^']*)'/g)) {
    cambios.push({ campo: coincidencia[1], antes: coincidencia[2], despues: coincidencia[3] });
  }
  return cambios;
}

function crearTablaCambios(cambios) {
  const encabezado = crearElemento('tr', {}, [
    crearElemento('th', { texto: 'Campo', atributos: { scope: 'col' } }),
    crearElemento('th', { texto: 'Valor anterior', atributos: { scope: 'col' } }),
    crearElemento('th', { texto: 'Valor nuevo', atributos: { scope: 'col' } })
  ]);
  const filas = cambios.map(cambio => crearElemento('tr', {}, [
    crearElemento('td', { clase: 'font-monospace', texto: cambio.campo }),
    crearElemento('td', { texto: formatearValor(cambio.antes) }),
    crearElemento('td', { clase: 'fw-semibold', texto: formatearValor(cambio.despues) })
  ]));
  const tabla = crearElemento('table', { clase: 'table table-sm table-bordered mb-0' }, [
    crearElemento('caption', { clase: 'visually-hidden', texto: 'Campos modificados en el evento' }),
    crearElemento('thead', { clase: 'table-light' }, [encabezado]),
    crearElemento('tbody', {}, filas)
  ]);
  return crearElemento('div', { clase: 'table-responsive' }, [tabla]);
}

function abrirDetalle(evento) {
  pantalla.evento = evento;

  elemento('detalle-fecha').textContent = formatearMarcaTiempo(evento.fecha);
  elemento('detalle-usuario').textContent = evento.identificador
    ? `${evento.identificador}${evento.usuarioId ? ` (ID ${evento.usuarioId})` : ' (cuenta no registrada)'}`
    : 'Sin identificar';
  elemento('detalle-accion').textContent = evento.accion;
  elemento('detalle-registro').textContent = descripcionRegistro(evento);
  elemento('detalle-ip').textContent = evento.ip || '—';

  const contenedor = elemento('detalle-cambios');
  const cambios = extraerCambios(evento.detalle);
  if (cambios.length > 0) {
    contenedor.replaceChildren(crearTablaCambios(cambios));
  } else {
    contenedor.replaceChildren(crearElemento('p', {
      clase: 'text-body-secondary mb-0',
      texto: 'Este evento no registra valores anteriores y nuevos.'
    }));
  }

  elemento('detalle-texto').textContent = evento.detalle || 'Sin detalle registrado.';
  elemento('boton-historial-registro').hidden = !(evento.entidad && evento.entidadId);
  modalDetalle.show();
}

function verHistorialDelRegistro() {
  const evento = pantalla.evento;
  elemento('filtro-usuario').value = '';
  elemento('filtro-accion').value = '';
  elemento('filtro-entidad').value = evento.entidad;
  elemento('filtro-registro').value = String(evento.entidadId);
  elemento('filtro-desde').value = '';
  elemento('filtro-hasta').value = '';
  limpiarAlerta(elemento('alertas'));
  pantalla.filtros = leerFiltros();
  modalDetalle.hide();
  cargarLista(0);
}