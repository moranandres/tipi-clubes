import { CalendarClock, MapPin, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import type { ClubDelCatalogo } from "@/lib/api/catalogo";
import { cuposEnTexto, rutaDeClubDelCatalogo } from "@/lib/portal/filtros-catalogo";
import { NOMBRES_DE_ESTADO, PUNTOS_DE_ESTADO_DE_CLUB } from "@/lib/portal/filtros-clubes";
import { horaCorta } from "@/lib/portal/tiempo";

type Props = {
  clubes: ClubDelCatalogo[];
};

export function horarioDelClub(club: {
  dia?: string;
  horaInicio?: string;
  horaFin?: string;
}): string | null {
  if (!club.dia) {
    return null;
  }
  const inicio = horaCorta(club.horaInicio);
  const fin = horaCorta(club.horaFin);
  return inicio && fin ? `${club.dia}, ${inicio} a ${fin}` : club.dia;
}

export function BarraDeCupos({
  ocupados,
  maximo,
  disponibles,
}: {
  ocupados: number;
  maximo: number | undefined;
  disponibles: number;
}) {
  const porcentaje = maximo && maximo > 0 ? Math.min(100, Math.round((ocupados / maximo) * 100)) : 0;
  const lleno = Boolean(maximo) && disponibles <= 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="cifras">
          {maximo ? `${ocupados} de ${maximo} integrantes` : `${ocupados} integrantes`}
        </span>
        <span className={`cifras ${lleno ? "text-error" : "text-tenue"}`}>
          {maximo ? cuposEnTexto(disponibles) : "Sin cupo máximo"}
        </span>
      </div>
      {maximo ? (
        <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-superficie-alta">
          <div
            className={`h-full rounded-full ${lleno ? "bg-error" : porcentaje >= 80 ? "bg-aviso" : "bg-exito"}`}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function Dato({ icono, children }: { icono: ReactNode; children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-[0.9375rem]">
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-tenue">
        {icono}
      </span>
      <span className="min-w-0 break-words">{children}</span>
    </p>
  );
}

function Tarjeta({ club }: { club: ClubDelCatalogo }) {
  const horario = horarioDelClub(club);
  const cursos = club.cursosAbiertos ?? 0;

  return (
    <li className="flex flex-col rounded-pieza bg-superficie p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        {club.estado ? (
          <PuntoDeEstado punto={PUNTOS_DE_ESTADO_DE_CLUB[club.estado]}>
            {NOMBRES_DE_ESTADO[club.estado]}
          </PuntoDeEstado>
        ) : null}
        <span className={club.admiteInscripciones ? "font-medium text-exito" : "text-tenue"}>
          {club.admiteInscripciones ? "Inscripciones abiertas" : "Inscripciones cerradas"}
        </span>
      </div>
      <h3 className="mt-3 break-words text-lg font-medium leading-snug">{club.nombre}</h3>
      <p className="mt-1 break-words text-[0.9375rem] text-tenue">
        {[club.institucionNombre, club.canton].filter(Boolean).join(" · ")}
      </p>
      <div className="mt-4 flex flex-col gap-1.5">
        {horario ? <Dato icono={<CalendarClock size={16} />}>{horario}</Dato> : null}
        {club.lugar ? <Dato icono={<MapPin size={16} />}>{club.lugar}</Dato> : null}
        <Dato icono={<UserRound size={16} />}>{club.docenteNombre ?? "Sin docente asignado"}</Dato>
      </div>
      <div className="mt-4">
        <BarraDeCupos
          ocupados={club.integrantesActivos ?? 0}
          maximo={club.cupoMaximo}
          disponibles={club.cuposDisponibles ?? 0}
        />
      </div>
      <p className="cifras mt-3 text-sm text-tenue">
        {cursos === 1 ? "1 curso abierto" : `${cursos} cursos abiertos`}
        {club.periodoNombre ? ` · ${club.periodoNombre}` : ""}
      </p>
      <div className="mt-auto pt-4">
        <EnlaceBoton href={rutaDeClubDelCatalogo(club.id ?? 0)} variante="elevado" tamano="compacto">
          Ver ficha
          <span className="sr-only"> de {club.nombre}</span>
        </EnlaceBoton>
      </div>
    </li>
  );
}

export function TarjetasDeClubes({ clubes }: Props) {
  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {clubes.map((club) => (
        <Tarjeta key={club.id} club={club} />
      ))}
    </ul>
  );
}
