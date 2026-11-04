package ec.edu.ups.tipi.competencias.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record ParticipacionActualizarRequest(
        @Size(max = 150, message = "El nombre del equipo admite máximo 150 caracteres")
        String equipoNombre,

        @Min(value = 1, message = "El puesto debe estar entre 1 y 999")
        @Max(value = 999, message = "El puesto debe estar entre 1 y 999")
        Integer puesto,

        @Size(max = 100, message = "El reconocimiento admite máximo 100 caracteres")
        String reconocimiento,

        @Size(max = 1000, message = "Las observaciones admiten máximo 1000 caracteres")
        String observaciones) {
}
