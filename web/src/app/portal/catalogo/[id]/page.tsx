import type { Metadata } from "next";
import { BookOpen, CalendarClock, MapPin, Settings2, UserRound } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import { BarraDeCupos, horarioDelClub } from "@/components/portal/catalogo/TarjetasDeClubes";
import {
  AvisoDenegado,
  AvisoNoEncontrado,
  AvisoSinServicio,
} from "@/components/portal/formularios/AvisosDeGestion";
import {
  COLUMNAS_DE_GESTION,
  CONTENEDOR_DE_GESTION,
  EncabezadoDeGestion,
  EnlaceVolver,
  EsqueletoDeGestion,
} from "@/components/portal/formularios/PiezasDeGestion";
import { ListaDeDatos } from "@/components/portal/ListaDeDatos";
import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { obtenerClubDelCatalogo, type CursoDelCatalogo } from "@/lib/api/catalogo";
import { RUTA_CATALOGO } from "@/lib/portal/filtros-catalogo";
import {
  NOMBRES_DE_ESTADO,
  PUNTOS_DE_ESTADO_DE_CLUB,
  RUTA_CLUBES,
} from "@/lib/portal/filtros-clubes";
import {
  NOMBRES_DE_ESTADO_DE_CURSO,
  NOMBRES_DE_MODALIDAD,
  NOMBRES_DE_NIVEL,
  PUNTOS_DE_ESTADO_DE_CURSO,
} from "@/lib/portal/filtros-cursos";
import { puedeAbrirClubDelCatalogo } from "@/lib/portal/permisos";
import { fechaCorta, horaCorta } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Ficha del club",
};

type Props = PageProps<"/portal/catalogo/[id]">;

const RECURSO = { recurso: "clubes del catálogo", rutaDeLista: RUTA_CATALOGO };
const NO_ENCONTRADO = "Este club no está en el catálogo";
const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");

function Indicador({ etiqueta, valor }: { etiqueta: string; valor?: number }) {
  return (
    <div className="min-w-0 rounded-control bg-superficie p-4">
      <dt className="text-sm text-tenue">{etiqueta}</dt>
      <dd className="cifras mt-2 text-2xl font-medium leading-none tracking-tight">
        {FORMATO_NUMERO.format(valor ?? 0)}
      </dd>
    </div>
  );
}

function fechasDe(curso: CursoDelCatalogo): string {
  const inicio = fechaCorta(curso.fechaInicio);
  const fin = fechaCorta(curso.fechaFin);
  if (inicio && fin) {
    return `Del ${inicio} al ${fin}`;
  }
  return inicio ? `Desde el ${inicio}` : "";
}

