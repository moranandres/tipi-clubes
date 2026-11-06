import { ETIQUETAS_ROL } from './config.js';
import { cerrarSesion, limpiarSesion, obtenerSesion } from './auth.js';
import { confirmar } from './confirmacion.js';
import { SECCIONES_MENU } from './menu.js';

const MARGEN_AVISO_MS = 60000;

export function montarLayout(sesion, opcionActiva) {
  montarBarra(sesion.usuario);
  montarMenu(sesion.usuario, opcionActiva);
  vigilarVencimiento(sesion);
}

function montarBarra(usuario) {
  const barra = document.getElementById('barra-superior');
  barra.className = 'navbar navbar-dark bg-primary sticky-top shadow-sm';
  barra.innerHTML = `
    <div class="container-fluid">
      <button class="navbar-toggler d-lg-none me-2" type="button" data-bs-toggle="offcanvas"
              data-bs-target="#panel-menu" aria-controls="panel-menu" aria-label="Abrir menú">
        <span class="navbar-toggler-icon"></span>
      </button>
      <a class="navbar-brand me-auto" href="dashboard.html">
        <i class="bi bi-robot me-2" aria-hidden="true"></i>TIPI 3.0
      </a>
      <div class="dropdown">
        <button class="btn btn-outline-light btn-sm dropdown-toggle" type="button" id="boton-usuario"
                data-bs-toggle="dropdown" aria-expanded="false">
          <i class="bi bi-person-circle me-1" aria-hidden="true"></i><span id="nombre-usuario"></span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="boton-usuario">
          <li><h6 class="dropdown-header" id="rol-usuario"></h6></li>
          <li><a class="dropdown-item" href="cambiar-password.html">Cambiar contraseña</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><button class="dropdown-item" type="button" id="boton-cerrar-sesion">Cerrar sesión</button></li>
          <li>
            <button class="dropdown-item" type="button" id="boton-cerrar-todas">
              Cerrar sesión en todos los dispositivos
            </button>
          </li>
        </ul>
      </div>
    </div>`;
  document.getElementById('nombre-usuario').textContent = `${usuario.nombres} ${usuario.apellidos}`;
  document.getElementById('rol-usuario').textContent = ETIQUETAS_ROL[usuario.rol] || usuario.rol;
  document.getElementById('boton-cerrar-sesion').addEventListener('click', () => cerrarSesion());
  document.getElementById('boton-cerrar-todas').addEventListener('click', cerrarTodas);
}

async function cerrarTodas() {
  const aceptado = await confirmar({
    titulo: 'Cerrar todas las sesiones',
    mensaje: 'Se cerrarán sus sesiones abiertas en todos los navegadores y dispositivos, incluida esta. Deberá iniciar sesión nuevamente.',
    textoAceptar: 'Cerrar todas'
  });
  if (aceptado) {
    await cerrarSesion({ todas: true });
  }
}

function montarMenu(usuario, opcionActiva) {
  const contenedor = document.getElementById('menu-lateral');
  contenedor.innerHTML = `
    <div class="offcanvas-lg offcanvas-start" tabindex="-1" id="panel-menu" aria-labelledby="titulo-menu">
      <div class="offcanvas-header">
        <h2 class="offcanvas-title h5" id="titulo-menu">Menú</h2>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas"
                data-bs-target="#panel-menu" aria-label="Cerrar menú"></button>
      </div>
      <div class="offcanvas-body flex-column p-2 p-lg-3" id="cuerpo-menu"></div>
    </div>`;

  const cuerpo = document.getElementById('cuerpo-menu');
  SECCIONES_MENU.forEach((seccion, indice) => {
    const visibles = seccion.opciones.filter(opcion => opcion.roles.includes(usuario.rol));
    if (visibles.length === 0) {
      return;
    }
    const idTitulo = `seccion-menu-${indice}`;
    const titulo = document.createElement('h3');
    titulo.className = 'titulo-seccion-menu';
    titulo.id = idTitulo;
    titulo.textContent = seccion.titulo;

    const lista = document.createElement('ul');
    lista.className = 'nav nav-pills flex-column gap-1 mb-3';
    lista.setAttribute('aria-labelledby', idTitulo);
    visibles.forEach(opcion => lista.appendChild(crearElementoMenu(opcion, opcionActiva)));

    cuerpo.append(titulo, lista);
  });

  const verificar = document.createElement('a');
  verificar.className = 'small link-secondary d-inline-block px-3 mt-auto';
  verificar.href = 'verificar-certificado.html';
  verificar.target = '_blank';
  verificar.rel = 'noopener';
  const icono = document.createElement('i');
  icono.className = 'bi bi-patch-check me-1';
  icono.setAttribute('aria-hidden', 'true');
  verificar.append(icono, document.createTextNode('Verificar un certificado'));
  cuerpo.appendChild(verificar);
}

function crearElementoMenu(opcion, opcionActiva) {
  const item = document.createElement('li');
  item.className = 'nav-item';

  const icono = document.createElement('i');
  icono.className = `bi ${opcion.icono} me-2`;
  icono.setAttribute('aria-hidden', 'true');

  const enlace = document.createElement('a');
  enlace.className = opcion.id === opcionActiva ? 'nav-link active' : 'nav-link';
  enlace.href = opcion.href;
  if (opcion.id === opcionActiva) {
    enlace.setAttribute('aria-current', 'page');
  }
  enlace.append(icono, document.createTextNode(opcion.etiqueta));
  item.appendChild(enlace);
  return item;
}

function vigilarVencimiento(sesion) {
  const restante = sesion.expiraEn - Date.now();
  if (restante <= 0) {
    finalizarPorVencimiento();
    return;
  }
  if (restante > MARGEN_AVISO_MS) {
    setTimeout(mostrarAvisoVencimiento, restante - MARGEN_AVISO_MS);
  } else {
    mostrarAvisoVencimiento();
  }
  setTimeout(finalizarPorVencimiento, restante);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !obtenerSesion()) {
      finalizarPorVencimiento();
    }
  });
}

function finalizarPorVencimiento() {
  limpiarSesion();
  window.location.replace('login.html?motivo=expirada');
}

function mostrarAvisoVencimiento() {
  if (document.getElementById('aviso-vencimiento')) {
    return;
  }
  const aviso = document.createElement('div');
  aviso.id = 'aviso-vencimiento';
  aviso.className = 'alert alert-warning alert-dismissible shadow aviso-sesion';
  aviso.setAttribute('role', 'alert');
  aviso.appendChild(document.createTextNode(
    'Su sesión vencerá en menos de un minuto. Guarde sus cambios; después deberá iniciar sesión nuevamente.'
  ));

  const cerrar = document.createElement('button');
  cerrar.type = 'button';
  cerrar.className = 'btn-close';
  cerrar.setAttribute('data-bs-dismiss', 'alert');
  cerrar.setAttribute('aria-label', 'Cerrar aviso');
  aviso.appendChild(cerrar);

  document.body.appendChild(aviso);
}