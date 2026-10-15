package ec.edu.ups.tipi.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import static ec.edu.ups.tipi.common.ReglasValidacion.PASSWORD_MSG;
import static ec.edu.ups.tipi.common.ReglasValidacion.PASSWORD_REGEX;

public record CambiarPasswordRequest(
        @NotBlank(message = "La contraseña actual es obligatoria")
        @Size(max = 128, message = "Máximo 128 caracteres")
        String passwordActual,

        @NotBlank(message = "La contraseña nueva es obligatoria")
        @Pattern(regexp = PASSWORD_REGEX, message = PASSWORD_MSG)
        String passwordNueva) {
}