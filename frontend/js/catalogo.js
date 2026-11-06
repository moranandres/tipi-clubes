import { apiFetch, construirConsulta, ApiError } from './api.js';
import { cargarPeriodos } from './catalogos.js';
import { exigirSesion } from './guard.js';
import { montarLayout } from './layout.js';
import { renderizarPaginacion } from './paginacion.js';
import { crearElemento, formatearFecha, mostrarAlerta, limpiarAlerta } from './ui.js';

const TAMANO_PAGINA = 12;
const ROLES_GLOBALES = ['ADMIN', 'COORDINADOR', 'CONSULTA'];

const ESTADOS_CLUB = {
  PLANIFICADO: { etiqueta: 'Planificado', clase: 'text-bg-info' },
  ACTIVO: { etiqueta: 'Activo', clase: 'text-bg-success' },
  SUSPENDIDO: { etiqueta: 'Suspendido', clase: 'text-bg-warning' },
  CERRADO: { etiqueta: 'Cerrado', clase: 'text-bg-secondary' }
};

const ESTADOS_CURSO = {
  PLANIFICADO: { etiqueta: 'Planificado', clase: 'text-bg-info' },
  EN_CURSO: { etiqueta: 'En curso', clase: 'text-bg-success' },
  FINALIZADO: { etiqueta: 'Finalizado', clase: 'text-bg-primary' },
  CANCELADO: { etiqueta: 'Cancelado', clase: 'text-bg-secondary' }
};

const ADHESIONES = {
  PENDIENTE: { etiqueta: 'Adhesión pendiente', clase: 'text-bg-warning' },
  ADHERIDA: { etiqueta: 'Adherida', clase: 'text-bg-success' },
  SUSPENDIDA: { etiqueta: 'Adhesión suspendida', clase: 'text-bg-warning' },
  RETIRADA: { etiqueta: 'Retirada del proyecto', clase: 'text-bg-secondary' }
};

const NIVELES = { PRINCIPIANTE: 'Principiante', INTERMEDIO: 'Intermedio', AVANZADO: 'Avanzado' };
const MODALIDADES = { PRESENCIAL: 'Presencial', ONLINE: 'En línea', HIBRIDO: 'Híbrida' };
const SESIONES = { PRESENCIAL: 'presencial', VIRTUAL: 'virtual' };

const sesion = exigirSesion();
const pantalla = { pagina: 0, filtros: {}, periodos: [], periodoCargado: null, instituciones: [] };
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

function mensajeDe(error) {
  return error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
}

function insignia(mapa, codigo) {
  const datos = mapa[codigo] || { etiqueta: codigo || '—', clase: 'text-bg-light' };
  return crearElemento('span', { clase: `badge ${datos.clase}`, texto: datos.etiqueta });
}

function hhmm(texto) {
  return texto ? texto.slice(0, 5) : '';
}

function icono(clase) {
  return crearElemento('i', { clase: `bi ${clase} me-1`, atributos: { 'aria-hidden': 'true' } });
}

function plural(cantidad, singular, varios) {
  return `${cantidad} ${cantidad === 1 ? singular : varios}`;
}

function textoHorario(club) {
  if (!club.diaSemana) {
    return 'Sin horario fijo';
  }
  return `${club.dia} ${hhmm(club.horaInicio)}–${hhmm(club.horaFin)}`;
}

function parametroNumerico(parametros, nombre) {
  const valor = parametros.get(nombre);
  return valor && /^\d+$/.test(valor) ? valor : '';
}

