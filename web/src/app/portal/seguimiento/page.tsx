import type { Metadata } from "next";
import { CircleAlert } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import { ProveedorDeBusqueda, ZonaDeResultados } from "@/components/portal/Busqueda";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { FiltrosDePeriodo } from "@/components/portal/FiltrosDePeriodo";
import { FormularioParametros } from "@/components/portal/seguimiento/FormularioParametros";
import {
  EstadoDeSeguimiento,
  ResumenDeIndicadores,
} from "@/components/portal/seguimiento/PiezasDeSeguimiento";
import { TablaDeIndicadores } from "@/components/portal/TablaDeIndicadores";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { listarInstitucionesParaFiltro, listarPeriodos } from "@/lib/api/clubes";
import { obtenerResumenDeSeguimiento, type ResumenDeSeguimiento } from "@/lib/api/seguimiento";
import {
  ESTADOS_DE_SEGUIMIENTO,
  NOMBRES_DE_ESTADO_DE_SEGUIMIENTO,
  PUNTOS_DE_ESTADO_DE_SEGUIMIENTO,
  RUTA_SEGUIMIENTO,
  leerFiltrosDePeriodo,
  nombreDeMes,
  porcentaje,
  rutaDeSeguimientoDeClub,
} from "@/lib/portal/filtros-seguimiento";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { opcionesConNombre } from "@/lib/portal/opciones";
import type { ParametrosDeBusqueda } from "@/lib/portal/parametros";
import { puedeAjustarParametrosDeSeguimiento } from "@/lib/portal/permisos";
import { fechaCorta, momentoCorto } from "@/lib/portal/tiempo";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Seguimiento de actividades",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const CLAVES_DE_ESTADO = {
  ADECUADO: "clubesAdecuados",
  EN_RIESGO: "clubesEnRiesgo",
  CRITICO: "clubesCriticos",
  SIN_DATOS: "clubesSinDatos",
} as const;

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDePeriodo(await parametros);
  const usuario = await exigirSesion();
  const [periodos, instituciones] = await Promise.all([
    listarPeriodos(),
    tieneAlcanceGlobal(usuario?.rol) ? listarInstitucionesParaFiltro() : null,
  ]);

  return (
    <FiltrosDePeriodo
      etiqueta="Filtros del seguimiento"
      ruta={RUTA_SEGUIMIENTO}
      filtros={filtros}
      periodos={opcionesConNombre(periodos ?? [])}
      instituciones={instituciones ? opcionesConNombre(instituciones) : null}
      conFechas
    />
  );
}

