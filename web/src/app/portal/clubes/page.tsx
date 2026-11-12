import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlert, SearchX, ShieldAlert, Users } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import {
  BotonReintentar,
  ProveedorDeBusqueda,
  ZonaDeResultados,
} from "@/components/portal/Busqueda";
import { EsqueletoFiltros, FiltrosClubes } from "@/components/portal/clubes/FiltrosClubes";
import { PaginacionClubes } from "@/components/portal/clubes/PaginacionClubes";
import { EsqueletoTabla, TablaClubes } from "@/components/portal/clubes/TablaClubes";
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

function alcanceDe(rol?: string): string {
  if (tieneAlcanceGlobal(rol)) {
    return "en todas las instituciones";
  }
  return rol === ROL_DOCENTE ? "a tu cargo" : "de tu institución";
}

function Aviso({
  icono,
  titulo,
  children,
  accion,
  urgente = false,
}: {
  icono: ReactNode;
  titulo: string;
  children: ReactNode;
  accion?: ReactNode;
  urgente?: boolean;
}) {
  return (
    <div
      role={urgente ? "alert" : undefined}
      className="flex flex-col items-start gap-4 rounded-pieza bg-superficie p-6 sm:flex-row sm:p-8"
    >
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-control bg-superficie-alta text-tenue">
        {icono}
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-medium">{titulo}</h2>
        <p className="mt-1.5 max-w-[60ch] text-tenue">{children}</p>
        {accion ? <div className="mt-5">{accion}</div> : null}
      </div>
    </div>
  );
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
      <Aviso
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar los clubes"
        accion={<BotonReintentar />}
      >
        El servidor de TIPI 3.0 no responde en este momento. Tu sesión sigue guardada y los
        filtros se conservan.
      </Aviso>
    );
  }

  if (resultado.estado === "denegado") {
    return (
      <Aviso urgente icono={<ShieldAlert size={20} />} titulo="No tienes acceso a esta lista">
        {resultado.mensaje}
      </Aviso>
    );
  }

  const { clubes, total, pagina, totalPaginas } = resultado.datos;

  if (clubes.length === 0 && total > 0) {
    redirect(rutaConFiltros({ ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosActivos(filtros) ? (
      <Aviso
        icono={<SearchX size={20} />}
        titulo="Ningún club coincide con los filtros"
        accion={
          <Link href={RUTA_CLUBES} className="font-medium text-acento">
            Ver todos los clubes
          </Link>
        }
      >
        Prueba con otro nombre o cambia el estado o la institución.
      </Aviso>
    ) : (
      <Aviso icono={<Users size={20} />} titulo="Todavía no hay clubes">
        {usuario?.rol === ROL_DOCENTE
          ? "No tienes clubes a tu cargo. El responsable de tu institución puede asignarte uno."
          : "Cuando se registre el primer club aparecerá en esta lista."}
      </Aviso>
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
      <PaginacionClubes filtros={filtros} pagina={pagina} totalPaginas={totalPaginas} />
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
        <Suspense fallback={<EsqueletoFiltros />}>
          <Filtros parametros={searchParams} />
        </Suspense>
        <div className="mt-8">
          <ZonaDeResultados>
            <Suspense fallback={<EsqueletoTabla />}>
              <Resultados parametros={searchParams} />
            </Suspense>
          </ZonaDeResultados>
        </div>
      </ProveedorDeBusqueda>
    </div>
  );
}
