import { crearElemento } from './ui.js';

let elementoModal = null;
let instancia = null;

function asegurarModal() {
  if (elementoModal) {
    return;
  }
  const titulo = crearElemento('h2', {
    clase: 'modal-title h5',
    texto: 'Confirmar acción',
    atributos: { id: 'titulo-confirmacion' }
  });
  const cerrar = crearElemento('button', {
    clase: 'btn-close',
    atributos: { type: 'button', 'data-bs-dismiss': 'modal', 'aria-label': 'Cerrar' }
  });
  const cabecera = crearElemento('div', { clase: 'modal-header' }, [titulo, cerrar]);

  const mensaje = crearElemento('p', { clase: 'mb-0', atributos: { id: 'mensaje-confirmacion' } });
  const cuerpo = crearElemento('div', { clase: 'modal-body' }, [mensaje]);

  const cancelar = crearElemento('button', {
    clase: 'btn btn-outline-secondary',
    texto: 'Cancelar',
    atributos: { type: 'button', 'data-bs-dismiss': 'modal' }
  });
  const aceptar = crearElemento('button', {
    clase: 'btn btn-primary',
    texto: 'Confirmar',
    atributos: { type: 'button', id: 'boton-aceptar-confirmacion' }
  });
  const pie = crearElemento('div', { clase: 'modal-footer' }, [cancelar, aceptar]);

  const contenido = crearElemento('div', { clase: 'modal-content' }, [cabecera, cuerpo, pie]);
  const dialogo = crearElemento('div', { clase: 'modal-dialog' }, [contenido]);
  elementoModal = crearElemento('div', {
    clase: 'modal fade',
    atributos: {
      id: 'modal-confirmacion',
      tabindex: '-1',
      'aria-labelledby': 'titulo-confirmacion',
      'aria-hidden': 'true'
    }
  }, [dialogo]);

  document.body.appendChild(elementoModal);
  instancia = bootstrap.Modal.getOrCreateInstance(elementoModal);
}

export function confirmar({ titulo = 'Confirmar acción', mensaje, textoAceptar = 'Confirmar' }) {
  asegurarModal();
  elementoModal.querySelector('#titulo-confirmacion').textContent = titulo;
  elementoModal.querySelector('#mensaje-confirmacion').textContent = mensaje;
  const botonAceptar = elementoModal.querySelector('#boton-aceptar-confirmacion');
  botonAceptar.textContent = textoAceptar;

  return new Promise(resolver => {
    let aceptado = false;

    const alAceptar = () => {
      aceptado = true;
      instancia.hide();
    };

    const alOcultar = () => {
      botonAceptar.removeEventListener('click', alAceptar);
      elementoModal.removeEventListener('hidden.bs.modal', alOcultar);
      resolver(aceptado);
    };

    botonAceptar.addEventListener('click', alAceptar);
    elementoModal.addEventListener('hidden.bs.modal', alOcultar);
    instancia.show();
  });
}