function Semaforo({ resumen }: { resumen: ResumenDeSeguimiento }) {
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {ESTADOS_DE_SEGUIMIENTO.map((estado) => (
        <div key={estado} className="rounded-pieza bg-superficie p-4">
          <dt className="flex items-center gap-2 text-sm text-tenue">
            <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${PUNTOS_DE_ESTADO_DE_SEGUIMIENTO[estado]}`} />
            {NOMBRES_DE_ESTADO_DE_SEGUIMIENTO[estado]}
          </dt>
          <dd className="cifras mt-2 text-2xl font-medium leading-none tracking-tight">
            {resumen[CLAVES_DE_ESTADO[estado]] ?? 0}
          </dd>
        </div>
      ))}
    </dl>
  );
}

async function Resumen({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDePeriodo(await parametros);
  const [usuario, { datos, detalle }] = await Promise.all([exigirSesion(), obtenerResumenDeSeguimiento(filtros)]);

  if (!datos) {
    return (
      <AvisoDeLista urgente icono={<CircleAlert size={20} />} titulo="No pudimos calcular el seguimiento">
        {detalle ?? "El servidor de TIPI 3.0 no responde en este momento. Tu sesión sigue guardada."}
      </AvisoDeLista>
    );
  }

  const clubes = datos.clubes ?? [];
  const meses = datos.meses ?? [];
  const global = tieneAlcanceGlobal(usuario?.rol);
  const parametrosActuales = datos.parametros;

  return (
    <div className="flex min-w-0 flex-col gap-10">
      <div className="flex min-w-0 flex-col gap-10">
        <p className="text-[0.9375rem] text-tenue">
          Período {datos.periodoNombre}, del {fechaCorta(datos.desde)} al {fechaCorta(datos.hasta)}. Se exige lo
          programado hasta el {fechaCorta(datos.exigibleHasta)}, con corte al {fechaCorta(datos.fechaCorte)}.
        </p>
        <section aria-label="Semáforo de clubes">
          <Semaforo resumen={datos} />
        </section>
        <section aria-labelledby="indicadores-totales">
          <h2 id="indicadores-totales" className="text-lg font-medium">
            Indicadores del alcance
          </h2>
          <div className="mt-4">
            <ResumenDeIndicadores indicadores={datos.totales} />
          </div>
        </section>
        <section aria-labelledby="clubes-en-seguimiento">
          <h2 id="clubes-en-seguimiento" className="text-lg font-medium">
            Clubes
          </h2>
          <div className="mt-4">
            {clubes.length === 0 ? (
              <p className="text-[0.9375rem] text-tenue">No hay clubes en el período para este alcance.</p>
            ) : (
              <TablaDeIndicadores
                titulo="Seguimiento por club"
                filas={clubes}
                clave={(fila) => fila.clubId ?? 0}
                tituloDeEncabezado="Club"
                encabezado={(fila) => (
                  <>
                    <span className="block break-words">{fila.clubNombre}</span>
                    <span className="mt-0.5 block break-words text-sm font-normal text-tenue">
                      {[global ? fila.institucionNombre : null, fila.docenteNombre].filter(Boolean).join(" · ")}
                    </span>
                  </>
                )}
                columnas={[
                  { titulo: "Estado", celda: (fila) => <EstadoDeSeguimiento estado={fila.indicadores?.estado} /> },
                  { titulo: "Cumplimiento", alineada: true, celda: (fila) => porcentaje(fila.indicadores?.porcentajeCumplimiento) },
                  {
                    titulo: "Pendientes",
                    alineada: true,
                    celda: (fila) => `${fila.indicadores?.porRegistrar ?? 0} por registrar, ${fila.indicadores?.vencidas ?? 0} vencidas`,
                  },
                  {
                    titulo: "Detalle",
                    celda: (fila) => (
                      <EnlaceBoton
                        href={rutaDeSeguimientoDeClub(fila.clubId ?? 0, datos.desde ?? null, datos.hasta ?? null)}
                        variante="elevado"
                        tamano="compacto"
                        className="whitespace-nowrap"
                      >
                        Ver club
                        <span className="sr-only"> {fila.clubNombre}</span>
                      </EnlaceBoton>
                    ),
                  },
                ]}
              />
            )}
          </div>
        </section>
        {meses.length > 0 ? (
          <section aria-labelledby="seguimiento-por-mes">
            <h2 id="seguimiento-por-mes" className="text-lg font-medium">
              Mes a mes
            </h2>
            <div className="mt-4">
              <TablaDeIndicadores
                titulo="Seguimiento por mes"
                filas={meses}
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
      </div>
      <div className="max-w-[40rem]">
        {puedeAjustarParametrosDeSeguimiento(usuario?.rol) && parametrosActuales ? (
          <FormularioParametros
            iniciales={{
              diasGraciaRegistro: String(parametrosActuales.diasGraciaRegistro ?? 0),
              umbralAdecuado: String(parametrosActuales.umbralAdecuado ?? ""),
              umbralMinimo: String(parametrosActuales.umbralMinimo ?? ""),
            }}
            actualizacion={
              parametrosActuales.actualizadoEn
                ? [momentoCorto(parametrosActuales.actualizadoEn), parametrosActuales.actualizadoPorNombre].filter(Boolean).join(", por ")
                : null
            }
          />
        ) : parametrosActuales ? (
          <section aria-labelledby="parametros-vigentes" className="rounded-pieza border border-linea p-5">
            <h2 id="parametros-vigentes" className="text-lg font-medium">
              Cómo se calcula
            </h2>
            <p className="mt-2 text-[0.9375rem] text-tenue">
              Adecuado desde {porcentaje(parametrosActuales.umbralAdecuado)} de cumplimiento, en riesgo desde{" "}
              {porcentaje(parametrosActuales.umbralMinimo)} y crítico por debajo. Una sesión se registra a tiempo
              si su ejecución se anota dentro de {parametrosActuales.diasGraciaRegistro} días.
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export default function PaginaSeguimiento({ searchParams }: PageProps<"/portal/seguimiento">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <h1 className="text-3xl font-medium tracking-tight">Seguimiento de actividades</h1>
      <p className="mt-3 max-w-[70ch] text-tenue">
        Semáforo de cumplimiento de las sesiones programadas por club: cuántas se ejecutaron, cuántas
        faltan registrar y cuántas vencieron, con el detalle mes a mes.
      </p>
      <ProveedorDeBusqueda>
        <Suspense fallback={<EsqueletoFiltros anchos={["md:w-64", "md:w-64", "md:w-44", "md:w-44"]} />}>
          <Filtros parametros={searchParams} />
        </Suspense>
        <div className="mt-8">
          <ZonaDeResultados>
            <Suspense fallback={<EsqueletoLista mensaje="Calculando el seguimiento." />}>
              <Resumen parametros={searchParams} />
            </Suspense>
          </ZonaDeResultados>
        </div>
      </ProveedorDeBusqueda>
    </div>
  );
}
