package ec.edu.ups.tipi.recuperacion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import static ec.edu.ups.tipi.common.ReglasValidacion.PASSWORD_MSG;
import static ec.edu.ups.tipi.common.ReglasValidacion.PASSWORD_REGEX;

public record RestablecerRequest(
        @NotBlank(message = "El enlace no es válido o ya expiró. Solicite uno nuevo.")
        @Pattern(regexp = "^[A-Za-z0-9_-]{43}$", message = "El enlace no es válido o ya expiró. Solicite uno nuevo.")
        String token,

        @NotBlank(message = "La contraseña nueva es obligatoria")
        @Pattern(regexp = PASSWORD_REGEX, message = PASSWORD_MSG)
        String passwordNueva) {
}