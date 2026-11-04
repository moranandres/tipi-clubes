package ec.edu.ups.tipi.inscripciones.dto;

import ec.edu.ups.tipi.cursos.NivelCurso;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SolicitudCrearRequest(
        @NotNull(message = "El estudiante es obligatorio")
        Long estudianteId,

        @NotNull(message = "El club es obligatorio")
        Long clubId,

        Long cursoId,

        @NotNull(message = "El nivel de conocimiento es obligatorio")
        NivelCurso nivel,

        @Size(max = 2000, message = "Máximo 2000 caracteres")
        String conocimientos,

        @Size(max = 2000, message = "Máximo 2000 caracteres")
        String experienciaPrevia,

        @NotBlank(message = "La motivación es obligatoria")
        @Size(min = 10, max = 2000, message = "La motivación debe tener entre 10 y 2000 caracteres")
        String motivacion) {
}
