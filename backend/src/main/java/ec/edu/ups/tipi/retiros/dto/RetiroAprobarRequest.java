package ec.edu.ups.tipi.retiros.dto;

import jakarta.validation.constraints.Size;

public record RetiroAprobarRequest(
        @Size(max = 500, message = "Máximo 500 caracteres")
        String observacion) {
}
