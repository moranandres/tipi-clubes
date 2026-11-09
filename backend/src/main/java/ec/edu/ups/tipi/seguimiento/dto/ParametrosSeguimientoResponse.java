package ec.edu.ups.tipi.seguimiento.dto;

import java.time.Instant;

public record ParametrosSeguimientoResponse(
        int diasGraciaRegistro, double umbralAdecuado, double umbralMinimo, String actualizadoPorNombre,
        Instant actualizadoEn) {
}
