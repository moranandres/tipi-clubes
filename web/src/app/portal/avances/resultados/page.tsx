import type { Metadata } from "next";
import { CircleAlert } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import { ProveedorDeBusqueda, ZonaDeResultados } from "@/components/portal/Busqueda";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { FiltrosDePeriodo } from "@/components/portal/FiltrosDePeriodo";
import { CONTENEDOR_DE_GESTION, EncabezadoDeGestion, EnlaceVolver } from "@/components/portal/formularios/PiezasDeGestion";
import { TablaDeIndicadores } from "@/components/portal/TablaDeIndicadores";
import { TarjetaMetrica } from "@/components/portal/TarjetaMetrica";
import { obtenerResumenDeResultados } from "@/lib/api/avances";
import { listarInstitucionesParaFiltro, listarPeriodos } from "@/lib/api/clubes";
import { RUTA_AVANCES, RUTA_RESULTADOS } from "@/lib/portal/filtros-avances";
import { leerFiltrosDePeriodo, porcentaje } from "@/lib/portal/filtros-seguimiento";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { opcionesConNombre } from "@/lib/portal/opciones";
import type { ParametrosDeBusqueda } from "@/lib/portal/parametros";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Resultados del período",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");

function numero(valor?: number | null): string {
  return typeof valor === "number" ? FORMATO_NUMERO.format(valor) : "—";
}

function cuenta(valor: number | null | undefined, singular: string, plural: string): string {
  return `${numero(valor)} ${valor === 1 ? singular : plural}`;
}

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDePeriodo(await parametros);
  const usuario = await exigirSesion();
  const [periodos, instituciones] = await Promise.all([
    listarPeriodos(),
    tieneAlcanceGlobal(usuario?.rol) ? listarInstitucionesParaFiltro() : null,
  ]);

  return (
    <FiltrosDePeriodo
      etiqueta="Filtros de resultados"
      ruta={RUTA_RESULTADOS}
      filtros={filtros}
      periodos={opcionesConNombre(periodos ?? [])}
      instituciones={instituciones ? opcionesConNombre(instituciones) : null}
      conFechas={false}
    />
  );
}

