package ec.edu.ups.tipi.avances.dto;

import ec.edu.ups.tipi.historial.AlcanceHistorial;

import java.time.LocalDate;
import java.util.List;

public record ProgresoEstudianteResponse(
        EstudianteAvanceVista estudiante, Long institucionId, Integer periodoId, AlcanceHistorial alcance,
        long avancesRegistrados, LocalDate fechaUltimoAvance, long competenciasEvaluadas,
        long competenciasLogradas, List<ProgresoCompetenciaResponse> competencias,
        List<ProyectoEstudianteResponse> proyectos) {
}
