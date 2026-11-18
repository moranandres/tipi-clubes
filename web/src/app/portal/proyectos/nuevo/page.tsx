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
import { FormularioProyecto } from "@/components/portal/proyectos/FormularioProyecto";
import { listarClubesParaFormulario } from "@/lib/api/clubes";
import { armarClubesParaProyecto } from "@/lib/api/proyectos";
import { RUTA_PROYECTOS } from "@/lib/portal/filtros-proyectos";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { primerValor } from "@/lib/portal/parametros";
import { puedeGestionarProyectos } from "@/lib/portal/permisos";
import type { DatosDeProyecto } from "@/lib/portal/reglas-proyectos";
import { hoyEnGuayaquil } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Registrar proyecto",
};

type Props = PageProps<"/portal/proyectos/nuevo">;

const RECURSO = { recurso: "proyectos", rutaDeLista: RUTA_PROYECTOS };
const QUIENES = "el administrador, el responsable institucional y el docente del club";
const CLUB_ACTIVO = "ACTIVO";

async function Contenido({ searchParams }: Pick<Props, "searchParams">) {
  const [consulta, usuario] = await Promise.all([searchParams, exigirSesion()]);

  if (!usuario) {
    return <AvisoSinServicio />;
  }
  if (!puedeGestionarProyectos(usuario.rol)) {
    return <AvisoSoloLectura {...RECURSO} quienes={QUIENES} />;
  }

  const clubes = await listarClubesParaFormulario();
  if (!clubes) {
    return <AvisoSinServicio />;
  }

  const activos = clubes.filter((club) => club.estado === CLUB_ACTIVO);
  if (activos.length === 0) {
    return (
      <AvisoDeRequisito titulo="No hay clubes activos" {...RECURSO}>
        Los proyectos se registran en clubes activos. Cuando un club se active podrás registrar los
        proyectos de sus integrantes.
      </AvisoDeRequisito>
    );
  }

  const opciones = await armarClubesParaProyecto(activos, tieneAlcanceGlobal(usuario.rol));
  if (!opciones) {
    return <AvisoSinServicio />;
  }

  const pedido = idDe(primerValor(consulta.club));
  const club =
    opciones.find((opcion) => opcion.valor === String(pedido)) ?? (opciones.length === 1 ? opciones[0] : null);
  const hoy = hoyEnGuayaquil();
  const iniciales: DatosDeProyecto = {
    clubId: club?.valor ?? "",
    tipo: "PROTOTIPO",
    titulo: "",
    objetivo: "",
    descripcion: "",
    docenteId: club?.docenteId ?? "",
    fechaInicio: hoy,
    fechaFinPrevista: "",
  };

  return (
    <div className="mt-8 max-w-[52rem]">
      <FormularioProyecto proyectoId={null} iniciales={iniciales} integrantesIniciales={[]} clubes={opciones} hoy={hoy} />
    </div>
  );
}

export default function PaginaNuevoProyecto({ searchParams }: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_PROYECTOS}>Volver a proyectos</EnlaceVolver>
      <EncabezadoDeGestion
        titulo="Registrar proyecto"
        detalle="El proyecto empieza En desarrollo. Su tutor registra los avances con el porcentaje logrado y, al terminarlo, el resultado final con sus evidencias."
      />
      <Suspense fallback={<EsqueletoDeGestion mensaje="Cargando el formulario del proyecto." />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
