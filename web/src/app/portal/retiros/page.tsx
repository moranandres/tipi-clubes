import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlert, LogOut, Plus, SearchX, ShieldAlert } from "lucide-react";
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
import { FiltrosRetiros } from "@/components/portal/retiros/FiltrosRetiros";
import {
  EsqueletoResumenDeRetiros,
  ResumenDeRetiros,
} from "@/components/portal/retiros/ResumenDeRetiros";
import { TablaRetiros } from "@/components/portal/retiros/TablaRetiros";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { listarInstitucionesParaFiltro } from "@/lib/api/clubes";
import { contarRetirosPorEstado, listarRetiros } from "@/lib/api/retiros";
import {
  RETIROS_POR_PAGINA,
  RUTA_RETIROS,
  hayFiltrosDeRetiros,
  leerFiltrosDeRetiros,
  rutaDeRetiros,
} from "@/lib/portal/filtros-retiros";
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
  title: "Solicitudes de retiro",
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
    return "Quien registra un retiro no puede resolverlo: otra persona revisa sus efectos sobre cupos y cursos y lo aprueba o lo rechaza.";
  }
  if (puedeRegistrarSolicitudes(rol)) {
    return "Registras el retiro de un integrante de tus clubes y el responsable de tu institución lo resuelve.";
  }
  return "Consulta cada retiro desde su registro hasta su resolución.";
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
    <EnlaceBoton href={`${RUTA_RETIROS}/nuevo`} className="shrink-0">
      <Plus aria-hidden="true" size={18} />
      Nuevo retiro
    </EnlaceBoton>
  );
}

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeRetiros(await parametros);
  const usuario = await exigirSesion();
  const instituciones = tieneAlcanceGlobal(usuario?.rol)
    ? await listarInstitucionesParaFiltro()
    : null;

  return (
    <FiltrosRetiros
      filtros={filtros}
      instituciones={instituciones}
      soloCodigo={soloVeDatosMinimos(usuario?.rol)}
    />
  );
}

async function Resumen({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeRetiros(await parametros);
  const conteos = await contarRetirosPorEstado(filtros);

  return <ResumenDeRetiros filtros={filtros} conteos={conteos} />;
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeRetiros(await parametros);
  const [usuario, resultado] = await Promise.all([exigirSesion(), listarRetiros(filtros)]);

  if (resultado.estado === "sin-servicio") {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar los retiros"
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
    redirect(rutaDeRetiros({ ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosDeRetiros(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo="Ningún retiro coincide con los filtros"
        accion={
          <Link href={RUTA_RETIROS} className="font-medium text-acento">
            Ver todos los retiros
          </Link>
        }
      >
        Prueba con otro nombre o código, o cambia el estado o la institución.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<LogOut size={20} />} titulo="Todavía no hay solicitudes de retiro">
        {puedeRegistrarSolicitudes(usuario?.rol)
          ? "Usa el botón Nuevo retiro cuando un integrante deba dejar un club."
          : "Cuando se registre el primer retiro aparecerá en esta lista."}
      </AvisoDeLista>
    );
  }

  const primero = (pagina - 1) * RETIROS_POR_PAGINA + 1;
  const ultimo = primero + elementos.length - 1;

  return (
    <>
      <p role="status" className="cifras text-[0.9375rem] text-tenue">
        {total === 1
          ? `1 retiro ${alcanceDe(usuario?.rol)}`
          : `${FORMATO_NUMERO.format(total)} retiros ${alcanceDe(usuario?.rol)}`}
        {totalPaginas > 1 ? `, del ${primero} al ${ultimo}` : ""}.
      </p>
      <div className="mt-4">
        <TablaRetiros
          retiros={elementos}
          mostrarInstitucion={tieneAlcanceGlobal(usuario?.rol)}
          minima={soloVeDatosMinimos(usuario?.rol)}
        />
      </div>
      <Paginacion
        etiqueta="Páginas de la lista de retiros"
        pagina={pagina}
        totalPaginas={totalPaginas}
        rutaAnterior={pagina > 1 ? rutaDeRetiros({ ...filtros, pagina: pagina - 1 }) : null}
        rutaSiguiente={
          pagina < totalPaginas ? rutaDeRetiros({ ...filtros, pagina: pagina + 1 }) : null
        }
      />
    </>
  );
}

export default function PaginaRetiros({ searchParams }: PageProps<"/portal/retiros">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-medium tracking-tight">Solicitudes de retiro</h1>
          <p className="mt-3 max-w-[70ch] text-tenue">
            Un integrante sale de un club por medio de una solicitud de retiro con su motivo. Al
            aprobarla se libera su cupo y se cierran sus cursos activos en el club.
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
        <Suspense fallback={<EsqueletoResumenDeRetiros />}>
          <Resumen parametros={searchParams} />
        </Suspense>
        <div className="mt-8">
          <ZonaDeResultados>
            <Suspense fallback={<EsqueletoLista mensaje="Cargando la lista de retiros." />}>
              <Resultados parametros={searchParams} />
            </Suspense>
          </ZonaDeResultados>
        </div>
      </ProveedorDeBusqueda>
    </div>
  );
}
