import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import type { Proyecto } from "@/lib/api/proyectos";
import { NOMBRES_DE_TIPO_DE_PROYECTO, rutaDeProyecto } from "@/lib/portal/filtros-proyectos";
import { fechaCorta } from "@/lib/portal/tiempo";
import { BarraDeAvance, EstadoDeProyecto } from "./PiezasDeProyecto";

type Props = {
  proyectos: Proyecto[];
  mostrarInstitucion: boolean;
};

const CELDA = "px-5 py-3.5 align-top";
const ENCABEZADO = "px-5 py-3 text-left text-sm font-medium text-tenue";

function grupoDe(proyecto: Proyecto, mostrarInstitucion: boolean): string {
  return [proyecto.clubNombre, mostrarInstitucion ? proyecto.institucionNombre : null].filter(Boolean).join(" · ");
}

function integrantesDe(proyecto: Proyecto): string {
  const cantidad = proyecto.integrantes?.length ?? 0;
  return cantidad === 1 ? "1 integrante" : `${cantidad} integrantes`;
}

function Enlace({ proyecto }: { proyecto: Proyecto }) {
  return (
    <EnlaceBoton
      href={rutaDeProyecto(proyecto.id ?? 0)}
      variante="elevado"
      tamano="compacto"
      className="whitespace-nowrap"
    >
      Ver proyecto
      <span className="sr-only"> {proyecto.titulo}</span>
    </EnlaceBoton>
  );
}

function Tipo({ proyecto }: { proyecto: Proyecto }) {
  return <>{proyecto.tipo ? NOMBRES_DE_TIPO_DE_PROYECTO[proyecto.tipo] : "Proyecto"}</>;
}

export function TablaProyectos({ proyectos, mostrarInstitucion }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-pieza bg-superficie xl:block">
        <table className="w-full border-collapse text-[0.9375rem]">
          <caption className="sr-only">Lista de proyectos de estudiantes</caption>
          <thead>
            <tr className="border-b border-linea">
              <th scope="col" className={ENCABEZADO}>
                Proyecto
              </th>
              <th scope="col" className={`${ENCABEZADO} w-[17%]`}>
                Tutor
              </th>
              <th scope="col" className={`${ENCABEZADO} w-[15%]`}>
                Avance
              </th>
              <th scope="col" className={`${ENCABEZADO} w-[9rem]`}>
                Estado
              </th>
              <th scope="col" className={`${ENCABEZADO} text-right`}>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {proyectos.map((proyecto) => (
              <tr key={proyecto.id} className="border-b border-linea last:border-b-0">
                <th scope="row" className={`${CELDA} text-left font-medium`}>
                  <span className="block break-words">{proyecto.titulo}</span>
                  <span className="mt-0.5 block break-words text-sm font-normal text-tenue">
                    <Tipo proyecto={proyecto} /> · {grupoDe(proyecto, mostrarInstitucion)} · {integrantesDe(proyecto)}
                  </span>
                </th>
                <td className={`${CELDA} break-words text-tenue`}>{proyecto.docenteNombre}</td>
                <td className={CELDA}>
                  <BarraDeAvance porcentaje={proyecto.porcentajeAvance} etiqueta={`Avance de ${proyecto.titulo}`} />
                  <span className="cifras mt-1 block text-sm text-tenue">
                    {proyecto.fechaUltimoAvance ? `Último: ${fechaCorta(proyecto.fechaUltimoAvance)}` : "Sin avances"}
                  </span>
                </td>
                <td className={CELDA}>
                  <EstadoDeProyecto estado={proyecto.estado} />
                </td>
                <td className="px-5 py-2.5 text-right align-top">
                  <Enlace proyecto={proyecto} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 xl:hidden">
        {proyectos.map((proyecto) => (
          <li key={proyecto.id} className="rounded-pieza bg-superficie p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="min-w-0 break-words font-medium">{proyecto.titulo}</p>
              <span className="shrink-0 text-sm">
                <EstadoDeProyecto estado={proyecto.estado} />
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9375rem]">
              <dt className="text-tenue">Tipo</dt>
              <dd className="min-w-0">
                <Tipo proyecto={proyecto} />
              </dd>
              <dt className="text-tenue">Club</dt>
              <dd className="min-w-0 break-words">{grupoDe(proyecto, mostrarInstitucion)}</dd>
              <dt className="text-tenue">Tutor</dt>
              <dd className="min-w-0 break-words">{proyecto.docenteNombre}</dd>
              <dt className="text-tenue">Equipo</dt>
              <dd className="min-w-0">{integrantesDe(proyecto)}</dd>
              <dt className="text-tenue">Avance</dt>
              <dd className="min-w-0">
                <BarraDeAvance porcentaje={proyecto.porcentajeAvance} etiqueta={`Avance de ${proyecto.titulo}`} />
              </dd>
            </dl>
            <div className="mt-4">
              <Enlace proyecto={proyecto} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
