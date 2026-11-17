import type { Metadata } from "next";
import { Suspense } from "react";
import { AvisoSinServicio, AvisoSoloLectura } from "@/components/portal/formularios/AvisosDeGestion";
import {
  CONTENEDOR_DE_GESTION,
  EncabezadoDeGestion,
  EnlaceVolver,
  EsqueletoDeGestion,
} from "@/components/portal/formularios/PiezasDeGestion";
import { FormularioPeriodo } from "@/components/portal/periodos/FormularioPeriodo";
import { puedeGestionarPeriodos } from "@/lib/portal/permisos";
import { RUTA_PERIODOS } from "@/lib/portal/reglas-periodos";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Nuevo período",
};

const RECURSO = { recurso: "períodos", rutaDeLista: RUTA_PERIODOS, quienes: "el administrador" };

async function Contenido() {
  const usuario = await exigirSesion();

  if (!usuario) {
    return <AvisoSinServicio />;
  }
  if (!puedeGestionarPeriodos(usuario.rol)) {
    return <AvisoSoloLectura {...RECURSO} />;
  }

  return (
    <div className="mt-8 max-w-[40rem]">
      <FormularioPeriodo periodoId={null} iniciales={{ nombre: "", fechaInicio: "", fechaFin: "" }} />
    </div>
  );
}

export default function PaginaNuevoPeriodo() {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_PERIODOS}>Volver a períodos</EnlaceVolver>
      <EncabezadoDeGestion
        titulo="Nuevo período"
        detalle="El período se registra como no vigente. Podrás marcarlo como vigente desde su página."
      />
      <Suspense fallback={<EsqueletoDeGestion mensaje="Cargando el formulario del período." />}>
        <Contenido />
      </Suspense>
    </div>
  );
}
