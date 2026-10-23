package ec.edu.ups.tipi.estudiantes.dto;

import ec.edu.ups.tipi.estudiantes.CursoEducativo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import static ec.edu.ups.tipi.common.ReglasValidacion.NOMBRE_PERSONA_MSG;
import static ec.edu.ups.tipi.common.ReglasValidacion.NOMBRE_PERSONA_REGEX;

public record EstudianteCrearRequest(
        @NotNull(message = "La institución es obligatoria")
        Long institucionId,

        @NotBlank(message = "Los nombres son obligatorios")
        @Size(max = 100, message = "Máximo 100 caracteres")
        @Pattern(regexp = NOMBRE_PERSONA_REGEX, message = NOMBRE_PERSONA_MSG)
        String nombres,

        @NotBlank(message = "Los apellidos son obligatorios")
        @Size(max = 100, message = "Máximo 100 caracteres")
        @Pattern(regexp = NOMBRE_PERSONA_REGEX, message = NOMBRE_PERSONA_MSG)
        String apellidos,

        @NotNull(message = "El curso es obligatorio")
        CursoEducativo curso,

        Boolean confirmarHomonimo) {
}