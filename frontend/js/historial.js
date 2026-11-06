import { apiFetch, construirConsulta, ApiError } from './api.js';
import { cargarInstituciones } from './catalogos.js';
import { exigirSesion } from './guard.js';
import { montarLayout } from './layout.js';
import { renderizarPaginacion } from './paginacion.js';
import { crearElemento, formatearFecha, mostrarAlerta, limpiarAlerta } from './ui.js';

const TAMANO_PAGINA = 10;
const ROLES_GLOBALES = ['ADMIN', 'COORDINADOR', 'CONSULTA'];
const ROLES_DATOS_MINIMOS = ['COORDINADOR', 'CONSULTA'];

const ESTADOS_ESTUDIANTE = {
  ACTIVO: { etiqueta: 'Activo', clase: 'text-bg-success' },
  RETIRADO: { etiqueta: 'Retirado', clase: 'text-bg-secondary' },
  EGRESADO: { etiqueta: 'Egresado', clase: 'text-bg-info' }
};

const ESTADOS_CLUB = {
  ACTIVA: { etiqueta: 'Activa', clase: 'text-bg-success' },
  RETIRADA: { etiqueta: 'Retirada', clase: 'text-bg-warning' },
  TRASLADADA: { etiqueta: 'Trasladada', clase: 'text-bg-info' },
  FINALIZADA: { etiqueta: 'Finalizada', clase: 'text-bg-secondary' }
};

const ESTADOS_CURSO = {
  ACTIVA: { etiqueta: 'En marcha', clase: 'text-bg-success' },
  FINALIZADA: { etiqueta: 'Finalizada', clase: 'text-bg-primary' },
  RETIRADA: { etiqueta: 'Retirada', clase: 'text-bg-secondary' }
};

const RESULTADOS = {
  APROBADO: { etiqueta: 'Aprobado', clase: 'text-bg-success' },
  NO_APROBADO: { etiqueta: 'No aprobado', clase: 'text-bg-danger' }
};

const ESTADOS_CERTIFICADO = {
  EMITIDO: { etiqueta: 'Vigente', clase: 'text-bg-success' },
  ANULADO: { etiqueta: 'Anulado', clase: 'text-bg-danger' }
};

const TIPOS_CERTIFICADO = {
  PARTICIPACION_CURSO: 'Participación en curso',
  APROBACION_CURSO: 'Aprobación de curso',
  PARTICIPACION_COMPETENCIA: 'Participación en competencia',
  RECONOCIMIENTO_COMPETENCIA: 'Reconocimiento en competencia'
};

const NIVELES_CURSO = {
  PRINCIPIANTE: 'Principiante',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado'
};

const NIVELES_CATEGORIA = {
  BASICA: 'Básica',
  AVANZADA: 'Avanzada'
};

const EVENTOS = {
  INGRESO_CLUB: { grupo: 'CLUB', etiqueta: 'Ingreso al club', icono: 'bi-box-arrow-in-right', color: 'text-bg-primary' },
  SALIDA_CLUB: { grupo: 'CLUB', etiqueta: 'Salida del club', icono: 'bi-box-arrow-right', color: 'text-bg-secondary' },
  INGRESO_CURSO: { grupo: 'CURSO', etiqueta: 'Inscripción en curso', icono: 'bi-journal-plus', color: 'text-bg-info' },
  FIN_CURSO: { grupo: 'CURSO', etiqueta: 'Fin de curso', icono: 'bi-journal-check', color: 'text-bg-success' },
  RETIRO_CURSO: { grupo: 'CURSO', etiqueta: 'Retiro de curso', icono: 'bi-journal-x', color: 'text-bg-warning' },
  COMPETENCIA: { grupo: 'COMPETENCIA', etiqueta: 'Competencia', icono: 'bi-trophy', color: 'text-bg-warning' },
  CERTIFICADO_EMITIDO: { grupo: 'CERTIFICADO', etiqueta: 'Certificado emitido', icono: 'bi-award', color: 'text-bg-success' },
  CERTIFICADO_ANULADO: { grupo: 'CERTIFICADO', etiqueta: 'Certificado anulado', icono: 'bi-x-octagon', color: 'text-bg-danger' }
};

const AVISOS_ALCANCE = {
  CLUBES_DEL_DOCENTE: 'Como docente, ve la trayectoria del estudiante en los clubes a su cargo y lo que usted registró. Los clubes de otros docentes no aparecen en esta ficha.',
  VISTA_MINIMA: 'Vista de supervisión: el estudiante se identifica solo por su código EST-, sin nombres ni datos personales.'
};

