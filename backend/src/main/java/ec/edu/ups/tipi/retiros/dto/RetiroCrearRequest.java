package ec.edu.ups.tipi.retiros.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RetiroCrearRequest(
        @NotNull(message = "La inscripción es obligatoria")
        Long inscripcionId,

        @NotBlank(message = "El motivo del retiro es obligatorio")
        @Size(min = 10, max = 500, message = "El motivo debe tener entre 10 y 500 caracteres")
        String motivo) {
}
