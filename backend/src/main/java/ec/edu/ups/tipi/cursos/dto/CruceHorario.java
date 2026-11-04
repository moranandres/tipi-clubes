package ec.edu.ups.tipi.cursos.dto;

import java.time.LocalTime;

public record CruceHorario(String cursoNombre, Short diaSemana, LocalTime horaInicio, LocalTime horaFin) {
}