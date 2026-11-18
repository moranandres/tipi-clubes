import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import type { Participacion } from "@/lib/api/competencias";
import { rutaDeParticipacion } from "@/lib/portal/filtros-competencias";
import { identidadDe } from "@/lib/portal/identidad";
import { NivelDeCategoria, ResultadoDeParticipacion } from "./PiezasDeCompetencia";

type Props = {
  participaciones: Participacion[];
  minima: boolean;
  mostrarInstitucion: boolean;
};

const CELDA = "px-5 py-3.5 align-top";
const ENCABEZADO = "px-5 py-3 text-left text-sm font-medium text-tenue";

function Estudiante({ participacion, minima }: { participacion: Participacion; minima: boolean }) {
  const identidad = identidadDe(
    {
      nombres: participacion.estudianteNombres,
      apellidos: participacion.estudianteApellidos,
      codigo: participacion.estudianteCodigo,
    },
    minima,
  );
  return (
    <>
      <span className="block break-words">{identidad.principal}</span>
      {identidad.codigo ? (
        <span className="cifras mt-0.5 block text-sm font-normal text-tenue">{identidad.codigo}</span>
      ) : null}
    </>
  );
}

function competenciaDe(participacion: Participacion): string {
  return [participacion.competenciaNombre, participacion.edicionNombre].filter(Boolean).join(" · ");
}

function grupoDe(participacion: Participacion, mostrarInstitucion: boolean): string {
  return [participacion.clubNombre, mostrarInstitucion ? participacion.institucionNombre : null]
    .filter(Boolean)
    .join(" · ");
}

function Enlace({ participacion }: { participacion: Participacion }) {
  return (
    <EnlaceBoton
      href={rutaDeParticipacion(participacion.id ?? 0)}
      variante="elevado"
      tamano="compacto"
      className="whitespace-nowrap"
    >
      Ver participación
      <span className="sr-only"> en {competenciaDe(participacion)}</span>
    </EnlaceBoton>
  );
}

export function TablaParticipaciones({ participaciones, minima, mostrarInstitucion }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-pieza bg-superficie xl:block">
        <table className="w-full border-collapse text-[0.9375rem]">
          <caption className="sr-only">Participaciones de estudiantes en competencias</caption>
          <thead>
            <tr className="border-b border-linea">
              <th scope="col" className={`${ENCABEZADO} w-[22%]`}>
                Estudiante
              </th>
              <th scope="col" className={ENCABEZADO}>
                Competencia y categoría
              </th>
              <th scope="col" className={`${ENCABEZADO} w-[18%]`}>
                Club
              </th>
              <th scope="col" className={`${ENCABEZADO} w-[18%]`}>
                Resultado
              </th>
              <th scope="col" className={`${ENCABEZADO} text-right`}>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {participaciones.map((participacion) => (
              <tr key={participacion.id} className="border-b border-linea last:border-b-0">
                <th scope="row" className={`${CELDA} text-left font-medium`}>
                  <Estudiante participacion={participacion} minima={minima} />
                </th>
                <td className={CELDA}>
                  <span className="block break-words">{competenciaDe(participacion)}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-tenue">
                    <span className="break-words">{participacion.categoriaNombre}</span>
                    <NivelDeCategoria nivel={participacion.categoriaNivel} />
                  </span>
                  {participacion.equipoNombre ? (
                    <span className="mt-0.5 block break-words text-sm text-tenue">
                      Equipo {participacion.equipoNombre}
                    </span>
                  ) : null}
                </td>
                <td className={`${CELDA} break-words text-tenue`}>
                  {grupoDe(participacion, mostrarInstitucion)}
                </td>
                <td className={CELDA}>
                  <ResultadoDeParticipacion
                    puesto={participacion.puesto}
                    reconocimiento={participacion.reconocimiento}
                  />
                </td>
                <td className="px-5 py-2.5 text-right align-top">
                  <Enlace participacion={participacion} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 xl:hidden">
        {participaciones.map((participacion) => (
          <li key={participacion.id} className="rounded-pieza bg-superficie p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="min-w-0 font-medium">
                <Estudiante participacion={participacion} minima={minima} />
              </p>
              <span className="shrink-0 text-sm">
                <NivelDeCategoria nivel={participacion.categoriaNivel} />
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9375rem]">
              <dt className="text-tenue">Competencia</dt>
              <dd className="min-w-0 break-words">{competenciaDe(participacion)}</dd>
              <dt className="text-tenue">Categoría</dt>
              <dd className="min-w-0 break-words">{participacion.categoriaNombre}</dd>
              {participacion.equipoNombre ? (
                <>
                  <dt className="text-tenue">Equipo</dt>
                  <dd className="min-w-0 break-words">{participacion.equipoNombre}</dd>
                </>
              ) : null}
              <dt className="text-tenue">Club</dt>
              <dd className="min-w-0 break-words">{grupoDe(participacion, mostrarInstitucion)}</dd>
              <dt className="text-tenue">Resultado</dt>
              <dd className="min-w-0">
                <ResultadoDeParticipacion
                  puesto={participacion.puesto}
                  reconocimiento={participacion.reconocimiento}
                />
              </dd>
            </dl>
            <div className="mt-4">
              <Enlace participacion={participacion} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
