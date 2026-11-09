package ec.edu.ups.tipi.seguimiento.dto;

import java.time.LocalDate;

public record MesSeguimientoResponse(String mes, LocalDate desde, LocalDate hasta, IndicadoresSeguimiento indicadores) {
}
