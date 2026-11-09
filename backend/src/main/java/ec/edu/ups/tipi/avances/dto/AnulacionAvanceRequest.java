package ec.edu.ups.tipi.avances.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AnulacionAvanceRequest(
        @NotBlank(message = "Indique el motivo de la anulación")
        @Size(max = 500, message = "Máximo 500 caracteres")
        String motivo) {
}
