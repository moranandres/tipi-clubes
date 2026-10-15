package ec.edu.ups.tipi.instituciones.dto;

import jakarta.validation.constraints.NotNull;

public record ResponsableRequest(@NotNull(message = "El usuario es obligatorio") Long usuarioId) {
}