package ec.edu.ups.tipi.avances.dto;

import ec.edu.ups.tipi.proyectos.EstadoProyecto;
import ec.edu.ups.tipi.proyectos.TipoProyecto;

import java.time.LocalDate;

public record ProyectoEstudianteResponse(
        Long proyectoId, Long clubId, String clubNombre, TipoProyecto tipo, String titulo, EstadoProyecto estado,
        LocalDate fechaInicio, LocalDate fechaFinalizacion) {
}
