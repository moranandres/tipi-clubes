package ec.edu.ups.tipi.periodos.dto;

import ec.edu.ups.tipi.periodos.PeriodoAcademico;

import java.time.LocalDate;

public record PeriodoResponse(Integer id, String nombre, LocalDate fechaInicio,
                              LocalDate fechaFin, boolean activo) {

    public static PeriodoResponse de(PeriodoAcademico p) {
        return new PeriodoResponse(p.getId(), p.getNombre(), p.getFechaInicio(),
                p.getFechaFin(), p.isActivo());
    }
}