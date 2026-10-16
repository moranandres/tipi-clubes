import { crearElemento } from './ui.js';

export function renderizarPaginacion(contenedor, { pagina, totalPaginas }, alCambiar) {
  contenedor.replaceChildren();
  if (totalPaginas <= 1) {
    return;
  }

  const lista = crearElemento('ul', { clase: 'pagination pagination-sm mb-0' });

  const agregar = (etiqueta, destino, { activo = false, deshabilitado = false, accesible = null } = {}) => {
    const claseItem = `page-item${activo ? ' active' : ''}${deshabilitado ? ' disabled' : ''}`;
    const item = crearElemento('li', { clase: claseItem });
    const boton = crearElemento('button', {
      clase: 'page-link',
      texto: etiqueta,
      atributos: { type: 'button' }
    });
    if (accesible) {
      boton.setAttribute('aria-label', accesible);
    }
    if (activo) {
      boton.setAttribute('aria-current', 'page');
    }
    if (deshabilitado) {
      boton.disabled = true;
    } else {
      boton.addEventListener('click', () => alCambiar(destino));
    }
    item.appendChild(boton);
    lista.appendChild(item);
  };

  agregar('«', pagina - 1, { deshabilitado: pagina === 0, accesible: 'Página anterior' });

  const inicio = Math.max(0, Math.min(pagina - 2, totalPaginas - 5));
  const fin = Math.min(totalPaginas, inicio + 5);
  for (let indice = inicio; indice < fin; indice++) {
    agregar(String(indice + 1), indice, { activo: indice === pagina, accesible: `Página ${indice + 1}` });
  }

  agregar('»', pagina + 1, { deshabilitado: pagina >= totalPaginas - 1, accesible: 'Página siguiente' });
  contenedor.appendChild(lista);
}