package ec.edu.ups.tipi.proyectos.dto;

public record IntegranteProyectoResponse(
        Long estudianteId, String estudianteCodigo, String estudianteNombres, String estudianteApellidos,
        boolean integranteActivoDelClub) implements IntegranteProyectoVista {
}
