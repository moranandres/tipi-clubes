package ec.edu.ups.tipi.cursos.dto;

import ec.edu.ups.tipi.cursos.Curso;
import ec.edu.ups.tipi.cursos.EstadoCurso;
import ec.edu.ups.tipi.cursos.ModalidadCurso;
import ec.edu.ups.tipi.cursos.NivelCurso;

import java.time.LocalDate;
import java.util.List;

public record CursoResponse(
        Long id, Long clubId, String clubNombre, Long institucionId, String institucionNombre,
        String nombre, String descripcion, NivelCurso nivel, ModalidadCurso modalidad,
        String lugar, String enlaceVirtual, boolean tieneEnlaceVirtual,
        LocalDate fechaInicio, LocalDate fechaFin, Short duracionHoras, double horasSemanales,
        Integer cupoMaximo, long inscritosActivos, long cuposDisponibles,
        EstadoCurso estado, List<HorarioResponse> horarios) {

    public static CursoResponse de(Curso c, String clubNombre, String institucionNombre,
                                   List<HorarioResponse> horarios, long inscritosActivos, boolean ocultarEnlace) {
        long minutos = horarios.stream().mapToLong(HorarioResponse::duracionMinutos).sum();
        double horasSemanales = Math.round(minutos / 60.0 * 100) / 100.0;
        return new CursoResponse(c.getId(), c.getClubId(), clubNombre, c.getInstitucionId(), institucionNombre,
                c.getNombre(), c.getDescripcion(), c.getNivel(), c.getModalidad(),
                c.getLugar(), ocultarEnlace ? null : c.getEnlaceVirtual(), c.getEnlaceVirtual() != null,
                c.getFechaInicio(), c.getFechaFin(), c.getDuracionHoras(), horasSemanales,
                c.getCupoMaximo(), inscritosActivos, Math.max(c.getCupoMaximo() - inscritosActivos, 0),
                c.getEstado(), horarios);
    }
}