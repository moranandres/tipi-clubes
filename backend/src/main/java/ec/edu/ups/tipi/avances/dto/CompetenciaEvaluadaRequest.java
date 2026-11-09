package ec.edu.ups.tipi.avances.dto;

import ec.edu.ups.tipi.avances.NivelLogro;
import jakarta.validation.constraints.NotNull;

public record CompetenciaEvaluadaRequest(
        @NotNull(message = "Indique la competencia evaluada")
        Integer contenidoId,

        @NotNull(message = "Indique el nivel: INICIAL, EN_PROCESO, LOGRADO o DESTACADO")
        NivelLogro nivel) {
}