function TarjetaDeCurso({ curso }: { curso: CursoDelCatalogo }) {
  const horarios = curso.horarios ?? [];
  return (
    <li className="rounded-pieza bg-superficie p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        {curso.estado ? (
          <PuntoDeEstado punto={PUNTOS_DE_ESTADO_DE_CURSO[curso.estado]}>
            {NOMBRES_DE_ESTADO_DE_CURSO[curso.estado]}
          </PuntoDeEstado>
        ) : null}
        <span className={curso.admiteInscripciones ? "font-medium text-exito" : "text-tenue"}>
          {curso.admiteInscripciones ? "Admite inscripciones" : "No admite inscripciones"}
        </span>
      </div>
      <h3 className="mt-3 break-words font-medium">{curso.nombre}</h3>
      <p className="mt-1 text-[0.9375rem] text-tenue">
        {[
          curso.nivel ? NOMBRES_DE_NIVEL[curso.nivel] : null,
          curso.modalidad ? NOMBRES_DE_MODALIDAD[curso.modalidad] : null,
          curso.duracionHoras ? `${curso.duracionHoras} horas` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {curso.descripcion ? (
        <p className="mt-3 max-w-[70ch] whitespace-pre-line break-words text-[0.9375rem]">
          {curso.descripcion}
        </p>
      ) : null}
      <div className="mt-3 flex flex-col gap-1 text-[0.9375rem]">
        {fechasDe(curso) ? <p className="cifras">{fechasDe(curso)}</p> : null}
        {curso.lugar ? <p className="break-words text-tenue">{curso.lugar}</p> : null}
      </div>
      {horarios.length > 0 ? (
        <ul aria-label={`Horarios de ${curso.nombre}`} className="mt-3 flex flex-wrap gap-2">
          {horarios.map((horario) => (
            <li
              key={horario.id}
              className="cifras rounded-control bg-superficie-alta px-2.5 py-1 text-sm"
            >
              {horario.dia} {horaCorta(horario.horaInicio)}–{horaCorta(horario.horaFin)}
              {horario.tipoSesion === "VIRTUAL" ? " · virtual" : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-tenue">Todavía no tiene horarios publicados.</p>
      )}
      <div className="mt-4">
        <BarraDeCupos
          ocupados={curso.inscritosActivos ?? 0}
          maximo={curso.cupoMaximo}
          disponibles={curso.cuposDisponibles ?? 0}
        />
      </div>
      {(curso.finalizados ?? 0) > 0 ? (
        <p className="cifras mt-2 text-sm text-tenue">
          {curso.finalizados} finalizaron · {curso.aprobados ?? 0} aprobaron
        </p>
      ) : null}
    </li>
  );
}

async function Ficha({ params }: Pick<Props, "params">) {
  const [{ id: segmento }, usuario] = await Promise.all([params, exigirSesion()]);
  const id = idDe(segmento);

  if (!id) {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADO} {...RECURSO} />;
  }

  const resultado = await obtenerClubDelCatalogo(id);

  if (resultado.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADO} {...RECURSO} />;
  }
  if (resultado.estado === "denegado") {
    return <AvisoDenegado mensaje={resultado.mensaje} {...RECURSO} />;
  }
  if (resultado.estado === "sin-servicio") {
    return <AvisoSinServicio />;
  }

  const { club, trayectoria, cursos = [] } = resultado.datos;
  const horario = horarioDelClub(club ?? {});
  const abreFicha = puedeAbrirClubDelCatalogo(
    usuario?.rol,
    usuario?.institucionId,
    club?.institucionId,
  );

  return (
    <>
      <EncabezadoDeGestion
        titulo={club?.nombre ?? "Club"}
        detalle={[club?.institucionNombre, club?.canton, club?.periodoNombre]
          .filter(Boolean)
          .join(" · ")}
      />
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.9375rem]">
        {club?.estado ? (
          <PuntoDeEstado punto={PUNTOS_DE_ESTADO_DE_CLUB[club.estado]}>
            {NOMBRES_DE_ESTADO[club.estado]}
          </PuntoDeEstado>
        ) : null}
        <span className={club?.admiteInscripciones ? "font-medium text-exito" : "text-tenue"}>
          {club?.admiteInscripciones ? "Inscripciones abiertas" : "Inscripciones cerradas"}
        </span>
        {club?.periodoActivo === false ? (
          <span className="text-aviso">Período no vigente</span>
        ) : null}
      </div>
      <div className={COLUMNAS_DE_GESTION}>
        <div className="min-w-0">
          <section aria-labelledby="titulo-club">
            <h2 id="titulo-club" className="text-lg font-medium">
              Datos del club
            </h2>
            <div className="mt-4">
              <ListaDeDatos
                datos={[
                  { termino: "Objetivo", valor: club?.objetivo, ancho: true },
                  {
                    termino: "Horario",
                    valor: horario ? (
                      <span className="inline-flex items-center gap-2">
                        <CalendarClock aria-hidden="true" size={16} className="text-tenue" />
                        {horario}
                      </span>
                    ) : null,
                  },
                  {
                    termino: "Lugar",
                    valor: club?.lugar ? (
                      <span className="inline-flex items-center gap-2">
                        <MapPin aria-hidden="true" size={16} className="shrink-0 text-tenue" />
                        {club.lugar}
                      </span>
                    ) : null,
                  },
                  {
                    termino: "Docente coordinador",
                    valor: (
                      <span className="inline-flex items-center gap-2">
                        <UserRound aria-hidden="true" size={16} className="shrink-0 text-tenue" />
                        {club?.docenteNombre ?? "Sin docente asignado"}
                      </span>
                    ),
                  },
                  { termino: "Código AMIE", valor: club?.codigoAmie },
                  {
                    termino: "Creado el",
                    valor: club?.fechaCreacion ? fechaCorta(club.fechaCreacion) : null,
                  },
                ]}
              />
            </div>
          </section>

          <section aria-labelledby="titulo-cursos" className="mt-10">
            <h2 id="titulo-cursos" className="text-lg font-medium">
              Cursos del club
            </h2>
            {cursos.length === 0 ? (
              <div className="mt-4">
                <AvisoDeLista icono={<BookOpen size={20} />} titulo="El club todavía no tiene cursos">
                  Cuando la institución publique sus cursos aparecerán aquí con sus horarios.
                </AvisoDeLista>
              </div>
            ) : (
              <ul className="mt-4 grid gap-3 lg:grid-cols-2">
                {cursos.map((curso) => (
                  <TarjetaDeCurso key={curso.id} curso={curso} />
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section aria-labelledby="titulo-cupos" className="rounded-pieza border border-linea p-5">
            <h2 id="titulo-cupos" className="text-lg font-medium">
              Cupos
            </h2>
            <div className="mt-4">
              <BarraDeCupos
                ocupados={club?.integrantesActivos ?? 0}
                maximo={club?.cupoMaximo}
                disponibles={club?.cuposDisponibles ?? 0}
              />
            </div>
            <p className="cifras mt-3 text-sm text-tenue">
              {club?.integrantesNuevos ?? 0} nuevos · {club?.integrantesAntiguos ?? 0} que
              continúan
            </p>
          </section>
          <section aria-labelledby="titulo-trayectoria">
            <h2 id="titulo-trayectoria" className="text-lg font-medium">
              Trayectoria
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <Indicador etiqueta="Integrantes históricos" valor={trayectoria?.integrantesHistoricos} />
              <Indicador etiqueta="Retiros" valor={trayectoria?.retiros} />
              <Indicador etiqueta="Cursos dictados" valor={trayectoria?.cursosTotal} />
              <Indicador
                etiqueta="Participaciones en competencias"
                valor={trayectoria?.participacionesCompetencia}
              />
              <Indicador etiqueta="Certificados vigentes" valor={trayectoria?.certificadosVigentes} />
            </dl>
          </section>
          {abreFicha ? (
            <EnlaceBoton href={`${RUTA_CLUBES}/${id}`} variante="secundario">
              <Settings2 aria-hidden="true" size={16} />
              Abrir en la gestión de clubes
            </EnlaceBoton>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default function PaginaClubDelCatalogo({ params }: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_CATALOGO}>Volver al catálogo de clubes</EnlaceVolver>
      <Suspense fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando la ficha del club." />}>
        <Ficha params={params} />
      </Suspense>
    </div>
  );
}
