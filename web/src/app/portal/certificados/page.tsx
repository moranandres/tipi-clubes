import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlert, ClipboardCheck, FileBadge, SearchX, ShieldAlert } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import {
  BotonReintentar,
  ProveedorDeBusqueda,
  ZonaDeResultados,
} from "@/components/portal/Busqueda";
import { FiltrosCertificados } from "@/components/portal/certificados/FiltrosCertificados";
import {
  EsqueletoResumenDeCertificados,
  ResumenDeCertificados,
} from "@/components/portal/certificados/ResumenDeCertificados";
import { TablaCertificados } from "@/components/portal/certificados/TablaCertificados";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { Paginacion } from "@/components/portal/Paginacion";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { listarOpcionesDeClubes } from "@/lib/api/actividades";
import { contarCertificadosPorEstado, listarCertificados } from "@/lib/api/certificados";
import { listarInstitucionesParaFiltro } from "@/lib/api/clubes";
import {
  CERTIFICADOS_POR_PAGINA,
  RUTA_CERTIFICADOS,
  RUTA_EMITIR_CERTIFICADO,
  hayFiltrosDeCertificados,
  leerFiltrosDeCertificados,
  rutaDeCertificados,
} from "@/lib/portal/filtros-certificados";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { opcionesConNombre } from "@/lib/portal/opciones";
import type { ParametrosDeBusqueda } from "@/lib/portal/parametros";
import {
  esDocente,
  puedeEmitirCertificados,
  puedeRegistrarResultadosDeCurso,
  soloVeDatosMinimos,
} from "@/lib/portal/permisos";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Certificados",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const ANCHOS_DE_FILTROS = ["md:min-w-[16rem] md:flex-1", "md:w-52", "md:w-60", "md:w-44", "md:w-44"];

function alcanceDe(rol?: string): string {
  if (tieneAlcanceGlobal(rol)) {
    return "en todas las instituciones";
  }
  return esDocente(rol) ? "de tus clubes" : "en tu institución";
}

async function AccionPrincipal() {
  const usuario = await exigirSesion();

  if (puedeEmitirCertificados(usuario?.rol)) {
    return (
      <EnlaceBoton href={RUTA_EMITIR_CERTIFICADO} className="shrink-0">
        <FileBadge aria-hidden="true" size={18} />
        Emitir certificado
      </EnlaceBoton>
    );
  }
  if (puedeRegistrarResultadosDeCurso(usuario?.rol)) {
    return (
      <EnlaceBoton href={RUTA_EMITIR_CERTIFICADO} variante="secundario" className="shrink-0">
        <ClipboardCheck aria-hidden="true" size={18} />
        Resultados de cursos
      </EnlaceBoton>
    );
  }
  return null;
}

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeCertificados(await parametros);
  const usuario = await exigirSesion();
  const global = tieneAlcanceGlobal(usuario?.rol);
  const [instituciones, clubes] = await Promise.all([
    global ? listarInstitucionesParaFiltro() : null,
    listarOpcionesDeClubes(global ? filtros.institucion : null),
  ]);

  return (
    <FiltrosCertificados
      filtros={filtros}
      instituciones={instituciones ? opcionesConNombre(instituciones) : null}
      clubes={opcionesConNombre(clubes)}
      minima={soloVeDatosMinimos(usuario?.rol)}
    />
  );
}

async function Resumen({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeCertificados(await parametros);
  const conteos = await contarCertificadosPorEstado(filtros);

  return <ResumenDeCertificados filtros={filtros} conteos={conteos} />;
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeCertificados(await parametros);
  const [usuario, resultado] = await Promise.all([exigirSesion(), listarCertificados(filtros)]);

  if (resultado.estado === "sin-servicio") {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar los certificados"
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
  const anulados = filtros.estado === "ANULADO";

  if (elementos.length === 0 && total > 0) {
    redirect(rutaDeCertificados({ ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosDeCertificados(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo={anulados ? "No hay certificados anulados con esos filtros" : "Ningún certificado coincide con los filtros"}
        accion={
          <Link href={RUTA_CERTIFICADOS} className="font-medium text-acento">
            Ver todos los certificados
          </Link>
        }
      >
        Revisa lo que escribiste, cambia el tipo o el club, o amplía el rango de fechas.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<FileBadge size={20} />} titulo="Todavía no hay certificados">
        {puedeEmitirCertificados(usuario?.rol)
          ? "Los certificados se emiten al terminar un curso o al participar en una competencia. Usa el botón Emitir certificado."
          : "Cuando se emita el primer certificado aparecerá aquí."}
      </AvisoDeLista>
    );
  }

  const primero = (pagina - 1) * CERTIFICADOS_POR_PAGINA + 1;
  const ultimo = primero + elementos.length - 1;
  const estado = filtros.estado === "EMITIDO" ? "vigentes " : anulados ? "anulados " : "";

  return (
    <>
      <p role="status" className="cifras text-[0.9375rem] text-tenue">
        {total === 1
          ? `1 certificado ${estado.replace(/s $/, " ")}${alcanceDe(usuario?.rol)}`
          : `${FORMATO_NUMERO.format(total)} certificados ${estado}${alcanceDe(usuario?.rol)}`}
        {totalPaginas > 1 ? `, del ${primero} al ${ultimo}` : ""}.
      </p>
      <div className="mt-4">
        <TablaCertificados
          certificados={elementos}
          minima={soloVeDatosMinimos(usuario?.rol)}
          mostrarInstitucion={tieneAlcanceGlobal(usuario?.rol)}
        />
      </div>
      <Paginacion
        etiqueta="Páginas de la lista de certificados"
        pagina={pagina}
        totalPaginas={totalPaginas}
        rutaAnterior={pagina > 1 ? rutaDeCertificados({ ...filtros, pagina: pagina - 1 }) : null}
        rutaSiguiente={
          pagina < totalPaginas ? rutaDeCertificados({ ...filtros, pagina: pagina + 1 }) : null
        }
      />
    </>
  );
}

export default function PaginaCertificados({ searchParams }: PageProps<"/portal/certificados">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-medium tracking-tight">Certificados</h1>
          <p className="mt-3 max-w-[70ch] text-tenue">
            Certificados de participación y aprobación de cursos, y de participación y
            reconocimiento en competencias. Cada uno lleva un código de verificación y una huella
            SHA-256 de su PDF.
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
        <Suspense fallback={<EsqueletoResumenDeCertificados />}>
          <Resumen parametros={searchParams} />
        </Suspense>
        <div className="mt-8">
          <ZonaDeResultados>
            <Suspense fallback={<EsqueletoLista mensaje="Cargando los certificados." />}>
              <Resultados parametros={searchParams} />
            </Suspense>
          </ZonaDeResultados>
        </div>
      </ProveedorDeBusqueda>
    </div>
  );
}
