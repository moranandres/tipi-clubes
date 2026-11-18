import type { Metadata } from "next";
import { Suspense } from "react";
import { FormularioContenido } from "@/components/portal/contenidos/FormularioContenido";
import {
  AvisoSinAcceso,
  AvisoSinServicio,
} from "@/components/portal/formularios/AvisosDeGestion";
import {
  CONTENEDOR_DE_GESTION,
  EncabezadoDeGestion,
  EnlaceVolver,
  EsqueletoDeGestion,
} from "@/components/portal/formularios/PiezasDeGestion";
import { RUTA_CONTENIDOS } from "@/lib/portal/filtros-contenidos";
import { opcionValida, primerValor } from "@/lib/portal/parametros";
import { TIPOS_DE_CONTENIDO } from "@/lib/portal/filtros-actividades";
import { puedeAdministrarContenidos } from "@/lib/portal/permisos";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Nuevo contenido",
};

type Props = PageProps<"/portal/contenidos/nuevo">;

async function Contenido({ searchParams }: Props) {
  const [usuario, consulta] = await Promise.all([exigirSesion(), searchParams]);

  if (!usuario) {
    return <AvisoSinServicio />;
  }
  if (!puedeAdministrarContenidos(usuario.rol)) {
    return <AvisoSinAcceso quienes="el administrador del sistema" />;
  }

  const tipo = opcionValida(TIPOS_DE_CONTENIDO, primerValor(consulta.tipo)) ?? "";

  return (
    <div className="mt-8 max-w-[52rem]">
      <FormularioContenido
        contenidoId={null}
        iniciales={{ tipo, nombre: "", descripcion: "" }}
        actividades={0}
      />
    </div>
  );
}

export default function PaginaNuevoContenido(props: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_CONTENIDOS}>Volver al catálogo de contenidos</EnlaceVolver>
      <EncabezadoDeGestion
        titulo="Nuevo contenido"
        detalle="Queda activo y disponible enseguida para planificar actividades y registrar avances."
      />
      <Suspense fallback={<EsqueletoDeGestion mensaje="Cargando el formulario del contenido." />}>
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}
