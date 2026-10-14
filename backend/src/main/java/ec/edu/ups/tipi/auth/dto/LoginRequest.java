package ec.edu.ups.tipi.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "El usuario o correo es obligatorio")
        @Size(max = 150, message = "Máximo 150 caracteres")
        String identificador,

        @NotBlank(message = "La contraseña es obligatoria")
        @Size(max = 128, message = "Máximo 128 caracteres")
        String password) {
}