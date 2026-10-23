package ec.edu.ups.tipi.estudiantes.dto;

import ec.edu.ups.tipi.estudiantes.Autorizacion;
import ec.edu.ups.tipi.estudiantes.EstadoAutorizacion;
import ec.edu.ups.tipi.estudiantes.TipoAutorizacion;

import java.time.Instant;
import java.time.LocalDate;

public record AutorizacionResponse(
        TipoAutorizacion tipo, EstadoAutorizacion estado, LocalDate fechaRegistro, String observacion,
        boolean tieneDocumento, String documentoNombre, String documentoTipo, Long documentoTamano,
        Instant documentoSubidoEn, Instant revocadoEn, Instant actualizadoEn, String advertencia) {

    public static AutorizacionResponse de(Autorizacion a, String advertencia) {
        return new AutorizacionResponse(a.getTipo(), a.getEstado(), a.getFechaRegistro(), a.getObservacion(),
                a.getDocumentoRuta() != null, a.getDocumentoNombre(), a.getDocumentoTipo(), a.getDocumentoTamano(),
                a.getDocumentoSubidoEn(), a.getRevocadoEn(), a.getActualizadoEn(), advertencia);
    }

    public static AutorizacionResponse de(Autorizacion a) {
        return de(a, null);
    }
}