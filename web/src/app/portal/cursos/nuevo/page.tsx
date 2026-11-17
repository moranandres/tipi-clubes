import type { Metadata } from "next";
import { Suspense } from "react";
import { FormularioCurso } from "@/components/portal/cursos/FormularioCurso";
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
import { listarClubesParaFormulario, listarPeriodos } from "@/lib/api/clubes";
import { RUTA_CURSOS } from "@/lib/portal/filtros-cursos";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { puedeGestionarClubesYCursos } from "@/lib/portal/permisos";
import { ESTADO_DE_CLUB_CERRADO } from "@/lib/portal/reglas-clubes";
import { clubParaCurso, type DatosDeCurso } from "@/lib/portal/reglas-cursos";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Nuevo curso",
};

type Props = PageProps<"/portal/cursos/nuevo">;

const RECURSO = { recurso: "cursos", rutaDeLista: RUTA_CURSOS };

function primero(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

async function Contenido({ searchParams }: Pick<Props, "searchParams">) {
  const [consulta, usuario] = await Promise.all([searchParams, exigirSesion()]);

  if (!usuario) {
    return <AvisoSinServicio />;
  }
  if (!puedeGestionarClubesYCursos(usuario.rol)) {
    return <AvisoSoloLectura {...RECURSO} />;
  }

  const [clubes, periodos] = await Promise.all([listarClubesParaFormulario(), listarPeriodos()]);

  if (!clubes || !periodos) {
    return <AvisoSinServicio />;
  }

  const abiertos = clubes.filter(
    (club) => typeof club.id === "number" && club.estado !== ESTADO_DE_CLUB_CERRADO,
  );

  if (abiertos.length === 0) {
    return (
      <AvisoDeRequisito titulo="Primero registra un club" {...RECURSO}>
        Un curso siempre pertenece a un club que no esté cerrado. Crea el club en la sección
        Clubes y vuelve a esta pantalla.
      </AvisoDeRequisito>
    );
  }

  const opciones = abiertos.map((club) =>
    clubParaCurso(club, periodos, tieneAlcanceGlobal(usuario.rol)),
  );
  const pedido = idDe(primero(consulta.club));
  const elegido = opciones.find((opcion) => opcion.valor === String(pedido));

  const iniciales: DatosDeCurso = {
    clubId: elegido?.valor ?? (opciones.length === 1 ? opciones[0].valor : ""),
    nombre: "",
    descripcion: "",
    nivel: "",
    modalidad: "",
    lugar: "",
    enlaceVirtual: "",
    fechaInicio: "",
    fechaFin: "",
    duracionHoras: "",
    cupoMaximo: "",
  };

  return (
    <div className="mt-8 max-w-[52rem]">
      <FormularioCurso
        cursoId={null}
        iniciales={iniciales}
        clubes={opciones}
        clubFijo={null}
        inscritosActivos={0}
        bloqueado={false}
      />
    </div>
  );
}

export default function PaginaNuevoCurso({ searchParams }: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_CURSOS}>Volver a cursos</EnlaceVolver>
      <EncabezadoDeGestion
        titulo="Nuevo curso"
        detalle="El curso se crea en estado Planificado. Después de guardarlo podrás agregar su horario semanal e iniciarlo."
      />
      <Suspense fallback={<EsqueletoDeGestion mensaje="Cargando el formulario del curso." />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
