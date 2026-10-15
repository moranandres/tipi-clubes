package ec.edu.ups.tipi.usuarios.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import static ec.edu.ups.tipi.common.ReglasValidacion.PASSWORD_MSG;
import static ec.edu.ups.tipi.common.ReglasValidacion.PASSWORD_REGEX;

public record PasswordTemporalRequest(
        @NotBlank(message = "La contraseña temporal es obligatoria")
        @Pattern(regexp = PASSWORD_REGEX, message = PASSWORD_MSG)
        String passwordTemporal) {
}