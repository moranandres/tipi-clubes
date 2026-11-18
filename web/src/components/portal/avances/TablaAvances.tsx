import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import type { Avance } from "@/lib/api/avances";
import { rutaDeAvance } from "@/lib/portal/filtros-avances";
import { fechaCorta } from "@/lib/portal/tiempo";
import { AlcanceDeAvance, sujetoDe } from "./PiezasDeAvance";

type Props = {
  avances: Avance[];
  minima: boolean;
  mostrarInstitucion: boolean;
};

const CELDA = "px-5 py-3.5 align-top";
const ENCABEZADO = "px-5 py-3 text-left text-sm font-medium text-tenue";

function grupoDe(avance: Avance, mostrarInstitucion: boolean): string {
  return [avance.clubNombre, mostrarInstitucion ? avance.institucionNombre : null].filter(Boolean).join(" · ");
}

function Resumen({ avance }: { avance: Avance }) {
  if (avance.estado === "ANULADO") {
    return <span className="text-error">Anulado</span>;
  }
  if (avance.contenidoReservado) {
    return <span className="text-tenue">Contenido reservado</span>;
  }
  return <span className="line-clamp-2 break-words text-tenue">{avance.resultados}</span>;
}

function Enlace({ avance, sujeto }: { avance: Avance; sujeto: string }) {
  return (
    <EnlaceBoton href={rutaDeAvance(avance.id ?? 0)} variante="elevado" tamano="compacto" className="whitespace-nowrap">
      Ver avance
      <span className="sr-only">
        {" "}
        de {sujeto} del {fechaCorta(avance.fecha)}
      </span>
    </EnlaceBoton>
  );
}

export function TablaAvances({ avances, minima, mostrarInstitucion }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-pieza bg-superficie xl:block">
        <table className="w-full border-collapse text-[0.9375rem]">
          <caption className="sr-only">Lista de avances</caption>
          <thead>
            <tr className="border-b border-linea">
              <th scope="col" className={`${ENCABEZADO} w-[8rem]`}>
                Fecha
              </th>
              <th scope="col" className={`${ENCABEZADO} w-[26%]`}>
                Sujeto
              </th>
              <th scope="col" className={ENCABEZADO}>
                Resultados
              </th>
              <th scope="col" className={`${ENCABEZADO} text-right`}>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {avances.map((avance) => {
              const sujeto = sujetoDe(avance, minima);
              return (
                <tr key={avance.id} className="border-b border-linea last:border-b-0">
                  <td className={`${CELDA} cifras whitespace-nowrap`}>{fechaCorta(avance.fecha)}</td>
                  <th scope="row" className={`${CELDA} text-left font-medium`}>
                    <span className="block break-words">{sujeto}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm font-normal text-tenue">
                      <AlcanceDeAvance alcance={avance.alcance} />
                      <span className="break-words">{grupoDe(avance, mostrarInstitucion)}</span>
                      {typeof avance.porcentajeAvance === "number" ? (
                        <span className="cifras">{avance.porcentajeAvance}%</span>
                      ) : null}
                    </span>
                  </th>
                  <td className={CELDA}>
                    <Resumen avance={avance} />
                  </td>
                  <td className="px-5 py-2.5 text-right align-top">
                    <Enlace avance={avance} sujeto={sujeto} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 xl:hidden">
        {avances.map((avance) => {
          const sujeto = sujetoDe(avance, minima);
          return (
            <li key={avance.id} className="rounded-pieza bg-superficie p-4">
              <div className="flex items-start justify-between gap-4">
                <p className="min-w-0 break-words font-medium">{sujeto}</p>
                <span className="cifras shrink-0 text-sm text-tenue">{fechaCorta(avance.fecha)}</span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-tenue">
                <AlcanceDeAvance alcance={avance.alcance} />
                <span className="break-words">{grupoDe(avance, mostrarInstitucion)}</span>
                {typeof avance.porcentajeAvance === "number" ? <span className="cifras">{avance.porcentajeAvance}%</span> : null}
              </p>
              <p className="mt-2 text-[0.9375rem]">
                <Resumen avance={avance} />
              </p>
              <div className="mt-4">
                <Enlace avance={avance} sujeto={sujeto} />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
