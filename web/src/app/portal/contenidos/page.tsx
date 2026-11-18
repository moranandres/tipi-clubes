import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CircleAlert, Plus, SearchX, ShieldAlert } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import {
  BotonReintentar,
  ProveedorDeBusqueda,
  ZonaDeResultados,
} from "@/components/portal/Busqueda";
import { FiltrosContenidos } from "@/components/portal/contenidos/FiltrosContenidos";
import {
  EsqueletoResumenDeContenidos,
  ResumenDeContenidos,
} from "@/components/portal/contenidos/ResumenDeContenidos";
import { TablaContenidos } from "@/components/portal/contenidos/TablaContenidos";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { AvisoSinAcceso } from "@/components/portal/formularios/AvisosDeGestion";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { listarContenidos } from "@/lib/api/contenidos";
import {
  RUTA_CONTENIDOS,
  estadoDeContenido,
  hayFiltrosDeContenidos,
  leerFiltrosDeContenidos,
} from "@/lib/portal/filtros-contenidos";
import type { ParametrosDeBusqueda } from "@/lib/portal/parametros";
import { puedeAdministrarContenidos } from "@/lib/portal/permisos";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Catálogo de contenidos",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const ANCHOS_DE_FILTROS = ["md:min-w-[16rem] md:flex-1", "md:w-48", "md:w-40"];

async function AccionPrincipal() {
  const usuario = await exigirSesion();

  if (!puedeAdministrarContenidos(usuario?.rol)) {
    return null;
  }

  return (
    <EnlaceBoton href={`${RUTA_CONTENIDOS}/nuevo`} className="shrink-0">
      <Plus aria-hidden="true" size={18} />
      Nuevo contenido
    </EnlaceBoton>
  );
}

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeContenidos(await parametros);
  return <FiltrosContenidos filtros={filtros} />;
}

async function Resumen({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeContenidos(await parametros);
  const resultado = await listarContenidos(filtros);
  const contenidos = resultado.estado === "ok" ? resultado.contenidos : null;

  return (
    <ResumenDeContenidos
      filtros={filtros}
      conteos={{
        ACTIVO: contenidos ? contenidos.filter((contenido) => contenido.activo !== false).length : null,
        INACTIVO: contenidos ? contenidos.filter((contenido) => contenido.activo === false).length : null,
      }}
    />
  );
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeContenidos(await parametros);
  const resultado = await listarContenidos(filtros);

  if (resultado.estado === "sin-servicio") {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar el catálogo"
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

  const contenidos = filtros.estado
    ? resultado.contenidos.filter(
        (contenido) => estadoDeContenido(contenido.activo) === filtros.estado,
      )
    : resultado.contenidos;

  if (contenidos.length === 0) {
    return hayFiltrosDeContenidos(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo="Ningún contenido coincide con los filtros"
        accion={
          <Link href={RUTA_CONTENIDOS} className="font-medium text-acento">
            Ver todo el catálogo
          </Link>
        }
      >
        Prueba con otro nombre o cambia el tipo o el estado.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<BookOpen size={20} />} titulo="El catálogo está vacío">
        Agrega las herramientas, lenguajes, componentes y competencias que trabajan los clubes.
      </AvisoDeLista>
    );
  }

  const enUso = contenidos.filter((contenido) => (contenido.actividades ?? 0) > 0).length;

  return (
    <>
      <p role="status" className="cifras text-[0.9375rem] text-tenue">
        {contenidos.length === 1
          ? "1 contenido"
          : `${FORMATO_NUMERO.format(contenidos.length)} contenidos`}
        {`, ${FORMATO_NUMERO.format(enUso)} en uso en actividades.`}
      </p>
      <div className="mt-4">
        <TablaContenidos contenidos={contenidos} />
      </div>
    </>
  );
}

async function Contenido({ parametros }: PropsConParametros) {
  const usuario = await exigirSesion();

  if (usuario && !puedeAdministrarContenidos(usuario.rol)) {
    return <AvisoSinAcceso quienes="el administrador del sistema" />;
  }

  return (
    <>
      <Suspense fallback={<EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />}>
        <Filtros parametros={parametros} />
      </Suspense>
      <Suspense fallback={<EsqueletoResumenDeContenidos />}>
        <Resumen parametros={parametros} />
      </Suspense>
      <div className="mt-8">
        <ZonaDeResultados>
          <Suspense fallback={<EsqueletoLista mensaje="Cargando el catálogo de contenidos." />}>
            <Resultados parametros={parametros} />
          </Suspense>
        </ZonaDeResultados>
      </div>
    </>
  );
}

export default function PaginaContenidos({ searchParams }: PageProps<"/portal/contenidos">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-medium tracking-tight">Catálogo de contenidos</h1>
          <p className="mt-3 max-w-[70ch] text-tenue">
            Herramientas, lenguajes, componentes y competencias que los docentes eligen al
            planificar sus sesiones y al registrar los avances de sus estudiantes.
          </p>
        </div>
        <Suspense fallback={null}>
          <AccionPrincipal />
        </Suspense>
      </div>
      <ProveedorDeBusqueda>
        <Suspense
          fallback={
            <>
              <EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />
              <EsqueletoResumenDeContenidos />
              <div className="mt-8">
                <EsqueletoLista mensaje="Cargando el catálogo de contenidos." />
              </div>
            </>
          }
        >
          <Contenido parametros={searchParams} />
        </Suspense>
      </ProveedorDeBusqueda>
    </div>
  );
}
