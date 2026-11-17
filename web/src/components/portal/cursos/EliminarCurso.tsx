"use client";

import { ConfirmarEliminacion } from "@/components/portal/formularios/ConfirmarEliminacion";
import { eliminarCurso } from "@/lib/acciones/cursos";

type Props = {
  cursoId: number;
};

export function EliminarCurso({ cursoId }: Props) {
  return (
    <ConfirmarEliminacion
      titulo="Eliminar el curso"
      descripcion="Solo se elimina un curso planificado que no tiene inscripciones ni solicitudes. Si ya las tiene, cancélalo en el panel de estado."
      etiqueta="Eliminar curso"
      etiquetaDeConfirmacion="Confirmar la eliminación del curso"
      eliminar={() => eliminarCurso(cursoId)}
    />
  );
}
