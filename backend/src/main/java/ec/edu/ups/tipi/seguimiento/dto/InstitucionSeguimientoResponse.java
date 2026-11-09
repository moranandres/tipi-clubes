package ec.edu.ups.tipi.seguimiento.dto;

public record InstitucionSeguimientoResponse(
        Long institucionId, String institucionNombre, long clubes, IndicadoresSeguimiento indicadores) {
}
