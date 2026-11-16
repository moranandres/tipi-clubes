const FILAS_DE_ESPERA = [0, 1, 2, 3, 4, 5];

export function EsqueletoLista({ mensaje }: { mensaje: string }) {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        {mensaje}
      </p>
      <div aria-hidden="true" className="motion-safe:animate-pulse">
        <div className="flex h-6 items-center">
          <div className="h-3.5 w-56 max-w-full rounded-full bg-superficie" />
        </div>
        <div className="mt-4 hidden rounded-pieza bg-superficie md:block">
          <div className="h-[2.8125rem] border-b border-linea" />
          {FILAS_DE_ESPERA.map((fila) => (
            <div
              key={fila}
              className="flex h-[4.5rem] items-center gap-8 border-b border-linea px-5 last:border-b-0"
            >
              <div className="h-4 w-48 rounded-full bg-superficie-alta" />
              <div className="h-4 w-40 rounded-full bg-superficie-alta" />
              <div className="h-4 w-32 rounded-full bg-superficie-alta" />
              <div className="ml-auto h-4 w-20 rounded-full bg-superficie-alta" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 md:hidden">
          {FILAS_DE_ESPERA.slice(0, 3).map((fila) => (
            <div key={fila} className="h-40 rounded-pieza bg-superficie" />
          ))}
        </div>
      </div>
    </div>
  );
}
