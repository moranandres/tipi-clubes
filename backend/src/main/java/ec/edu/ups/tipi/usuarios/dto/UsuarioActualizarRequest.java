package ec.edu.ups.tipi.usuarios.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UsuarioActualizarRequest(
        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "Correo electrónico inválido")
        @Size(max = 150, message = "Máximo 150 caracteres")
        String email,

        @NotBlank(message = "Los nombres son obligatorios")
        @Size(max = 100, message = "Máximo 100 caracteres")
        String nombres,

        @NotBlank(message = "Los apellidos son obligatorios")
        @Size(max = 100, message = "Máximo 100 caracteres")
        String apellidos,

        @NotBlank(message = "El rol es obligatorio") String rolCodigo,

        Long institucionId) {
}