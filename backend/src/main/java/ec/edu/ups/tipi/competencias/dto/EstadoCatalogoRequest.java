package ec.edu.ups.tipi.competencias.dto;

import jakarta.validation.constraints.NotNull;

public record EstadoCatalogoRequest(
        @NotNull(message = "Indique si el registro queda activo (true) o inactivo (false)")
        Boolean activa) {
}
