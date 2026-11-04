package ec.edu.ups.tipi.cursos.dto;

import ec.edu.ups.tipi.cursos.TipoSesion;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

public record HorarioRequest(
        @NotNull(message = "El día de la semana es obligatorio")
        @Min(value = 1, message = "El día de la semana va de 1 (lunes) a 7 (domingo)")
        @Max(value = 7, message = "El día de la semana va de 1 (lunes) a 7 (domingo)")
        Short diaSemana,

        @NotNull(message = "La hora de inicio es obligatoria")
        LocalTime horaInicio,

        @NotNull(message = "La hora de fin es obligatoria")
        LocalTime horaFin,

        @NotNull(message = "El tipo de sesión es obligatorio")
        TipoSesion tipoSesion) {
}