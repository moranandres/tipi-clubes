package ec.edu.ups.tipi.inscripciones.dto;

import ec.edu.ups.tipi.cursos.NivelCurso;
import ec.edu.ups.tipi.inscripciones.EstadoSolicitud;
import ec.edu.ups.tipi.inscripciones.SolicitudInscripcion;

import java.time.Instant;
import java.util.Map;

public record SolicitudResumenResponse(
        Long id, EstadoSolicitud estado,
        Long estudianteId, String estudianteCodigo,
        Long institucionId, String institucionNombre,
        Long clubId, String clubNombre,
        Long cursoId, String cursoNombre,
        NivelCurso nivel, NivelCurso nivelAsignado, Long cursoAsignadoId, String cursoAsignadoNombre,
        Instant fechaSolicitud, Instant fechaRevision, Instant fechaResolucion) implements SolicitudVista {

    public static SolicitudResumenResponse de(SolicitudInscripcion s, String estudianteCodigo,
                                              String institucionNombre, String clubNombre,
                                              Map<Long, String> cursos) {
        return new SolicitudResumenResponse(s.getId(), s.getEstado(),
                s.getEstudianteId(), estudianteCodigo,
                s.getInstitucionId(), institucionNombre,
                s.getClubId(), clubNombre,
                s.getCursoId(), cursos.get(s.getCursoId()),
                s.getNivel(), s.getNivelAsignado(), s.getCursoAsignadoId(), cursos.get(s.getCursoAsignadoId()),
                s.getFechaSolicitud(), s.getFechaRevision(), s.getFechaResolucion());
    }
}
