import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Bienvenida, EsqueletoBienvenida } from "@/components/portal/Bienvenida";
import { EsqueletoSemaforo, SemaforoClubes } from "@/components/portal/SemaforoClubes";
import {
  EsqueletoTarjeta,
  TarjetaMetrica,
  type DatosTarjeta,
  type TonoMetrica,
} from "@/components/portal/TarjetaMetrica";
import {
  obtenerActividadPanel,
  obtenerResumenPanel,
  type ActividadPanel,
  type ResumenPanel,
} from "@/lib/api/panel";

export const metadata: Metadata = {
  title: "Panel principal",
};

type EstadoSeguimiento = NonNullable<NonNullable<ActividadPanel["indicadores"]>["estado"]>;

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const FORMATO_HORAS = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 });
const FORMATO_FECHA = new Intl.DateTimeFormat("es-EC", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const FORMATO_HORA = new Intl.DateTimeFormat("es-EC", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Guayaquil",
});

const REJILLA = "grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4";
const TITULO_SECCION = "text-lg font-medium";
const SIN_PERIODO = "Sin datos del período";

const CUMPLIMIENTO: Record<EstadoSeguimiento, { detalle: string; tono: TonoMetrica }> = {
  ADECUADO: { detalle: "Adecuado", tono: "exito" },
  EN_RIESGO: { detalle: "En riesgo", tono: "aviso" },
  CRITICO: { detalle: "Crítico", tono: "error" },
  SIN_DATOS: { detalle: "Sin sesiones exigibles todavía", tono: "neutro" },
};

function pendiente(
  valor: number | undefined,
  conPendientes: string,
): Pick<DatosTarjeta, "detalle" | "tono"> {
  if (typeof valor !== "number") {
    return { detalle: "Sin dato", tono: "neutro" };
  }
  return valor > 0 ? { detalle: conPendientes, tono: "aviso" } : { detalle: "Al día", tono: "exito" };
}

function tarjetasDePendientes(resumen: ResumenPanel): DatosTarjeta[] {
  const pendientes = resumen.pendientes;
  return [
    {
      etiqueta: "Sesiones sin registrar",
      valor: pendientes?.sesionesSinEjecucion,
      href: "/portal/actividades",
      ...pendiente(pendientes?.sesionesSinEjecucion, "Falta registrar su ejecución"),
    },
    {
      etiqueta: "Sesiones próximas",
      valor: pendientes?.sesionesProximosSieteDias,
      detalle: "En los próximos 7 días",
      href: "/portal/actividades",
    },
    {
      etiqueta: "Solicitudes de inscripción",
      valor: pendientes?.solicitudesInscripcionPorResolver,
      href: "/portal/solicitudes",
      ...pendiente(pendientes?.solicitudesInscripcionPorResolver, "Por resolver"),
    },
    {
      etiqueta: "Solicitudes de retiro",
      valor: pendientes?.solicitudesRetiroPorResolver,
      href: "/portal/retiros",
      ...pendiente(pendientes?.solicitudesRetiroPorResolver, "Por resolver"),
    },
  ];
}

function tarjetasDeActividad(actividad: ActividadPanel): DatosTarjeta[] {
  const indicadores = actividad.indicadores;
  const exigibles = indicadores?.exigibles;
  const horasPlanificadas = indicadores?.horasPlanificadas;
  const inscripciones = actividad.inscripcionesActivas;
  const cumplimiento = indicadores?.estado ? CUMPLIMIENTO[indicadores.estado] : null;

  return [
    {
      etiqueta: "Sesiones ejecutadas",
      valor: indicadores?.ejecutadas,
      detalle:
        typeof exigibles === "number"
          ? `De ${FORMATO_NUMERO.format(exigibles)} exigibles a la fecha`
          : SIN_PERIODO,
      href: "/portal/actividades",
    },
    {
      etiqueta: "Horas de trabajo",
      valor: indicadores?.horasEjecutadas,
      decimales: 1,
      sufijo: "h",
      detalle:
        typeof horasPlanificadas === "number"
          ? `De ${FORMATO_HORAS.format(horasPlanificadas)} planificadas`
          : SIN_PERIODO,
      href: "/portal/seguimiento",
    },
    {
      etiqueta: "Cumplimiento",
      valor: indicadores?.porcentajeCumplimiento,
      sufijo: "%",
      detalle: cumplimiento?.detalle ?? SIN_PERIODO,
      tono: cumplimiento?.tono ?? "neutro",
      href: "/portal/seguimiento",
    },
    {
      etiqueta: "Estudiantes activos",
      valor: actividad.estudiantesActivos,
      detalle:
        typeof inscripciones === "number"
          ? `${FORMATO_NUMERO.format(inscripciones)} ${inscripciones === 1 ? "inscripción activa" : "inscripciones activas"}`
          : "Sin dato de inscripciones",
      href: "/portal/estudiantes",
    },
  ];
}

function tarjetasDeIndicadores(resumen: ResumenPanel): DatosTarjeta[] {
  const indicadores = resumen.indicadores;
  const activos = indicadores?.clubesActivos;
  const tarjetas: DatosTarjeta[] = [];

  if (resumen.alcanceGlobal) {
    tarjetas.push({
      etiqueta: "Instituciones",
      valor: indicadores?.instituciones,
      detalle: "Adheridas al proyecto",
      href: "/portal/instituciones",
    });
  }

  tarjetas.push(
    {
      etiqueta: "Clubes",
      valor: indicadores?.clubes,
      detalle:
        typeof activos === "number"
          ? `${FORMATO_NUMERO.format(activos)} ${activos === 1 ? "activo" : "activos"}`
          : "Registrados",
      tono: typeof activos === "number" && activos > 0 ? "exito" : "neutro",
      href: "/portal/clubes",
    },
    {
      etiqueta: "Docentes activos",
      valor: indicadores?.docentesActivos,
      detalle: "Habilitados",
      href: "/portal/docentes",
    },
  );

  if (typeof indicadores?.usuariosActivos === "number") {
    tarjetas.push({
      etiqueta: "Usuarios activos",
      valor: indicadores.usuariosActivos,
      detalle: "En todo el sistema",
      href: "/portal/usuarios",
    });
  }

  return tarjetas;
}

