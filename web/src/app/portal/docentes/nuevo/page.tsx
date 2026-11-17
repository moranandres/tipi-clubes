import type { Metadata } from "next";
import { Suspense } from "react";
import { FormularioDocente } from "@/components/portal/docentes/FormularioDocente";
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
import {
  listarInstitucionesParaFiltro,
  listarInstitucionesParaFormulario,
} from "@/lib/api/clubes";
import { listarCuentasDisponibles } from "@/lib/api/docentes";
import { RUTA_DOCENTES } from "@/lib/portal/filtros-docentes";
import { opcionesConNombre, opcionesDeCuentas } from "@/lib/portal/opciones";
import { puedeElegirInstitucion, puedeGestionarDocentes } from "@/lib/portal/permisos";
import type { DatosDeDocente } from "@/lib/portal/reglas-docentes";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Nuevo docente",
};

const RECURSO = { recurso: "docentes", rutaDeLista: RUTA_DOCENTES };

async function Contenido() {
  const usuario = await exigirSesion();

  if (!usuario) {
    return <AvisoSinServicio />;
  }
  if (!puedeGestionarDocentes(usuario.rol)) {
    return <AvisoSoloLectura {...RECURSO} />;
  }

  const eligeInstitucion = puedeElegirInstitucion(usuario.rol);
  const institucionPropia = usuario.institucionId ?? null;

  if (!eligeInstitucion && !institucionPropia) {
    return (
      <AvisoDeRequisito titulo="Tu cuenta no tiene una institución asignada" {...RECURSO}>
        Pide a la administración de TIPI 3.0 que vincule tu usuario con tu institución para poder
        registrar docentes.
      </AvisoDeRequisito>
    );
  }

  const [instituciones, cuentas] = await Promise.all([
    eligeInstitucion ? listarInstitucionesParaFormulario() : listarInstitucionesParaFiltro(),
    institucionPropia && !eligeInstitucion ? listarCuentasDisponibles(institucionPropia, null) : [],
  ]);

  if (!instituciones || !cuentas) {
    return <AvisoSinServicio />;
  }

  if (eligeInstitucion && instituciones.length === 0) {
    return (
      <AvisoDeRequisito titulo="Todavía no hay instituciones" {...RECURSO}>
        Registra primero la institución educativa a la que pertenecerá el docente.
      </AvisoDeRequisito>
    );
  }

  const propia = instituciones.find((institucion) => institucion.id === institucionPropia);

  const iniciales: DatosDeDocente = {
    institucionId: eligeInstitucion ? "" : String(institucionPropia),
    nombres: "",
    apellidos: "",
    correo: "",
    telefono: "",
    usuarioId: "",
  };

  return (
    <div className="mt-8 max-w-[52rem]">
      <FormularioDocente
        docenteId={null}
        iniciales={iniciales}
        instituciones={eligeInstitucion ? opcionesConNombre(instituciones) : null}
        institucionFija={propia?.nombre ?? "Tu institución"}
        cuentas={opcionesDeCuentas(cuentas)}
      />
    </div>
  );
}

export default function PaginaNuevoDocente() {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_DOCENTES}>Volver a docentes</EnlaceVolver>
      <EncabezadoDeGestion
        titulo="Nuevo docente"
        detalle="El docente queda activo y disponible para asignarle clubes de su institución."
      />
      <Suspense fallback={<EsqueletoDeGestion mensaje="Cargando el formulario del docente." />}>
        <Contenido />
      </Suspense>
    </div>
  );
}
