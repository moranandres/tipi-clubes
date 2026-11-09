package ec.edu.ups.tipi.proyectos.dto;

import ec.edu.ups.tipi.evidencias.EstadoEvidencia;
import ec.edu.ups.tipi.evidencias.TipoEvidencia;

import java.time.LocalDate;

public record EvidenciaVinculadaResponse(
        Long evidenciaId, Long actividadId, TipoEvidencia tipo, String titulo, LocalDate fechaEvidencia,
        EstadoEvidencia estado) {
}
