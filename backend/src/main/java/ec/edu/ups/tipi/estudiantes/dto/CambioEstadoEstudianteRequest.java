package ec.edu.ups.tipi.estudiantes.dto;

import ec.edu.ups.tipi.estudiantes.EstadoEstudiante;
import jakarta.validation.constraints.NotNull;

public record CambioEstadoEstudianteRequest(
        @NotNull(message = "El estado es obligatorio")
        EstadoEstudiante estado) {
}