async function iniciar() {
  montarLayout(sesion, 'catalogo');
  modalDetalle = bootstrap.Modal.getOrCreateInstance(elemento('modal-detalle'));

  elemento('formulario-filtros').addEventListener('submit', evento => {
    evento.preventDefault();
    buscar();
  });
  elemento('formulario-filtros').addEventListener('reset', () => {
    setTimeout(() => {
      seleccionarPeriodoActivo();
      buscar();
    }, 0);
  });
  elemento('mostrar-sin-clubes').addEventListener('change', renderizarInstituciones);

  const parametros = new URLSearchParams(window.location.search);
  await cargarListaPeriodos(parametroNumerico(parametros, 'periodoId'));
  await cargarInstituciones();

  const institucionId = parametroNumerico(parametros, 'institucionId');
  if (institucionId && pantalla.instituciones.some(item => String(item.institucionId) === institucionId)) {
    elemento('filtro-institucion').value = institucionId;
  }
  if (parametros.get('abiertos') === 'true') {
    elemento('filtro-abiertos').checked = true;
  }
  pantalla.filtros = leerFiltros();
  await cargarClubes(0);

  const clubId = parametroNumerico(parametros, 'clubId');
  if (clubId) {
    abrirDetalle(Number(clubId));
  }
}

async function cargarListaPeriodos(periodoInicial) {
  const selector = elemento('filtro-periodo');
  try {
    const periodos = await cargarPeriodos();
    pantalla.periodos = periodos;
    selector.replaceChildren(...periodos.map(periodo => crearElemento('option', {
      texto: periodo.activo ? `${periodo.nombre} (activo)` : periodo.nombre,
      atributos: { value: String(periodo.id) }
    })));
    if (periodoInicial && periodos.some(periodo => String(periodo.id) === periodoInicial)) {
      selector.value = periodoInicial;
    } else {
      seleccionarPeriodoActivo();
    }
    if (periodos.length === 0) {
      mostrarAlerta(elemento('alertas'), 'warning', 'Todavía no hay períodos académicos registrados.');
    }
  } catch (error) {
    mostrarAlerta(elemento('alertas'), 'danger', `No se pudieron cargar los períodos. ${mensajeDe(error)}`);
  }
}

function seleccionarPeriodoActivo() {
  const periodos = pantalla.periodos;
  const activo = periodos.find(periodo => periodo.activo) || periodos[0];
  if (activo) {
    elemento('filtro-periodo').value = String(activo.id);
  }
}

function leerFiltros() {
  return {
    q: elemento('filtro-q').value.trim(),
    periodoId: elemento('filtro-periodo').value,
    institucionId: elemento('filtro-institucion').value,
    estado: elemento('filtro-estado').value,
    nivel: elemento('filtro-nivel').value,
    modalidad: elemento('filtro-modalidad').value,
    abiertos: elemento('filtro-abiertos').checked ? 'true' : '',
    conCupo: elemento('filtro-con-cupo').checked ? 'true' : ''
  };
}

async function buscar() {
  limpiarAlerta(elemento('alertas'));
  if (elemento('filtro-periodo').value !== pantalla.periodoCargado) {
    await cargarInstituciones();
  }
  pantalla.filtros = leerFiltros();
  await cargarClubes(0);
}

async function cargarInstituciones() {
  const periodoId = elemento('filtro-periodo').value;
  const cuerpo = elemento('cuerpo-instituciones');
  cuerpo.replaceChildren(filaMensaje('Cargando instituciones...', 7));
  elemento('pie-instituciones').replaceChildren();
  try {
    pantalla.instituciones = await apiFetch(`/api/catalogo/instituciones${construirConsulta({ periodoId })}`);
    pantalla.periodoCargado = periodoId;
  } catch (error) {
    pantalla.instituciones = [];
    pantalla.periodoCargado = null;
    mostrarAlerta(elemento('alertas'), 'danger', `No se pudo cargar el resumen por institución. ${mensajeDe(error)}`);
  }
  llenarFiltroInstituciones();
  renderizarInstituciones();
}

function llenarFiltroInstituciones() {
  const selector = elemento('filtro-institucion');
  const anterior = selector.value;
  const opciones = [crearElemento('option', { texto: 'Todas', atributos: { value: '' } })];
  pantalla.instituciones.forEach(institucion => {
    opciones.push(crearElemento('option', {
      texto: institucion.nombre,
      atributos: { value: String(institucion.institucionId) }
    }));
  });
  selector.replaceChildren(...opciones);
  if (pantalla.instituciones.some(item => String(item.institucionId) === anterior)) {
    selector.value = anterior;
  }
}

