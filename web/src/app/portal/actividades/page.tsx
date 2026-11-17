import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, CircleAlert, Plus, SearchX, ShieldAlert } from "lucide-react";
import { Suspense } from "react";
import {
  EsqueletoResumenDeActividades,
  ResumenDeActividades,
} from "@/components/portal/actividades/ResumenDeActividades";
import { FiltrosActividades } from "@/components/portal/actividades/FiltrosActividades";
import { TablaActividades } from "@/components/portal/actividades/TablaActividades";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import {
  BotonReintentar,
  ProveedorDeBusqueda,
  ZonaDeResultados,
} from "@/components/portal/Busqueda";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { AvisoDeResultado } from "@/components/portal/formularios/PiezasDeGestion";
import { Paginacion } from "@/components/portal/Paginacion";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import {
  contarActividadesPorFicha,
  listarActividades,
  listarCursosDeClub,
  listarOpcionesDeClubes,
} from "@/lib/api/actividades";
import { listarInstitucionesParaFiltro } from "@/lib/api/clubes";
import {
  ACTIVIDADES_POR_PAGINA,
  RUTA_ACTIVIDADES,
  hayFiltrosDeActividades,
  leerFiltrosDeActividades,
  rutaDeActividades,
  rutaDeNuevaActividad,
} from "@/lib/portal/filtros-actividades";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { opcionesConNombre } from "@/lib/portal/opciones";
import type { ParametrosDeBusqueda } from "@/lib/portal/parametros";
import { esDocente, puedeGestionarActividades } from "@/lib/portal/permisos";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Actividades y sesiones",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const ANCHOS_DE_FILTROS = ["md:min-w-[16rem] md:flex-1", "md:w-56", "md:w-44", "md:w-44"];
const AVISO_DE_ELIMINACION = "actividad-eliminada";

function alcanceDe(rol?: string): string {
  if (tieneAlcanceGlobal(rol)) {
    return "en todas las instituciones";
  }
  return esDocente(rol) ? "de tus clubes" : "en tu institución";
}

async function AccionPrincipal({ parametros }: PropsConParametros) {
  const [usuario, consulta] = await Promise.all([exigirSesion(), parametros]);

  if (!puedeGestionarActividades(usuario?.rol)) {
    return null;
  }

  const filtros = leerFiltrosDeActividades(consulta);
  return (
    <EnlaceBoton href={rutaDeNuevaActividad(filtros.club)} className="shrink-0">
      <Plus aria-hidden="true" size={18} />
      Nueva actividad
    </EnlaceBoton>
  );
}

async function AvisoDeAccion({ parametros }: PropsConParametros) {
  const { aviso } = await parametros;

  return aviso === AVISO_DE_ELIMINACION ? (
    <AvisoDeResultado>La actividad planificada se eliminó.</AvisoDeResultado>
  ) : null;
}

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeActividades(await parametros);
  const usuario = await exigirSesion();
  const global = tieneAlcanceGlobal(usuario?.rol);
  const [instituciones, clubes, cursos] = await Promise.all([
    global ? listarInstitucionesParaFiltro() : null,
    listarOpcionesDeClubes(global ? filtros.institucion : null),
    filtros.club ? listarCursosDeClub(filtros.club) : null,
  ]);

  return (
    <FiltrosActividades
      filtros={filtros}
      instituciones={instituciones ? opcionesConNombre(instituciones) : null}
      clubes={opcionesConNombre(clubes)}
      cursos={opcionesConNombre(cursos ?? [])}
    />
  );
}

async function Resumen({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeActividades(await parametros);
  const conteos = await contarActividadesPorFicha(filtros);

  return <ResumenDeActividades filtros={filtros} conteos={conteos} />;
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeActividades(await parametros);
  const [usuario, resultado] = await Promise.all([exigirSesion(), listarActividades(filtros)]);

  if (resultado.estado === "sin-servicio") {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar las actividades"
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
    redirect(rutaDeActividades({ ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosDeActividades(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo="Ninguna actividad coincide con los filtros"
        accion={
          <Link href={RUTA_ACTIVIDADES} className="font-medium text-acento">
            Ver todas las actividades
          </Link>
        }
      >
        Prueba con otro tema, cambia el club o amplía el rango de fechas.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<CalendarDays size={20} />} titulo="Todavía no hay actividades">
        {puedeGestionarActividades(usuario?.rol)
          ? "Usa el botón Nueva actividad para planificar la primera sesión de un club."
          : "Cuando se planifique la primera sesión aparecerá en esta lista."}
      </AvisoDeLista>
    );
  }

  const primero = (pagina - 1) * ACTIVIDADES_POR_PAGINA + 1;
  const ultimo = primero + elementos.length - 1;

  return (
    <>
      <p role="status" className="cifras text-[0.9375rem] text-tenue">
        {total === 1
          ? `1 actividad ${alcanceDe(usuario?.rol)}`
          : `${FORMATO_NUMERO.format(total)} actividades ${alcanceDe(usuario?.rol)}`}
        {totalPaginas > 1 ? `, de la ${primero} a la ${ultimo}` : ""}. Las más recientes primero.
      </p>
      <div className="mt-4">
        <TablaActividades
          actividades={elementos}
          mostrarInstitucion={tieneAlcanceGlobal(usuario?.rol)}
        />
      </div>
      <Paginacion
        etiqueta="Páginas de la lista de actividades"
        pagina={pagina}
        totalPaginas={totalPaginas}
        rutaAnterior={pagina > 1 ? rutaDeActividades({ ...filtros, pagina: pagina - 1 }) : null}
        rutaSiguiente={
          pagina < totalPaginas ? rutaDeActividades({ ...filtros, pagina: pagina + 1 }) : null
        }
      />
    </>
  );
}

export default function PaginaActividades({ searchParams }: PageProps<"/portal/actividades">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-medium tracking-tight">Actividades y sesiones</h1>
          <p className="mt-3 max-w-[70ch] text-tenue">
            Planifica cada sesión del club, registra lo que se trabajó y desde ahí pasa asistencia
            y carga sus evidencias.
          </p>
        </div>
        <Suspense fallback={null}>
          <AccionPrincipal parametros={searchParams} />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <AvisoDeAccion parametros={searchParams} />
      </Suspense>
      <ProveedorDeBusqueda>
        <Suspense fallback={<EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />}>
          <Filtros parametros={searchParams} />
        </Suspense>
        <Suspense fallback={<EsqueletoResumenDeActividades />}>
          <Resumen parametros={searchParams} />
        </Suspense>
        <div className="mt-8">
          <ZonaDeResultados>
            <Suspense fallback={<EsqueletoLista mensaje="Cargando la lista de actividades." />}>
              <Resultados parametros={searchParams} />
            </Suspense>
          </ZonaDeResultados>
        </div>
      </ProveedorDeBusqueda>
    </div>
  );
}
