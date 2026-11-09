package ec.edu.ups.tipi.evidencias.dto;

import ec.edu.ups.tipi.actividades.EstadoActividad;

import java.time.LocalDate;
import java.util.List;

public record EvidenciasActividadResponse(
        Long actividadId, String actividadTema, LocalDate actividadFecha, EstadoActividad estadoActividad,
        Long clubId, String clubNombre, Long institucionId, boolean editable, String motivoNoEditable,
        long activas, long retiradas, int maximoPorActividad, ConteoEvidencias conteo,
        List<EvidenciaResponse> evidencias) {
}
