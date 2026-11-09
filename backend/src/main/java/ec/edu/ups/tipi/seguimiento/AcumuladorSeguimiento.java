package ec.edu.ups.tipi.seguimiento;

import ec.edu.ups.tipi.seguimiento.dto.IndicadoresSeguimiento;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

final class AcumuladorSeguimiento {

    private final LocalDate hoy;
    private final int diasGracia;
    private long planificadas;
    private long canceladas;
    private long ejecutadas;
    private long porEjecutar;
    private long porRegistrar;
    private long vencidas;
    private long reprogramadas;
    private long ejecutadasEnFechaOriginal;
    private long registradasATiempo;
    private long minutosPlanificados;
    private long minutosEjecutados;
    private LocalDate ultimaEjecucion;
    private LocalDate proximaActividad;

    AcumuladorSeguimiento(LocalDate hoy, int diasGracia) {
        this.hoy = hoy;
        this.diasGracia = diasGracia;
    }

    void agregar(FilaActividad fila) {
        planificadas++;
        SituacionActividad situacion = fila.situacion(hoy, diasGracia);
        if (situacion == SituacionActividad.CANCELADA) {
            canceladas++;
            return;
        }
        minutosPlanificados += fila.minutos();
        if (fila.reprogramaciones() > 0) {
            reprogramadas++;
        }
        switch (situacion) {
            case EJECUTADA -> {
                ejecutadas++;
                minutosEjecutados += fila.minutos();
                if (fila.conservaFechaOriginal()) {
                    ejecutadasEnFechaOriginal++;
                }
                if (Boolean.TRUE.equals(fila.registroOportuno(diasGracia))) {
                    registradasATiempo++;
                }
                if (ultimaEjecucion == null || fila.fecha().isAfter(ultimaEjecucion)) {
                    ultimaEjecucion = fila.fecha();
                }
            }
            case POR_EJECUTAR -> porEjecutar++;
            case POR_REGISTRAR -> porRegistrar++;
            case VENCIDA -> vencidas++;
            default -> {
            }
        }
        if (situacion != SituacionActividad.EJECUTADA && !fila.fecha().isBefore(hoy)
                && (proximaActividad == null || fila.fecha().isBefore(proximaActividad))) {
            proximaActividad = fila.fecha();
        }
    }

    LocalDate ultimaEjecucion() {
        return ultimaEjecucion;
    }

    LocalDate proximaActividad() {
        return proximaActividad;
    }

    IndicadoresSeguimiento indicadores(BigDecimal umbralAdecuado, BigDecimal umbralMinimo) {
        long validas = planificadas - canceladas;
        long exigibles = ejecutadas + vencidas;
        Double cumplimiento = porcentaje(ejecutadas, exigibles);
        return new IndicadoresSeguimiento(planificadas, canceladas, validas, ejecutadas,
                porEjecutar + porRegistrar + vencidas, porEjecutar, porRegistrar, vencidas, exigibles,
                reprogramadas, ejecutadasEnFechaOriginal, registradasATiempo,
                horas(minutosPlanificados), horas(minutosEjecutados),
                porcentaje(ejecutadas, validas), cumplimiento, porcentaje(minutosEjecutados, minutosPlanificados),
                porcentaje(reprogramadas, validas), porcentaje(ejecutadasEnFechaOriginal, ejecutadas),
                porcentaje(registradasATiempo, ejecutadas), estado(cumplimiento, umbralAdecuado, umbralMinimo));
    }

    static EstadoSeguimiento estado(Double cumplimiento, BigDecimal umbralAdecuado, BigDecimal umbralMinimo) {
        if (cumplimiento == null) {
            return EstadoSeguimiento.SIN_DATOS;
        }
        BigDecimal valor = BigDecimal.valueOf(cumplimiento);
        if (valor.compareTo(umbralAdecuado) >= 0) {
            return EstadoSeguimiento.ADECUADO;
        }
        if (valor.compareTo(umbralMinimo) >= 0) {
            return EstadoSeguimiento.EN_RIESGO;
        }
        return EstadoSeguimiento.CRITICO;
    }

    private static Double porcentaje(long numerador, long denominador) {
        if (denominador <= 0) {
            return null;
        }
        return BigDecimal.valueOf(numerador).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(denominador), 1, RoundingMode.HALF_UP).doubleValue();
    }

    private static double horas(long minutos) {
        return BigDecimal.valueOf(minutos).divide(BigDecimal.valueOf(60), 1, RoundingMode.HALF_UP).doubleValue();
    }
}
