import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX2 } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import { AvisoDenegado, AvisoNoEncontrado, AvisoSinServicio } from "@/components/portal/formularios/AvisosDeGestion";
import {
  CONTENEDOR_DE_GESTION,
  EncabezadoDeGestion,
  EnlaceVolver,
  EsqueletoDeGestion,
} from "@/components/portal/formularios/PiezasDeGestion";
import {
  EstadoDeSeguimiento,
  ResumenDeIndicadores,
  SituacionDeActividad,
} from "@/components/portal/seguimiento/PiezasDeSeguimiento";
import { TablaDeIndicadores } from "@/components/portal/TablaDeIndicadores";
import { obtenerSeguimientoDeClub } from "@/lib/api/seguimiento";
import { rutaDeActividad } from "@/lib/portal/filtros-actividades";
import { RUTA_SEGUIMIENTO, leerFiltrosDePeriodo, nombreDeMes, porcentaje } from "@/lib/portal/filtros-seguimiento";
import { fechaCorta, horaCorta } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Seguimiento del club",
};

type Props = PageProps<"/portal/seguimiento/[clubId]">;

const RECURSO = { recurso: "clubes en seguimiento", rutaDeLista: RUTA_SEGUIMIENTO };
const NO_ENCONTRADO = "Este club no existe";

async function Contenido({ params, searchParams }: Props) {
  const [{ clubId: segmento }, consulta, usuario] = await Promise.all([params, searchParams, exigirSesion()]);
  const clubId = idDe(segmento);

  if (!clubId) {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADO} {...RECURSO} />;
  }
  if (!usuario) {
    return <AvisoSinServicio />;
  }

  const filtros = leerFiltrosDePeriodo(consulta);
  const resultado = await obtenerSeguimientoDeClub(clubId, filtros.desde, filtros.hasta);
  if (resultado.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADO} {...RECURSO} />;
  }
  if (resultado.estado === "denegado") {
    return <AvisoDenegado mensaje={resultado.mensaje} {...RECURSO} />;
  }
  if (resultado.estado === "sin-servicio") {
    return <AvisoSinServicio />;
  }

  const club = resultado.datos;
  const actividades = club.actividades ?? [];

  return (
    <>
      <EncabezadoDeGestion
        titulo={club.clubNombre ?? "Club"}
        detalle={[club.institucionNombre, club.docenteNombre, club.periodoNombre].filter(Boolean).join(" · ")}
      />
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.9375rem]">
        <EstadoDeSeguimiento estado={club.indicadores?.estado} />
        <span className="cifras text-tenue">
          Del {fechaCorta(club.desde)} al {fechaCorta(club.hasta)}, exigible hasta el {fechaCorta(club.exigibleHasta)}
        </span>
      </div>
      <div className="mt-8 flex flex-col gap-10">
        <ResumenDeIndicadores indicadores={club.indicadores} />
        {(club.meses ?? []).length > 0 ? (
          <section aria-labelledby="meses-del-club">
            <h2 id="meses-del-club" className="text-lg font-medium">
              Mes a mes
            </h2>
            <div className="mt-4">
              <TablaDeIndicadores
                titulo="Seguimiento del club por mes"
                filas={club.meses ?? []}
                clave={(fila) => fila.mes ?? ""}
                tituloDeEncabezado="Mes"
                encabezado={(fila) => <span className="inline-block first-letter:uppercase">{nombreDeMes(fila.mes)}</span>}
                columnas={[
                  { titulo: "Estado", celda: (fila) => <EstadoDeSeguimiento estado={fila.indicadores?.estado} /> },
                  { titulo: "Exigibles", alineada: true, celda: (fila) => String(fila.indicadores?.exigibles ?? 0) },
                  { titulo: "Ejecutadas", alineada: true, celda: (fila) => String(fila.indicadores?.ejecutadas ?? 0) },
                  { titulo: "Cumplimiento", alineada: true, celda: (fila) => porcentaje(fila.indicadores?.porcentajeCumplimiento) },
                ]}
              />
            </div>
          </section>
        ) : null}
        <section aria-labelledby="sesiones-del-club">
          <h2 id="sesiones-del-club" className="text-lg font-medium">
            Sesiones del rango
          </h2>
          <div className="mt-4">
            {actividades.length === 0 ? (
              <AvisoDeLista icono={<CalendarX2 size={20} />} titulo="Sin sesiones en el rango">
                El club no tiene sesiones programadas entre estas fechas.
              </AvisoDeLista>
            ) : (
              <TablaDeIndicadores
                titulo="Sesiones del club"
                filas={actividades}
                clave={(fila) => fila.id ?? 0}
                tituloDeEncabezado="Sesión"
                encabezado={(fila) => (
                  <>
                    <Link href={rutaDeActividad(fila.id ?? 0)} className="block break-words text-acento">
                      {fila.tema}
                    </Link>
                    <span className="cifras mt-0.5 block text-sm font-normal text-tenue">
                      {fechaCorta(fila.fecha)}, {horaCorta(fila.horaInicio)} a {horaCorta(fila.horaFin)}
                    </span>
                  </>
                )}
                columnas={[
                  { titulo: "Situación", celda: (fila) => <SituacionDeActividad situacion={fila.situacion} /> },
                  {
                    titulo: "Registro",
                    celda: (fila) =>
                      fila.fechaRegistroEjecucion
                        ? `${fechaCorta(fila.fechaRegistroEjecucion)}${fila.registroOportuno === false ? ", fuera de plazo" : ""}`
                        : typeof fila.diasDeAtraso === "number" && fila.diasDeAtraso > 0
                          ? `${fila.diasDeAtraso} ${fila.diasDeAtraso === 1 ? "día" : "días"} de atraso`
                          : "—",
                  },
                  {
                    titulo: "Reprogramaciones",
                    alineada: true,
                    celda: (fila) => String(fila.reprogramaciones ?? 0),
                  },
                ]}
              />
            )}
          </div>
        </section>
      </div>
    </>
  );
}

export default function PaginaSeguimientoDeClub(props: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_SEGUIMIENTO}>Volver al seguimiento</EnlaceVolver>
      <Suspense fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando el seguimiento del club." />}>
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}
