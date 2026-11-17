import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlert, FileSignature, SearchX, ShieldAlert } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import { FiltrosAutorizaciones } from "@/components/portal/autorizaciones/FiltrosAutorizaciones";
import {
  EsqueletoResumenDeAutorizaciones,
  ResumenDeAutorizaciones,
} from "@/components/portal/autorizaciones/ResumenDeAutorizaciones";
import { TablaAutorizaciones } from "@/components/portal/autorizaciones/TablaAutorizaciones";
import {
  BotonReintentar,
  ProveedorDeBusqueda,
  ZonaDeResultados,
} from "@/components/portal/Busqueda";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { Paginacion } from "@/components/portal/Paginacion";
import { contarAutorizacionesPorEstado, listarAutorizaciones } from "@/lib/api/autorizaciones";
import { listarInstitucionesParaFiltro } from "@/lib/api/clubes";
import { obtenerEstudiante } from "@/lib/api/estudiantes";
import {
  AUTORIZACIONES_POR_PAGINA,
  RUTA_AUTORIZACIONES,
  hayFiltrosDeAutorizaciones,
  leerFiltrosDeAutorizaciones,
  rutaDeAutorizaciones,
} from "@/lib/portal/filtros-autorizaciones";
import { identidadDe } from "@/lib/portal/identidad";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import type { ParametrosDeBusqueda } from "@/lib/portal/parametros";
import { puedeElegirInstitucion, puedeGestionarAutorizaciones } from "@/lib/portal/permisos";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Autorizaciones",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const ANCHOS_DE_FILTROS = ["md:w-72", "md:w-64"];

function alcanceDe(rol?: string): string {
  return tieneAlcanceGlobal(rol) ? "en todas las instituciones" : "de tu institución";
}

async function Acceso({ children }: { children: ReactNode }) {
  const usuario = await exigirSesion();

  if (usuario && !puedeGestionarAutorizaciones(usuario.rol)) {
    return (
      <div className="mt-8">
        <AvisoDeLista
          urgente
          icono={<ShieldAlert size={20} />}
          titulo="Tu rol no tiene acceso a las autorizaciones"
          accion={
            <Link href="/portal" className="font-medium text-acento">
              Volver al panel principal
            </Link>
          }
        >
          Las autorizaciones contienen datos personales de los representantes legales. Solo el
          administrador, el responsable institucional y el docente coordinador pueden consultarlas.
        </AvisoDeLista>
      </div>
    );
  }

  return children;
}

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeAutorizaciones(await parametros);
  const usuario = await exigirSesion();
  const [instituciones, estudiante] = await Promise.all([
    puedeElegirInstitucion(usuario?.rol) ? listarInstitucionesParaFiltro() : Promise.resolve(null),
    filtros.estudiante ? obtenerEstudiante(filtros.estudiante) : Promise.resolve(null),
  ]);

  const nombre =
    estudiante?.estado === "ok"
      ? identidadDe(
          {
            nombres: estudiante.datos.nombres,
            apellidos: estudiante.datos.apellidos,
            codigo: estudiante.datos.codigoInterno,
          },
          false,
        ).principal
      : null;

  return <FiltrosAutorizaciones filtros={filtros} instituciones={instituciones} estudiante={nombre} />;
}

async function Resumen({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeAutorizaciones(await parametros);
  const conteos = await contarAutorizacionesPorEstado(filtros);

  return <ResumenDeAutorizaciones filtros={filtros} conteos={conteos} />;
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeAutorizaciones(await parametros);
  const [usuario, resultado] = await Promise.all([exigirSesion(), listarAutorizaciones(filtros)]);

  if (resultado.estado === "sin-servicio") {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar las autorizaciones"
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
    redirect(rutaDeAutorizaciones({ ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosDeAutorizaciones(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo="Ninguna autorización coincide con los filtros"
        accion={
          <Link href={RUTA_AUTORIZACIONES} className="font-medium text-acento">
            Ver todas las autorizaciones
          </Link>
        }
      >
        Cambia el estado, el tipo o la institución, o quita el filtro por estudiante.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<FileSignature size={20} />} titulo="Todavía no hay autorizaciones">
        Cada estudiante registrado tiene dos autorizaciones pendientes: participación y uso de
        imagen. Aparecerán aquí en cuanto registres al primer estudiante.
      </AvisoDeLista>
    );
  }

  const primero = (pagina - 1) * AUTORIZACIONES_POR_PAGINA + 1;
  const ultimo = primero + elementos.length - 1;

  return (
    <>
      <p role="status" className="cifras text-[0.9375rem] text-tenue">
        {total === 1
          ? `1 autorización ${alcanceDe(usuario?.rol)}`
          : `${FORMATO_NUMERO.format(total)} autorizaciones ${alcanceDe(usuario?.rol)}`}
        {totalPaginas > 1 ? `, de la ${primero} a la ${ultimo}` : ""}.
      </p>
      <div className="mt-4">
        <TablaAutorizaciones
          autorizaciones={elementos}
          mostrarInstitucion={tieneAlcanceGlobal(usuario?.rol)}
        />
      </div>
      <Paginacion
        etiqueta="Páginas de la lista de autorizaciones"
        pagina={pagina}
        totalPaginas={totalPaginas}
        rutaAnterior={pagina > 1 ? rutaDeAutorizaciones({ ...filtros, pagina: pagina - 1 }) : null}
        rutaSiguiente={
          pagina < totalPaginas ? rutaDeAutorizaciones({ ...filtros, pagina: pagina + 1 }) : null
        }
      />
    </>
  );
}

function EsqueletoDeSeccion() {
  return (
    <>
      <EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />
      <EsqueletoResumenDeAutorizaciones />
      <div className="mt-8">
        <EsqueletoLista mensaje="Cargando las autorizaciones." />
      </div>
    </>
  );
}

export default function PaginaAutorizaciones({ searchParams }: PageProps<"/portal/autorizaciones">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="min-w-0">
        <h1 className="text-3xl font-medium tracking-tight">Autorizaciones</h1>
        <p className="mt-3 max-w-[70ch] text-tenue">
          El representante legal de cada estudiante firma dos autorizaciones: la de participación,
          obligatoria para aprobar su inscripción a un club, y la de uso de imagen, necesaria para
          publicar fotografías en las que aparezca. Aquí registras sus datos y el documento firmado.
        </p>
      </div>
      <Suspense fallback={<EsqueletoDeSeccion />}>
        <Acceso>
          <ProveedorDeBusqueda>
            <Suspense fallback={<EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />}>
              <Filtros parametros={searchParams} />
            </Suspense>
            <Suspense fallback={<EsqueletoResumenDeAutorizaciones />}>
              <Resumen parametros={searchParams} />
            </Suspense>
            <div className="mt-8">
              <ZonaDeResultados>
                <Suspense fallback={<EsqueletoLista mensaje="Cargando las autorizaciones." />}>
                  <Resultados parametros={searchParams} />
                </Suspense>
              </ZonaDeResultados>
            </div>
          </ProveedorDeBusqueda>
        </Acceso>
      </Suspense>
    </div>
  );
}
