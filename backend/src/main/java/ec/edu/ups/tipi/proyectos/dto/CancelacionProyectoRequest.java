package ec.edu.ups.tipi.proyectos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CancelacionProyectoRequest(
        @NotBlank(message = "Indique el motivo de la cancelación")
        @Size(max = 500, message = "Máximo 500 caracteres")
        String motivo) {
}
