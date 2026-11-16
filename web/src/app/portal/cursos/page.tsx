import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, CircleAlert, SearchX, ShieldAlert } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import {
  BotonReintentar,
  ProveedorDeBusqueda,
  ZonaDeResultados,
} from "@/components/portal/Busqueda";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { FiltrosCursos } from "@/components/portal/cursos/FiltrosCursos";
import {
  EsqueletoResumenPorEstado,
  ResumenPorEstado,
} from "@/components/portal/cursos/ResumenPorEstado";
import { TablaCursos } from "@/components/portal/cursos/TablaCursos";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { Paginacion } from "@/components/portal/Paginacion";
import { listarInstitucionesParaFiltro } from "@/lib/api/clubes";
import { contarCursosPorEstado, listarCursos } from "@/lib/api/cursos";
import {
  CURSOS_POR_PAGINA,
  RUTA_CURSOS,
  hayFiltrosDeCursos,
  leerFiltrosDeCursos,
  rutaDeCursos,
  type ParametrosDeBusqueda,
} from "@/lib/portal/filtros-cursos";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Cursos y horarios",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const ROL_DOCENTE = "DOCENTE";
const ANCHOS_DE_FILTROS = ["md:min-w-[16rem] md:flex-1", "md:w-44", "md:w-44", "md:w-64"];

function alcanceDe(rol?: string): string {
  if (tieneAlcanceGlobal(rol)) {
    return "en todas las instituciones";
  }
  return rol === ROL_DOCENTE ? "en tus clubes" : "en tu institución";
}

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeCursos(await parametros);
  const usuario = await exigirSesion();
  const instituciones = tieneAlcanceGlobal(usuario?.rol)
    ? await listarInstitucionesParaFiltro()
    : null;

  return <FiltrosCursos filtros={filtros} instituciones={instituciones} />;
}

async function Resumen({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeCursos(await parametros);
  const conteos = await contarCursosPorEstado(filtros);

  return <ResumenPorEstado filtros={filtros} conteos={conteos} />;
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeCursos(await parametros);
  const [usuario, resultado] = await Promise.all([exigirSesion(), listarCursos(filtros)]);

  if (resultado.estado === "sin-servicio") {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar los cursos"
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

  const { cursos, total, pagina, totalPaginas } = resultado.datos;

  if (cursos.length === 0 && total > 0) {
    redirect(rutaDeCursos({ ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosDeCursos(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo="Ningún curso coincide con los filtros"
        accion={
          <Link href={RUTA_CURSOS} className="font-medium text-acento">
            Ver todos los cursos
          </Link>
        }
      >
        Prueba con otro nombre o cambia el estado, el nivel o la modalidad.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<BookOpen size={20} />} titulo="Todavía no hay cursos">
        {usuario?.rol === ROL_DOCENTE
          ? "Tus clubes todavía no tienen cursos. El responsable de tu institución puede crearlos."
          : "Cuando se registre el primer curso aparecerá en esta lista."}
      </AvisoDeLista>
    );
  }

  const primero = (pagina - 1) * CURSOS_POR_PAGINA + 1;
  const ultimo = primero + cursos.length - 1;

  return (
    <>
      <p role="status" className="cifras text-[0.9375rem] text-tenue">
        {total === 1
          ? `1 curso ${alcanceDe(usuario?.rol)}`
          : `${FORMATO_NUMERO.format(total)} cursos ${alcanceDe(usuario?.rol)}`}
        {totalPaginas > 1 ? `, del ${primero} al ${ultimo}` : ""}.
      </p>
      <div className="mt-4">
        <TablaCursos cursos={cursos} mostrarInstitucion={tieneAlcanceGlobal(usuario?.rol)} />
      </div>
      <Paginacion
        etiqueta="Páginas de la lista de cursos"
        pagina={pagina}
        totalPaginas={totalPaginas}
        rutaAnterior={pagina > 1 ? rutaDeCursos({ ...filtros, pagina: pagina - 1 }) : null}
        rutaSiguiente={
          pagina < totalPaginas ? rutaDeCursos({ ...filtros, pagina: pagina + 1 }) : null
        }
      />
    </>
  );
}

export default function PaginaCursos({ searchParams }: PageProps<"/portal/cursos">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <h1 className="text-3xl font-medium tracking-tight">Cursos y horarios</h1>
      <p className="mt-3 max-w-[70ch] text-tenue">
        Consulta la programación de cada club: nivel, modalidad, horario semanal, fechas y cupos.
      </p>
      <ProveedorDeBusqueda>
        <Suspense fallback={<EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />}>
          <Filtros parametros={searchParams} />
        </Suspense>
        <Suspense fallback={<EsqueletoResumenPorEstado />}>
          <Resumen parametros={searchParams} />
        </Suspense>
        <div className="mt-8">
          <ZonaDeResultados>
            <Suspense fallback={<EsqueletoLista mensaje="Cargando la lista de cursos." />}>
              <Resultados parametros={searchParams} />
            </Suspense>
          </ZonaDeResultados>
        </div>
      </ProveedorDeBusqueda>
    </div>
  );
}
