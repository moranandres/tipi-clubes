import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { Suspense } from "react";
import { EstadoDelContenido } from "@/components/portal/contenidos/EstadoDelContenido";
import { FormularioContenido } from "@/components/portal/contenidos/FormularioContenido";
import {
  AvisoDenegado,
  AvisoNoEncontrado,
  AvisoSinAcceso,
  AvisoSinServicio,
} from "@/components/portal/formularios/AvisosDeGestion";
import {
  AvisoDeResultado,
  COLUMNAS_DE_GESTION,
  CONTENEDOR_DE_GESTION,
  EncabezadoDeGestion,
  EnlaceVolver,
  EsqueletoDeGestion,
} from "@/components/portal/formularios/PiezasDeGestion";
import type { Contenido as ContenidoDelCatalogo } from "@/lib/api/actividades";
import { obtenerContenido } from "@/lib/api/contenidos";
import { FILTROS_DE_AUDITORIA_VACIOS, rutaDeAuditoria } from "@/lib/portal/filtros-auditoria";
import {
  NOMBRE_DE_TIPO_EN_SINGULAR,
  RUTA_CONTENIDOS,
  estadoDeContenido,
} from "@/lib/portal/filtros-contenidos";
import { puedeAdministrarContenidos } from "@/lib/portal/permisos";
import type { DatosDeContenido } from "@/lib/portal/reglas-contenidos";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Contenido del catálogo",
};

type Props = PageProps<"/portal/contenidos/[id]">;

const RECURSO = { recurso: "contenidos", rutaDeLista: RUTA_CONTENIDOS };
const NO_ENCONTRADO = "Este contenido no existe";
const AVISO_CREADO = "creado";

function datosDe(contenido: ContenidoDelCatalogo): DatosDeContenido {
  return {
    tipo: contenido.tipo ?? "",
    nombre: contenido.nombre ?? "",
    descripcion: contenido.descripcion ?? "",
  };
}

function usoDe(actividades: number): string {
  if (actividades === 0) {
    return "Todavía no se usa en actividades";
  }
  return actividades === 1 ? "Se usa en 1 actividad" : `Se usa en ${actividades} actividades`;
}

async function Ficha({ params, searchParams }: Props) {
  const [{ id: segmento }, consulta, usuario] = await Promise.all([
    params,
    searchParams,
    exigirSesion(),
  ]);
  const id = idDe(segmento);

  if (!usuario) {
    return <AvisoSinServicio />;
  }
  if (!puedeAdministrarContenidos(usuario.rol)) {
    return <AvisoSinAcceso quienes="el administrador del sistema" />;
  }
  if (!id) {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADO} {...RECURSO} />;
  }

  const resultado = await obtenerContenido(id);

  if (resultado.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADO} {...RECURSO} />;
  }
  if (resultado.estado === "denegado") {
    return <AvisoDenegado mensaje={resultado.mensaje} {...RECURSO} />;
  }
  if (resultado.estado === "sin-servicio") {
    return <AvisoSinServicio />;
  }

  const contenido = resultado.datos;
  const actividades = contenido.actividades ?? 0;

  return (
    <>
      <EncabezadoDeGestion
        titulo={contenido.nombre ?? "Contenido"}
        detalle={[contenido.tipo ? NOMBRE_DE_TIPO_EN_SINGULAR[contenido.tipo] : null, usoDe(actividades)]
          .filter(Boolean)
          .join(" · ")}
      />
      {consulta.aviso === AVISO_CREADO ? (
        <AvisoDeResultado>
          El contenido se agregó y ya aparece al planificar actividades.
        </AvisoDeResultado>
      ) : null}
      <div className={COLUMNAS_DE_GESTION}>
        <div className="min-w-0">
          <FormularioContenido
            key={id}
            contenidoId={id}
            iniciales={datosDe(contenido)}
            actividades={actividades}
          />
          <Link
            href={rutaDeAuditoria({
              ...FILTROS_DE_AUDITORIA_VACIOS,
              entidad: "CONTENIDO",
              registro: id,
            })}
            className="mt-6 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-acento"
          >
            <History aria-hidden="true" size={16} />
            Ver su historial en la auditoría
          </Link>
        </div>
        <EstadoDelContenido
          contenidoId={id}
          estado={estadoDeContenido(contenido.activo)}
          actividades={actividades}
        />
      </div>
    </>
  );
}

export default function PaginaContenidoDelCatalogo(props: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_CONTENIDOS}>Volver al catálogo de contenidos</EnlaceVolver>
      <Suspense fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando el contenido." />}>
        <Ficha {...props} />
      </Suspense>
    </div>
  );
}
