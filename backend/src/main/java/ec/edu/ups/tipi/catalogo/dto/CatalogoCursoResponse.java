package ec.edu.ups.tipi.catalogo.dto;

import ec.edu.ups.tipi.catalogo.CatalogoCurso;
import ec.edu.ups.tipi.cursos.EstadoCurso;
import ec.edu.ups.tipi.cursos.ModalidadCurso;
import ec.edu.ups.tipi.cursos.NivelCurso;
import ec.edu.ups.tipi.cursos.dto.HorarioResponse;

import java.time.LocalDate;
import java.util.List;

public record CatalogoCursoResponse(
        Long id, String nombre, String descripcion, NivelCurso nivel, ModalidadCurso modalidad, String lugar,
        LocalDate fechaInicio, LocalDate fechaFin, Short duracionHoras,
        Integer cupoMaximo, long inscritosActivos, long cuposDisponibles, long finalizados, long aprobados,
        EstadoCurso estado, boolean admiteInscripciones, List<HorarioResponse> horarios) {

    public static CatalogoCursoResponse de(CatalogoCurso c, List<HorarioResponse> horarios) {
        return new CatalogoCursoResponse(c.getId(), c.getNombre(), c.getDescripcion(), c.getNivel(),
                c.getModalidad(), c.getLugar(), c.getFechaInicio(), c.getFechaFin(), c.getDuracionHoras(),
                c.getCupoMaximo(), c.getInscritosActivos(), c.getCuposDisponibles(), c.getFinalizados(),
                c.getAprobados(), c.getEstado(), c.isAdmiteInscripciones(), horarios);
    }
}
