package ec.edu.ups.tipi.inscripciones.dto;

import ec.edu.ups.tipi.cursos.NivelCurso;
import ec.edu.ups.tipi.estudiantes.Estudiante;
import ec.edu.ups.tipi.inscripciones.EstadoSolicitud;
import ec.edu.ups.tipi.inscripciones.SolicitudInscripcion;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record SolicitudResponse(
        Long id, EstadoSolicitud estado,
        Long estudianteId, String estudianteCodigo, String estudianteNombres, String estudianteApellidos,
        Long institucionId, String institucionNombre,
        Long clubId, String clubNombre,
        Long cursoId, String cursoNombre,
        NivelCurso nivel, String conocimientos, String experienciaPrevia, String motivacion,
        Long solicitadoPorId, String solicitadoPorNombre, Instant fechaSolicitud,
        Long revisadoPorId, String revisadoPorNombre, Instant fechaRevision,
        Long resueltoPorId, String resueltoPorNombre, Instant fechaResolucion,
        NivelCurso nivelAsignado, Long cursoAsignadoId, String cursoAsignadoNombre,
        String observacionResolucion, Long inscripcionId, Long inscripcionCursoId, boolean sobrecupoAutorizado,
        List<String> advertencias) implements SolicitudVista {

    public static SolicitudResponse de(SolicitudInscripcion s, Estudiante e, String institucionNombre,
                                       String clubNombre, Map<Long, String> cursos, Map<Long, String> usuarios,
                                       List<String> advertencias) {
        return new SolicitudResponse(s.getId(), s.getEstado(),
                s.getEstudianteId(), e.getCodigoInterno(), e.getNombres(), e.getApellidos(),
                s.getInstitucionId(), institucionNombre,
                s.getClubId(), clubNombre,
                s.getCursoId(), cursos.get(s.getCursoId()),
                s.getNivel(), s.getConocimientos(), s.getExperienciaPrevia(), s.getMotivacion(),
                s.getSolicitadoPor(), usuarios.get(s.getSolicitadoPor()), s.getFechaSolicitud(),
                s.getRevisadoPor(), usuarios.get(s.getRevisadoPor()), s.getFechaRevision(),
                s.getResueltoPor(), usuarios.get(s.getResueltoPor()), s.getFechaResolucion(),
                s.getNivelAsignado(), s.getCursoAsignadoId(), cursos.get(s.getCursoAsignadoId()),
                s.getObservacionResolucion(), s.getInscripcionId(), s.getInscripcionCursoId(),
                s.isSobrecupoAutorizado(), advertencias);
    }

    public SolicitudResponse conAdvertencias(List<String> nuevas) {
        return new SolicitudResponse(id, estado, estudianteId, estudianteCodigo, estudianteNombres, estudianteApellidos,
                institucionId, institucionNombre, clubId, clubNombre, cursoId, cursoNombre,
                nivel, conocimientos, experienciaPrevia, motivacion,
                solicitadoPorId, solicitadoPorNombre, fechaSolicitud,
                revisadoPorId, revisadoPorNombre, fechaRevision,
                resueltoPorId, resueltoPorNombre, fechaResolucion,
                nivelAsignado, cursoAsignadoId, cursoAsignadoNombre,
                observacionResolucion, inscripcionId, inscripcionCursoId, sobrecupoAutorizado, nuevas);
    }
}
