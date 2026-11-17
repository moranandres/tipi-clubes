import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChartColumn, CircleAlert, ClipboardList, SearchX, ShieldAlert } from "lucide-react";
import { Suspense } from "react";
import { FiltrosDeSesiones } from "@/components/portal/asistencia/FiltrosDeSesiones";
import { ListaDeSesiones } from "@/components/portal/asistencia/ListaDeSesiones";
import { ResumenDeAsistenciaDelClub } from "@/components/portal/asistencia/ResumenDeAsistenciaDelClub";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import {
  BotonReintentar,
  ProveedorDeBusqueda,
  ZonaDeResultados,
} from "@/components/portal/Busqueda";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { Paginacion } from "@/components/portal/Paginacion";
import { listarOpcionesDeClubes, listarSesionesEjecutadas } from "@/lib/api/actividades";
import { obtenerResumenDeAsistencia } from "@/lib/api/asistencia";
import { listarInstitucionesParaFiltro } from "@/lib/api/clubes";
import {
  RUTA_ASISTENCIA,
  SESIONES_POR_PAGINA,
  hayFiltrosDeSesiones,
  leerFiltrosDeSesiones,
  rutaDeSesiones,
} from "@/lib/portal/filtros-asistencia";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { opcionesConNombre } from "@/lib/portal/opciones";
import type { ParametrosDeBusqueda } from "@/lib/portal/parametros";
import { esDocente, puedeGestionarActividades, soloVeDatosMinimos } from "@/lib/portal/permisos";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Asistencia",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const ANCHOS_DE_FILTROS = ["md:min-w-[16rem] md:flex-1", "md:w-44", "md:w-44"];

function alcanceDe(rol?: string): string {
  if (tieneAlcanceGlobal(rol)) {
    return "en todas las instituciones";
  }
  return esDocente(rol) ? "de tus clubes" : "en tu institución";
}

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeSesiones(await parametros);
  const usuario = await exigirSesion();
  const global = tieneAlcanceGlobal(usuario?.rol);
  const [instituciones, clubes] = await Promise.all([
    global ? listarInstitucionesParaFiltro() : null,
    listarOpcionesDeClubes(global ? filtros.institucion : null),
  ]);

  return (
    <FiltrosDeSesiones
      base={RUTA_ASISTENCIA}
      filtros={filtros}
      instituciones={instituciones ? opcionesConNombre(instituciones) : null}
      clubes={opcionesConNombre(clubes)}
    />
  );
}

async function Resumen({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeSesiones(await parametros);

  if (!filtros.club) {
    return (
      <p className="mt-6 flex items-start gap-2.5 text-[0.9375rem] text-tenue">
        <ChartColumn aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
        Elige un club para ver su resumen de asistencia por estudiante.
      </p>
    );
  }

  const [usuario, resultado] = await Promise.all([
    exigirSesion(),
    obtenerResumenDeAsistencia({ club: filtros.club, desde: filtros.desde, hasta: filtros.hasta }),
  ]);

  if (resultado.estado === "ok") {
    return <ResumenDeAsistenciaDelClub resumen={resultado.datos} minima={soloVeDatosMinimos(usuario?.rol)} />;
  }

  return (
    <div className="mt-8">
      <AvisoDeLista
        icono={resultado.estado === "denegado" ? <ShieldAlert size={20} /> : <CircleAlert size={20} />}
        titulo="No pudimos mostrar el resumen del club"
      >
        {resultado.estado === "denegado"
          ? resultado.mensaje
          : "El resumen no está disponible en este momento. Las sesiones siguen listadas abajo."}
      </AvisoDeLista>
    </div>
  );
}

function EsqueletoResumen() {
  return <div aria-hidden="true" className="mt-6 h-6 w-80 max-w-full rounded-full bg-superficie motion-safe:animate-pulse" />;
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeSesiones(await parametros);
  const [usuario, resultado] = await Promise.all([
    exigirSesion(),
    listarSesionesEjecutadas(filtros, SESIONES_POR_PAGINA),
  ]);

  if (resultado.estado === "sin-servicio") {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar las sesiones"
        accion={<BotonReintentar />}
      >
        El servidor de TIPI 3.0 no responde en este momento. Tu sesión sigue guardada y los
        filtros se conservan.
      </AvisoDeLista>
    );
  }

  if (resultado.estado === "denegado") {
    return (
      <AvisoDeLista urgente icono={<ShieldAlert size={20} />} titulo="No tienes acceso a esta lista">
        {resultado.mensaje}
      </AvisoDeLista>
    );
  }

  const { elementos, total, pagina, totalPaginas } = resultado.datos;

  if (elementos.length === 0 && total > 0) {
    redirect(rutaDeSesiones(RUTA_ASISTENCIA, { ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosDeSesiones(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo="Ninguna sesión ejecutada coincide con los filtros"
        accion={
          <Link href={RUTA_ASISTENCIA} className="font-medium text-acento">
            Ver todas las sesiones
          </Link>
        }
      >
        Cambia el club o amplía el rango de fechas.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<ClipboardList size={20} />} titulo="Todavía no hay sesiones ejecutadas">
        La asistencia se toma en las sesiones que ya tienen registrada su ejecución. Regístrala
        desde Actividades y sesiones.
      </AvisoDeLista>
    );
  }

  return (
    <>
      <h2 className="text-lg font-medium">Sesiones ejecutadas</h2>
      <p role="status" className="cifras mt-1.5 text-[0.9375rem] text-tenue">
        {total === 1
          ? `1 sesión ${alcanceDe(usuario?.rol)}`
          : `${FORMATO_NUMERO.format(total)} sesiones ${alcanceDe(usuario?.rol)}`}
        . Las más recientes primero.
      </p>
      <div className="mt-4">
        <ListaDeSesiones
          sesiones={elementos}
          destino="asistencia"
          gestiona={puedeGestionarActividades(usuario?.rol)}
          mostrarInstitucion={tieneAlcanceGlobal(usuario?.rol)}
        />
      </div>
      <Paginacion
        etiqueta="Páginas de la lista de sesiones"
        pagina={pagina}
        totalPaginas={totalPaginas}
        rutaAnterior={
          pagina > 1 ? rutaDeSesiones(RUTA_ASISTENCIA, { ...filtros, pagina: pagina - 1 }) : null
        }
        rutaSiguiente={
          pagina < totalPaginas
            ? rutaDeSesiones(RUTA_ASISTENCIA, { ...filtros, pagina: pagina + 1 })
            : null
        }
      />
    </>
  );
}

export default function PaginaAsistencia({ searchParams }: PageProps<"/portal/asistencia">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="min-w-0">
        <h1 className="text-3xl font-medium tracking-tight">Asistencia</h1>
        <p className="mt-3 max-w-[70ch] text-tenue">
          Elige una sesión ejecutada para pasar lista a sus integrantes, o filtra por club para ver
          el resumen de asistencia de cada estudiante.
        </p>
      </div>
      <ProveedorDeBusqueda>
        <Suspense fallback={<EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />}>
          <Filtros parametros={searchParams} />
        </Suspense>
        <ZonaDeResultados>
          <Suspense fallback={<EsqueletoResumen />}>
            <Resumen parametros={searchParams} />
          </Suspense>
          <div className="mt-10">
            <Suspense fallback={<EsqueletoLista mensaje="Cargando las sesiones ejecutadas." />}>
              <Resultados parametros={searchParams} />
            </Suspense>
          </div>
        </ZonaDeResultados>
      </ProveedorDeBusqueda>
    </div>
  );
}
