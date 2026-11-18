import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChartColumnBig, CircleAlert, NotebookPen, Plus, SearchX, ShieldAlert } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import { FiltrosAvances } from "@/components/portal/avances/FiltrosAvances";
import { EsqueletoResumenDeAvances, ResumenDeAvances } from "@/components/portal/avances/ResumenDeAvances";
import { TablaAvances } from "@/components/portal/avances/TablaAvances";
import { BotonReintentar, ProveedorDeBusqueda, ZonaDeResultados } from "@/components/portal/Busqueda";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { Paginacion } from "@/components/portal/Paginacion";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { listarOpcionesDeClubes } from "@/lib/api/actividades";
import { contarAvancesPorAlcance, listarAvances } from "@/lib/api/avances";
import { listarInstitucionesParaFiltro } from "@/lib/api/clubes";
import {
  AVANCES_POR_PAGINA,
  RUTA_AVANCES,
  RUTA_NUEVO_AVANCE,
  RUTA_RESULTADOS,
  hayFiltrosDeAvances,
  leerFiltrosDeAvances,
  rutaDeAvances,
} from "@/lib/portal/filtros-avances";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { opcionesConNombre } from "@/lib/portal/opciones";
import type { ParametrosDeBusqueda } from "@/lib/portal/parametros";
import { esDocente, puedeRegistrarAvances, soloVeDatosMinimos } from "@/lib/portal/permisos";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Avances y resultados",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const ANCHOS_DE_FILTROS = ["md:min-w-[14rem] md:flex-1", "md:w-40", "md:w-44", "md:w-44"];

function alcanceDe(rol?: string): string {
  if (tieneAlcanceGlobal(rol)) {
    return "en todas las instituciones";
  }
  return esDocente(rol) ? "de tus clubes, proyectos y sesiones" : "en tu institución";
}

async function AccionesPrincipales() {
  const usuario = await exigirSesion();
  return (
    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
      <EnlaceBoton href={RUTA_RESULTADOS} variante="secundario">
        <ChartColumnBig aria-hidden="true" size={18} />
        Resultados del período
      </EnlaceBoton>
      {puedeRegistrarAvances(usuario?.rol) ? (
        <EnlaceBoton href={RUTA_NUEVO_AVANCE}>
          <Plus aria-hidden="true" size={18} />
          Registrar avance
        </EnlaceBoton>
      ) : null}
    </div>
  );
}

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeAvances(await parametros);
  const usuario = await exigirSesion();
  const global = tieneAlcanceGlobal(usuario?.rol);
  const [instituciones, clubes] = await Promise.all([
    global ? listarInstitucionesParaFiltro() : null,
    listarOpcionesDeClubes(global ? filtros.institucion : null),
  ]);

  return (
    <FiltrosAvances
      filtros={filtros}
      instituciones={instituciones ? opcionesConNombre(instituciones) : null}
      clubes={opcionesConNombre(clubes)}
    />
  );
}

async function Resumen({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeAvances(await parametros);
  const conteos = await contarAvancesPorAlcance(filtros);
  return <ResumenDeAvances filtros={filtros} conteos={conteos} />;
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeAvances(await parametros);
  const [usuario, resultado] = await Promise.all([exigirSesion(), listarAvances(filtros)]);

  if (resultado.estado === "sin-servicio") {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar los avances"
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
    redirect(rutaDeAvances({ ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosDeAvances(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo="Ningún avance coincide con los filtros"
        accion={
          <Link href={RUTA_AVANCES} className="font-medium text-acento">
            Ver todos los avances
          </Link>
        }
      >
        Cambia el club o el alcance, o amplía el rango de fechas.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<NotebookPen size={20} />} titulo="Todavía no hay avances">
        {puedeRegistrarAvances(usuario?.rol)
          ? "Registra el progreso de un estudiante, de un proyecto o del club con el botón Registrar avance."
          : "Cuando se registre el primer avance aparecerá aquí."}
      </AvisoDeLista>
    );
  }

  const primero = (pagina - 1) * AVANCES_POR_PAGINA + 1;
  const ultimo = primero + elementos.length - 1;

  return (
    <>
      <p role="status" className="cifras text-[0.9375rem] text-tenue">
        {total === 1
          ? `1 avance ${alcanceDe(usuario?.rol)}`
          : `${FORMATO_NUMERO.format(total)} avances ${alcanceDe(usuario?.rol)}`}
        {totalPaginas > 1 ? `, del ${primero} al ${ultimo}` : ""}.
      </p>
      <div className="mt-4">
        <TablaAvances
          avances={elementos}
          minima={soloVeDatosMinimos(usuario?.rol)}
          mostrarInstitucion={tieneAlcanceGlobal(usuario?.rol)}
        />
      </div>
      <Paginacion
        etiqueta="Páginas de la lista de avances"
        pagina={pagina}
        totalPaginas={totalPaginas}
        rutaAnterior={pagina > 1 ? rutaDeAvances({ ...filtros, pagina: pagina - 1 }) : null}
        rutaSiguiente={pagina < totalPaginas ? rutaDeAvances({ ...filtros, pagina: pagina + 1 }) : null}
      />
    </>
  );
}

export default function PaginaAvances({ searchParams }: PageProps<"/portal/avances">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-medium tracking-tight">Avances y resultados</h1>
          <p className="mt-3 max-w-[70ch] text-tenue">
            Registro del progreso de cada estudiante con sus competencias, de cada proyecto con su
            porcentaje y del club en general. Para Coordinación y Consulta el contenido de los avances
            individuales queda reservado.
          </p>
        </div>
        <Suspense fallback={null}>
          <AccionesPrincipales />
        </Suspense>
      </div>
      <ProveedorDeBusqueda>
        <Suspense fallback={<EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />}>
          <Filtros parametros={searchParams} />
        </Suspense>
        <Suspense fallback={<EsqueletoResumenDeAvances />}>
          <Resumen parametros={searchParams} />
        </Suspense>
        <div className="mt-8">
          <ZonaDeResultados>
            <Suspense fallback={<EsqueletoLista mensaje="Cargando los avances." />}>
              <Resultados parametros={searchParams} />
            </Suspense>
          </ZonaDeResultados>
        </div>
      </ProveedorDeBusqueda>
    </div>
  );
}
