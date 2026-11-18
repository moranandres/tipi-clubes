import type { ReactNode } from "react";

export type ColumnaDeIndicadores<T> = {
  titulo: string;
  celda: (fila: T) => ReactNode;
  alineada?: boolean;
};

type Props<T> = {
  titulo: string;
  filas: T[];
  clave: (fila: T) => string | number;
  encabezado: (fila: T) => ReactNode;
  tituloDeEncabezado: string;
  columnas: ColumnaDeIndicadores<T>[];
};

const CELDA = "px-4 py-3 align-top";
const ENCABEZADO = "px-4 py-3 text-left text-sm font-medium text-tenue";

export function TablaDeIndicadores<T>({ titulo, filas, clave, encabezado, tituloDeEncabezado, columnas }: Props<T>) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-pieza bg-superficie lg:block">
        <table className="w-full border-collapse text-[0.9375rem]">
          <caption className="sr-only">{titulo}</caption>
          <thead>
            <tr className="border-b border-linea">
              <th scope="col" className={ENCABEZADO}>
                {tituloDeEncabezado}
              </th>
              {columnas.map((columna) => (
                <th key={columna.titulo} scope="col" className={`${ENCABEZADO} ${columna.alineada ? "text-right" : ""}`}>
                  {columna.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={clave(fila)} className="border-b border-linea last:border-b-0">
                <th scope="row" className={`${CELDA} text-left font-medium`}>
                  {encabezado(fila)}
                </th>
                {columnas.map((columna) => (
                  <td key={columna.titulo} className={`${CELDA} ${columna.alineada ? "cifras text-right" : ""}`}>
                    {columna.celda(fila)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-3 lg:hidden">
        {filas.map((fila) => (
          <li key={clave(fila)} className="rounded-pieza bg-superficie p-4">
            <div className="font-medium">{encabezado(fila)}</div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9375rem]">
              {columnas.map((columna) => (
                <div key={columna.titulo} className="contents">
                  <dt className="text-tenue">{columna.titulo}</dt>
                  <dd className={`min-w-0 break-words ${columna.alineada ? "cifras" : ""}`}>{columna.celda(fila)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
