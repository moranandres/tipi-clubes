import type { Metadata } from "next";
import { Suspense } from "react";
import { EsqueletoSemaforo, SemaforoClubes } from "@/components/portal/SemaforoClubes";
import {
  EsqueletoTarjeta,
  TarjetaMetrica,
  type TonoMetrica,
} from "@/components/portal/TarjetaMetrica";
import { obtenerResumenPanel, type ResumenPanel } from "@/lib/api/panel";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Panel principal",
};

type Tarjeta = {
  etiqueta: string;
  valor?: number;
  detalle: string;
  tono?: TonoMetrica;
  href?: string;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
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

const REJILLA = "grid gap-4 sm:grid-cols-2 xl:grid-cols-4";
const TITULO_SECCION = "text-lg font-medium";

function pendiente(valor: number | undefined, conPendientes: string): Pick<Tarjeta, "detalle" | "tono"> {
  if (typeof valor !== "number") {
    return { detalle: "Sin dato", tono: "neutro" };
  }
  return valor > 0 ? { detalle: conPendientes, tono: "aviso" } : { detalle: "Al día", tono: "exito" };
}

function tarjetasDePendientes(resumen: ResumenPanel): Tarjeta[] {
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

function tarjetasDeIndicadores(resumen: ResumenPanel): Tarjeta[] {
  const indicadores = resumen.indicadores;
  const activos = indicadores?.clubesActivos;
  const tarjetas: Tarjeta[] = [];

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
  return `Resumen de ${alcance} ${periodo}${corte}.`;
}

function Rejilla({ tarjetas }: { tarjetas: Tarjeta[] }) {
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

async function Saludo() {
  const usuario = await exigirSesion();
  return (
    <h1 className="text-3xl font-medium tracking-tight">
      {usuario?.nombres ? `Hola, ${usuario.nombres}` : "Panel principal"}
    </h1>
  );
}

async function Resumen() {
  const resumen = await obtenerResumenPanel();

  if (!resumen) {
    return (
      <div role="alert" className="mt-8 max-w-[60ch] rounded-pieza bg-superficie p-6">
        <h2 className={TITULO_SECCION}>No pudimos leer el resumen</h2>
        <p className="mt-2 text-tenue">
          El servidor de TIPI 3.0 no responde en este momento. Tu sesión sigue guardada: recarga la
          página en unos minutos.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="mt-3 max-w-[70ch] text-tenue">{contextoDe(resumen)}</p>

      <section aria-labelledby="titulo-pendientes" className="mt-10">
        <h2 id="titulo-pendientes" className={TITULO_SECCION}>
          Pendientes
        </h2>
        <div className="mt-4">
          <Rejilla tarjetas={tarjetasDePendientes(resumen)} />
        </div>
      </section>

      <section aria-labelledby="titulo-indicadores" className="mt-10">
        <h2 id="titulo-indicadores" className={TITULO_SECCION}>
          Indicadores
        </h2>
        <div className="mt-4">
          <Rejilla tarjetas={tarjetasDeIndicadores(resumen)} />
        </div>
      </section>

      <section aria-labelledby="titulo-seguimiento" className="mt-10">
        <h2 id="titulo-seguimiento" className={TITULO_SECCION}>
          Seguimiento de clubes
        </h2>
        <div className="mt-4">
          <SemaforoClubes seguimiento={resumen.seguimiento} />
        </div>
      </section>

      {resumen.generadoEn ? (
        <p className="mt-6 text-sm text-tenue">
          Calculado a las {FORMATO_HORA.format(new Date(resumen.generadoEn))}.
        </p>
      ) : null}
    </>
  );
}

function EsqueletoResumen() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Cargando el resumen del panel.
      </p>
      <div aria-hidden="true">
        <div className="mt-3 flex h-6 items-center motion-safe:animate-pulse">
          <div className="h-4 w-[30rem] max-w-full rounded-full bg-superficie" />
        </div>
        {[
          { titulo: "Pendientes", tarjetas: 4 },
          { titulo: "Indicadores", tarjetas: 3 },
        ].map((grupo) => (
          <div key={grupo.titulo} className="mt-10">
            <p className={TITULO_SECCION}>{grupo.titulo}</p>
            <div className={`mt-4 ${REJILLA}`}>
              {Array.from({ length: grupo.tarjetas }, (_, indice) => (
                <EsqueletoTarjeta key={indice} />
              ))}
            </div>
          </div>
        ))}
        <div className="mt-10">
          <p className={TITULO_SECCION}>Seguimiento de clubes</p>
          <div className="mt-4">
            <EsqueletoSemaforo />
          </div>
        </div>
      </div>
    </div>
  );
}

function EsqueletoSaludo() {
  return <div aria-hidden="true" className="h-9 w-64 max-w-full rounded-[10px] bg-superficie-alta" />;
}

export default function PaginaPortal() {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <Suspense fallback={<EsqueletoSaludo />}>
        <Saludo />
      </Suspense>
      <Suspense fallback={<EsqueletoResumen />}>
        <Resumen />
      </Suspense>
    </div>
  );
}
