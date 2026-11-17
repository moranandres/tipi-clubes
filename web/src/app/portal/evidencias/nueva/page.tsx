import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlert, ClipboardList, SearchX, ShieldAlert } from "lucide-react";
import { Suspense } from "react";
import { FiltrosDeSesiones } from "@/components/portal/asistencia/FiltrosDeSesiones";
import { ListaDeSesiones } from "@/components/portal/asistencia/ListaDeSesiones";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import {
  BotonReintentar,
  ProveedorDeBusqueda,
  ZonaDeResultados,
} from "@/components/portal/Busqueda";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { AvisoSoloLectura } from "@/components/portal/formularios/AvisosDeGestion";
import {
  CONTENEDOR_DE_GESTION,
  EncabezadoDeGestion,
  EnlaceVolver,
} from "@/components/portal/formularios/PiezasDeGestion";
import { Paginacion } from "@/components/portal/Paginacion";
import { listarOpcionesDeClubes, listarSesionesEjecutadas } from "@/lib/api/actividades";
import { listarInstitucionesParaFiltro } from "@/lib/api/clubes";
import {
  SESIONES_POR_PAGINA,
  hayFiltrosDeSesiones,
  leerFiltrosDeSesiones,
  rutaDeSesiones,
} from "@/lib/portal/filtros-asistencia";
import { RUTA_EVIDENCIAS, RUTA_NUEVA_EVIDENCIA } from "@/lib/portal/filtros-evidencias";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { opcionesConNombre } from "@/lib/portal/opciones";
import type { ParametrosDeBusqueda } from "@/lib/portal/parametros";
import { puedeGestionarActividades } from "@/lib/portal/permisos";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Registrar evidencia",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const ANCHOS_DE_FILTROS = ["md:min-w-[16rem] md:flex-1", "md:w-44", "md:w-44"];
const QUIENES = "el administrador, el responsable institucional y el docente del club";

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeSesiones(await parametros);
  const usuario = await exigirSesion();
  if (!puedeGestionarActividades(usuario?.rol)) {
    return null;
  }
  const global = tieneAlcanceGlobal(usuario?.rol);
  const [instituciones, clubes] = await Promise.all([
    global ? listarInstitucionesParaFiltro() : null,
    listarOpcionesDeClubes(global ? filtros.institucion : null),
  ]);

  return (
    <FiltrosDeSesiones
      base={RUTA_NUEVA_EVIDENCIA}
      filtros={filtros}
      instituciones={instituciones ? opcionesConNombre(instituciones) : null}
      clubes={opcionesConNombre(clubes)}
    />
  );
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeSesiones(await parametros);
  const usuario = await exigirSesion();

  if (!puedeGestionarActividades(usuario?.rol)) {
    return <AvisoSoloLectura recurso="evidencias" rutaDeLista={RUTA_EVIDENCIAS} quienes={QUIENES} />;
  }

  const resultado = await listarSesionesEjecutadas(filtros, SESIONES_POR_PAGINA);

  if (resultado.estado === "sin-servicio") {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar las sesiones"
        accion={<BotonReintentar />}
      >
        El servidor de TIPI 3.0 no responde en este momento. Tu sesión sigue guardada.
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
    redirect(rutaDeSesiones(RUTA_NUEVA_EVIDENCIA, { ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosDeSesiones(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo="Ninguna sesión ejecutada coincide con los filtros"
        accion={
          <Link href={RUTA_NUEVA_EVIDENCIA} className="font-medium text-acento">
            Ver todas las sesiones
          </Link>
        }
      >
        Cambia el club o amplía el rango de fechas.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<ClipboardList size={20} />} titulo="Todavía no hay sesiones ejecutadas">
        Las evidencias se cargan en sesiones que ya tienen registrada su ejecución. Regístrala desde
        Actividades y sesiones.
      </AvisoDeLista>
    );
  }

  return (
    <>
      <ListaDeSesiones
        sesiones={elementos}
        destino="evidencias"
        gestiona
        mostrarInstitucion={tieneAlcanceGlobal(usuario?.rol)}
      />
      <Paginacion
        etiqueta="Páginas de la lista de sesiones"
        pagina={pagina}
        totalPaginas={totalPaginas}
        rutaAnterior={
          pagina > 1 ? rutaDeSesiones(RUTA_NUEVA_EVIDENCIA, { ...filtros, pagina: pagina - 1 }) : null
        }
        rutaSiguiente={
          pagina < totalPaginas
            ? rutaDeSesiones(RUTA_NUEVA_EVIDENCIA, { ...filtros, pagina: pagina + 1 })
            : null
        }
      />
    </>
  );
}

export default function PaginaNuevaEvidencia({ searchParams }: PageProps<"/portal/evidencias/nueva">) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_EVIDENCIAS}>Volver a evidencias</EnlaceVolver>
      <EncabezadoDeGestion
        titulo="Registrar evidencia"
        detalle="Elige la sesión ejecutada a la que pertenece la evidencia. Ahí subes el archivo o el enlace y relacionas a los estudiantes."
      />
      <ProveedorDeBusqueda>
        <Suspense fallback={<EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />}>
          <Filtros parametros={searchParams} />
        </Suspense>
        <div className="mt-8">
          <ZonaDeResultados>
            <Suspense fallback={<EsqueletoLista mensaje="Cargando las sesiones ejecutadas." />}>
              <Resultados parametros={searchParams} />
            </Suspense>
          </ZonaDeResultados>
        </div>
      </ProveedorDeBusqueda>
    </div>
  );
}
