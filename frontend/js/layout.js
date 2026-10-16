import { ETIQUETAS_ROL } from './config.js';
import { cerrarSesion } from './auth.js';
import { OPCIONES_MENU } from './menu.js';

export function montarLayout(sesion, opcionActiva) {
  montarBarra(sesion.usuario);
  montarMenu(sesion.usuario, opcionActiva);
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
        </ul>
      </div>
    </div>`;
  document.getElementById('nombre-usuario').textContent = `${usuario.nombres} ${usuario.apellidos}`;
  document.getElementById('rol-usuario').textContent = ETIQUETAS_ROL[usuario.rol] || usuario.rol;
  document.getElementById('boton-cerrar-sesion').addEventListener('click', cerrarSesion);
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
      <div class="offcanvas-body p-2 p-lg-3">
        <ul class="nav nav-pills flex-column gap-1" id="lista-menu"></ul>
      </div>
    </div>`;

  const lista = document.getElementById('lista-menu');
  OPCIONES_MENU
    .filter(opcion => opcion.roles.includes(usuario.rol))
    .forEach(opcion => lista.appendChild(crearElementoMenu(opcion, opcionActiva)));
}

function crearElementoMenu(opcion, opcionActiva) {
  const item = document.createElement('li');
  item.className = 'nav-item';

  const icono = document.createElement('i');
  icono.className = `bi ${opcion.icono} me-2`;
  icono.setAttribute('aria-hidden', 'true');

  if (opcion.disponible) {
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

  const deshabilitado = document.createElement('span');
  deshabilitado.className = 'nav-link disabled d-flex justify-content-between align-items-center';
  deshabilitado.setAttribute('aria-disabled', 'true');

  const etiqueta = document.createElement('span');
  etiqueta.append(icono, document.createTextNode(opcion.etiqueta));

  const insignia = document.createElement('span');
  insignia.className = 'badge text-bg-secondary';
  insignia.textContent = 'Pronto';

  deshabilitado.append(etiqueta, insignia);
  item.appendChild(deshabilitado);
  return item;
}