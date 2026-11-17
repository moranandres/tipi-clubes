import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CircleAlert, Plus, SearchX, ShieldAlert } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import {
  BotonReintentar,
  ProveedorDeBusqueda,
  ZonaDeResultados,
} from "@/components/portal/Busqueda";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { FiltrosInstituciones } from "@/components/portal/instituciones/FiltrosInstituciones";
import {
  EsqueletoResumenDeInstituciones,
  ResumenDeInstituciones,
} from "@/components/portal/instituciones/ResumenDeInstituciones";
import { TablaInstituciones } from "@/components/portal/instituciones/TablaInstituciones";
import { Paginacion } from "@/components/portal/Paginacion";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { contarInstitucionesPorEstado, listarInstituciones } from "@/lib/api/instituciones";
import {
  INSTITUCIONES_POR_PAGINA,
  RUTA_INSTITUCIONES,
  hayFiltrosDeInstituciones,
  leerFiltrosDeInstituciones,
  rutaDeInstituciones,
} from "@/lib/portal/filtros-instituciones";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import type { ParametrosDeBusqueda } from "@/lib/portal/parametros";
import { puedeAdministrarInstituciones } from "@/lib/portal/permisos";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Instituciones",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const ANCHOS_DE_FILTROS = ["md:min-w-[16rem] md:flex-1", "md:w-48"];

async function AccionPrincipal() {
  const usuario = await exigirSesion();

  if (!puedeAdministrarInstituciones(usuario?.rol)) {
    return null;
  }

  return (
    <EnlaceBoton href={`${RUTA_INSTITUCIONES}/nueva`} className="shrink-0">
      <Plus aria-hidden="true" size={18} />
      Nueva institución
    </EnlaceBoton>
  );
}

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeInstituciones(await parametros);

  return <FiltrosInstituciones filtros={filtros} />;
}

async function Resumen({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeInstituciones(await parametros);
  const conteos = await contarInstitucionesPorEstado(filtros);

  return <ResumenDeInstituciones filtros={filtros} conteos={conteos} />;
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeInstituciones(await parametros);
  const [usuario, resultado] = await Promise.all([exigirSesion(), listarInstituciones(filtros)]);

  if (resultado.estado === "sin-servicio") {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar las instituciones"
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
  const gestionable = puedeAdministrarInstituciones(usuario?.rol);

  if (elementos.length === 0 && total > 0) {
    redirect(rutaDeInstituciones({ ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosDeInstituciones(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo="Ninguna institución coincide con los filtros"
        accion={
          <Link href={RUTA_INSTITUCIONES} className="font-medium text-acento">
            Ver todas las instituciones
          </Link>
        }
      >
        Prueba con otro nombre o código AMIE, o cambia el estado de adhesión.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<Building2 size={20} />} titulo="Todavía no hay instituciones">
        {gestionable
          ? "Usa el botón Nueva institución para registrar la primera con su código AMIE."
          : "Cuando se registre la primera institución aparecerá en esta lista."}
      </AvisoDeLista>
    );
  }

  const primero = (pagina - 1) * INSTITUCIONES_POR_PAGINA + 1;
  const ultimo = primero + elementos.length - 1;

  return (
    <>
      <p role="status" className="cifras text-[0.9375rem] text-tenue">
        {total === 1
          ? "1 institución registrada"
          : `${FORMATO_NUMERO.format(total)} instituciones registradas`}
        {totalPaginas > 1 ? `, de la ${primero} a la ${ultimo}` : ""}.
      </p>
      <div className="mt-4">
        <TablaInstituciones instituciones={elementos} gestionable={gestionable} />
      </div>
      <Paginacion
        etiqueta="Páginas de la lista de instituciones"
        pagina={pagina}
        totalPaginas={totalPaginas}
        rutaAnterior={pagina > 1 ? rutaDeInstituciones({ ...filtros, pagina: pagina - 1 }) : null}
        rutaSiguiente={
          pagina < totalPaginas ? rutaDeInstituciones({ ...filtros, pagina: pagina + 1 }) : null
        }
      />
    </>
  );
}

async function Contenido({ parametros }: PropsConParametros) {
  const usuario = await exigirSesion();

  if (usuario && !tieneAlcanceGlobal(usuario.rol)) {
    if (usuario.institucionId) {
      redirect(`${RUTA_INSTITUCIONES}/${usuario.institucionId}`);
    }
    return (
      <div className="mt-8">
        <AvisoDeLista icono={<CircleAlert size={20} />} titulo="Tu cuenta no tiene una institución asignada">
          Pide a la administración de TIPI 3.0 que vincule tu usuario con tu institución.
        </AvisoDeLista>
      </div>
    );
  }

  return (
    <ProveedorDeBusqueda>
      <Suspense fallback={<EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />}>
        <Filtros parametros={parametros} />
      </Suspense>
      <Suspense fallback={<EsqueletoResumenDeInstituciones />}>
        <Resumen parametros={parametros} />
      </Suspense>
      <div className="mt-8">
        <ZonaDeResultados>
          <Suspense fallback={<EsqueletoLista mensaje="Cargando la lista de instituciones." />}>
            <Resultados parametros={parametros} />
          </Suspense>
        </ZonaDeResultados>
      </div>
    </ProveedorDeBusqueda>
  );
}

export default function PaginaInstituciones({ searchParams }: PageProps<"/portal/instituciones">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-medium tracking-tight">Instituciones</h1>
          <p className="mt-3 max-w-[70ch] text-tenue">
            Unidades educativas fiscales adheridas a TIPI 3.0, con su código AMIE, su ubicación y
            su responsable institucional.
          </p>
        </div>
        <Suspense fallback={null}>
          <AccionPrincipal />
        </Suspense>
      </div>
      <Suspense
        fallback={
          <>
            <EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />
            <EsqueletoResumenDeInstituciones />
            <div className="mt-8">
              <EsqueletoLista mensaje="Cargando la lista de instituciones." />
            </div>
          </>
        }
      >
        <Contenido parametros={searchParams} />
      </Suspense>
    </div>
  );
}
