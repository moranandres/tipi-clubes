package ec.edu.ups.tipi.actividades.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CancelacionActividadRequest(
        @NotBlank(message = "Debe indicar el motivo de la cancelación")
        @Size(max = 500, message = "Máximo 500 caracteres")
        String motivo) {
}
