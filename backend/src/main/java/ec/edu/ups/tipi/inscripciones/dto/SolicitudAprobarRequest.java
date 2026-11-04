package ec.edu.ups.tipi.inscripciones.dto;

import ec.edu.ups.tipi.cursos.NivelCurso;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SolicitudAprobarRequest(
        @NotNull(message = "El nivel asignado es obligatorio")
        NivelCurso nivelAsignado,

        Long cursoId,

        @Size(max = 500, message = "Máximo 500 caracteres")
        String observacion,

        Boolean autorizarSobrecupo) {
}
