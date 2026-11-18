import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlert, FolderKanban, Plus, SearchX, ShieldAlert } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import { BotonReintentar, ProveedorDeBusqueda, ZonaDeResultados } from "@/components/portal/Busqueda";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { Paginacion } from "@/components/portal/Paginacion";
import { FiltrosProyectos } from "@/components/portal/proyectos/FiltrosProyectos";
import { EsqueletoResumenDeProyectos, ResumenDeProyectos } from "@/components/portal/proyectos/ResumenDeProyectos";
import { TablaProyectos } from "@/components/portal/proyectos/TablaProyectos";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { listarOpcionesDeClubes } from "@/lib/api/actividades";
import { listarInstitucionesParaFiltro, listarPeriodos } from "@/lib/api/clubes";
import { contarProyectosPorEstado, listarProyectos } from "@/lib/api/proyectos";
import {
  PROYECTOS_POR_PAGINA,
  RUTA_NUEVO_PROYECTO,
  RUTA_PROYECTOS,
  hayFiltrosDeProyectos,
  leerFiltrosDeProyectos,
  rutaDeProyectos,
} from "@/lib/portal/filtros-proyectos";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { opcionesConNombre } from "@/lib/portal/opciones";
import type { ParametrosDeBusqueda } from "@/lib/portal/parametros";
import { esDocente, puedeGestionarProyectos } from "@/lib/portal/permisos";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Proyectos de estudiantes",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const ANCHOS_DE_FILTROS = ["md:min-w-[14rem] md:flex-1", "md:w-56", "md:w-40"];

function alcanceDe(rol?: string): string {
  if (tieneAlcanceGlobal(rol)) {
    return "en todas las instituciones";
  }
  return esDocente(rol) ? "de tus clubes" : "en tu institución";
}

async function AccionPrincipal() {
  const usuario = await exigirSesion();
  if (!puedeGestionarProyectos(usuario?.rol)) {
    return null;
  }
  return (
    <EnlaceBoton href={RUTA_NUEVO_PROYECTO} className="shrink-0">
      <Plus aria-hidden="true" size={18} />
      Registrar proyecto
    </EnlaceBoton>
  );
}

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeProyectos(await parametros);
  const usuario = await exigirSesion();
  const global = tieneAlcanceGlobal(usuario?.rol);
  const [instituciones, clubes, periodos] = await Promise.all([
    global ? listarInstitucionesParaFiltro() : null,
    listarOpcionesDeClubes(global ? filtros.institucion : null),
    listarPeriodos(),
  ]);

  return (
    <FiltrosProyectos
      filtros={filtros}
      instituciones={instituciones ? opcionesConNombre(instituciones) : null}
      clubes={opcionesConNombre(clubes)}
      periodos={opcionesConNombre(periodos ?? [])}
    />
  );
}

async function Resumen({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeProyectos(await parametros);
  const conteos = await contarProyectosPorEstado(filtros);
  return <ResumenDeProyectos filtros={filtros} conteos={conteos} />;
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeProyectos(await parametros);
  const [usuario, resultado] = await Promise.all([exigirSesion(), listarProyectos(filtros)]);

  if (resultado.estado === "sin-servicio") {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar los proyectos"
        accion={<BotonReintentar />}
      >
        El servidor de TIPI 3.0 no responde en este momento. Tu sesión sigue guardada y los filtros se
        conservan.
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
    redirect(rutaDeProyectos({ ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosDeProyectos(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo="Ningún proyecto coincide con los filtros"
        accion={
          <Link href={RUTA_PROYECTOS} className="font-medium text-acento">
            Ver todos los proyectos
          </Link>
        }
      >
        Cambia el club, el período, el tipo o el estado.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<FolderKanban size={20} />} titulo="Todavía no hay proyectos">
        {puedeGestionarProyectos(usuario?.rol)
          ? "Registra el primer prototipo o software que desarrollan los integrantes de un club activo con el botón Registrar proyecto."
          : "Cuando un club registre su primer proyecto aparecerá aquí."}
      </AvisoDeLista>
    );
  }

  const primero = (pagina - 1) * PROYECTOS_POR_PAGINA + 1;
  const ultimo = primero + elementos.length - 1;

  return (
    <>
      <p role="status" className="cifras text-[0.9375rem] text-tenue">
        {total === 1
          ? `1 proyecto ${alcanceDe(usuario?.rol)}`
          : `${FORMATO_NUMERO.format(total)} proyectos ${alcanceDe(usuario?.rol)}`}
        {totalPaginas > 1 ? `, del ${primero} al ${ultimo}` : ""}.
      </p>
      <div className="mt-4">
        <TablaProyectos proyectos={elementos} mostrarInstitucion={tieneAlcanceGlobal(usuario?.rol)} />
      </div>
      <Paginacion
        etiqueta="Páginas de la lista de proyectos"
        pagina={pagina}
        totalPaginas={totalPaginas}
        rutaAnterior={pagina > 1 ? rutaDeProyectos({ ...filtros, pagina: pagina - 1 }) : null}
        rutaSiguiente={pagina < totalPaginas ? rutaDeProyectos({ ...filtros, pagina: pagina + 1 }) : null}
      />
    </>
  );
}

export default function PaginaProyectos({ searchParams }: PageProps<"/portal/proyectos">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-medium tracking-tight">Proyectos de estudiantes</h1>
          <p className="mt-3 max-w-[70ch] text-tenue">
            Prototipos y software que desarrollan los integrantes de los clubes, con su tutor, su
            equipo, sus avances y las evidencias que los respaldan.
          </p>
        </div>
        <Suspense fallback={null}>
          <AccionPrincipal />
        </Suspense>
      </div>
      <ProveedorDeBusqueda>
        <Suspense fallback={<EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />}>
          <Filtros parametros={searchParams} />
        </Suspense>
        <Suspense fallback={<EsqueletoResumenDeProyectos />}>
          <Resumen parametros={searchParams} />
        </Suspense>
        <div className="mt-8">
          <ZonaDeResultados>
            <Suspense fallback={<EsqueletoLista mensaje="Cargando los proyectos." />}>
              <Resultados parametros={searchParams} />
            </Suspense>
          </ZonaDeResultados>
        </div>
      </ProveedorDeBusqueda>
    </div>
  );
}
