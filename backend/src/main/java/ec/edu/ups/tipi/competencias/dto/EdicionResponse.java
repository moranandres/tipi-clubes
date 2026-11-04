package ec.edu.ups.tipi.competencias.dto;

import ec.edu.ups.tipi.competencias.EdicionCompetencia;

import java.time.LocalDate;

public record EdicionResponse(Integer id, Integer competenciaId, String competenciaNombre, String nombre, int anio,
                              LocalDate fechaInicio, LocalDate fechaFin, String sede, boolean activa,
                              long participaciones) {

    public static EdicionResponse de(EdicionCompetencia e, String competenciaNombre, long participaciones) {
        return new EdicionResponse(e.getId(), e.getCompetenciaId(), competenciaNombre, e.getNombre(), e.getAnio(),
                e.getFechaInicio(), e.getFechaFin(), e.getSede(), e.isActiva(), participaciones);
    }
}
