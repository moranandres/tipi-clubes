import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookMarked, CircleAlert, Plus, SearchX, ShieldAlert, Trophy } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import {
  BotonReintentar,
  ProveedorDeBusqueda,
  ZonaDeResultados,
} from "@/components/portal/Busqueda";
import { FiltrosParticipaciones } from "@/components/portal/competencias/FiltrosParticipaciones";
import {
  EsqueletoResumenDeParticipaciones,
  ResumenDeParticipaciones,
} from "@/components/portal/competencias/ResumenDeParticipaciones";
import { TablaParticipaciones } from "@/components/portal/competencias/TablaParticipaciones";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { AvisoDeResultado } from "@/components/portal/formularios/PiezasDeGestion";
import { Paginacion } from "@/components/portal/Paginacion";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { listarOpcionesDeClubes } from "@/lib/api/actividades";
import { listarInstitucionesParaFiltro } from "@/lib/api/clubes";
import {
  contarParticipacionesPorNivel,
  listarCompetencias,
  listarEdiciones,
  listarParticipaciones,
} from "@/lib/api/competencias";
import {
  PARTICIPACIONES_POR_PAGINA,
  RUTA_CATALOGO_DE_COMPETENCIAS,
  RUTA_COMPETENCIAS,
  RUTA_NUEVA_PARTICIPACION,
  hayFiltrosDeParticipaciones,
  leerFiltrosDeParticipaciones,
  rutaDeParticipaciones,
} from "@/lib/portal/filtros-competencias";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { opcionesConNombre } from "@/lib/portal/opciones";
import type { ParametrosDeBusqueda } from "@/lib/portal/parametros";
import { esDocente, puedeRegistrarParticipaciones, soloVeDatosMinimos } from "@/lib/portal/permisos";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Competencias",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const ANCHOS_DE_FILTROS = ["md:min-w-[16rem] md:flex-1", "md:w-52", "md:w-52"];
const AVISO_ELIMINADA = "eliminada";

function alcanceDe(rol?: string): string {
  if (tieneAlcanceGlobal(rol)) {
    return "en todas las instituciones";
  }
  return esDocente(rol) ? "de tus clubes" : "en tu institución";
}

async function AccionesPrincipales() {
  const usuario = await exigirSesion();

  return (
    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
      <EnlaceBoton href={RUTA_CATALOGO_DE_COMPETENCIAS} variante="secundario">
        <BookMarked aria-hidden="true" size={18} />
        Catálogo de competencias
      </EnlaceBoton>
      {puedeRegistrarParticipaciones(usuario?.rol) ? (
        <EnlaceBoton href={RUTA_NUEVA_PARTICIPACION}>
          <Plus aria-hidden="true" size={18} />
          Registrar participación
        </EnlaceBoton>
      ) : null}
    </div>
  );
}

async function AvisoDeEliminacion({ parametros }: PropsConParametros) {
  const { aviso } = await parametros;
  return aviso === AVISO_ELIMINADA ? (
    <AvisoDeResultado>La participación se eliminó y el cambio quedó en la auditoría.</AvisoDeResultado>
  ) : null;
}

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeParticipaciones(await parametros);
  const usuario = await exigirSesion();
  const global = tieneAlcanceGlobal(usuario?.rol);
  const [instituciones, clubes, competencias, ediciones] = await Promise.all([
    global ? listarInstitucionesParaFiltro() : null,
    listarOpcionesDeClubes(global ? filtros.institucion : null),
    listarCompetencias(),
    filtros.competencia ? listarEdiciones(filtros.competencia) : null,
  ]);

  return (
    <FiltrosParticipaciones
      filtros={filtros}
      instituciones={instituciones ? opcionesConNombre(instituciones) : null}
      clubes={opcionesConNombre(clubes)}
      competencias={opcionesConNombre(competencias ?? [])}
      ediciones={(ediciones ?? []).map((edicion) => ({
        valor: String(edicion.id),
        texto: [edicion.nombre, edicion.anio].filter(Boolean).join(" · "),
      }))}
      minima={soloVeDatosMinimos(usuario?.rol)}
    />
  );
}

async function Resumen({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeParticipaciones(await parametros);
  const conteos = await contarParticipacionesPorNivel(filtros);

  return <ResumenDeParticipaciones filtros={filtros} conteos={conteos} />;
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeParticipaciones(await parametros);
  const [usuario, resultado] = await Promise.all([exigirSesion(), listarParticipaciones(filtros)]);

  if (resultado.estado === "sin-servicio") {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar las participaciones"
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
    redirect(rutaDeParticipaciones({ ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosDeParticipaciones(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo="Ninguna participación coincide con los filtros"
        accion={
          <Link href={RUTA_COMPETENCIAS} className="font-medium text-acento">
            Ver todas las participaciones
          </Link>
        }
      >
        Revisa lo que escribiste o cambia la competencia, la edición o el club.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<Trophy size={20} />} titulo="Todavía no hay participaciones">
        {puedeRegistrarParticipaciones(usuario?.rol)
          ? "Cuando un integrante del club represente a su institución en una competencia, regístralo con el botón Registrar participación."
          : "Cuando se registre la primera participación de un estudiante en una competencia aparecerá aquí."}
      </AvisoDeLista>
    );
  }

  const primero = (pagina - 1) * PARTICIPACIONES_POR_PAGINA + 1;
  const ultimo = primero + elementos.length - 1;

  return (
    <>
      <p role="status" className="cifras text-[0.9375rem] text-tenue">
        {total === 1
          ? `1 participación ${alcanceDe(usuario?.rol)}`
          : `${FORMATO_NUMERO.format(total)} participaciones ${alcanceDe(usuario?.rol)}`}
        {totalPaginas > 1 ? `, de la ${primero} a la ${ultimo}` : ""}.
      </p>
      <div className="mt-4">
        <TablaParticipaciones
          participaciones={elementos}
          minima={soloVeDatosMinimos(usuario?.rol)}
          mostrarInstitucion={tieneAlcanceGlobal(usuario?.rol)}
        />
      </div>
      <Paginacion
        etiqueta="Páginas de la lista de participaciones"
        pagina={pagina}
        totalPaginas={totalPaginas}
        rutaAnterior={pagina > 1 ? rutaDeParticipaciones({ ...filtros, pagina: pagina - 1 }) : null}
        rutaSiguiente={
          pagina < totalPaginas ? rutaDeParticipaciones({ ...filtros, pagina: pagina + 1 }) : null
        }
      />
    </>
  );
}

export default function PaginaCompetencias({ searchParams }: PageProps<"/portal/competencias">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-medium tracking-tight">Competencias</h1>
          <p className="mt-3 max-w-[70ch] text-tenue">
            Participación de los integrantes de los clubes en competencias de robótica y
            programación, con su equipo, categoría y resultado. Solo se inscriben estudiantes
            activos con la autorización de participación otorgada.
          </p>
        </div>
        <Suspense fallback={null}>
          <AccionesPrincipales />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <AvisoDeEliminacion parametros={searchParams} />
      </Suspense>
      <ProveedorDeBusqueda>
        <Suspense fallback={<EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />}>
          <Filtros parametros={searchParams} />
        </Suspense>
        <Suspense fallback={<EsqueletoResumenDeParticipaciones />}>
          <Resumen parametros={searchParams} />
        </Suspense>
        <div className="mt-8">
          <ZonaDeResultados>
            <Suspense fallback={<EsqueletoLista mensaje="Cargando las participaciones." />}>
              <Resultados parametros={searchParams} />
            </Suspense>
          </ZonaDeResultados>
        </div>
      </ProveedorDeBusqueda>
    </div>
  );
}
