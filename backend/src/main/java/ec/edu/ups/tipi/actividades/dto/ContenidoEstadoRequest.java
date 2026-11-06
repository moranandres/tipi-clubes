package ec.edu.ups.tipi.actividades.dto;

import jakarta.validation.constraints.NotNull;

public record ContenidoEstadoRequest(
        @NotNull(message = "Indique si el contenido queda activo (true) o inactivo (false)")
        Boolean activo) {
}
