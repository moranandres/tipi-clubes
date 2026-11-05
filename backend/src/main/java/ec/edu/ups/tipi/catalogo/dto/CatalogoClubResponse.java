package ec.edu.ups.tipi.catalogo.dto;

import ec.edu.ups.tipi.catalogo.CatalogoClub;
import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.cursos.dto.HorarioResponse;

import java.time.LocalDate;
import java.time.LocalTime;

public record CatalogoClubResponse(
        Long id, String nombre, String objetivo,
        Long institucionId, String institucionNombre, String codigoAmie, String canton,
        Integer periodoId, String periodoNombre, boolean periodoActivo,
        String docenteNombre, LocalDate fechaCreacion,
        Short diaSemana, String dia, LocalTime horaInicio, LocalTime horaFin, String lugar,
        Integer cupoMaximo, long integrantesActivos, long cuposDisponibles,
        long integrantesNuevos, long integrantesAntiguos, long cursosAbiertos,
        EstadoClub estado, boolean admiteInscripciones) {

    public static CatalogoClubResponse de(CatalogoClub c) {
        return new CatalogoClubResponse(c.getId(), c.getNombre(), c.getObjetivo(),
                c.getInstitucionId(), c.getInstitucionNombre(), c.getCodigoAmie(), c.getCanton(),
                c.getPeriodoId(), c.getPeriodoNombre(), c.isPeriodoActivo(),
                c.getDocenteNombre(), c.getFechaCreacion(),
                c.getDiaSemana(), c.getDiaSemana() == null ? null : HorarioResponse.DIAS[c.getDiaSemana()],
                c.getHoraInicio(), c.getHoraFin(), c.getLugar(),
                c.getCupoMaximo(), c.getIntegrantesActivos(), c.getCuposDisponibles(),
                c.getIntegrantesNuevos(), c.getIntegrantesAntiguos(), c.getCursosAbiertos(),
                c.getEstado(), c.isAdmiteInscripciones());
    }
}
