package ec.edu.ups.tipi.recuperacion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ValidarTokenRequest(
        @NotBlank(message = "El enlace no es válido o ya expiró. Solicite uno nuevo.")
        @Pattern(regexp = "^[A-Za-z0-9_-]{43}$", message = "El enlace no es válido o ya expiró. Solicite uno nuevo.")
        String token) {
}