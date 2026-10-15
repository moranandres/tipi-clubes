package ec.edu.ups.tipi.clubes.dto;

import ec.edu.ups.tipi.clubes.Club;
import ec.edu.ups.tipi.clubes.EstadoClub;

import java.time.LocalDate;
import java.time.LocalTime;

public record ClubResponse(Long id, Long institucionId, String institucionNombre, Integer periodoId,
                           String periodoNombre, Long docenteId, String docenteNombre, String nombre,
                           String objetivo, LocalDate fechaCreacion, Short diaSemana,
                           LocalTime horaInicio, LocalTime horaFin, String lugar, Integer cupoMaximo,
                           long integrantesActivos, long cuposDisponibles, EstadoClub estado) {

    public static ClubResponse de(Club c, String institucionNombre, String periodoNombre,
                                  String docenteNombre, long integrantesActivos) {
        return new ClubResponse(c.getId(), c.getInstitucionId(), institucionNombre, c.getPeriodoId(),
                periodoNombre, c.getDocenteId(), docenteNombre, c.getNombre(), c.getObjetivo(),
                c.getFechaCreacion(), c.getDiaSemana(), c.getHoraInicio(), c.getHoraFin(), c.getLugar(),
                c.getCupoMaximo(), integrantesActivos,
                Math.max(c.getCupoMaximo() - integrantesActivos, 0), c.getEstado());
    }
}