const sesion = exigirSesion();
const pantalla = { pagina: 0, filtros: {}, historial: null };

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

function mensajeDe(error) {
  return error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
}

function insignia(mapa, codigo) {
  const datos = mapa[codigo] || { etiqueta: codigo || '—', clase: 'text-bg-light' };
  return crearElemento('span', { clase: `badge ${datos.clase}`, texto: datos.etiqueta });
}

function plural(cantidad, singular, varios) {
  return `${cantidad} ${cantidad === 1 ? singular : varios}`;
}

function tieneNombre(estudiante) {
  return !soloDatosMinimos() && Boolean(estudiante.nombres);
}

async function iniciar() {
  montarLayout(sesion, 'historial');

  const id = new URLSearchParams(window.location.search).get('id');
  if (id && /^\d+$/.test(id)) {
    await cargarHistorial(Number(id));
    return;
  }
  if (id) {
    mostrarAlerta(elemento('alertas'), 'warning', 'El enlace no indica un estudiante válido. Búsquelo en la lista.');
  }
  await mostrarBusqueda();
}

async function mostrarBusqueda() {
  elemento('seccion-busqueda').hidden = false;
  elemento('grupo-busqueda-institucion').hidden = !esGlobal();
  elemento('columna-nombre').hidden = soloDatosMinimos();
  if (soloDatosMinimos()) {
    elemento('etiqueta-busqueda-q').textContent = 'Código EST-';
  }

  elemento('formulario-busqueda').addEventListener('submit', evento => {
    evento.preventDefault();
    pantalla.filtros = leerFiltros();
    buscarEstudiantes(0);
  });
  elemento('formulario-busqueda').addEventListener('reset', () => {
    setTimeout(() => {
      pantalla.filtros = {};
      buscarEstudiantes(0);
    }, 0);
  });

  if (esGlobal()) {
    try {
      const instituciones = await cargarInstituciones();
      const opciones = [crearElemento('option', { texto: 'Todas', atributos: { value: '' } })];
      instituciones.forEach(institucion => {
        opciones.push(crearElemento('option', { texto: institucion.nombre, atributos: { value: String(institucion.id) } }));
      });
      elemento('busqueda-institucion').replaceChildren(...opciones);
    } catch (error) {
      mostrarAlerta(elemento('alertas'), 'warning', `No se pudo cargar la lista de instituciones. ${mensajeDe(error)}`);
    }
  }
  await buscarEstudiantes(0);
}

function leerFiltros() {
  return {
    q: elemento('busqueda-q').value.trim(),
    institucionId: esGlobal() ? elemento('busqueda-institucion').value : ''
  };
}

function columnasBusqueda() {
  return soloDatosMinimos() ? 5 : 6;
}

function filaMensaje(texto, columnas) {
  const celda = crearElemento('td', {
    clase: 'text-center text-body-secondary py-4',
    texto,
    atributos: { colspan: String(columnas) }
  });
  return crearElemento('tr', {}, [celda]);
}

function resumenPagina(respuesta) {
  if (respuesta.totalElementos === 0) {
    return 'Sin resultados';
  }
  const desde = respuesta.pagina * respuesta.tamano + 1;
  const hasta = desde + respuesta.contenido.length - 1;
  return `Mostrando ${desde}–${hasta} de ${respuesta.totalElementos}`;
}

async function buscarEstudiantes(pagina) {
  const cuerpo = elemento('cuerpo-busqueda');
  cuerpo.replaceChildren(filaMensaje('Cargando estudiantes...', columnasBusqueda()));
  try {
    const ruta = `/api/estudiantes${construirConsulta({ ...pantalla.filtros, pagina, tamano: TAMANO_PAGINA })}`;
    const respuesta = await apiFetch(ruta);
    pantalla.pagina = respuesta.pagina;
    if (respuesta.contenido.length === 0) {
      cuerpo.replaceChildren(filaMensaje('No se encontraron estudiantes.', columnasBusqueda()));
    } else {
      cuerpo.replaceChildren(...respuesta.contenido.map(crearFilaEstudiante));
    }
    elemento('resumen-busqueda').textContent = resumenPagina(respuesta);
    renderizarPaginacion(elemento('paginacion-busqueda'), respuesta, buscarEstudiantes);
  } catch (error) {
    cuerpo.replaceChildren(filaMensaje('No se pudo cargar el listado.', columnasBusqueda()));
    elemento('resumen-busqueda').textContent = '';
    elemento('paginacion-busqueda').replaceChildren();
    mostrarAlerta(elemento('alertas'), 'danger', mensajeDe(error));
  }
}

