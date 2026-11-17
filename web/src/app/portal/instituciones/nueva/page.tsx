import type { Metadata } from "next";
import { Suspense } from "react";
import { AvisoSinServicio, AvisoSoloLectura } from "@/components/portal/formularios/AvisosDeGestion";
import {
  CONTENEDOR_DE_GESTION,
  EncabezadoDeGestion,
  EnlaceVolver,
  EsqueletoDeGestion,
} from "@/components/portal/formularios/PiezasDeGestion";
import { FormularioInstitucion } from "@/components/portal/instituciones/FormularioInstitucion";
import { RUTA_INSTITUCIONES } from "@/lib/portal/filtros-instituciones";
import { puedeAdministrarInstituciones } from "@/lib/portal/permisos";
import type { DatosDeInstitucion } from "@/lib/portal/reglas-instituciones";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Nueva institución",
};

const RECURSO = {
  recurso: "instituciones",
  rutaDeLista: RUTA_INSTITUCIONES,
  quienes: "el administrador",
};

const INICIALES: DatosDeInstitucion = {
  codigoAmie: "",
  nombre: "",
  zona: "Zona 8",
  circuito: "",
  provincia: "Guayas",
  canton: "",
  direccion: "",
  telefono: "",
  correoContacto: "",
  autoridadNombre: "",
  autoridadCargo: "",
  estadoAdhesion: "PENDIENTE",
  fechaAdhesion: "",
};

async function Contenido() {
  const usuario = await exigirSesion();

  if (!usuario) {
    return <AvisoSinServicio />;
  }
  if (!puedeAdministrarInstituciones(usuario.rol)) {
    return <AvisoSoloLectura {...RECURSO} />;
  }

  return (
    <div className="mt-8 max-w-[52rem]">
      <FormularioInstitucion institucionId={null} iniciales={INICIALES} />
    </div>
  );
}

export default function PaginaNuevaInstitucion() {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_INSTITUCIONES}>Volver a instituciones</EnlaceVolver>
      <EncabezadoDeGestion
        titulo="Nueva institución"
        detalle="Registra la unidad educativa con su código AMIE. Después podrás asignarle su responsable institucional."
      />
      <Suspense fallback={<EsqueletoDeGestion mensaje="Cargando el formulario de la institución." />}>
        <Contenido />
      </Suspense>
    </div>
  );
}
