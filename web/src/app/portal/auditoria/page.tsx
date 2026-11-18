import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlert, History, SearchX, ShieldAlert } from "lucide-react";
import { Suspense } from "react";
import { FiltrosAuditoria } from "@/components/portal/auditoria/FiltrosAuditoria";
import { ListaDeEventos, type EventoVisible } from "@/components/portal/auditoria/ListaDeEventos";
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
import { listarEventosDeAuditoria, type EventoDeAuditoria } from "@/lib/api/auditoria";
import {
  EVENTOS_POR_PAGINA,
  RUTA_AUDITORIA,
  enlaceDeEntidad,
  hayFiltrosDeAuditoria,
  interpretarDetalle,
  leerFiltrosDeAuditoria,
  nombreDeAccion,
  nombreDeEntidad,
  rutaDeAuditoria,
} from "@/lib/portal/filtros-auditoria";
import type { ParametrosDeBusqueda } from "@/lib/portal/parametros";
import { puedeAdministrarUsuarios, puedeConsultarAuditoria } from "@/lib/portal/permisos";
import { momentoCorto } from "@/lib/portal/tiempo";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Auditoría",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const ANCHOS_DE_FILTROS = [
  "md:min-w-[16rem] md:flex-1",
  "md:w-60",
  "md:w-72",
  "md:w-44",
  "md:w-44",
];

function visible(evento: EventoDeAuditoria, esAdministrador: boolean): EventoVisible {
  return {
    id: evento.id ?? 0,
    momento: momentoCorto(evento.fecha),
    identificador: evento.identificador || "Sistema",
    usuarioId: evento.usuarioId ?? null,
    ip: evento.ip ?? null,
    accion: nombreDeAccion(evento.accion),
    codigoDeAccion: evento.accion ?? "",
    entidad: evento.entidad ? nombreDeEntidad(evento.entidad) : null,
    entidadId: evento.entidadId ?? null,
    enlace: enlaceDeEntidad(evento.entidad, evento.entidadId, esAdministrador),
    detalle: interpretarDetalle(evento.detalle),
  };
}

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeAuditoria(await parametros);
  return <FiltrosAuditoria filtros={filtros} />;
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeAuditoria(await parametros);
  const [sesion, resultado] = await Promise.all([exigirSesion(), listarEventosDeAuditoria(filtros)]);

  if (resultado.estado === "sin-servicio") {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar la auditoría"
        accion={<BotonReintentar />}
      >
        El servidor de TIPI 3.0 no responde en este momento. Tu sesión sigue guardada y los
        filtros se conservan.
      </AvisoDeLista>
    );
  }

  if (resultado.estado === "denegado") {
    return (
      <AvisoDeLista urgente icono={<ShieldAlert size={20} />} titulo="No tienes acceso a la auditoría">
        {resultado.mensaje}
      </AvisoDeLista>
    );
  }

  const { elementos, total, pagina, totalPaginas } = resultado.datos;

  if (elementos.length === 0 && total > 0) {
    redirect(rutaDeAuditoria({ ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosDeAuditoria(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo="Ningún evento coincide con los filtros"
        accion={
          <Link href={RUTA_AUDITORIA} className="font-medium text-acento">
            Ver todos los eventos
          </Link>
        }
      >
        Prueba con otro usuario, amplía el rango de fechas o quita la acción elegida.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<History size={20} />} titulo="Todavía no hay eventos registrados">
        Cada inicio de sesión y cada cambio en el sistema quedará anotado aquí.
      </AvisoDeLista>
    );
  }

  const esAdministrador = puedeAdministrarUsuarios(sesion?.rol);
  const primero = (pagina - 1) * EVENTOS_POR_PAGINA + 1;
  const ultimo = primero + elementos.length - 1;

  return (
    <>
      <p role="status" className="cifras text-[0.9375rem] text-tenue">
        {total === 1 ? "1 evento" : `${FORMATO_NUMERO.format(total)} eventos`}
        {totalPaginas > 1 ? `, del ${primero} al ${ultimo}` : ""}, del más reciente al más antiguo.
      </p>
      <div className="mt-4">
        <ListaDeEventos eventos={elementos.map((evento) => visible(evento, esAdministrador))} />
      </div>
      <Paginacion
        etiqueta="Páginas de la auditoría"
        pagina={pagina}
        totalPaginas={totalPaginas}
        rutaAnterior={pagina > 1 ? rutaDeAuditoria({ ...filtros, pagina: pagina - 1 }) : null}
        rutaSiguiente={
          pagina < totalPaginas ? rutaDeAuditoria({ ...filtros, pagina: pagina + 1 }) : null
        }
      />
    </>
  );
}

async function Contenido({ parametros }: PropsConParametros) {
  const usuario = await exigirSesion();

  if (usuario && !puedeConsultarAuditoria(usuario.rol)) {
    return <AvisoSinAcceso quienes="el administrador y el rol de consulta" />;
  }

  return (
    <>
      <Suspense fallback={<EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />}>
        <Filtros parametros={parametros} />
      </Suspense>
      <div className="mt-8">
        <ZonaDeResultados>
          <Suspense fallback={<EsqueletoLista mensaje="Cargando los eventos de la auditoría." />}>
            <Resultados parametros={parametros} />
          </Suspense>
        </ZonaDeResultados>
      </div>
    </>
  );
}

export default function PaginaAuditoria({ searchParams }: PageProps<"/portal/auditoria">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <h1 className="text-3xl font-medium tracking-tight">Auditoría</h1>
      <p className="mt-3 max-w-[70ch] text-tenue">
        Registro inalterable de los accesos y de cada cambio hecho en el sistema: quién lo hizo,
        cuándo, desde qué dirección y qué datos cambiaron. Solo se consulta; nadie puede editarlo.
      </p>
      <ProveedorDeBusqueda>
        <Suspense
          fallback={
            <>
              <EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />
              <div className="mt-8">
                <EsqueletoLista mensaje="Cargando los eventos de la auditoría." />
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