function crearFilaEstudiante(estudiante) {
  const identificacion = tieneNombre(estudiante)
    ? `${estudiante.apellidos} ${estudiante.nombres}`
    : estudiante.codigoInterno;
  const celdas = [
    crearElemento('td', { clase: 'text-nowrap font-monospace small', texto: estudiante.codigoInterno })
  ];
  if (!soloDatosMinimos()) {
    celdas.push(crearElemento('td', { clase: 'fw-semibold', texto: identificacion }));
  }
  celdas.push(crearElemento('td', { texto: estudiante.institucionNombre || `Institución ${estudiante.institucionId}` }));
  celdas.push(crearElemento('td', { texto: estudiante.cursoEtiqueta || '—' }));
  celdas.push(crearElemento('td', {}, [insignia(ESTADOS_ESTUDIANTE, estudiante.estado)]));

  const enlace = crearElemento('a', {
    clase: 'btn btn-sm btn-outline-primary',
    atributos: { href: `historial.html?id=${estudiante.id}`, 'aria-label': `Ver historial: ${identificacion}` }
  }, [
    crearElemento('i', { clase: 'bi bi-clock-history me-1', atributos: { 'aria-hidden': 'true' } }),
    document.createTextNode('Ver historial')
  ]);
  celdas.push(crearElemento('td', { clase: 'text-end text-nowrap' }, [enlace]));
  return crearElemento('tr', {}, celdas);
}

async function cargarHistorial(estudianteId) {
  const seccion = elemento('seccion-historial');
  mostrarAlerta(elemento('alertas'), 'info', 'Cargando el historial del estudiante...');
  try {
    const historial = await apiFetch(`/api/estudiantes/${estudianteId}/historial`);
    pantalla.historial = historial;
    limpiarAlerta(elemento('alertas'));
    renderizarHistorial(historial);
    seccion.hidden = false;
    elemento('acciones-historial').hidden = false;
  } catch (error) {
    const sinAcceso = error instanceof ApiError && (error.estado === 403 || error.estado === 404);
    mostrarAlerta(
      elemento('alertas'),
      'danger',
      sinAcceso
        ? `No puede ver el historial de este estudiante. ${mensajeDe(error)}`
        : `No se pudo cargar el historial. ${mensajeDe(error)}`
    );
    await mostrarBusqueda();
  }
}

