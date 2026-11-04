package ec.edu.ups.tipi.inscripciones.dto;

import ec.edu.ups.tipi.cursos.NivelCurso;
import ec.edu.ups.tipi.inscripciones.EstadoInscripcionCurso;
import ec.edu.ups.tipi.inscripciones.InscripcionCurso;
import ec.edu.ups.tipi.inscripciones.ResultadoCurso;

import java.time.LocalDate;

public record InscripcionCursoResponse(Long id, Long cursoId, String cursoNombre, NivelCurso cursoNivel,
                                       LocalDate fechaIngreso, LocalDate fechaFin,
                                       EstadoInscripcionCurso estado, ResultadoCurso resultado) {

    public static InscripcionCursoResponse de(InscripcionCurso ic, String cursoNombre, NivelCurso cursoNivel) {
        return new InscripcionCursoResponse(ic.getId(), ic.getCursoId(), cursoNombre, cursoNivel,
                ic.getFechaIngreso(), ic.getFechaFin(), ic.getEstado(), ic.getResultado());
    }
}
