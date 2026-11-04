package ec.edu.ups.tipi.retiros.dto;

import ec.edu.ups.tipi.inscripciones.Inscripcion;
import ec.edu.ups.tipi.retiros.EstadoRetiro;
import ec.edu.ups.tipi.retiros.SolicitudRetiro;

import java.time.Instant;
import java.time.LocalDate;

public record RetiroResumenResponse(
        Long id, EstadoRetiro estado,
        Long inscripcionId, Long estudianteId, String estudianteCodigo,
        Long institucionId, String institucionNombre,
        Long clubId, String clubNombre,
        Instant fechaSolicitud, Instant fechaResolucion, LocalDate fechaRetiro,
        int cursosRetirados) implements RetiroVista {

    public static RetiroResumenResponse de(SolicitudRetiro s, Inscripcion i, String estudianteCodigo,
                                           String institucionNombre, String clubNombre, int cursosRetirados) {
        return new RetiroResumenResponse(s.getId(), s.getEstado(),
                s.getInscripcionId(), i.getEstudianteId(), estudianteCodigo,
                s.getInstitucionId(), institucionNombre,
                i.getClubId(), clubNombre,
                s.getFechaSolicitud(), s.getFechaResolucion(), s.getFechaRetiro(),
                cursosRetirados);
    }
}
