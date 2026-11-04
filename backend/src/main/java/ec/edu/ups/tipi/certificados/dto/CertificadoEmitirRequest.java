package ec.edu.ups.tipi.certificados.dto;

import ec.edu.ups.tipi.certificados.TipoCertificado;
import jakarta.validation.constraints.NotNull;

public record CertificadoEmitirRequest(
        @NotNull(message = "El tipo de certificado es obligatorio")
        TipoCertificado tipo,

        Long inscripcionCursoId,

        Long participacionId) {
}
