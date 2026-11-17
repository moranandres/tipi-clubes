import type { Metadata } from "next";
import { Suspense } from "react";
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
  FormularioSolicitud,
  type OpcionesIniciales,
} from "@/components/portal/solicitudes/FormularioSolicitud";
import { consultarOpcionesDeClub } from "@/lib/acciones/solicitudes";
import { listarClubesParaFormulario, type Club } from "@/lib/api/clubes";
import { RUTA_SOLICITUDES } from "@/lib/portal/filtros-solicitudes";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";
import { primerValor } from "@/lib/portal/parametros";
import { puedeRegistrarSolicitudes } from "@/lib/portal/permisos";
import type { DatosDeSolicitud } from "@/lib/portal/reglas-solicitudes";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Nueva solicitud de inscripción",
};

type Props = PageProps<"/portal/solicitudes/nueva">;

const RECURSO = { recurso: "solicitudes", rutaDeLista: RUTA_SOLICITUDES };
const QUIENES_REGISTRAN = "el administrador, el responsable institucional y el docente coordinador";
const ESTADOS_ABIERTOS: readonly string[] = ["PLANIFICADO", "ACTIVO"];

function opcionDeClub(club: Club, conInstitucion: boolean): OpcionDeFormulario {
  return {
    valor: String(club.id),
    texto: [club.nombre ?? "Club", conInstitucion ? club.institucionNombre : null]
      .filter(Boolean)
      .join(" · "),
  };
}

async function Contenido({ searchParams }: Pick<Props, "searchParams">) {
  const [consulta, usuario] = await Promise.all([searchParams, exigirSesion()]);

  if (!usuario) {
    return <AvisoSinServicio />;
  }
  if (!puedeRegistrarSolicitudes(usuario.rol)) {
    return <AvisoSoloLectura {...RECURSO} quienes={QUIENES_REGISTRAN} />;
  }

  const clubes = await listarClubesParaFormulario();

  if (!clubes) {
    return <AvisoSinServicio />;
  }

  const abiertos = clubes.filter(
    (club) => typeof club.id === "number" && ESTADOS_ABIERTOS.includes(club.estado ?? ""),
  );

  if (abiertos.length === 0) {
    return (
      <AvisoDeRequisito titulo="No hay clubes abiertos" {...RECURSO}>
        Una solicitud siempre se registra para un club planificado o activo. Revisa la sección
        Clubes y vuelve a esta pantalla.
      </AvisoDeRequisito>
    );
  }

  const opciones = abiertos.map((club) => opcionDeClub(club, tieneAlcanceGlobal(usuario.rol)));
  const pedido = idDe(primerValor(consulta.club));
  const elegido =
    opciones.find((opcion) => opcion.valor === String(pedido))?.valor ??
    (opciones.length === 1 ? opciones[0].valor : "");

  let opcionesIniciales: OpcionesIniciales | null = null;
  if (elegido) {
    const cargadas = await consultarOpcionesDeClub(elegido);
    opcionesIniciales = cargadas.ok
      ? { estudiantes: cargadas.estudiantes, cursos: cargadas.cursos }
      : null;
  }

  const iniciales: DatosDeSolicitud = {
    clubId: opcionesIniciales ? elegido : "",
    estudianteId: "",
    cursoId: "",
    nivel: "",
    conocimientos: "",
    experienciaPrevia: "",
    motivacion: "",
  };

  return (
    <div className="mt-8 max-w-[52rem]">
      <FormularioSolicitud
        clubes={opciones}
        iniciales={iniciales}
        opcionesIniciales={opcionesIniciales}
      />
    </div>
  );
}

export default function PaginaNuevaSolicitud({ searchParams }: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_SOLICITUDES}>Volver a solicitudes</EnlaceVolver>
      <EncabezadoDeGestion
        titulo="Nueva solicitud de inscripción"
        detalle="La solicitud queda Pendiente. Otra persona con permiso de revisión la toma, comprueba los requisitos (entre ellos la autorización de participación) y la aprueba o la rechaza."
      />
      <Suspense fallback={<EsqueletoDeGestion mensaje="Cargando el formulario de la solicitud." />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
