import type { ReactNode } from "react";

export type Dato = {
  termino: string;
  valor: ReactNode;
  ancho?: boolean;
};

type Props = {
  datos: (Dato | null)[];
  columnas?: string;
};

export function ListaDeDatos({ datos, columnas = "sm:grid-cols-2" }: Props) {
  const presentes = datos.filter(
    (dato): dato is Dato => dato !== null && dato.valor !== null && dato.valor !== undefined && dato.valor !== "",
  );

  return (
    <dl className={`grid gap-x-8 gap-y-4 ${columnas}`}>
      {presentes.map((dato) => (
        <div key={dato.termino} className={`min-w-0 ${dato.ancho ? "col-span-full" : ""}`}>
          <dt className="text-sm text-tenue">{dato.termino}</dt>
          <dd className="mt-1 whitespace-pre-line break-words">{dato.valor}</dd>
        </div>
      ))}
    </dl>
  );
}
