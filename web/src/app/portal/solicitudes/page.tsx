import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlert, ClipboardList, Plus, SearchX, ShieldAlert } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import {
  BotonReintentar,
  ProveedorDeBusqueda,
  ZonaDeResultados,
} from "@/components/portal/Busqueda";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { Paginacion } from "@/components/portal/Paginacion";
import { FiltrosSolicitudes } from "@/components/portal/solicitudes/FiltrosSolicitudes";
import {
  EsqueletoResumenDeSolicitudes,
  ResumenDeSolicitudes,
} from "@/components/portal/solicitudes/ResumenDeSolicitudes";
import { TablaSolicitudes } from "@/components/portal/solicitudes/TablaSolicitudes";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { listarInstitucionesParaFiltro } from "@/lib/api/clubes";
import { contarSolicitudesPorEstado, listarSolicitudes } from "@/lib/api/solicitudes";
import {
  RUTA_SOLICITUDES,
  SOLICITUDES_POR_PAGINA,
  hayFiltrosDeSolicitudes,
  leerFiltrosDeSolicitudes,
  rutaDeSolicitudes,
} from "@/lib/portal/filtros-solicitudes";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import type { ParametrosDeBusqueda } from "@/lib/portal/parametros";
import {
  esDocente,
  puedeRegistrarSolicitudes,
  puedeResolverSolicitudes,
  soloVeDatosMinimos,
} from "@/lib/portal/permisos";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Solicitudes de inscripción",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const ANCHOS_DE_FILTROS = ["md:min-w-[16rem] md:flex-1", "md:w-64"];

function alcanceDe(rol?: string): string {
  if (tieneAlcanceGlobal(rol)) {
    return "en todas las instituciones";
  }
  return esDocente(rol) ? "de tus clubes" : "en tu institución";
}

function pasosDelRol(rol?: string): string {
  if (puedeResolverSolicitudes(rol)) {
    return "Quien registra una solicitud no puede revisarla ni resolverla: otra persona la toma en revisión, comprueba los requisitos y la aprueba o rechaza.";
  }
  if (puedeRegistrarSolicitudes(rol)) {
    return "Registras la solicitud y el responsable de tu institución la revisa y la resuelve.";
  }
  return "Consulta el avance de cada solicitud desde su registro hasta su resolución.";
}

async function Cabecera() {
  const usuario = await exigirSesion();

  return (
    <p className="mt-2 max-w-[70ch] text-[0.9375rem] text-tenue">{pasosDelRol(usuario?.rol)}</p>
  );
}

async function AccionPrincipal() {
  const usuario = await exigirSesion();

  if (!puedeRegistrarSolicitudes(usuario?.rol)) {
    return null;
  }

  return (
    <EnlaceBoton href={`${RUTA_SOLICITUDES}/nueva`} className="shrink-0">
      <Plus aria-hidden="true" size={18} />
      Nueva solicitud
    </EnlaceBoton>
  );
}

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeSolicitudes(await parametros);
  const usuario = await exigirSesion();
  const instituciones = tieneAlcanceGlobal(usuario?.rol)
    ? await listarInstitucionesParaFiltro()
    : null;

  return (
    <FiltrosSolicitudes
      filtros={filtros}
      instituciones={instituciones}
      soloCodigo={soloVeDatosMinimos(usuario?.rol)}
    />
  );
}

async function Resumen({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeSolicitudes(await parametros);
  const conteos = await contarSolicitudesPorEstado(filtros);

  return <ResumenDeSolicitudes filtros={filtros} conteos={conteos} />;
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeSolicitudes(await parametros);
  const [usuario, resultado] = await Promise.all([exigirSesion(), listarSolicitudes(filtros)]);

  if (resultado.estado === "sin-servicio") {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar las solicitudes"
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
    redirect(rutaDeSolicitudes({ ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosDeSolicitudes(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo="Ninguna solicitud coincide con los filtros"
        accion={
          <Link href={RUTA_SOLICITUDES} className="font-medium text-acento">
            Ver todas las solicitudes
          </Link>
        }
      >
        Prueba con otro nombre o código, o cambia el estado o la institución.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<ClipboardList size={20} />} titulo="Todavía no hay solicitudes">
        {puedeRegistrarSolicitudes(usuario?.rol)
          ? "Usa el botón Nueva solicitud para inscribir a un estudiante en un club."
          : "Cuando se registre la primera solicitud de inscripción aparecerá en esta lista."}
      </AvisoDeLista>
    );
  }

  const primero = (pagina - 1) * SOLICITUDES_POR_PAGINA + 1;
  const ultimo = primero + elementos.length - 1;

  return (
    <>
      <p role="status" className="cifras text-[0.9375rem] text-tenue">
        {total === 1
          ? `1 solicitud ${alcanceDe(usuario?.rol)}`
          : `${FORMATO_NUMERO.format(total)} solicitudes ${alcanceDe(usuario?.rol)}`}
        {totalPaginas > 1 ? `, de la ${primero} a la ${ultimo}` : ""}.
      </p>
      <div className="mt-4">
        <TablaSolicitudes
          solicitudes={elementos}
          mostrarInstitucion={tieneAlcanceGlobal(usuario?.rol)}
          minima={soloVeDatosMinimos(usuario?.rol)}
        />
      </div>
      <Paginacion
        etiqueta="Páginas de la lista de solicitudes"
        pagina={pagina}
        totalPaginas={totalPaginas}
        rutaAnterior={pagina > 1 ? rutaDeSolicitudes({ ...filtros, pagina: pagina - 1 }) : null}
        rutaSiguiente={
          pagina < totalPaginas ? rutaDeSolicitudes({ ...filtros, pagina: pagina + 1 }) : null
        }
      />
    </>
  );
}

export default function PaginaSolicitudes({ searchParams }: PageProps<"/portal/solicitudes">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-medium tracking-tight">Solicitudes de inscripción</h1>
          <p className="mt-3 max-w-[70ch] text-tenue">
            Cada estudiante entra a un club por medio de una solicitud que pasa de Pendiente a En
            revisión y termina aprobada o rechazada.
          </p>
          <Suspense fallback={<div className="mt-2 h-6" />}>
            <Cabecera />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <AccionPrincipal />
        </Suspense>
      </div>
      <ProveedorDeBusqueda>
        <Suspense fallback={<EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />}>
          <Filtros parametros={searchParams} />
        </Suspense>
        <Suspense fallback={<EsqueletoResumenDeSolicitudes />}>
          <Resumen parametros={searchParams} />
        </Suspense>
        <div className="mt-8">
          <ZonaDeResultados>
            <Suspense fallback={<EsqueletoLista mensaje="Cargando la lista de solicitudes." />}>
              <Resultados parametros={searchParams} />
            </Suspense>
          </ZonaDeResultados>
        </div>
      </ProveedorDeBusqueda>
    </div>
  );
}
