package ec.edu.ups.tipi.proyectos.dto;

import ec.edu.ups.tipi.proyectos.EstadoProyecto;
import ec.edu.ups.tipi.proyectos.TipoProyecto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record ProyectoResponse(
        Long id, Long clubId, String clubNombre, Long institucionId, String institucionNombre,
        Long docenteId, String docenteNombre, TipoProyecto tipo, String titulo, String objetivo, String descripcion,
        LocalDate fechaInicio, LocalDate fechaFinPrevista, EstadoProyecto estado, Integer porcentajeAvance,
        long avancesRegistrados, LocalDate fechaUltimoAvance, List<IntegranteProyectoVista> integrantes,
        List<EvidenciaVinculadaResponse> evidencias, String resultadoFinal, LocalDate fechaFinalizacion,
        String finalizadoPorNombre, String motivoCancelacion, String canceladoPorNombre, Instant fechaCancelacion,
        String creadoPorNombre, Instant fechaRegistro, Instant actualizadoEn, boolean editable,
        String motivoNoEditable) {
}
