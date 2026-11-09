package ec.edu.ups.tipi.evidencias.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RetiroEvidenciaRequest(
        @NotBlank(message = "Indique el motivo del retiro")
        @Size(max = 500, message = "Máximo 500 caracteres")
        String motivo) {
}
