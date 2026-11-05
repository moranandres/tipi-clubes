package ec.edu.ups.tipi.historial.dto;

import ec.edu.ups.tipi.historial.EventoHistorial;
import ec.edu.ups.tipi.historial.TipoEventoHistorial;

import java.time.LocalDate;

public record EventoHistorialResponse(LocalDate fecha, TipoEventoHistorial tipo, String descripcion,
                                      Long clubId, Long referenciaId) {

    public static EventoHistorialResponse de(EventoHistorial e) {
        return new EventoHistorialResponse(e.getFecha(), e.getTipo(), e.getDescripcion(), e.getClubId(),
                e.getReferenciaId());
    }
}
