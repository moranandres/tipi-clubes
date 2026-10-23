import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = dirname(fileURLToPath(import.meta.url));
const modulos = join(raiz, 'node_modules');
const destino = join(raiz, '..', '..', 'frontend', 'vendor');

const archivos = [
  ['bootstrap/dist/css/bootstrap.min.css', 'bootstrap/css/bootstrap.min.css'],
  ['bootstrap/dist/css/bootstrap.min.css.map', 'bootstrap/css/bootstrap.min.css.map'],
  ['bootstrap/dist/js/bootstrap.bundle.min.js', 'bootstrap/js/bootstrap.bundle.min.js'],
  ['bootstrap/dist/js/bootstrap.bundle.min.js.map', 'bootstrap/js/bootstrap.bundle.min.js.map'],
  ['bootstrap/LICENSE', 'bootstrap/LICENSE'],
  ['bootstrap-icons/font/bootstrap-icons.min.css', 'bootstrap-icons/font/bootstrap-icons.min.css'],
  ['bootstrap-icons/font/fonts/bootstrap-icons.woff2', 'bootstrap-icons/font/fonts/bootstrap-icons.woff2'],
  ['bootstrap-icons/font/fonts/bootstrap-icons.woff', 'bootstrap-icons/font/fonts/bootstrap-icons.woff'],
  ['bootstrap-icons/LICENSE', 'bootstrap-icons/LICENSE']
];

const faltantes = archivos
  .map(([origen]) => origen)
  .filter(origen => !existsSync(join(modulos, origen)));

if (faltantes.length > 0) {
  console.error('No se encontraron estos archivos. Ejecute primero "npm ci" o "npm install":');
  faltantes.forEach(origen => console.error(`  - ${origen}`));
  process.exit(1);
}

rmSync(destino, { recursive: true, force: true });

for (const [origen, salida] of archivos) {
  const rutaDestino = join(destino, salida);
  mkdirSync(dirname(rutaDestino), { recursive: true });
  cpSync(join(modulos, origen), rutaDestino);
}

const versiones = ['bootstrap', 'bootstrap-icons'].map(nombre => {
  const paquete = JSON.parse(readFileSync(join(modulos, nombre, 'package.json'), 'utf8'));
  return `${paquete.name} ${paquete.version} (licencia ${paquete.license})`;
});
writeFileSync(join(destino, 'VERSIONES.txt'), `${versiones.join('\n')}\n`);

console.log(`Recursos copiados en ${destino}`);