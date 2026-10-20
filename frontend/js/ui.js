export function crearElemento(etiqueta, opciones = {}, hijos = []) {
  const elemento = document.createElement(etiqueta);
  if (opciones.clase) {
    elemento.className = opciones.clase;
  }
  if (opciones.texto !== undefined) {
    elemento.textContent = opciones.texto;
  }
  if (opciones.atributos) {
    Object.entries(opciones.atributos).forEach(([nombre, valor]) => {
      elemento.setAttribute(nombre, valor);
    });
  }
  hijos.forEach(hijo => elemento.appendChild(hijo));
  return elemento;
}

export function formatearFecha(texto) {
  if (!texto) {
    return '—';
  }
  const [anio, mes, dia] = texto.split('-');
  return `${dia}/${mes}/${anio}`;
}

export function formatearFechaHora(texto) {
  if (!texto) {
    return '—';
  }
  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) {
    return texto;
  }
  return fecha.toLocaleString('es-EC', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Guayaquil'
  });
}

export function mostrarAlerta(contenedor, tipo, mensaje, detalles = []) {
  contenedor.replaceChildren();
  const alerta = document.createElement('div');
  alerta.className = `alert alert-${tipo} mb-3`;
  alerta.setAttribute('role', tipo === 'danger' ? 'alert' : 'status');

  const texto = document.createElement('div');
  texto.textContent = mensaje;
  alerta.appendChild(texto);

  if (detalles.length > 0) {
    const lista = document.createElement('ul');
    lista.className = 'mb-0 mt-2';
    detalles.forEach(detalle => {
      const elemento = document.createElement('li');
      elemento.textContent = detalle;
      lista.appendChild(elemento);
    });
    alerta.appendChild(lista);
  }
  contenedor.appendChild(alerta);
}

export function mostrarAlertaConEnlace(contenedor, tipo, mensaje, textoEnlace, href) {
  contenedor.replaceChildren();
  const alerta = document.createElement('div');
  alerta.className = `alert alert-${tipo} mb-3`;
  alerta.setAttribute('role', 'status');
  alerta.appendChild(document.createTextNode(`${mensaje} `));

  const enlace = document.createElement('a');
  enlace.className = 'alert-link';
  enlace.href = href;
  enlace.textContent = textoEnlace;
  alerta.appendChild(enlace);

  contenedor.appendChild(alerta);
}

export function limpiarAlerta(contenedor) {
  contenedor.replaceChildren();
}

export function mensajesDeError(error) {
  if (error && error.errores) {
    return Object.values(error.errores);
  }
  return [];
}

export function establecerCargando(boton, cargando, textoCargando = 'Procesando...') {
  if (cargando) {
    boton.dataset.textoOriginal = boton.textContent;
    boton.textContent = textoCargando;
    boton.disabled = true;
  } else {
    boton.textContent = boton.dataset.textoOriginal || boton.textContent;
    boton.disabled = false;
  }
}