function filaMensaje(texto, columnas) {
  const celda = crearElemento('td', {
    clase: 'text-center text-body-secondary py-3',
    texto,
    atributos: { colspan: String(columnas) }
  });
  return crearElemento('tr', {}, [celda]);
}

function celdaNumero(valor) {
  return crearElemento('td', { clase: 'text-end', texto: String(valor) });
}

function renderizarInstituciones() {
  const cuerpo = elemento('cuerpo-instituciones');
  const todas = elemento('mostrar-sin-clubes').checked;
  const visibles = pantalla.instituciones.filter(item => todas || item.clubesTotal > 0);
  if (visibles.length === 0) {
    cuerpo.replaceChildren(filaMensaje(
      pantalla.instituciones.length === 0
        ? 'No hay instituciones para el período seleccionado.'
        : 'Ninguna institución tiene clubes en este período.',
      7
    ));
    elemento('pie-instituciones').replaceChildren();
    return;
  }
  cuerpo.replaceChildren(...visibles.map(crearFilaInstitucion));

  const sumar = campo => visibles.reduce((total, item) => total + item[campo], 0);
  elemento('pie-instituciones').replaceChildren(crearElemento('tr', {}, [
    crearElemento('td', { texto: `Total (${visibles.length} ${visibles.length === 1 ? 'institución' : 'instituciones'})` }),
    celdaNumero(sumar('clubesTotal')),
    celdaNumero(sumar('clubesAbiertos')),
    celdaNumero(sumar('cuposDisponibles')),
    celdaNumero(sumar('cursosAbiertos')),
    celdaNumero(sumar('estudiantesActivos')),
    crearElemento('td')
  ]));
}

