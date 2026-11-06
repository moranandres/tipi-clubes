package ec.edu.ups.tipi.asistencias.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RegistroAsistenciaRequest(
        @NotEmpty(message = "Indique la asistencia de al menos un estudiante")
        @Size(max = 200, message = "Máximo 200 estudiantes por registro")
        List<@Valid @NotNull(message = "El registro del estudiante no puede ser nulo") RegistroEstudianteRequest> registros,

        @Size(max = 500, message = "Máximo 500 caracteres")
        String motivoCorreccion) {
}
