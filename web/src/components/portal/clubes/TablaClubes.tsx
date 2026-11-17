import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import type { Club } from "@/lib/api/clubes";
import {
  NOMBRES_DE_ESTADO,
  PUNTOS_DE_ESTADO_DE_CLUB,
  RUTA_CLUBES,
  type EstadoClub,
} from "@/lib/portal/filtros-clubes";
import { horaCorta, nombreDeDia } from "@/lib/portal/tiempo";

type Props = {
  clubes: Club[];
  mostrarInstitucion: boolean;
  gestionable: boolean;
};

const SIN_DATO = "—";

const CELDA = "px-5 py-3.5 align-top";
const ENCABEZADO = "px-5 py-3 text-left text-sm font-medium text-tenue";

function horarioDe(club: Club): string {
  const dia = nombreDeDia(club.diaSemana);
  if (!dia) {
    return "Sin horario";
  }
  const inicio = horaCorta(club.horaInicio);
  const fin = horaCorta(club.horaFin);
  return inicio && fin ? `${dia}, ${inicio} a ${fin}` : dia;
}

function integrantesDe(club: Club): string {
  const activos = club.integrantesActivos ?? 0;
  return typeof club.cupoMaximo === "number" ? `${activos} de ${club.cupoMaximo}` : String(activos);
}

function estaCompleto(club: Club): boolean {
  return club.cuposDisponibles === 0 && typeof club.cupoMaximo === "number";
}

function Estado({ estado }: { estado?: EstadoClub }) {
  if (!estado) {
    return <span className="text-tenue">{SIN_DATO}</span>;
  }
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span
        aria-hidden="true"
        className={`size-1.5 shrink-0 rounded-full ${PUNTOS_DE_ESTADO_DE_CLUB[estado]}`}
      />
      {NOMBRES_DE_ESTADO[estado]}
    </span>
  );
}

function Detalle({ club }: { club: Club }) {
  const partes = [club.periodoNombre, club.lugar].filter(Boolean);
  return partes.length > 0 ? (
    <span className="mt-0.5 block text-sm text-tenue">{partes.join(" · ")}</span>
  ) : null;
}

function EnlaceGestionar({ club }: { club: Club }) {
  return (
    <EnlaceBoton href={`${RUTA_CLUBES}/${club.id}`} variante="elevado" tamano="compacto">
      Gestionar
      <span className="sr-only"> el club {club.nombre}</span>
    </EnlaceBoton>
  );
}

export function TablaClubes({ clubes, mostrarInstitucion, gestionable }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-pieza bg-superficie md:block">
        <table className="w-full border-collapse text-[0.9375rem]">
          <caption className="sr-only">Lista de clubes</caption>
          <thead>
            <tr className="border-b border-linea">
              <th scope="col" className={`${ENCABEZADO} ${mostrarInstitucion ? "w-[26%]" : "w-[36%]"}`}>
                Club
              </th>
              {mostrarInstitucion ? (
                <th scope="col" className={`${ENCABEZADO} w-[18%]`}>
                  Institución
                </th>
              ) : null}
              <th scope="col" className={`${ENCABEZADO} ${mostrarInstitucion ? "w-[15%]" : "w-[22%]"}`}>
                Docente
              </th>
              <th scope="col" className={ENCABEZADO}>
                Horario
              </th>
              <th scope="col" className={`${ENCABEZADO} text-right`}>
                Integrantes
              </th>
              <th scope="col" className={ENCABEZADO}>
                Estado
              </th>
              {gestionable ? (
                <th scope="col" className={`${ENCABEZADO} text-right`}>
                  Acciones
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {clubes.map((club) => (
              <tr key={club.id} className="border-b border-linea last:border-b-0">
                <th scope="row" className={`${CELDA} text-left font-medium`}>
                  <span className="block break-words">{club.nombre}</span>
                  <Detalle club={club} />
                </th>
                {mostrarInstitucion ? (
                  <td className={`${CELDA} break-words text-tenue`}>
                    {club.institucionNombre ?? SIN_DATO}
                  </td>
                ) : null}
                <td className={`${CELDA} break-words`}>
                  {club.docenteNombre ?? <span className="text-tenue">Sin docente</span>}
                </td>
                <td className={`${CELDA} cifras whitespace-nowrap`}>{horarioDe(club)}</td>
                <td className={`${CELDA} cifras whitespace-nowrap text-right`}>
                  {integrantesDe(club)}
                  {estaCompleto(club) ? (
                    <span className="mt-0.5 block text-sm text-aviso">Completo</span>
                  ) : null}
                </td>
                <td className={CELDA}>
                  <Estado estado={club.estado} />
                </td>
                {gestionable ? (
                  <td className="px-5 py-2.5 text-right align-top">
                    <EnlaceGestionar club={club} />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {clubes.map((club) => (
          <li key={club.id} className="rounded-pieza bg-superficie p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="min-w-0 break-words font-medium">{club.nombre}</p>
              <span className="shrink-0 text-sm">
                <Estado estado={club.estado} />
              </span>
            </div>
            <Detalle club={club} />
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9375rem]">
              {mostrarInstitucion ? (
                <>
                  <dt className="text-tenue">Institución</dt>
                  <dd className="min-w-0 break-words">{club.institucionNombre ?? SIN_DATO}</dd>
                </>
              ) : null}
              <dt className="text-tenue">Docente</dt>
              <dd className="min-w-0 break-words">{club.docenteNombre ?? "Sin docente"}</dd>
              <dt className="text-tenue">Horario</dt>
              <dd className="cifras">{horarioDe(club)}</dd>
              <dt className="text-tenue">Integrantes</dt>
              <dd className="cifras">
                {integrantesDe(club)}
                {estaCompleto(club) ? <span className="ml-2 text-sm text-aviso">Completo</span> : null}
              </dd>
            </dl>
            {gestionable ? (
              <div className="mt-4">
                <EnlaceGestionar club={club} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}
