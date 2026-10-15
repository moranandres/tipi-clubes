package ec.edu.ups.tipi.docentes.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DocenteCrearRequest(
        @NotNull(message = "La institución es obligatoria")
        Long institucionId,

        @NotBlank(message = "Los nombres son obligatorios")
        @Size(max = 100, message = "Máximo 100 caracteres")
        String nombres,

        @NotBlank(message = "Los apellidos son obligatorios")
        @Size(max = 100, message = "Máximo 100 caracteres")
        String apellidos,

        @Email(message = "Correo electrónico inválido")
        @Size(max = 150, message = "Máximo 150 caracteres")
        String correo,

        @Size(max = 30, message = "Máximo 30 caracteres")
        String telefono,

        Long usuarioId) {
}