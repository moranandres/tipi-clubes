package ec.edu.ups.tipi.evidencias.dto;

import ec.edu.ups.tipi.evidencias.EstadoEvidencia;
import ec.edu.ups.tipi.evidencias.TipoEvidencia;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record EvidenciaResponse(
        Long id, Long actividadId, String actividadTema, LocalDate actividadFecha, String responsableActividadNombre,
        Long clubId, String clubNombre, Long institucionId, String institucionNombre,
        TipoEvidencia tipo, String titulo, String descripcion, LocalDate fechaEvidencia, String url,
        String archivoNombre, String archivoTipo, Long archivoTamano, String archivoHash,
        boolean descargable, String motivoNoDescargable, String descargaUrl,
        boolean sinEstudiantesIdentificables, List<EstudianteEvidenciaVista> estudiantes,
        EstadoEvidencia estado, String registradoPorNombre, Instant fechaRegistro, Instant actualizadoEn,
        String motivoRetiro, String retiradaPorNombre, Instant fechaRetiro) {
}
