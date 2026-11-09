package ec.edu.ups.tipi.avances.dto;

import ec.edu.ups.tipi.avances.NivelLogro;

import java.time.LocalDate;
import java.util.List;

public record ProgresoCompetenciaResponse(
        Integer contenidoId, String nombre, NivelLogro nivelInicial, NivelLogro nivelActual, int variacionNiveles,
        int evaluaciones, LocalDate fechaPrimeraEvaluacion, LocalDate fechaUltimaEvaluacion,
        List<EvaluacionCompetenciaResponse> historial) {
}
