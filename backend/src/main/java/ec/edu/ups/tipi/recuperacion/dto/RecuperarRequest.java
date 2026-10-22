package ec.edu.ups.tipi.recuperacion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RecuperarRequest(
        @NotBlank(message = "Ingrese su usuario o correo electrónico")
        @Size(max = 150, message = "Máximo 150 caracteres")
        String identificador) {
}