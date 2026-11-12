import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = dirname(fileURLToPath(import.meta.url));
const origen = process.env.API_DOCS_URL ?? 'http://localhost:8080/v3/api-docs';
const destino = join(raiz, 'openapi.json');

function ordenar(valor) {
  if (Array.isArray(valor)) {
    return valor.map(ordenar);
  }
  if (valor !== null && typeof valor === 'object') {
    return Object.fromEntries(
      Object.keys(valor)
        .sort()
        .map(clave => [clave, ordenar(valor[clave])])
    );
  }
  return valor;
}

let respuesta;
try {
  respuesta = await fetch(origen, { headers: { Accept: 'application/json' } });
} catch (error) {
  console.error(`No se pudo conectar con ${origen}. Verifique que el backend esté en ejecución.`);
  process.exit(1);
}

if (!respuesta.ok) {
  console.error(`${origen} respondió ${respuesta.status}. Verifique que OPENAPI_ENABLED no esté en false.`);
  process.exit(1);
}

const documento = await respuesta.json();
delete documento.servers;
if (Array.isArray(documento.tags)) {
  documento.tags.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

const operaciones = Object.values(documento.paths ?? {})
  .reduce((total, ruta) => total + Object.keys(ruta).length, 0);

writeFileSync(destino, `${JSON.stringify(ordenar(documento), null, 2)}\n`);

console.log(`Documento OpenAPI ${documento.openapi} guardado en ${destino}`);
console.log(`${Object.keys(documento.paths ?? {}).length} rutas, ${operaciones} operaciones`);
