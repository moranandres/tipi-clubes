package ec.edu.ups.tipi.retiros.dto;

import ec.edu.ups.tipi.estudiantes.Estudiante;
import ec.edu.ups.tipi.inscripciones.Inscripcion;
import ec.edu.ups.tipi.retiros.EstadoRetiro;
import ec.edu.ups.tipi.retiros.SolicitudRetiro;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record RetiroResponse(
        Long id, EstadoRetiro estado,
        Long inscripcionId, Long estudianteId, String estudianteCodigo, String estudianteNombres,
        String estudianteApellidos,
        Long institucionId, String institucionNombre,
        Long clubId, String clubNombre,
        String motivo,
        Long solicitadoPorId, String solicitadoPorNombre, Instant fechaSolicitud,
        Long resueltoPorId, String resueltoPorNombre, Instant fechaResolucion,
        String observacionResolucion, LocalDate fechaRetiro,
        List<CursoRetiradoResponse> cursosRetirados,
        List<String> avisos) implements RetiroVista {

    public static RetiroResponse de(SolicitudRetiro s, Inscripcion i, Estudiante e, String institucionNombre,
                                    String clubNombre, Map<Long, String> usuarios,
                                    List<CursoRetiradoResponse> cursosRetirados) {
        return new RetiroResponse(s.getId(), s.getEstado(),
                s.getInscripcionId(), e.getId(), e.getCodigoInterno(), e.getNombres(), e.getApellidos(),
                s.getInstitucionId(), institucionNombre,
                i.getClubId(), clubNombre,
                s.getMotivo(),
                s.getSolicitadoPor(), usuarios.get(s.getSolicitadoPor()), s.getFechaSolicitud(),
                s.getResueltoPor(), usuarios.get(s.getResueltoPor()), s.getFechaResolucion(),
                s.getObservacionResolucion(), s.getFechaRetiro(),
                cursosRetirados, List.of());
    }

    public RetiroResponse conAvisos(List<String> nuevos) {
        return new RetiroResponse(id, estado, inscripcionId, estudianteId, estudianteCodigo, estudianteNombres,
                estudianteApellidos, institucionId, institucionNombre, clubId, clubNombre, motivo,
                solicitadoPorId, solicitadoPorNombre, fechaSolicitud,
                resueltoPorId, resueltoPorNombre, fechaResolucion,
                observacionResolucion, fechaRetiro, cursosRetirados, nuevos);
    }
}
