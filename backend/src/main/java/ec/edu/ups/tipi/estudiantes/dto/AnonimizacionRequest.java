package ec.edu.ups.tipi.estudiantes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AnonimizacionRequest(
        @NotBlank(message = "Indique el motivo de la anonimización")
        @Size(min = 10, max = 300, message = "El motivo debe tener entre 10 y 300 caracteres")
        String motivo) {
}
