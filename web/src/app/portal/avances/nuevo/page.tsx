import type { Metadata } from "next";
import { Suspense } from "react";
import { FormularioAvance } from "@/components/portal/avances/FormularioAvance";
import { AvisoDeRequisito, AvisoSinServicio, AvisoSoloLectura } from "@/components/portal/formularios/AvisosDeGestion";
import {
  CONTENEDOR_DE_GESTION,
  EncabezadoDeGestion,
  EnlaceVolver,
  EsqueletoDeGestion,
} from "@/components/portal/formularios/PiezasDeGestion";
import { armarClubesParaAvance, listarCompetenciasEvaluables } from "@/lib/api/avances";
import { listarClubesParaFormulario } from "@/lib/api/clubes";
import { ALCANCES_DE_AVANCE, RUTA_AVANCES } from "@/lib/portal/filtros-avances";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { opcionValida, primerValor } from "@/lib/portal/parametros";
import { puedeRegistrarAvances } from "@/lib/portal/permisos";
import type { DatosDeAvance } from "@/lib/portal/reglas-avances";
import { hoyEnGuayaquil } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Registrar avance",
};

type Props = PageProps<"/portal/avances/nuevo">;

const RECURSO = { recurso: "avances", rutaDeLista: RUTA_AVANCES };
const QUIENES = "el administrador, el responsable institucional y el docente del club";
const CLUBES_CON_AVANCES = ["ACTIVO", "SUSPENDIDO"];

async function Contenido({ searchParams }: Pick<Props, "searchParams">) {
  const [consulta, usuario] = await Promise.all([searchParams, exigirSesion()]);

  if (!usuario) {
    return <AvisoSinServicio />;
  }
  if (!puedeRegistrarAvances(usuario.rol)) {
    return <AvisoSoloLectura {...RECURSO} quienes={QUIENES} />;
  }

  const [clubes, catalogo] = await Promise.all([listarClubesParaFormulario(), listarCompetenciasEvaluables()]);
  if (!clubes || !catalogo) {
    return <AvisoSinServicio />;
  }

  const abiertos = clubes.filter((club) => CLUBES_CON_AVANCES.includes(club.estado ?? ""));
  if (abiertos.length === 0) {
    return (
      <AvisoDeRequisito titulo="No hay clubes activos" {...RECURSO}>
        Los avances se registran desde que el club está activo. Cuando tengas uno podrás registrar el
        progreso de sus estudiantes y proyectos.
      </AvisoDeRequisito>
    );
  }

  const opciones = await armarClubesParaAvance(abiertos, tieneAlcanceGlobal(usuario.rol));
  if (!opciones) {
    return <AvisoSinServicio />;
  }

  const pedido = idDe(primerValor(consulta.club));
  const club =
    opciones.find((opcion) => opcion.valor === String(pedido)) ?? (opciones.length === 1 ? opciones[0] : null);
  const alcance = opcionValida(ALCANCES_DE_AVANCE, primerValor(consulta.alcance)) ?? "ESTUDIANTE";
  const proyecto = idDe(primerValor(consulta.proyecto));
  const estudiante = idDe(primerValor(consulta.estudiante));

  const iniciales: DatosDeAvance = {
    alcance,
    clubId: club?.valor ?? "",
    estudianteId: club && estudiante && club.estudiantes.some((opcion) => opcion.valor === String(estudiante)) ? String(estudiante) : "",
    proyectoId: club && proyecto && club.proyectos.some((opcion) => opcion.valor === String(proyecto)) ? String(proyecto) : "",
    actividadId: "",
    fecha: "",
    resultados: "",
    logros: "",
    dificultades: "",
    proximosPasos: "",
    porcentajeAvance: "",
  };

  return (
    <div className="mt-8 max-w-[56rem]">
      <FormularioAvance
        avanceId={null}
        iniciales={iniciales}
        competenciasIniciales={[]}
        clubes={opciones}
        sujetoFijo={null}
        catalogo={catalogo}
        hoy={hoyEnGuayaquil()}
      />
    </div>
  );
}

export default function PaginaNuevoAvance({ searchParams }: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_AVANCES}>Volver a avances</EnlaceVolver>
      <EncabezadoDeGestion
        titulo="Registrar avance"
        detalle="Un avance por sujeto y fecha: del estudiante con sus competencias, del proyecto con su porcentaje o del club en general."
      />
      <Suspense fallback={<EsqueletoDeGestion mensaje="Cargando el formulario del avance." />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
