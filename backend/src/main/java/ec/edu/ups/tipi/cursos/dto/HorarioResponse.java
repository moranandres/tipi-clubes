package ec.edu.ups.tipi.cursos.dto;

import ec.edu.ups.tipi.cursos.Horario;
import ec.edu.ups.tipi.cursos.TipoSesion;

import java.time.Duration;
import java.time.LocalTime;
import java.util.List;

public record HorarioResponse(Long id, Short diaSemana, String dia, LocalTime horaInicio, LocalTime horaFin,
                              long duracionMinutos, TipoSesion tipoSesion, List<String> advertencias) {

    public static final String[] DIAS = {"", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"};

    public static HorarioResponse de(Horario h, List<String> advertencias) {
        return new HorarioResponse(h.getId(), h.getDiaSemana(), DIAS[h.getDiaSemana()],
                h.getHoraInicio(), h.getHoraFin(),
                Duration.between(h.getHoraInicio(), h.getHoraFin()).toMinutes(),
                h.getTipoSesion(), advertencias);
    }

    public static HorarioResponse de(Horario h) {
        return de(h, List.of());
    }
}