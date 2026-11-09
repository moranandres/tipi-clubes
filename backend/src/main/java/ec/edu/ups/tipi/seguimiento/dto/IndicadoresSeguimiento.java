package ec.edu.ups.tipi.seguimiento.dto;

import ec.edu.ups.tipi.seguimiento.EstadoSeguimiento;

public record IndicadoresSeguimiento(
        long planificadas, long canceladas, long validas, long ejecutadas, long pendientes,
        long porEjecutar, long porRegistrar, long vencidas, long exigibles,
        long reprogramadas, long ejecutadasEnFechaOriginal, long registradasATiempo,
        double horasPlanificadas, double horasEjecutadas,
        Double porcentajeEjecucion, Double porcentajeCumplimiento, Double porcentajeHoras,
        Double porcentajeReprogramacion, Double porcentajeApegoFecha, Double porcentajeRegistroOportuno,
        EstadoSeguimiento estado) {
}
