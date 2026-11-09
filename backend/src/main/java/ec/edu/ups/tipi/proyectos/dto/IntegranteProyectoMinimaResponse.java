package ec.edu.ups.tipi.proyectos.dto;

public record IntegranteProyectoMinimaResponse(
        Long estudianteId, String estudianteCodigo, boolean integranteActivoDelClub)
        implements IntegranteProyectoVista {
}
