package ec.edu.ups.tipi.inscripciones.dto;

import ec.edu.ups.tipi.estudiantes.CursoEducativo;
import ec.edu.ups.tipi.estudiantes.Estudiante;
import ec.edu.ups.tipi.inscripciones.EstadoInscripcion;
import ec.edu.ups.tipi.inscripciones.Inscripcion;

import java.time.LocalDate;
import java.util.List;

public record InscripcionResumenResponse(
        Long id, Long estudianteId, String estudianteCodigo,
        CursoEducativo cursoEducativo, String cursoEducativoEtiqueta,
        Long institucionId, String institucionNombre, Long clubId, String clubNombre, String periodoNombre,
        LocalDate fechaIngreso, LocalDate fechaRetiro, EstadoInscripcion estado,
        List<InscripcionCursoResponse> cursos) implements InscripcionVista {

    public static InscripcionResumenResponse de(Inscripcion i, Estudiante e, String institucionNombre,
                                                String clubNombre, String periodoNombre,
                                                List<InscripcionCursoResponse> cursos) {
        return new InscripcionResumenResponse(i.getId(), i.getEstudianteId(), e.getCodigoInterno(),
                e.getCurso(), e.getCurso().getEtiqueta(),
                i.getInstitucionId(), institucionNombre, i.getClubId(), clubNombre, periodoNombre,
                i.getFechaIngreso(), i.getFechaRetiro(), i.getEstado(), cursos);
    }
}
