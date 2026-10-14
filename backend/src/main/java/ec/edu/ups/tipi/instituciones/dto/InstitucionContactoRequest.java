package ec.edu.ups.tipi.instituciones.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record InstitucionContactoRequest(
        @Size(max = 255, message = "Máximo 255 caracteres") String direccion,
        @Size(max = 30, message = "Máximo 30 caracteres") String telefono,

        @Email(message = "Correo electrónico inválido")
        @Size(max = 150, message = "Máximo 150 caracteres")
        String correoContacto,

        @Size(max = 150, message = "Máximo 150 caracteres") String autoridadNombre,
        @Size(max = 80, message = "Máximo 80 caracteres") String autoridadCargo) {
}