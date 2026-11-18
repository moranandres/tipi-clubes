import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlert, LayoutGrid, SearchX, ShieldAlert } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import {
  BotonReintentar,
  ProveedorDeBusqueda,
  ZonaDeResultados,
} from "@/components/portal/Busqueda";
import { FiltrosCatalogo } from "@/components/portal/catalogo/FiltrosCatalogo";
import { OfertaDeInstitucion } from "@/components/portal/catalogo/OfertaDeInstitucion";
import {
  EsqueletoResumenDelCatalogo,
  ResumenDelCatalogo,
} from "@/components/portal/catalogo/ResumenDelCatalogo";
import { TarjetasDeClubes } from "@/components/portal/catalogo/TarjetasDeClubes";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { Paginacion } from "@/components/portal/Paginacion";
import {
  contarClubesDelCatalogoPorEstado,
  listarClubesDelCatalogo,
  listarInstitucionesDelCatalogo,
} from "@/lib/api/catalogo";
import { listarInstitucionesParaFiltro, listarPeriodos } from "@/lib/api/clubes";
import {
  CLUBES_DEL_CATALOGO_POR_PAGINA,
  RUTA_CATALOGO,
  hayFiltrosDelCatalogo,
  leerFiltrosDelCatalogo,
  rutaDelCatalogo,
} from "@/lib/portal/filtros-catalogo";
import { ESTADOS_DE_CLUB } from "@/lib/portal/filtros-clubes";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";
import type { ParametrosDeBusqueda } from "@/lib/portal/parametros";

export const metadata: Metadata = {
  title: "Catálogo de clubes",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const ANCHOS_DE_FILTROS = [
  "sm:col-span-2",
  "min-w-0",
  "min-w-0",
  "min-w-0",
  "min-w-0",
  "min-w-0",
  "min-w-0",
  "min-w-0",
];

function EsqueletoDeFiltrosDelCatalogo() {
  return (
    <div aria-hidden="true" className="mt-6 grid gap-4 motion-safe:animate-pulse sm:grid-cols-2 lg:grid-cols-4">
      {ANCHOS_DE_FILTROS.map((ancho, indice) => (
        <div key={indice} className={ancho}>
          <div className="flex h-[1.40625rem] items-center">
            <div className="h-3.5 w-28 rounded-full bg-superficie" />
          </div>
          <div className="mt-2 h-11 rounded-control bg-superficie" />
        </div>
      ))}
    </div>
  );
}

async function opcionesDeInstituciones(periodo: number | null): Promise<OpcionDeFormulario[]> {
  const delCatalogo = await listarInstitucionesDelCatalogo(periodo);
  if (delCatalogo && delCatalogo.length > 0) {
    return delCatalogo
      .filter((institucion) => typeof institucion.institucionId === "number")
      .map((institucion) => ({
        valor: String(institucion.institucionId),
        texto: institucion.nombre ?? "Institución",
      }));
  }
  return (await listarInstitucionesParaFiltro()).map((institucion) => ({
    valor: String(institucion.id),
    texto: institucion.nombre ?? "Institución",
  }));
}

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDelCatalogo(await parametros);
  const [instituciones, periodos] = await Promise.all([
    opcionesDeInstituciones(filtros.periodo),
    listarPeriodos(),
  ]);

  return (
    <FiltrosCatalogo
      filtros={filtros}
      instituciones={instituciones}
      periodos={(periodos ?? []).map((periodo) => ({
        valor: String(periodo.id),
        texto: periodo.activo ? `${periodo.nombre} (vigente)` : (periodo.nombre ?? "Período"),
      }))}
    />
  );
}

async function Oferta({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDelCatalogo(await parametros);

  if (!filtros.institucion) {
    return null;
  }

  const instituciones = await listarInstitucionesDelCatalogo(filtros.periodo);
  const institucion = instituciones?.find((opcion) => opcion.institucionId === filtros.institucion);

  return institucion ? <OfertaDeInstitucion institucion={institucion} /> : null;
}

async function Resumen({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDelCatalogo(await parametros);
  const conteos = await contarClubesDelCatalogoPorEstado(filtros, ESTADOS_DE_CLUB);

  return <ResumenDelCatalogo filtros={filtros} conteos={conteos} />;
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDelCatalogo(await parametros);
  const resultado = await listarClubesDelCatalogo(filtros);

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
      <AvisoDeLista urgente icono={<ShieldAlert size={20} />} titulo="No tienes acceso al catálogo">
        {resultado.mensaje}
      </AvisoDeLista>
    );
  }

  const { elementos, total, pagina, totalPaginas } = resultado.datos;

  if (elementos.length === 0 && total > 0) {
    redirect(rutaDelCatalogo({ ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosDelCatalogo(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo="Ningún club coincide con los filtros"
        accion={
          <Link href={RUTA_CATALOGO} className="font-medium text-acento">
            Ver todo el catálogo
          </Link>
        }
      >
        Prueba con otro nombre o quita algún filtro de cupos, nivel o modalidad.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<LayoutGrid size={20} />} titulo="Todavía no hay clubes en el catálogo">
        Cuando las instituciones registren sus clubes aparecerán aquí con sus horarios y cupos.
      </AvisoDeLista>
    );
  }

  const primero = (pagina - 1) * CLUBES_DEL_CATALOGO_POR_PAGINA + 1;
  const ultimo = primero + elementos.length - 1;

  return (
    <>
      <p role="status" className="cifras text-[0.9375rem] text-tenue">
        {total === 1 ? "1 club" : `${FORMATO_NUMERO.format(total)} clubes`}
        {totalPaginas > 1 ? `, del ${primero} al ${ultimo}` : ""}.
      </p>
      <div className="mt-4">
        <TarjetasDeClubes clubes={elementos} />
      </div>
      <Paginacion
        etiqueta="Páginas del catálogo de clubes"
        pagina={pagina}
        totalPaginas={totalPaginas}
        rutaAnterior={pagina > 1 ? rutaDelCatalogo({ ...filtros, pagina: pagina - 1 }) : null}
        rutaSiguiente={
          pagina < totalPaginas ? rutaDelCatalogo({ ...filtros, pagina: pagina + 1 }) : null
        }
      />
    </>
  );
}

export default function PaginaCatalogo({ searchParams }: PageProps<"/portal/catalogo">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <h1 className="text-3xl font-medium tracking-tight">Catálogo de clubes</h1>
      <p className="mt-3 max-w-[70ch] text-tenue">
        Oferta de clubes de robótica y programación de todas las instituciones del proyecto, con
        su horario, su docente, sus cupos y los cursos que tienen abiertos.
      </p>
      <ProveedorDeBusqueda>
        <Suspense fallback={<EsqueletoDeFiltrosDelCatalogo />}>
          <Filtros parametros={searchParams} />
        </Suspense>
        <Suspense fallback={null}>
          <Oferta parametros={searchParams} />
        </Suspense>
        <Suspense fallback={<EsqueletoResumenDelCatalogo />}>
          <Resumen parametros={searchParams} />
        </Suspense>
        <div className="mt-8">
          <ZonaDeResultados>
            <Suspense fallback={<EsqueletoLista mensaje="Cargando el catálogo de clubes." />}>
              <Resultados parametros={searchParams} />
            </Suspense>
          </ZonaDeResultados>
        </div>
      </ProveedorDeBusqueda>
    </div>
  );
}
