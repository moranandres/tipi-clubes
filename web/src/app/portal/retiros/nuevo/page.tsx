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
import { FormularioRetiro } from "@/components/portal/retiros/FormularioRetiro";
import { consultarIntegrantesDeClub } from "@/lib/acciones/retiros";
import { listarClubesParaFormulario } from "@/lib/api/clubes";
import { RUTA_RETIROS } from "@/lib/portal/filtros-retiros";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";
import { primerValor } from "@/lib/portal/parametros";
import { puedeRegistrarSolicitudes } from "@/lib/portal/permisos";
import { ESTADO_DE_CLUB_CERRADO } from "@/lib/portal/reglas-clubes";
import type { DatosDeRetiro } from "@/lib/portal/reglas-retiros";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Nueva solicitud de retiro",
};

type Props = PageProps<"/portal/retiros/nuevo">;

const RECURSO = { recurso: "retiros", rutaDeLista: RUTA_RETIROS };
const QUIENES_REGISTRAN = "el administrador, el responsable institucional y el docente coordinador";

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

  const conIntegrantes = clubes.filter(
    (club) =>
      typeof club.id === "number" &&
      club.estado !== ESTADO_DE_CLUB_CERRADO &&
      (club.integrantesActivos ?? 0) > 0,
  );

  if (conIntegrantes.length === 0) {
    return (
      <AvisoDeRequisito titulo="Ningún club tiene integrantes activos" {...RECURSO}>
        Solo se registra el retiro de un estudiante que hoy es integrante activo de un club.
      </AvisoDeRequisito>
    );
  }

  const global = tieneAlcanceGlobal(usuario.rol);
  const opciones: OpcionDeFormulario[] = conIntegrantes.map((club) => ({
    valor: String(club.id),
    texto: [club.nombre ?? "Club", global ? club.institucionNombre : null].filter(Boolean).join(" · "),
  }));

  const pedido = idDe(primerValor(consulta.club));
  const elegido =
    opciones.find((opcion) => opcion.valor === String(pedido))?.valor ??
    (opciones.length === 1 ? opciones[0].valor : "");

  let integrantes: OpcionDeFormulario[] | null = null;
  if (elegido) {
    const cargados = await consultarIntegrantesDeClub(elegido);
    integrantes = cargados.ok ? cargados.integrantes : null;
  }

  const inscripcionPedida = primerValor(consulta.inscripcion);
  const iniciales: DatosDeRetiro = {
    clubId: integrantes ? elegido : "",
    inscripcionId:
      integrantes?.find((opcion) => opcion.valor === inscripcionPedida)?.valor ?? "",
    motivo: "",
  };

  return (
    <div className="mt-8 max-w-[52rem]">
      <FormularioRetiro clubes={opciones} iniciales={iniciales} integrantesIniciales={integrantes} />
    </div>
  );
}

export default function PaginaNuevoRetiro({ searchParams }: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_RETIROS}>Volver a retiros</EnlaceVolver>
      <EncabezadoDeGestion
        titulo="Nueva solicitud de retiro"
        detalle="El retiro queda Pendiente hasta que otra persona con permiso lo apruebe o lo rechace. Mientras tanto, el estudiante sigue siendo integrante del club."
      />
      <Suspense fallback={<EsqueletoDeGestion mensaje="Cargando el formulario de retiro." />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
