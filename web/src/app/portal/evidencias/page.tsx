import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlert, Images, Plus, SearchX, ShieldAlert } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import {
  BotonReintentar,
  ProveedorDeBusqueda,
  ZonaDeResultados,
} from "@/components/portal/Busqueda";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { FiltrosEvidencias } from "@/components/portal/evidencias/FiltrosEvidencias";
import {
  EsqueletoResumenDeEvidencias,
  ResumenDeEvidencias,
} from "@/components/portal/evidencias/ResumenDeEvidencias";
import { TarjetaDeEvidencia } from "@/components/portal/evidencias/TarjetaDeEvidencia";
import { Paginacion } from "@/components/portal/Paginacion";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { listarOpcionesDeClubes } from "@/lib/api/actividades";
import { listarInstitucionesParaFiltro } from "@/lib/api/clubes";
import { contarEvidenciasPorTipo, listarEvidencias } from "@/lib/api/evidencias";
import {
  EVIDENCIAS_POR_PAGINA,
  RUTA_EVIDENCIAS,
  RUTA_NUEVA_EVIDENCIA,
  hayFiltrosDeEvidencias,
  leerFiltrosDeEvidencias,
  rutaDeEvidencias,
} from "@/lib/portal/filtros-evidencias";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { opcionesConNombre } from "@/lib/portal/opciones";
import type { ParametrosDeBusqueda } from "@/lib/portal/parametros";
import { esDocente, puedeGestionarActividades, soloVeDatosMinimos } from "@/lib/portal/permisos";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Evidencias",
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
  return esDocente(rol) ? "de tus clubes" : "en tu institución";
}

async function AccionPrincipal() {
  const usuario = await exigirSesion();

  if (!puedeGestionarActividades(usuario?.rol)) {
    return null;
  }

  return (
    <EnlaceBoton href={RUTA_NUEVA_EVIDENCIA} className="shrink-0">
      <Plus aria-hidden="true" size={18} />
      Registrar evidencia
    </EnlaceBoton>
  );
}

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeEvidencias(await parametros);
  const usuario = await exigirSesion();
  const global = tieneAlcanceGlobal(usuario?.rol);
  const [instituciones, clubes] = await Promise.all([
    global ? listarInstitucionesParaFiltro() : null,
    listarOpcionesDeClubes(global ? filtros.institucion : null),
  ]);

  return (
    <FiltrosEvidencias
      filtros={filtros}
      instituciones={instituciones ? opcionesConNombre(instituciones) : null}
      clubes={opcionesConNombre(clubes)}
    />
  );
}

async function Resumen({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeEvidencias(await parametros);
  const conteos = await contarEvidenciasPorTipo(filtros);

  return <ResumenDeEvidencias filtros={filtros} conteos={conteos} />;
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeEvidencias(await parametros);
  const [usuario, resultado] = await Promise.all([exigirSesion(), listarEvidencias(filtros)]);

  if (resultado.estado === "sin-servicio") {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar las evidencias"
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
  const retiradas = filtros.estado === "RETIRADA";

  if (elementos.length === 0 && total > 0) {
    redirect(rutaDeEvidencias({ ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosDeEvidencias(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo={retiradas ? "No hay evidencias retiradas con esos filtros" : "Ninguna evidencia coincide con los filtros"}
        accion={
          <Link href={RUTA_EVIDENCIAS} className="font-medium text-acento">
            Ver todas las evidencias
          </Link>
        }
      >
        Cambia el tipo o el club, o amplía el rango de fechas.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<Images size={20} />} titulo="Todavía no hay evidencias">
        {puedeGestionarActividades(usuario?.rol)
          ? "Las evidencias se cargan en las sesiones ejecutadas. Usa el botón Registrar evidencia para elegir la sesión."
          : "Cuando se cargue la primera evidencia de una sesión aparecerá aquí."}
      </AvisoDeLista>
    );
  }

  const primero = (pagina - 1) * EVIDENCIAS_POR_PAGINA + 1;
  const ultimo = primero + elementos.length - 1;

  return (
    <>
      <p role="status" className="cifras text-[0.9375rem] text-tenue">
        {total === 1
          ? `1 evidencia ${retiradas ? "retirada " : ""}${alcanceDe(usuario?.rol)}`
          : `${FORMATO_NUMERO.format(total)} evidencias ${retiradas ? "retiradas " : ""}${alcanceDe(usuario?.rol)}`}
        {totalPaginas > 1 ? `, de la ${primero} a la ${ultimo}` : ""}.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {elementos.map((evidencia) => (
          <TarjetaDeEvidencia
            key={evidencia.id}
            evidencia={evidencia}
            minima={soloVeDatosMinimos(usuario?.rol)}
            conSesion
          />
        ))}
      </div>
      <Paginacion
        etiqueta="Páginas de la lista de evidencias"
        pagina={pagina}
        totalPaginas={totalPaginas}
        rutaAnterior={pagina > 1 ? rutaDeEvidencias({ ...filtros, pagina: pagina - 1 }) : null}
        rutaSiguiente={
          pagina < totalPaginas ? rutaDeEvidencias({ ...filtros, pagina: pagina + 1 }) : null
        }
      />
    </>
  );
}

export default function PaginaEvidencias({ searchParams }: PageProps<"/portal/evidencias">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-medium tracking-tight">Evidencias</h1>
          <p className="mt-3 max-w-[70ch] text-tenue">
            Fotografías, informes, enlaces y productos que respaldan cada sesión. Una fotografía
            solo se muestra si todos los estudiantes que aparecen tienen la autorización de uso de
            imagen vigente.
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
        <Suspense fallback={<EsqueletoResumenDeEvidencias />}>
          <Resumen parametros={searchParams} />
        </Suspense>
        <div className="mt-8">
          <ZonaDeResultados>
            <Suspense fallback={<EsqueletoLista mensaje="Cargando la lista de evidencias." />}>
              <Resultados parametros={searchParams} />
            </Suspense>
          </ZonaDeResultados>
        </div>
      </ProveedorDeBusqueda>
    </div>
  );
}
