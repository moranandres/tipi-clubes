package ec.edu.ups.tipi.asistencias.dto;

import ec.edu.ups.tipi.asistencias.EstadoAsistencia;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegistroEstudianteRequest(
        @NotNull(message = "Indique el estudiante")
        Long estudianteId,

        @NotNull(message = "Indique el estado: PRESENTE, AUSENTE, ATRASADO o JUSTIFICADO")
        EstadoAsistencia estado,

        @Size(max = 500, message = "Máximo 500 caracteres")
        String observacion) {
}
