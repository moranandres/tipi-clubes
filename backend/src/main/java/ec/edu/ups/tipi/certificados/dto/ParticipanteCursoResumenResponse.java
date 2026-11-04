package ec.edu.ups.tipi.certificados.dto;

import ec.edu.ups.tipi.inscripciones.EstadoInscripcionCurso;
import ec.edu.ups.tipi.inscripciones.InscripcionCurso;
import ec.edu.ups.tipi.inscripciones.ResultadoCurso;

import java.time.LocalDate;
import java.util.List;

public record ParticipanteCursoResumenResponse(
        Long inscripcionCursoId, Long cursoId, Long estudianteId, String estudianteCodigo,
        EstadoInscripcionCurso estado, LocalDate fechaIngreso, LocalDate fechaFin, ResultadoCurso resultado,
        List<CertificadoVigente> certificadosVigentes) implements ParticipanteCursoVista {

    public static ParticipanteCursoResumenResponse de(InscripcionCurso ic, String estudianteCodigo,
                                                      List<CertificadoVigente> vigentes) {
        return new ParticipanteCursoResumenResponse(ic.getId(), ic.getCursoId(), ic.getEstudianteId(),
                estudianteCodigo, ic.getEstado(), ic.getFechaIngreso(), ic.getFechaFin(), ic.getResultado(),
                vigentes);
    }
}
