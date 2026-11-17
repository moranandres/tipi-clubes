"use client";

import { ConfirmarEliminacion } from "@/components/portal/formularios/ConfirmarEliminacion";
import { eliminarEstudiante } from "@/lib/acciones/estudiantes";

type Props = {
  estudianteId: number;
};

export function EliminarEstudiante({ estudianteId }: Props) {
  return (
    <ConfirmarEliminacion
      titulo="Eliminar el registro"
      descripcion="Solo se elimina un estudiante registrado por error, sin inscripciones, solicitudes, participaciones ni certificados. Si ya tiene historial, márcalo como retirado o egresado."
      etiqueta="Eliminar estudiante"
      etiquetaDeConfirmacion="Confirmar la eliminación del estudiante"
      eliminar={() => eliminarEstudiante(estudianteId)}
    />
  );
}
