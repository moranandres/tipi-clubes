package ec.edu.ups.tipi.seguimiento.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record ParametrosSeguimientoRequest(
        @NotNull(message = "Indique los días de gracia para registrar la ejecución")
        @Min(value = 0, message = "Los días de gracia van de 0 a 15")
        @Max(value = 15, message = "Los días de gracia van de 0 a 15")
        Integer diasGraciaRegistro,

        @NotNull(message = "Indique el umbral de cumplimiento adecuado")
        @DecimalMin(value = "0.0", inclusive = false, message = "El umbral debe ser mayor que 0")
        @DecimalMax(value = "100.0", message = "El umbral no puede superar 100")
        @Digits(integer = 3, fraction = 1, message = "Use como máximo un decimal")
        BigDecimal umbralAdecuado,

        @NotNull(message = "Indique el umbral de cumplimiento mínimo")
        @DecimalMin(value = "0.0", inclusive = false, message = "El umbral debe ser mayor que 0")
        @DecimalMax(value = "100.0", message = "El umbral no puede superar 100")
        @Digits(integer = 3, fraction = 1, message = "Use como máximo un decimal")
        BigDecimal umbralMinimo) {
}
