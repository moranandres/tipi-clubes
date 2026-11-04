package ec.edu.ups.tipi.certificados.dto;

import ec.edu.ups.tipi.estudiantes.Estudiante;
import ec.edu.ups.tipi.inscripciones.EstadoInscripcionCurso;
import ec.edu.ups.tipi.inscripciones.InscripcionCurso;
import ec.edu.ups.tipi.inscripciones.ResultadoCurso;

import java.time.LocalDate;
import java.util.List;

public record ParticipanteCursoResponse(
        Long inscripcionCursoId, Long cursoId, Long estudianteId, String estudianteCodigo,
        String estudianteNombres, String estudianteApellidos,
        EstadoInscripcionCurso estado, LocalDate fechaIngreso, LocalDate fechaFin, ResultadoCurso resultado,
        List<CertificadoVigente> certificadosVigentes, List<String> avisos) implements ParticipanteCursoVista {

    public static ParticipanteCursoResponse de(InscripcionCurso ic, Estudiante e, List<CertificadoVigente> vigentes) {
        return new ParticipanteCursoResponse(ic.getId(), ic.getCursoId(), e.getId(), e.getCodigoInterno(),
                e.getNombres(), e.getApellidos(), ic.getEstado(), ic.getFechaIngreso(), ic.getFechaFin(),
                ic.getResultado(), vigentes, List.of());
    }

    public ParticipanteCursoResponse conAvisos(List<String> nuevos) {
        return new ParticipanteCursoResponse(inscripcionCursoId, cursoId, estudianteId, estudianteCodigo,
                estudianteNombres, estudianteApellidos, estado, fechaIngreso, fechaFin, resultado,
                certificadosVigentes, nuevos);
    }
}
