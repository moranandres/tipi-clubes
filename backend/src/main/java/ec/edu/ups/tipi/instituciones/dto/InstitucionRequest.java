package ec.edu.ups.tipi.instituciones.dto;

import ec.edu.ups.tipi.instituciones.EstadoAdhesion;
import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record InstitucionRequest(
        @NotBlank(message = "El código AMIE es obligatorio")
        @Pattern(regexp = "^[0-9]{2}[A-Za-z][0-9]{5}$",
                 message = "Formato de AMIE inválido (ejemplo: 09H00001)")
        String codigoAmie,

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 200, message = "Máximo 200 caracteres")
        String nombre,

        @Size(max = 30, message = "Máximo 30 caracteres") String zona,
        @Size(max = 80, message = "Máximo 80 caracteres") String circuito,

        @NotBlank(message = "La provincia es obligatoria")
        @Size(max = 80, message = "Máximo 80 caracteres")
        String provincia,

        @NotBlank(message = "El cantón es obligatorio")
        @Size(max = 80, message = "Máximo 80 caracteres")
        String canton,

        @Size(max = 255, message = "Máximo 255 caracteres") String direccion,
        @Size(max = 30, message = "Máximo 30 caracteres") String telefono,

        @Email(message = "Correo electrónico inválido")
        @Size(max = 150, message = "Máximo 150 caracteres")
        String correoContacto,

        @Size(max = 150, message = "Máximo 150 caracteres") String autoridadNombre,
        @Size(max = 80, message = "Máximo 80 caracteres") String autoridadCargo,

        EstadoAdhesion estadoAdhesion,

        @PastOrPresent(message = "La fecha de adhesión no puede ser futura")
        LocalDate fechaAdhesion) {
}