function contextoDe(resumen: ResumenPanel): string {
  const alcance = resumen.alcanceGlobal
    ? "todas las instituciones"
    : (resumen.institucionNombre ?? "tu institución");
  const periodo = resumen.periodoActivo?.nombre
    ? `en el período ${resumen.periodoActivo.nombre}`
    : "sin período académico activo";
  const corte = resumen.fechaCorte
    ? `, con corte al ${FORMATO_FECHA.format(new Date(`${resumen.fechaCorte}T00:00:00Z`))}`
    : "";
  return `Datos de ${alcance} ${periodo}${corte}.`;
}

function Seccion({
  id,
  titulo,
  nota,
  children,
}: {
  id: string;
  titulo: string;
  nota?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className={TITULO_SECCION}>
        {titulo}
      </h2>
      {nota ? <p className="mt-1 max-w-[70ch] text-[0.9375rem] text-tenue">{nota}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Rejilla({ tarjetas }: { tarjetas: DatosTarjeta[] }) {
  return (
    <ul className={REJILLA}>
      {tarjetas.map((tarjeta) => (
        <li key={tarjeta.etiqueta}>
          <TarjetaMetrica {...tarjeta} />
        </li>
      ))}
    </ul>
  );
}

async function Pendientes() {
  const resumen = await obtenerResumenPanel();

  if (!resumen) {
    return (
      <div role="alert" className="mt-10 max-w-[60ch] rounded-pieza bg-superficie p-6">
        <h2 className={TITULO_SECCION}>No pudimos leer el resumen</h2>
        <p className="mt-2 text-tenue">
          El servidor de TIPI 3.0 no responde en este momento. Tu sesión sigue guardada: recarga la
          página en unos minutos.
        </p>
      </div>
    );
  }

  return (
    <Seccion id="titulo-pendientes" titulo="Pendientes" nota={contextoDe(resumen)}>
      <Rejilla tarjetas={tarjetasDePendientes(resumen)} />
    </Seccion>
  );
}

async function Actividad() {
  const actividad = await obtenerActividadPanel();
  return (
    <Seccion id="titulo-actividad" titulo="Actividad del período">
      <Rejilla tarjetas={tarjetasDeActividad(actividad)} />
    </Seccion>
  );
}

async function Indicadores() {
  const resumen = await obtenerResumenPanel();
  if (!resumen) {
    return null;
  }
  return (
    <Seccion id="titulo-indicadores" titulo="Indicadores">
      <Rejilla tarjetas={tarjetasDeIndicadores(resumen)} />
    </Seccion>
  );
}

async function Seguimiento() {
  const resumen = await obtenerResumenPanel();
  if (!resumen) {
    return null;
  }
  return (
    <>
      <Seccion id="titulo-seguimiento" titulo="Seguimiento de clubes">
        <SemaforoClubes seguimiento={resumen.seguimiento} />
      </Seccion>
      {resumen.generadoEn ? (
        <p className="mt-6 text-sm text-tenue">
          Calculado a las {FORMATO_HORA.format(new Date(resumen.generadoEn))}.
        </p>
      ) : null}
    </>
  );
}

function EsqueletoSeccion({
  titulo,
  tarjetas,
  conNota = false,
}: {
  titulo: string;
  tarjetas: number;
  conNota?: boolean;
}) {
  return (
    <div aria-busy="true" className="mt-10">
      <p className="sr-only" role="status">
        Cargando {titulo.toLowerCase()}.
      </p>
      <div aria-hidden="true">
        <p className={TITULO_SECCION}>{titulo}</p>
        {conNota ? (
          <div className="mt-1 flex h-[1.40625rem] items-center motion-safe:animate-pulse">
            <div className="h-3.5 w-[28rem] max-w-full rounded-full bg-superficie" />
          </div>
        ) : null}
        <div className={`mt-4 ${REJILLA}`}>
          {Array.from({ length: tarjetas }, (_, indice) => (
            <EsqueletoTarjeta key={indice} />
          ))}
        </div>
      </div>
    </div>
  );
}

function EsqueletoSeguimiento() {
  return (
    <div aria-hidden="true" className="mt-10">
      <p className={TITULO_SECCION}>Seguimiento de clubes</p>
      <div className="mt-4">
        <EsqueletoSemaforo />
      </div>
    </div>
  );
}

export default function PaginaPortal() {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <Suspense fallback={<EsqueletoBienvenida />}>
        <Bienvenida />
      </Suspense>
      <Suspense fallback={<EsqueletoSeccion titulo="Pendientes" tarjetas={4} conNota />}>
        <Pendientes />
      </Suspense>
      <Suspense fallback={<EsqueletoSeccion titulo="Actividad del período" tarjetas={4} />}>
        <Actividad />
      </Suspense>
      <Suspense fallback={<EsqueletoSeccion titulo="Indicadores" tarjetas={3} />}>
        <Indicadores />
      </Suspense>
      <Suspense fallback={<EsqueletoSeguimiento />}>
        <Seguimiento />
      </Suspense>
    </div>
  );
}