async function Resumen({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDePeriodo(await parametros);
  const { datos, detalle } = await obtenerResumenDeResultados(filtros.periodo, filtros.institucion);

  if (!datos) {
    return (
      <AvisoDeLista urgente icono={<CircleAlert size={20} />} titulo="No pudimos calcular los resultados">
        {detalle ?? "El servidor de TIPI 3.0 no responde en este momento. Tu sesión sigue guardada."}
      </AvisoDeLista>
    );
  }

  const proyectos = datos.proyectos;
  const avances = datos.avances;
  const competencias = datos.competencias ?? [];
  const clubes = datos.clubes ?? [];

  return (
    <div className="flex flex-col gap-10">
      <p className="text-[0.9375rem] text-tenue">
        Período {datos.periodoNombre ?? "vigente"} · {numero(datos.totalClubes)}{" "}
        {datos.totalClubes === 1 ? "club" : "clubes"} · {numero(datos.participantesUnicos)} participantes.
      </p>
      <section aria-label="Indicadores del período" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaMetrica
          etiqueta="Proyectos desarrollados"
          valor={datos.proyectosDesarrollados}
          detalle={`${cuenta(proyectos?.finalizados, "finalizado", "finalizados")}, ${cuenta(proyectos?.prototiposFinalizados, "prototipo", "prototipos")}`}
        />
        <TarjetaMetrica
          etiqueta="Finalización de proyectos"
          valor={datos.porcentajeFinalizacion}
          decimales={1}
          sufijo=" %"
          detalle={`${numero(proyectos?.enDesarrollo)} en desarrollo, ${cuenta(proyectos?.cancelados, "cancelado", "cancelados")}`}
        />
        <TarjetaMetrica
          etiqueta="Participantes en proyectos"
          valor={datos.porcentajeParticipantesEnProyectos}
          decimales={1}
          sufijo=" %"
          detalle={`${cuenta(datos.estudiantesEnProyectosUnicos, "estudiante", "estudiantes")} en al menos un proyecto`}
        />
        <TarjetaMetrica
          etiqueta="Estudiantes con avance"
          valor={datos.porcentajeEstudiantesConAvance}
          decimales={1}
          sufijo=" %"
          detalle={`${cuenta(avances?.deEstudiantes, "individual", "individuales")}, ${numero(avances?.deProyectos)} de proyectos, ${numero(avances?.deClub)} del club`}
        />
      </section>

      <section aria-labelledby="resultados-por-competencia">
        <h2 id="resultados-por-competencia" className="text-lg font-medium">
          Competencias trabajadas
        </h2>
        <div className="mt-4">
          {competencias.length === 0 ? (
            <p className="text-[0.9375rem] text-tenue">Todavía no hay competencias trabajadas o evaluadas en el período.</p>
          ) : (
            <TablaDeIndicadores
              titulo="Resultados por competencia"
              filas={competencias}
              clave={(fila) => fila.contenidoId ?? 0}
              tituloDeEncabezado="Competencia"
              encabezado={(fila) => <span className="break-words">{fila.nombre}</span>}
              columnas={[
                { titulo: "Sesiones", alineada: true, celda: (fila) => numero(fila.sesionesTrabajadas) },
                { titulo: "Clubes", alineada: true, celda: (fila) => numero(fila.clubesQueLaTrabajaron) },
                { titulo: "Evaluados", alineada: true, celda: (fila) => numero(fila.estudiantesEvaluados) },
                {
                  titulo: "Niveles actuales",
                  celda: (fila) =>
                    `${numero(fila.nivelesActuales?.inicial)} inicial · ${numero(fila.nivelesActuales?.enProceso)} en proceso · ${numero(fila.nivelesActuales?.logrado)} logrado · ${numero(fila.nivelesActuales?.destacado)} destacado`,
                },
                { titulo: "Logrado o más", alineada: true, celda: (fila) => porcentaje(fila.porcentajeLogrado) },
              ]}
            />
          )}
        </div>
      </section>

      <section aria-labelledby="resultados-por-club">
        <h2 id="resultados-por-club" className="text-lg font-medium">
          Resultados por club
        </h2>
        <div className="mt-4">
          {clubes.length === 0 ? (
            <p className="text-[0.9375rem] text-tenue">No hay clubes en el período para este alcance.</p>
          ) : (
            <TablaDeIndicadores
              titulo="Resultados por club"
              filas={clubes}
              clave={(fila) => fila.clubId ?? 0}
              tituloDeEncabezado="Club"
              encabezado={(fila) => (
                <>
                  <span className="block break-words">{fila.clubNombre}</span>
                  <span className="mt-0.5 block break-words text-sm font-normal text-tenue">{fila.institucionNombre}</span>
                </>
              )}
              columnas={[
                { titulo: "Participantes", alineada: true, celda: (fila) => numero(fila.participantes) },
                {
                  titulo: "Proyectos",
                  alineada: true,
                  celda: (fila) => `${numero(fila.proyectos?.finalizados)} de ${numero((fila.proyectos?.enDesarrollo ?? 0) + (fila.proyectos?.finalizados ?? 0))}`,
                },
                { titulo: "Finalización", alineada: true, celda: (fila) => porcentaje(fila.porcentajeFinalizacion) },
                { titulo: "Con avance", alineada: true, celda: (fila) => porcentaje(fila.porcentajeEstudiantesConAvance) },
                { titulo: "Competencias", alineada: true, celda: (fila) => numero(fila.competenciasTrabajadas) },
              ]}
            />
          )}
        </div>
      </section>
    </div>
  );
}

export default function PaginaResultados({ searchParams }: PageProps<"/portal/avances/resultados">) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_AVANCES}>Volver a avances</EnlaceVolver>
      <EncabezadoDeGestion
        titulo="Resultados del período"
        detalle="Proyectos desarrollados, estudiantes con avances y competencias trabajadas por club. Los avances anulados y los proyectos cancelados no cuentan."
      />
      <ProveedorDeBusqueda>
        <Suspense fallback={<EsqueletoFiltros anchos={["md:w-64", "md:w-64"]} />}>
          <Filtros parametros={searchParams} />
        </Suspense>
        <div className="mt-8">
          <ZonaDeResultados>
            <Suspense fallback={<EsqueletoLista mensaje="Calculando los resultados del período." />}>
              <Resumen parametros={searchParams} />
            </Suspense>
          </ZonaDeResultados>
        </div>
      </ProveedorDeBusqueda>
    </div>
  );
}
