export const REGLA_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,128}$/;

const MAYUSCULAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MINUSCULAS = 'abcdefghijkmnopqrstuvwxyz';
const NUMEROS = '23456789';
const TODOS = MAYUSCULAS + MINUSCULAS + NUMEROS;

function numeroAleatorio(maximo) {
  const valores = new Uint32Array(1);
  const limite = Math.floor(0x100000000 / maximo) * maximo;
  let valor;
  do {
    crypto.getRandomValues(valores);
    valor = valores[0];
  } while (valor >= limite);
  return valor % maximo;
}

function elegir(conjunto) {
  return conjunto[numeroAleatorio(conjunto.length)];
}

export function generarPasswordTemporal(longitud = 12) {
  const caracteres = [elegir(MAYUSCULAS), elegir(MINUSCULAS), elegir(NUMEROS)];
  while (caracteres.length < longitud) {
    caracteres.push(elegir(TODOS));
  }
  for (let indice = caracteres.length - 1; indice > 0; indice--) {
    const otro = numeroAleatorio(indice + 1);
    [caracteres[indice], caracteres[otro]] = [caracteres[otro], caracteres[indice]];
  }
  return caracteres.join('');
}