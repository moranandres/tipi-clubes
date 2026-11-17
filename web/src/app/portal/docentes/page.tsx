import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlert, GraduationCap, SearchX, ShieldAlert, UserPlus } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import {
  BotonReintentar,
  ProveedorDeBusqueda,
  ZonaDeResultados,
} from "@/components/portal/Busqueda";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { FiltrosDocentes } from "@/components/portal/docentes/FiltrosDocentes";
import {
  EsqueletoResumenDeDocentes,
  ResumenDeDocentes,
} from "@/components/portal/docentes/ResumenDeDocentes";
import { TablaDocentes } from "@/components/portal/docentes/TablaDocentes";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { Paginacion } from "@/components/portal/Paginacion";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { listarInstitucionesParaFiltro } from "@/lib/api/clubes";
import { contarDocentesPorEstado, listarDocentes } from "@/lib/api/docentes";
import {
  DOCENTES_POR_PAGINA,
  RUTA_DOCENTES,
  hayFiltrosDeDocentes,
  leerFiltrosDeDocentes,
  rutaDeDocentes,
} from "@/lib/portal/filtros-docentes";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import type { ParametrosDeBusqueda } from "@/lib/portal/parametros";
import { esDocente, puedeGestionarDocentes } from "@/lib/portal/permisos";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Docentes",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const ANCHOS_DE_FILTROS = ["md:min-w-[16rem] md:flex-1", "md:w-48", "md:w-72"];

function alcanceDe(rol?: string): string {
  return tieneAlcanceGlobal(rol) ? "en todas las instituciones" : "en tu institución";
}

async function AccionPrincipal() {
  const usuario = await exigirSesion();

  if (!puedeGestionarDocentes(usuario?.rol)) {
    return null;
  }

  return (
    <EnlaceBoton href={`${RUTA_DOCENTES}/nuevo`} className="shrink-0">
      <UserPlus aria-hidden="true" size={18} />
      Nuevo docente
    </EnlaceBoton>
  );
}

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeDocentes(await parametros);
  const usuario = await exigirSesion();
  const instituciones = tieneAlcanceGlobal(usuario?.rol)
    ? await listarInstitucionesParaFiltro()
    : null;

  return <FiltrosDocentes filtros={filtros} instituciones={instituciones} />;
}

async function Resumen({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeDocentes(await parametros);
  const conteos = await contarDocentesPorEstado(filtros);

  return <ResumenDeDocentes filtros={filtros} conteos={conteos} />;
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeDocentes(await parametros);
  const [usuario, resultado] = await Promise.all([exigirSesion(), listarDocentes(filtros)]);

  if (resultado.estado === "sin-servicio") {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar los docentes"
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
  const gestionable = puedeGestionarDocentes(usuario?.rol);
  const global = tieneAlcanceGlobal(usuario?.rol);

  if (elementos.length === 0 && total > 0) {
    redirect(rutaDeDocentes({ ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosDeDocentes(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo="Ningún docente coincide con los filtros"
        accion={
          <Link href={RUTA_DOCENTES} className="font-medium text-acento">
            Ver todos los docentes
          </Link>
        }
      >
        Prueba con otro nombre o correo, o cambia el estado o la institución.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<GraduationCap size={20} />} titulo="Todavía no hay docentes">
        {gestionable
          ? "Usa el botón Nuevo docente para registrar al primero."
          : "Cuando se registre el primer docente aparecerá en esta lista."}
      </AvisoDeLista>
    );
  }

  const instituciones = global
    ? new Map(
        ((await listarInstitucionesParaFiltro()) ?? []).flatMap((institucion) =>
          typeof institucion.id === "number" ? [[institucion.id, institucion.nombre ?? ""]] : [],
        ),
      )
    : null;
  const primero = (pagina - 1) * DOCENTES_POR_PAGINA + 1;
  const ultimo = primero + elementos.length - 1;

  return (
    <>
      <p role="status" className="cifras text-[0.9375rem] text-tenue">
        {total === 1
          ? `1 docente ${alcanceDe(usuario?.rol)}`
          : `${FORMATO_NUMERO.format(total)} docentes ${alcanceDe(usuario?.rol)}`}
        {totalPaginas > 1 ? `, del ${primero} al ${ultimo}` : ""}.
      </p>
      <div className="mt-4">
        <TablaDocentes docentes={elementos} instituciones={instituciones} gestionable={gestionable} />
      </div>
      <Paginacion
        etiqueta="Páginas de la lista de docentes"
        pagina={pagina}
        totalPaginas={totalPaginas}
        rutaAnterior={pagina > 1 ? rutaDeDocentes({ ...filtros, pagina: pagina - 1 }) : null}
        rutaSiguiente={
          pagina < totalPaginas ? rutaDeDocentes({ ...filtros, pagina: pagina + 1 }) : null
        }
      />
    </>
  );
}

async function Contenido({ parametros }: PropsConParametros) {
  const usuario = await exigirSesion();

  if (esDocente(usuario?.rol)) {
    return (
      <div className="mt-8">
        <ZonaDeResultados>
          <Resultados parametros={parametros} />
        </ZonaDeResultados>
      </div>
    );
  }

  return (
    <>
      <Suspense fallback={<EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />}>
        <Filtros parametros={parametros} />
      </Suspense>
      <Suspense fallback={<EsqueletoResumenDeDocentes />}>
        <Resumen parametros={parametros} />
      </Suspense>
      <div className="mt-8">
        <ZonaDeResultados>
          <Suspense fallback={<EsqueletoLista mensaje="Cargando la lista de docentes." />}>
            <Resultados parametros={parametros} />
          </Suspense>
        </ZonaDeResultados>
      </div>
    </>
  );
}

export default function PaginaDocentes({ searchParams }: PageProps<"/portal/docentes">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-medium tracking-tight">Docentes</h1>
          <p className="mt-3 max-w-[70ch] text-tenue">
            Docentes coordinadores de club de cada institución, con su cuenta de acceso al portal.
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
              <EsqueletoResumenDeDocentes />
              <div className="mt-8">
                <EsqueletoLista mensaje="Cargando la lista de docentes." />
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