function renderizarHistorial(historial) {
  const estudiante = historial.estudiante;
  const completo = historial.alcance !== 'VISTA_MINIMA' && Boolean(estudiante.nombres);
  const titulo = completo ? `${estudiante.apellidos} ${estudiante.nombres}` : estudiante.codigoInterno;
  document.title = `Historial de ${titulo} | TIPI 3.0`;

  elemento('nombre-estudiante').textContent = titulo;
  const datos = [];
  if (completo) {
    datos.push(estudiante.codigoInterno);
  }
  datos.push(estudiante.institucionNombre || `Institución ${estudiante.institucionId}`);
  if (estudiante.cursoEtiqueta) {
    datos.push(estudiante.nivel ? `${estudiante.cursoEtiqueta} (${estudiante.nivel})` : estudiante.cursoEtiqueta);
  }
  elemento('datos-estudiante').textContent = datos.join(' · ');

  const insignias = [insignia(ESTADOS_ESTUDIANTE, estudiante.estado)];
  if (historial.alcance === 'CLUBES_DEL_DOCENTE') {
    insignias.push(crearElemento('span', { clase: 'badge text-bg-light border', texto: 'Solo sus clubes' }));
  } else if (historial.alcance === 'VISTA_MINIMA') {
    insignias.push(crearElemento('span', { clase: 'badge text-bg-light border', texto: 'Vista mínima' }));
  }
  elemento('insignias-estudiante').replaceChildren(...insignias);

  const aviso = AVISOS_ALCANCE[historial.alcance];
  elemento('aviso-alcance').hidden = !aviso;
  elemento('aviso-alcance').textContent = aviso || '';

  elemento('enlace-certificados').href = `certificados.html?estudianteId=${estudiante.id}`;
  elemento('boton-imprimir').addEventListener('click', () => window.print());
  elemento('filtro-tipo-evento').addEventListener('change', renderizarLineaDeTiempo);
  elemento('filtro-orden').addEventListener('change', renderizarLineaDeTiempo);

  renderizarResumen(historial.resumen);
  renderizarLineaDeTiempo();
  renderizarClubes(historial.clubes);
  renderizarCompetencias(historial.competencias);
  renderizarCertificados(historial.certificados);

  elemento('conteo-linea').textContent = String(historial.lineaDeTiempo.length);
  elemento('conteo-clubes').textContent = String(historial.clubes.length);
  elemento('conteo-competencias').textContent = String(historial.competencias.length);
  elemento('conteo-certificados').textContent = String(historial.certificados.length);

  const ahora = new Date().toLocaleString('es-EC', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Guayaquil' });
  elemento('pie-historial').textContent =
    `Consultado el ${ahora} por ${sesion.usuario.nombres} ${sesion.usuario.apellidos}. El historial se conserva aunque el estudiante se retire o el club se cierre.`;
}

function crearIndicador(icono, titulo, valor, detalle, claseValor = 'fs-4') {
  const cuerpo = crearElemento('div', { clase: 'card-body d-flex align-items-center gap-3' }, [
    crearElemento('i', { clase: `bi ${icono} fs-2 text-primary`, atributos: { 'aria-hidden': 'true' } }),
    crearElemento('div', { clase: 'text-break' }, [
      crearElemento('div', { clase: 'text-body-secondary small', texto: titulo }),
      crearElemento('div', { clase: `${claseValor} fw-semibold lh-sm`, texto: valor }),
      crearElemento('div', { clase: 'small text-body-secondary', texto: detalle })
    ])
  ]);
  return crearElemento('div', { clase: 'col-6 col-md-4 col-xxl-2' }, [
    crearElemento('div', { clase: 'card h-100 shadow-sm' }, [cuerpo])
  ]);
}

function renderizarResumen(resumen) {
  elemento('resumen-historial').replaceChildren(
    crearIndicador('bi-calendar-check', 'Primer ingreso', formatearFecha(resumen.primerIngreso),
      plural(resumen.periodos, 'período', 'períodos'), 'fs-6'),
    crearIndicador('bi-robot', 'Clubes', String(resumen.clubes),
      plural(resumen.clubesActivos, 'activo', 'activos')),
    crearIndicador('bi-journal-code', 'Cursos', String(resumen.cursos),
      `${resumen.cursosEnMarcha} en marcha · ${plural(resumen.cursosFinalizados, 'finalizado', 'finalizados')}`),
    crearIndicador('bi-check2-circle', 'Cursos aprobados', String(resumen.cursosAprobados),
      `de ${plural(resumen.cursosFinalizados, 'finalizado', 'finalizados')}`),
    crearIndicador('bi-trophy', 'Competencias', String(resumen.competencias),
      `${plural(resumen.podios, 'podio', 'podios')} · ${resumen.competenciasConResultado} con resultado`),
    crearIndicador('bi-award', 'Certificados vigentes', String(resumen.certificadosVigentes),
      plural(resumen.certificadosAnulados, 'anulado', 'anulados'))
  );
}

function renderizarLineaDeTiempo() {
  const lista = elemento('lista-eventos');
  const grupo = elemento('filtro-tipo-evento').value;
  const descendente = elemento('filtro-orden').value === 'DESC';
  let eventos = pantalla.historial.lineaDeTiempo
    .filter(evento => !grupo || (EVENTOS[evento.tipo] && EVENTOS[evento.tipo].grupo === grupo));
  if (descendente) {
    eventos = eventos.slice().reverse();
  }
  if (eventos.length === 0) {
    lista.replaceChildren(crearElemento('li', {
      clase: 'text-body-secondary py-3',
      texto: pantalla.historial.lineaDeTiempo.length === 0
        ? 'El estudiante todavía no tiene eventos registrados.'
        : 'No hay eventos de este tipo.'
    }));
    return;
  }
  lista.replaceChildren(...eventos.map(crearEvento));
}

function crearEvento(evento) {
  const datos = EVENTOS[evento.tipo] || { etiqueta: evento.tipo, icono: 'bi-dot', color: 'text-bg-light' };
  const marca = crearElemento('span', {
    clase: `marca-evento ${datos.color}`,
    atributos: { 'aria-hidden': 'true' }
  }, [crearElemento('i', { clase: `bi ${datos.icono}` })]);
  const contenido = crearElemento('div', { clase: 'flex-grow-1' }, [
    crearElemento('div', { clase: 'small text-body-secondary' }, [
      crearElemento('time', { texto: formatearFecha(evento.fecha), atributos: { datetime: evento.fecha || '' } }),
      document.createTextNode(` · ${datos.etiqueta}`)
    ]),
    crearElemento('div', { texto: evento.descripcion })
  ]);
  return crearElemento('li', { clase: 'evento-linea d-flex gap-3' }, [marca, contenido]);
}

function enlaceCatalogo(clubId, texto) {
  return crearElemento('a', { clase: 'link-primary', texto, atributos: { href: `catalogo.html?clubId=${clubId}` } });
}

function renderizarClubes(clubes) {
  const contenedor = elemento('lista-clubes');
  if (clubes.length === 0) {
    contenedor.replaceChildren(crearElemento('p', {
      clase: 'text-body-secondary mb-0',
      texto: 'El estudiante no tiene inscripciones en clubes visibles para su rol.'
    }));
    return;
  }
  const ordenados = clubes.slice().sort((a, b) => (b.fechaIngreso || '').localeCompare(a.fechaIngreso || ''));
  contenedor.replaceChildren(...ordenados.map(crearTarjetaClub));
}

function crearTarjetaClub(inscripcion) {
  const periodo = inscripcion.fechaRetiro
    ? `Del ${formatearFecha(inscripcion.fechaIngreso)} al ${formatearFecha(inscripcion.fechaRetiro)}`
    : `Desde el ${formatearFecha(inscripcion.fechaIngreso)}`;
  const cabecera = crearElemento('div', { clase: 'd-flex flex-wrap justify-content-between align-items-start gap-2 mb-2' }, [
    crearElemento('div', {}, [
      crearElemento('h4', { clase: 'h6 mb-1' }, [enlaceCatalogo(inscripcion.clubId, inscripcion.clubNombre)]),
      crearElemento('div', {
        clase: 'small text-body-secondary',
        texto: `${inscripcion.institucionNombre} · Período ${inscripcion.periodoNombre} · ${periodo}`
      })
    ]),
    insignia(ESTADOS_CLUB, inscripcion.estado)
  ]);

  const partes = [cabecera];
  if (!inscripcion.cursos || inscripcion.cursos.length === 0) {
    partes.push(crearElemento('p', { clase: 'small text-body-secondary mb-0', texto: 'Sin cursos en este club.' }));
  } else {
    const filas = inscripcion.cursos.map(curso => crearElemento('tr', {}, [
      crearElemento('td', {}, [
        crearElemento('div', { texto: curso.cursoNombre }),
        crearElemento('div', { clase: 'small text-body-secondary', texto: NIVELES_CURSO[curso.cursoNivel] || curso.cursoNivel })
      ]),
      crearElemento('td', { clase: 'text-nowrap', texto: formatearFecha(curso.fechaIngreso) }),
      crearElemento('td', { clase: 'text-nowrap', texto: formatearFecha(curso.fechaFin) }),
      crearElemento('td', {}, [insignia(ESTADOS_CURSO, curso.estado)]),
      crearElemento('td', {}, [curso.resultado
        ? insignia(RESULTADOS, curso.resultado)
        : crearElemento('span', {
          clase: 'small text-body-secondary',
          texto: curso.estado === 'FINALIZADA' ? 'Pendiente' : '—'
        })])
    ]));
    const tabla = crearElemento('table', { clase: 'table table-sm align-middle mb-0' }, [
      crearElemento('caption', { clase: 'visually-hidden', texto: `Cursos en ${inscripcion.clubNombre}` }),
      crearElemento('thead', {}, [crearElemento('tr', {}, [
        crearElemento('th', { texto: 'Curso', atributos: { scope: 'col' } }),
        crearElemento('th', { texto: 'Ingreso', atributos: { scope: 'col' } }),
        crearElemento('th', { texto: 'Fin', atributos: { scope: 'col' } }),
        crearElemento('th', { texto: 'Estado', atributos: { scope: 'col' } }),
        crearElemento('th', { texto: 'Resultado', atributos: { scope: 'col' } })
      ])]),
      crearElemento('tbody', {}, filas)
    ]);
    partes.push(crearElemento('div', { clase: 'table-responsive' }, [tabla]));
  }
  return crearElemento('article', { clase: 'border rounded p-3 mb-3 tarjeta-historial' }, partes);
}

function renderizarCompetencias(competencias) {
  const cuerpo = elemento('cuerpo-competencias');
  if (competencias.length === 0) {
    cuerpo.replaceChildren(filaMensaje('El estudiante no tiene participaciones en competencias.', 5));
    return;
  }
  const ordenadas = competencias.slice().sort((a, b) => b.edicionAnio - a.edicionAnio);
  cuerpo.replaceChildren(...ordenadas.map(participacion => {
    const resultado = [];
    if (participacion.puesto) {
      resultado.push(crearElemento('span', {
        clase: participacion.puesto <= 3 ? 'badge text-bg-warning me-1' : 'badge text-bg-light border me-1',
        texto: `Puesto ${participacion.puesto}`
      }));
    }
    if (participacion.reconocimiento) {
      resultado.push(crearElemento('span', { clase: 'small', texto: participacion.reconocimiento }));
    }
    if (resultado.length === 0) {
      resultado.push(crearElemento('span', { clase: 'small text-body-secondary', texto: 'Sin resultado registrado' }));
    }
    const enlace = crearElemento('a', {
      clase: 'link-primary',
      texto: participacion.competenciaNombre,
      atributos: { href: `competencias.html?id=${participacion.id}` }
    });
    return crearElemento('tr', {}, [
      crearElemento('td', {}, [
        crearElemento('div', {}, [enlace]),
        crearElemento('div', { clase: 'small text-body-secondary', texto: `${participacion.edicionNombre} · ${participacion.edicionAnio}` })
      ]),
      crearElemento('td', {}, [
        crearElemento('div', { texto: participacion.categoriaNombre }),
        crearElemento('div', { clase: 'small text-body-secondary', texto: NIVELES_CATEGORIA[participacion.categoriaNivel] || '' })
      ]),
      crearElemento('td', { texto: participacion.clubNombre || '—' }),
      crearElemento('td', { texto: participacion.equipoNombre || 'Individual' }),
      crearElemento('td', {}, resultado)
    ]);
  }));
}

function renderizarCertificados(certificados) {
  const cuerpo = elemento('cuerpo-certificados');
  if (certificados.length === 0) {
    cuerpo.replaceChildren(filaMensaje('El estudiante no tiene certificados emitidos.', 6));
    return;
  }
  const ordenados = certificados.slice().sort((a, b) => (b.fechaEmision || '').localeCompare(a.fechaEmision || ''));
  cuerpo.replaceChildren(...ordenados.map(certificado => {
    const ver = crearElemento('a', {
      clase: 'btn btn-sm btn-outline-secondary ms-1',
      atributos: {
        href: `certificados.html?id=${certificado.id}`,
        title: 'Ver detalle',
        'aria-label': `Ver detalle del certificado ${certificado.codigoVerificacion}`
      }
    }, [crearElemento('i', { clase: 'bi bi-eye', atributos: { 'aria-hidden': 'true' } })]);
    const verificar = crearElemento('a', {
      clase: 'btn btn-sm btn-outline-secondary ms-1',
      atributos: {
        href: `verificar-certificado.html?codigo=${encodeURIComponent(certificado.codigoVerificacion)}`,
        target: '_blank',
        rel: 'noopener',
        title: 'Verificación pública',
        'aria-label': `Abrir la verificación pública del certificado ${certificado.codigoVerificacion}`
      }
    }, [crearElemento('i', { clase: 'bi bi-patch-check', atributos: { 'aria-hidden': 'true' } })]);
    return crearElemento('tr', {}, [
      crearElemento('td', { clase: 'font-monospace small text-nowrap', texto: certificado.codigoVerificacion }),
      crearElemento('td', {}, [
        crearElemento('div', { texto: certificado.titulo }),
        crearElemento('div', { clase: 'small text-body-secondary', texto: TIPOS_CERTIFICADO[certificado.tipo] || certificado.tipo })
      ]),
      crearElemento('td', { texto: certificado.clubNombre || '—' }),
      crearElemento('td', { clase: 'text-nowrap', texto: formatearFecha(certificado.fechaEmision) }),
      crearElemento('td', {}, [insignia(ESTADOS_CERTIFICADO, certificado.estado)]),
      crearElemento('td', { clase: 'text-end text-nowrap no-imprimir' }, [ver, verificar])
    ]);
  }));
}
