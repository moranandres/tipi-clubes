import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlert, SearchX, ShieldAlert, UserPlus, UsersRound } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import {
  BotonReintentar,
  ProveedorDeBusqueda,
  ZonaDeResultados,
} from "@/components/portal/Busqueda";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { AvisoSinAcceso } from "@/components/portal/formularios/AvisosDeGestion";
import { Paginacion } from "@/components/portal/Paginacion";
import { FiltrosUsuarios } from "@/components/portal/usuarios/FiltrosUsuarios";
import {
  EsqueletoResumenDeUsuarios,
  ResumenDeUsuarios,
} from "@/components/portal/usuarios/ResumenDeUsuarios";
import { TablaUsuarios } from "@/components/portal/usuarios/TablaUsuarios";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { listarInstitucionesParaFiltro } from "@/lib/api/clubes";
import { contarUsuariosPorEstado, listarUsuarios } from "@/lib/api/usuarios";
import {
  RUTA_USUARIOS,
  USUARIOS_POR_PAGINA,
  hayFiltrosDeUsuarios,
  leerFiltrosDeUsuarios,
  rutaDeUsuarios,
} from "@/lib/portal/filtros-usuarios";
import type { ParametrosDeBusqueda } from "@/lib/portal/parametros";
import { puedeAdministrarUsuarios } from "@/lib/portal/permisos";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Usuarios",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const ANCHOS_DE_FILTROS = ["md:min-w-[16rem] md:flex-1", "md:w-56", "md:w-64", "md:w-40"];

async function AccionPrincipal() {
  const usuario = await exigirSesion();

  if (!puedeAdministrarUsuarios(usuario?.rol)) {
    return null;
  }

  return (
    <EnlaceBoton href={`${RUTA_USUARIOS}/nuevo`} className="shrink-0">
      <UserPlus aria-hidden="true" size={18} />
      Nueva cuenta
    </EnlaceBoton>
  );
}

async function Filtros({ parametros }: PropsConParametros) {
  const [filtros, instituciones] = await Promise.all([
    parametros.then(leerFiltrosDeUsuarios),
    listarInstitucionesParaFiltro(),
  ]);

  return <FiltrosUsuarios filtros={filtros} instituciones={instituciones} />;
}

async function Resumen({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeUsuarios(await parametros);
  const conteos = await contarUsuariosPorEstado(filtros);

  return <ResumenDeUsuarios filtros={filtros} conteos={conteos} />;
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeUsuarios(await parametros);
  const [sesion, resultado] = await Promise.all([exigirSesion(), listarUsuarios(filtros)]);

  if (resultado.estado === "sin-servicio") {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar las cuentas"
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
    redirect(rutaDeUsuarios({ ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosDeUsuarios(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo="Ninguna cuenta coincide con los filtros"
        accion={
          <Link href={RUTA_USUARIOS} className="font-medium text-acento">
            Ver todas las cuentas
          </Link>
        }
      >
        Prueba con otro nombre, usuario o correo, o cambia el rol, la institución o el estado.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<UsersRound size={20} />} titulo="Todavía no hay cuentas">
        Usa el botón Nueva cuenta para dar acceso al portal a la primera persona.
      </AvisoDeLista>
    );
  }

  const instituciones = new Map(
    (await listarInstitucionesParaFiltro()).flatMap((institucion) =>
      typeof institucion.id === "number" ? [[institucion.id, institucion.nombre ?? ""]] : [],
    ),
  );
  const primero = (pagina - 1) * USUARIOS_POR_PAGINA + 1;
  const ultimo = primero + elementos.length - 1;

  return (
    <>
      <p role="status" className="cifras text-[0.9375rem] text-tenue">
        {total === 1 ? "1 cuenta" : `${FORMATO_NUMERO.format(total)} cuentas`}
        {totalPaginas > 1 ? `, de la ${primero} a la ${ultimo}` : ""}.
      </p>
      <div className="mt-4">
        <TablaUsuarios
          usuarios={elementos}
          instituciones={instituciones}
          idPropio={sesion?.id}
        />
      </div>
      <Paginacion
        etiqueta="Páginas de la lista de cuentas"
        pagina={pagina}
        totalPaginas={totalPaginas}
        rutaAnterior={pagina > 1 ? rutaDeUsuarios({ ...filtros, pagina: pagina - 1 }) : null}
        rutaSiguiente={
          pagina < totalPaginas ? rutaDeUsuarios({ ...filtros, pagina: pagina + 1 }) : null
        }
      />
    </>
  );
}

async function Contenido({ parametros }: PropsConParametros) {
  const usuario = await exigirSesion();

  if (usuario && !puedeAdministrarUsuarios(usuario.rol)) {
    return <AvisoSinAcceso quienes="el administrador del sistema" />;
  }

  return (
    <>
      <Suspense fallback={<EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />}>
        <Filtros parametros={parametros} />
      </Suspense>
      <Suspense fallback={<EsqueletoResumenDeUsuarios />}>
        <Resumen parametros={parametros} />
      </Suspense>
      <div className="mt-8">
        <ZonaDeResultados>
          <Suspense fallback={<EsqueletoLista mensaje="Cargando la lista de cuentas." />}>
            <Resultados parametros={parametros} />
          </Suspense>
        </ZonaDeResultados>
      </div>
    </>
  );
}

export default function PaginaUsuarios({ searchParams }: PageProps<"/portal/usuarios">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-medium tracking-tight">Usuarios</h1>
          <p className="mt-3 max-w-[70ch] text-tenue">
            Cuentas de acceso al portal, con su rol, su institución y su estado.
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
              <EsqueletoResumenDeUsuarios />
              <div className="mt-8">
                <EsqueletoLista mensaje="Cargando la lista de cuentas." />
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
