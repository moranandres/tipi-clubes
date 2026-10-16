import { apiFetch } from './api.js';
import { ETIQUETAS_ROL } from './config.js';
import { exigirSesion } from './guard.js';
import { montarLayout } from './layout.js';

const sesion = exigirSesion();

if (sesion) {
  montarLayout(sesion, 'dashboard');
  mostrarEncabezado(sesion.usuario);
  cargarIndicadores(sesion.usuario.rol);
}

async function mostrarEncabezado(usuario) {
  document.getElementById('saludo').textContent = `Bienvenido(a), ${usuario.nombres}`;
  const rol = ETIQUETAS_ROL[usuario.rol] || usuario.rol;
  const resumen = document.getElementById('resumen-usuario');
  resumen.textContent = rol;

  if (usuario.institucionId !== null && usuario.institucionId !== undefined) {
    try {
      const institucion = await apiFetch(`/api/instituciones/${usuario.institucionId}`);
      resumen.textContent = `${rol} · ${institucion.nombre}`;
    } catch (error) {
      resumen.textContent = rol;
    }
  }
}

function definirIndicadores(rol) {
  const total = pagina => String(pagina.totalElementos);
  const lista = [
    { titulo: 'Instituciones', icono: 'bi-bank', ruta: '/api/instituciones?tamano=1', extraer: total },
    { titulo: 'Clubes', icono: 'bi-robot', ruta: '/api/clubes?tamano=1', extraer: total },
    { titulo: 'Clubes activos', icono: 'bi-lightning-charge', ruta: '/api/clubes?estado=ACTIVO&tamano=1', extraer: total },
    { titulo: 'Docentes activos', icono: 'bi-person-workspace', ruta: '/api/docentes?activo=true&tamano=1', extraer: total },
    {
      titulo: 'Período activo',
      icono: 'bi-calendar3',
      ruta: '/api/periodos',
      texto: true,
      extraer: periodos => {
        const activo = periodos.find(periodo => periodo.activo);
        return activo ? activo.nombre : 'Sin período activo';
      }
    }
  ];
  if (rol === 'ADMIN') {
    lista.push({ titulo: 'Usuarios activos', icono: 'bi-people', ruta: '/api/usuarios?activo=true&tamano=1', extraer: total });
  }
  return lista;
}

function crearTarjeta(indicador) {
  const columna = document.createElement('div');
  columna.className = 'col-12 col-sm-6 col-xl-4';

  const tarjeta = document.createElement('div');
  tarjeta.className = 'card h-100 shadow-sm';

  const cuerpo = document.createElement('div');
  cuerpo.className = 'card-body d-flex align-items-center gap-3';

  const marca = document.createElement('i');
  marca.className = `bi ${indicador.icono} fs-1 text-primary`;
  marca.setAttribute('aria-hidden', 'true');

  const contenido = document.createElement('div');

  const etiqueta = document.createElement('div');
  etiqueta.className = 'text-body-secondary small';
  etiqueta.textContent = indicador.titulo;

  const valor = document.createElement('div');
  valor.className = indicador.texto ? 'indicador-texto' : 'indicador-valor';
  valor.textContent = '…';

  contenido.append(etiqueta, valor);
  cuerpo.append(marca, contenido);
  tarjeta.appendChild(cuerpo);
  columna.appendChild(tarjeta);
  return { columna, valor };
}

async function cargarIndicadores(rol) {
  const contenedor = document.getElementById('indicadores');
  const indicadores = definirIndicadores(rol);

  const valores = indicadores.map(indicador => {
    const { columna, valor } = crearTarjeta(indicador);
    contenedor.appendChild(columna);
    return valor;
  });

  const resultados = await Promise.allSettled(indicadores.map(indicador => apiFetch(indicador.ruta)));

  resultados.forEach((resultado, indice) => {
    const valor = valores[indice];
    if (resultado.status === 'fulfilled') {
      valor.textContent = indicadores[indice].extraer(resultado.value);
    } else {
      valor.textContent = '—';
      valor.title = resultado.reason && resultado.reason.message
        ? resultado.reason.message
        : 'No disponible';
    }
  });
}