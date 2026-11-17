package ec.edu.ups.tipi.estudiantes.dto;

import ec.edu.ups.tipi.common.CedulaEcuatoriana;
import ec.edu.ups.tipi.common.ReglasValidacion;
import ec.edu.ups.tipi.estudiantes.Parentesco;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RepresentanteRequest(
        @NotBlank(message = "Los nombres del representante son obligatorios")
        @Size(max = 100, message = "Máximo 100 caracteres")
        @Pattern(regexp = ReglasValidacion.NOMBRE_PERSONA_REGEX, message = ReglasValidacion.NOMBRE_PERSONA_MSG)
        String nombres,

        @NotBlank(message = "Los apellidos del representante son obligatorios")
        @Size(max = 100, message = "Máximo 100 caracteres")
        @Pattern(regexp = ReglasValidacion.NOMBRE_PERSONA_REGEX, message = ReglasValidacion.NOMBRE_PERSONA_MSG)
        String apellidos,

        @NotBlank(message = "La cédula del representante es obligatoria")
        @CedulaEcuatoriana
        String cedula,

        @NotNull(message = "El parentesco con el estudiante es obligatorio")
        Parentesco parentesco,

        @NotBlank(message = "El teléfono del representante es obligatorio")
        @Pattern(regexp = "^0[2-9][0-9]{7,8}$",
                message = "El teléfono debe ser un celular de 10 dígitos (09…) o un fijo de 9 dígitos con código de provincia")
        String telefono,

        @Pattern(regexp = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
                message = "El correo no tiene un formato válido")
        @Size(max = 150, message = "Máximo 150 caracteres")
        String correo) {
}
