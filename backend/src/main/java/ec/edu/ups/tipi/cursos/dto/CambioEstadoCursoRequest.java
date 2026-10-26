package ec.edu.ups.tipi.cursos.dto;

import ec.edu.ups.tipi.cursos.EstadoCurso;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CambioEstadoCursoRequest(
        @NotNull(message = "El estado es obligatorio")
        EstadoCurso estado,

        @Size(max = 255, message = "Máximo 255 caracteres")
        String motivo) {
}