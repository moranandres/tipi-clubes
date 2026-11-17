import type { Metadata } from "next";
import { Suspense } from "react";
import { FormularioEstudiante } from "@/components/portal/estudiantes/FormularioEstudiante";
import {
  AvisoDeRequisito,
  AvisoSinServicio,
  AvisoSoloLectura,
} from "@/components/portal/formularios/AvisosDeGestion";
import {
  CONTENEDOR_DE_GESTION,
  EncabezadoDeGestion,
  EnlaceVolver,
  EsqueletoDeGestion,
} from "@/components/portal/formularios/PiezasDeGestion";
import { listarInstitucionesParaFormulario } from "@/lib/api/clubes";
import { RUTA_ESTUDIANTES } from "@/lib/portal/filtros-estudiantes";
import { opcionesConNombre } from "@/lib/portal/opciones";
import { puedeElegirInstitucion, puedeRegistrarEstudiantes } from "@/lib/portal/permisos";
import type { DatosDeEstudiante } from "@/lib/portal/reglas-estudiantes";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Nuevo estudiante",
};

const RECURSO = { recurso: "estudiantes", rutaDeLista: RUTA_ESTUDIANTES };
const QUIENES_REGISTRAN = "el administrador, el responsable institucional y el docente coordinador";

async function Contenido() {
  const usuario = await exigirSesion();

  if (!usuario) {
    return <AvisoSinServicio />;
  }
  if (!puedeRegistrarEstudiantes(usuario.rol)) {
    return <AvisoSoloLectura {...RECURSO} quienes={QUIENES_REGISTRAN} />;
  }

  const eligeInstitucion = puedeElegirInstitucion(usuario.rol);
  const institucionPropia = usuario.institucionId ?? null;

  if (!eligeInstitucion && !institucionPropia) {
    return (
      <AvisoDeRequisito titulo="Tu cuenta no tiene una institución asignada" {...RECURSO}>
        Para registrar estudiantes tu usuario debe pertenecer a una institución. Pide al
        administrador que la asigne.
      </AvisoDeRequisito>
    );
  }

  const instituciones = await listarInstitucionesParaFormulario();

  if (!instituciones) {
    return <AvisoSinServicio />;
  }

  if (eligeInstitucion && instituciones.length === 0) {
    return (
      <AvisoDeRequisito titulo="Todavía no hay instituciones" {...RECURSO}>
        Un estudiante siempre pertenece a una institución. Regístrala primero en la sección
        Instituciones.
      </AvisoDeRequisito>
    );
  }

  const propia = instituciones.find((institucion) => institucion.id === institucionPropia);
  const opciones = eligeInstitucion ? opcionesConNombre(instituciones) : null;

  const iniciales: DatosDeEstudiante = {
    institucionId: eligeInstitucion
      ? opciones?.length === 1
        ? opciones[0].valor
        : ""
      : String(institucionPropia),
    nombres: "",
    apellidos: "",
    curso: "",
  };

  return (
    <div className="mt-8 max-w-[52rem]">
      <FormularioEstudiante
        estudianteId={null}
        iniciales={iniciales}
        instituciones={opciones}
        institucionFija={propia?.nombre ?? "Tu institución"}
      />
    </div>
  );
}

export default function PaginaNuevoEstudiante() {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_ESTUDIANTES}>Volver a estudiantes</EnlaceVolver>
      <EncabezadoDeGestion
        titulo="Nuevo estudiante"
        detalle="El sistema asigna un código interno al guardar. Después registra la autorización de participación firmada por su representante: sin ella no se puede aprobar su inscripción a un club."
      />
      <Suspense fallback={<EsqueletoDeGestion mensaje="Cargando el formulario del estudiante." />}>
        <Contenido />
      </Suspense>
    </div>
  );
}
