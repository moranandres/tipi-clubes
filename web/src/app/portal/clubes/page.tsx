import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlert, SearchX, ShieldAlert, Users } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import {
  BotonReintentar,
  ProveedorDeBusqueda,
  ZonaDeResultados,
} from "@/components/portal/Busqueda";
import { FiltrosClubes } from "@/components/portal/clubes/FiltrosClubes";
import { TablaClubes } from "@/components/portal/clubes/TablaClubes";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { Paginacion } from "@/components/portal/Paginacion";
import { listarClubes, listarInstitucionesParaFiltro } from "@/lib/api/clubes";
import {
  CLUBES_POR_PAGINA,
  RUTA_CLUBES,
  hayFiltrosActivos,
  leerFiltros,
  rutaConFiltros,
  type ParametrosDeBusqueda,
} from "@/lib/portal/filtros-clubes";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Clubes",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const ROL_DOCENTE = "DOCENTE";
const ANCHOS_DE_FILTROS = ["md:min-w-[16rem] md:flex-1", "md:w-48", "md:w-72"];

function alcanceDe(rol?: string): string {
  if (tieneAlcanceGlobal(rol)) {
    return "en todas las instituciones";
  }
  return rol === ROL_DOCENTE ? "a tu cargo" : "de tu institución";
}

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltros(await parametros);
  const usuario = await exigirSesion();
  const instituciones = tieneAlcanceGlobal(usuario?.rol)
    ? await listarInstitucionesParaFiltro()
    : null;

  return <FiltrosClubes filtros={filtros} instituciones={instituciones} />;
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltros(await parametros);
  const [usuario, resultado] = await Promise.all([exigirSesion(), listarClubes(filtros)]);

  if (resultado.estado === "sin-servicio") {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar los clubes"
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

  const { clubes, total, pagina, totalPaginas } = resultado.datos;

  if (clubes.length === 0 && total > 0) {
    redirect(rutaConFiltros({ ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosActivos(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo="Ningún club coincide con los filtros"
        accion={
          <Link href={RUTA_CLUBES} className="font-medium text-acento">
            Ver todos los clubes
          </Link>
        }
      >
        Prueba con otro nombre o cambia el estado o la institución.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<Users size={20} />} titulo="Todavía no hay clubes">
        {usuario?.rol === ROL_DOCENTE
          ? "No tienes clubes a tu cargo. El responsable de tu institución puede asignarte uno."
          : "Cuando se registre el primer club aparecerá en esta lista."}
      </AvisoDeLista>
    );
  }

  const primero = (pagina - 1) * CLUBES_POR_PAGINA + 1;
  const ultimo = primero + clubes.length - 1;

  return (
    <>
      <p role="status" className="cifras text-[0.9375rem] text-tenue">
        {total === 1
          ? `1 club ${alcanceDe(usuario?.rol)}`
          : `${FORMATO_NUMERO.format(total)} clubes ${alcanceDe(usuario?.rol)}`}
        {totalPaginas > 1 ? `, del ${primero} al ${ultimo}` : ""}.
      </p>
      <div className="mt-4">
        <TablaClubes clubes={clubes} mostrarInstitucion={tieneAlcanceGlobal(usuario?.rol)} />
      </div>
      <Paginacion
        etiqueta="Páginas de la lista de clubes"
        pagina={pagina}
        totalPaginas={totalPaginas}
        rutaAnterior={pagina > 1 ? rutaConFiltros({ ...filtros, pagina: pagina - 1 }) : null}
        rutaSiguiente={
          pagina < totalPaginas ? rutaConFiltros({ ...filtros, pagina: pagina + 1 }) : null
        }
      />
    </>
  );
}

export default function PaginaClubes({ searchParams }: PageProps<"/portal/clubes">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <h1 className="text-3xl font-medium tracking-tight">Clubes</h1>
      <p className="mt-3 max-w-[70ch] text-tenue">
        Consulta los clubes de robótica y programación con su docente, su horario y sus cupos.
      </p>
      <ProveedorDeBusqueda>
        <Suspense fallback={<EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />}>
          <Filtros parametros={searchParams} />
        </Suspense>
        <div className="mt-8">
          <ZonaDeResultados>
            <Suspense fallback={<EsqueletoLista mensaje="Cargando la lista de clubes." />}>
              <Resultados parametros={searchParams} />
            </Suspense>
          </ZonaDeResultados>
        </div>
      </ProveedorDeBusqueda>
    </div>
  );
}
