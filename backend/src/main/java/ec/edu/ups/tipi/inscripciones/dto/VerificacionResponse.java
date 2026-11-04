package ec.edu.ups.tipi.inscripciones.dto;

import ec.edu.ups.tipi.cursos.NivelCurso;

import java.util.List;

public record VerificacionResponse(Long solicitudId, Long cursoId, NivelCurso nivelEvaluado,
                                   boolean aprobable, List<ControlVerificacion> controles) {

    public static VerificacionResponse de(Long solicitudId, Long cursoId, NivelCurso nivelEvaluado,
                                          List<ControlVerificacion> controles) {
        return new VerificacionResponse(solicitudId, cursoId, nivelEvaluado,
                controles.stream().allMatch(ControlVerificacion::cumple), controles);
    }
}
