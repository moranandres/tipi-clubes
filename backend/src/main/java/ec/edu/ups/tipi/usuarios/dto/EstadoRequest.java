package ec.edu.ups.tipi.usuarios.dto;

import jakarta.validation.constraints.NotNull;

public record EstadoRequest(@NotNull(message = "El estado es obligatorio") Boolean activo) {
}