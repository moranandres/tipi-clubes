package ec.edu.ups.tipi.seguimiento;

import ec.edu.ups.tipi.actividades.EstadoActividad;

import java.sql.Date;
import java.sql.Time;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;

record FilaActividad(
        Long id, Long clubId, LocalDate fecha, LocalTime horaInicio, LocalTime horaFin, String tema,
        EstadoActividad estado, Long cursoId, String cursoNombre, String responsableNombre,
        LocalDate fechaRegistroEjecucion, String motivoCancelacion, long reprogramaciones,
        LocalDate fechaOriginal, LocalTime horaInicioOriginal, LocalTime horaFinOriginal) {

    static FilaActividad de(Object[] f) {
        LocalDate fecha = fecha(f[2]);
        LocalTime inicio = hora(f[3]);
        LocalTime fin = hora(f[4]);
        long reprogramaciones = ((Number) f[12]).longValue();
        return new FilaActividad(((Number) f[0]).longValue(), ((Number) f[1]).longValue(), fecha, inicio, fin,
                (String) f[5], EstadoActividad.valueOf((String) f[6]),
                f[7] == null ? null : ((Number) f[7]).longValue(), (String) f[8], (String) f[9], fecha(f[10]),
                (String) f[11], reprogramaciones,
                reprogramaciones == 0 ? fecha : fecha(f[13]),
                reprogramaciones == 0 ? inicio : hora(f[14]),
                reprogramaciones == 0 ? fin : hora(f[15]));
    }

    long minutos() {
        return Duration.between(horaInicio, horaFin).toMinutes();
    }

    SituacionActividad situacion(LocalDate hoy, int diasGracia) {
        return switch (estado) {
            case CANCELADA -> SituacionActividad.CANCELADA;
            case EJECUTADA -> SituacionActividad.EJECUTADA;
            case PLANIFICADA -> fecha.isAfter(hoy) ? SituacionActividad.POR_EJECUTAR
                    : fecha.isBefore(hoy.minusDays(diasGracia)) ? SituacionActividad.VENCIDA
                    : SituacionActividad.POR_REGISTRAR;
        };
    }

    boolean conservaFechaOriginal() {
        return fecha.equals(fechaOriginal);
    }

    Long diasHastaRegistro() {
        return fechaRegistroEjecucion == null ? null : ChronoUnit.DAYS.between(fecha, fechaRegistroEjecucion);
    }

    Boolean registroOportuno(int diasGracia) {
        Long dias = diasHastaRegistro();
        return dias == null ? null : dias <= diasGracia;
    }

    private static LocalDate fecha(Object valor) {
        if (valor == null) {
            return null;
        }
        return valor instanceof Date sql ? sql.toLocalDate() : (LocalDate) valor;
    }

    private static LocalTime hora(Object valor) {
        if (valor == null) {
            return null;
        }
        return valor instanceof Time sql ? sql.toLocalTime() : (LocalTime) valor;
    }
}