function crearFilaInstitucion(institucion) {
  const nombre = [
    crearElemento('div', { clase: 'fw-semibold', texto: institucion.nombre }),
    crearElemento('div', {
      clase: 'small text-body-secondary',
      texto: `AMIE ${institucion.codigoAmie} · ${institucion.canton || institucion.provincia || ''}`
    })
  ];
  if (institucion.estadoAdhesion !== 'ADHERIDA') {
    nombre.push(insignia(ADHESIONES, institucion.estadoAdhesion));
  }
  const clubes = crearElemento('td', { clase: 'text-end' }, [
    crearElemento('div', { texto: String(institucion.clubesTotal) }),
    crearElemento('div', {
      clase: 'small text-body-secondary text-nowrap',
      texto: `${plural(institucion.clubesActivos, 'activo', 'activos')} · ${plural(institucion.clubesCerrados, 'cerrado', 'cerrados')}`
    })
  ]);
  const boton = crearElemento('button', {
    clase: 'btn btn-sm btn-outline-primary text-nowrap',
    texto: 'Ver clubes',
    atributos: { type: 'button', 'aria-label': `Ver clubes de ${institucion.nombre}` }
  });
  boton.disabled = institucion.clubesTotal === 0;
  boton.addEventListener('click', () => {
    elemento('filtro-institucion').value = String(institucion.institucionId);
    buscar();
    elemento('titulo-clubes').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  return crearElemento('tr', {}, [
    crearElemento('td', {}, nombre),
    clubes,
    celdaNumero(institucion.clubesAbiertos),
    celdaNumero(institucion.cuposDisponibles),
    celdaNumero(institucion.cursosAbiertos),
    celdaNumero(institucion.estudiantesActivos),
    crearElemento('td', { clase: 'text-end' }, [boton])
  ]);
}

function resumen(respuesta) {
  if (respuesta.totalElementos === 0) {
    return 'Sin resultados';
  }
  const desde = respuesta.pagina * respuesta.tamano + 1;
  const hasta = desde + respuesta.contenido.length - 1;
  return `Mostrando ${desde}–${hasta} de ${respuesta.totalElementos} clubes`;
}

function mensajeTarjetas(texto) {
  return crearElemento('div', { clase: 'col-12' }, [
    crearElemento('div', { clase: 'card card-body text-center text-body-secondary py-4', texto })
  ]);
}

async function cargarClubes(pagina) {
  const contenedor = elemento('tarjetas-clubes');
  contenedor.replaceChildren(mensajeTarjetas('Cargando clubes...'));
  try {
    const ruta = `/api/catalogo/clubes${construirConsulta({ ...pantalla.filtros, pagina, tamano: TAMANO_PAGINA })}`;
    const respuesta = await apiFetch(ruta);
    pantalla.pagina = respuesta.pagina;
    if (respuesta.contenido.length === 0) {
      contenedor.replaceChildren(mensajeTarjetas('No hay clubes que coincidan con los filtros.'));
    } else {
      contenedor.replaceChildren(...respuesta.contenido.map(crearTarjeta));
    }
    elemento('resumen-resultados').textContent = resumen(respuesta);
    renderizarPaginacion(elemento('paginacion'), respuesta, cargarClubes);
  } catch (error) {
    contenedor.replaceChildren(mensajeTarjetas('No se pudo cargar el catálogo.'));
    elemento('resumen-resultados').textContent = '';
    elemento('paginacion').replaceChildren();
    mostrarAlerta(elemento('alertas'), 'danger', mensajeDe(error));
  }
}

function crearBarraCupos(ocupados, cupo, nombre) {
  const porcentaje = cupo > 0 ? Math.min(100, Math.round((ocupados * 100) / cupo)) : 0;
  let clase = 'progress-bar';
  if (porcentaje >= 100) {
    clase = 'progress-bar bg-danger';
  } else if (porcentaje >= 80) {
    clase = 'progress-bar bg-warning';
  }
  const relleno = crearElemento('div', { clase });
  relleno.style.width = `${porcentaje}%`;
  return crearElemento('div', {
    clase: 'progress barra-ocupacion my-1',
    atributos: {
      role: 'progressbar',
      'aria-label': `Ocupación de ${nombre}`,
      'aria-valuenow': String(ocupados),
      'aria-valuemin': '0',
      'aria-valuemax': String(cupo)
    }
  }, [relleno]);
}

function crearTarjeta(club) {
  const cabecera = crearElemento('div', { clase: 'd-flex justify-content-between align-items-start gap-2 mb-1' }, [
    crearElemento('h3', { clase: 'h6 mb-0', texto: club.nombre }),
    insignia(ESTADOS_CLUB, club.estado)
  ]);
  const institucion = crearElemento('div', {
    clase: 'small text-body-secondary mb-2',
    texto: `${club.institucionNombre} · ${club.periodoNombre}`
  });
  const datos = crearElemento('ul', { clase: 'list-unstyled small mb-2' }, [
    crearElemento('li', {}, [icono('bi-person-workspace'), document.createTextNode(club.docenteNombre || 'Sin docente')]),
    crearElemento('li', {}, [icono('bi-clock'), document.createTextNode(textoHorario(club))]),
    crearElemento('li', {}, [icono('bi-geo-alt'), document.createTextNode(club.lugar || 'Lugar por definir')])
  ]);
  const cupos = [
    crearElemento('div', { clase: 'd-flex justify-content-between small' }, [
      crearElemento('span', { texto: `${club.integrantesActivos} de ${club.cupoMaximo} integrantes` }),
      crearElemento('span', {
        clase: club.cuposDisponibles > 0 ? 'fw-semibold text-success' : 'text-body-secondary',
        texto: plural(club.cuposDisponibles, 'cupo libre', 'cupos libres')
      })
    ]),
    crearBarraCupos(club.integrantesActivos, club.cupoMaximo, club.nombre),
    crearElemento('div', {
      clase: 'small text-body-secondary',
      texto: `${plural(club.integrantesNuevos, 'nuevo', 'nuevos')} · ${plural(club.integrantesAntiguos, 'antiguo', 'antiguos')} · ${plural(club.cursosAbiertos, 'curso abierto', 'cursos abiertos')}`
    })
  ];
  const estadoInscripcion = club.admiteInscripciones
    ? crearElemento('span', { clase: 'badge bg-success-subtle text-success-emphasis border border-success-subtle', texto: 'Inscripciones abiertas' })
    : crearElemento('span', { clase: 'badge text-bg-light border', texto: 'Inscripciones cerradas' });

  const boton = crearElemento('button', {
    clase: 'btn btn-sm btn-outline-primary',
    texto: 'Ver detalle',
    atributos: { type: 'button', 'aria-label': `Ver detalle de ${club.nombre}` }
  });
  boton.addEventListener('click', () => abrirDetalle(club.id));

  const cuerpo = crearElemento('div', { clase: 'card-body' }, [cabecera, institucion, datos, ...cupos]);
  const pie = crearElemento('div', { clase: 'card-footer bg-transparent d-flex justify-content-between align-items-center gap-2' }, [
    estadoInscripcion,
    boton
  ]);
  return crearElemento('div', { clase: 'col-12 col-md-6 col-xxl-4' }, [
    crearElemento('article', { clase: 'card h-100 shadow-sm' }, [cuerpo, pie])
  ]);
}

function puedeVerCursos(club) {
  return esGlobal() || club.institucionId === sesion.usuario.institucionId;
}

async function abrirDetalle(clubId) {
  elemento('titulo-detalle').textContent = 'Cargando club...';
  elemento('subtitulo-detalle').textContent = '';
  elemento('contenido-detalle').hidden = true;
  elemento('enlace-cursos').hidden = true;
  limpiarAlerta(elemento('alertas-detalle'));
  modalDetalle.show();
  try {
    const detalle = await apiFetch(`/api/catalogo/clubes/${clubId}`);
    renderizarDetalle(detalle);
  } catch (error) {
    elemento('titulo-detalle').textContent = 'Club';
    mostrarAlerta(elemento('alertas-detalle'), 'danger', mensajeDe(error));
  }
}

function dato(termino, valor) {
  return [
    crearElemento('dt', { clase: 'col-sm-4 text-body-secondary fw-normal', texto: termino }),
    crearElemento('dd', { clase: 'col-sm-8 mb-1', texto: valor })
  ];
}

function cifra(titulo, valor, columna = 'col-6 col-sm-4') {
  return crearElemento('div', { clase: columna }, [
    crearElemento('div', { clase: 'border rounded p-2 h-100' }, [
      crearElemento('div', { clase: 'fs-5 fw-semibold lh-sm', texto: String(valor) }),
      crearElemento('div', { clase: 'small text-body-secondary', texto: titulo })
    ])
  ]);
}

function renderizarDetalle({ club, trayectoria, cursos }) {
  elemento('titulo-detalle').textContent = club.nombre;
  elemento('subtitulo-detalle').textContent = `${club.institucionNombre} · Período ${club.periodoNombre}`;

  const insignias = [insignia(ESTADOS_CLUB, club.estado)];
  insignias.push(club.admiteInscripciones
    ? crearElemento('span', { clase: 'badge bg-success-subtle text-success-emphasis border border-success-subtle', texto: 'Inscripciones abiertas' })
    : crearElemento('span', { clase: 'badge text-bg-light border', texto: 'Inscripciones cerradas' }));
  if (!club.periodoActivo) {
    insignias.push(crearElemento('span', { clase: 'badge text-bg-light border', texto: 'Período no activo' }));
  }
  elemento('insignias-detalle').replaceChildren(...insignias);
  elemento('detalle-objetivo').textContent = club.objetivo || '';

  elemento('detalle-datos').replaceChildren(
    ...dato('AMIE', `${club.codigoAmie} · ${club.canton || '—'}`),
    ...dato('Docente', club.docenteNombre || '—'),
    ...dato('Horario', textoHorario(club)),
    ...dato('Lugar', club.lugar || 'Por definir'),
    ...dato('Creado', formatearFecha(club.fechaCreacion))
  );
  elemento('detalle-cifras').replaceChildren(
    cifra('integrantes activos', `${club.integrantesActivos}/${club.cupoMaximo}`),
    cifra('cupos libres', club.cuposDisponibles),
    cifra('cursos abiertos', club.cursosAbiertos),
    cifra('integrantes nuevos', club.integrantesNuevos),
    cifra('integrantes antiguos', club.integrantesAntiguos)
  );
  elemento('detalle-trayectoria').replaceChildren(
    cifra('integrantes en total', trayectoria.integrantesHistoricos, 'col-6 col-md'),
    cifra('retiros', trayectoria.retiros, 'col-6 col-md'),
    cifra('cursos dictados', trayectoria.cursosTotal, 'col-6 col-md'),
    cifra('participaciones en competencias', trayectoria.participacionesCompetencia, 'col-6 col-md'),
    cifra('certificados vigentes', trayectoria.certificadosVigentes, 'col-12 col-md')
  );

  const cuerpo = elemento('detalle-cursos');
  if (cursos.length === 0) {
    cuerpo.replaceChildren(filaMensaje('El club todavía no tiene cursos registrados.', 6));
  } else {
    cuerpo.replaceChildren(...cursos.map(crearFilaCurso));
  }

  const enlace = elemento('enlace-cursos');
  enlace.href = `cursos.html?clubId=${club.id}`;
  enlace.hidden = !puedeVerCursos(club);
  elemento('contenido-detalle').hidden = false;
}

function crearFilaCurso(curso) {
  const nombre = [
    crearElemento('div', { clase: 'fw-semibold', texto: curso.nombre }),
    crearElemento('div', { clase: 'small text-body-secondary', texto: `${NIVELES[curso.nivel] || curso.nivel} · ${curso.duracionHoras || '—'} h` })
  ];
  if (curso.descripcion) {
    nombre.push(crearElemento('div', { clase: 'small text-body-secondary detalle-truncado text-truncate', texto: curso.descripcion }));
  }
  const horarios = curso.horarios.length === 0
    ? [crearElemento('span', { clase: 'small text-body-secondary', texto: 'Sin horario' })]
    : curso.horarios.map(horario => crearElemento('div', {
      clase: 'small text-nowrap',
      texto: `${horario.dia} ${hhmm(horario.horaInicio)}–${hhmm(horario.horaFin)} (${SESIONES[horario.tipoSesion] || horario.tipoSesion})`
    }));
  const cupos = [
    crearElemento('div', { clase: 'small', texto: `${curso.inscritosActivos} de ${curso.cupoMaximo}` }),
    crearBarraCupos(curso.inscritosActivos, curso.cupoMaximo, curso.nombre),
    crearElemento('div', {
      clase: 'small text-body-secondary text-nowrap',
      texto: curso.admiteInscripciones
        ? plural(curso.cuposDisponibles, 'libre', 'libres')
        : `${curso.finalizados} finalizaron · ${curso.aprobados} aprobaron`
    })
  ];
  return crearElemento('tr', {}, [
    crearElemento('td', {}, nombre),
    crearElemento('td', {}, [
      crearElemento('div', { texto: MODALIDADES[curso.modalidad] || curso.modalidad }),
      crearElemento('div', { clase: 'small text-body-secondary', texto: curso.lugar || '' })
    ]),
    crearElemento('td', { clase: 'small text-nowrap', texto: `${formatearFecha(curso.fechaInicio)} – ${formatearFecha(curso.fechaFin)}` }),
    crearElemento('td', {}, horarios),
    crearElemento('td', { clase: 'cupos-club' }, cupos),
    crearElemento('td', {}, [insignia(ESTADOS_CURSO, curso.estado)])
  ]);
}
