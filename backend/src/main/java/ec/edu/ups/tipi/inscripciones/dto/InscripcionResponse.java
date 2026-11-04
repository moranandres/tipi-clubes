package ec.edu.ups.tipi.inscripciones.dto;

import ec.edu.ups.tipi.estudiantes.CursoEducativo;
import ec.edu.ups.tipi.estudiantes.Estudiante;
import ec.edu.ups.tipi.inscripciones.EstadoInscripcion;
import ec.edu.ups.tipi.inscripciones.Inscripcion;

import java.time.LocalDate;
import java.util.List;

public record InscripcionResponse(
        Long id, Long estudianteId, String estudianteCodigo, String estudianteNombres, String estudianteApellidos,
        CursoEducativo cursoEducativo, String cursoEducativoEtiqueta,
        Long institucionId, String institucionNombre, Long clubId, String clubNombre, String periodoNombre,
        LocalDate fechaIngreso, LocalDate fechaRetiro, EstadoInscripcion estado, boolean sobrecupoAutorizado,
        List<InscripcionCursoResponse> cursos) implements InscripcionVista {

    public static InscripcionResponse de(Inscripcion i, Estudiante e, String institucionNombre, String clubNombre,
                                         String periodoNombre, List<InscripcionCursoResponse> cursos) {
        return new InscripcionResponse(i.getId(), i.getEstudianteId(), e.getCodigoInterno(),
                e.getNombres(), e.getApellidos(), e.getCurso(), e.getCurso().getEtiqueta(),
                i.getInstitucionId(), institucionNombre, i.getClubId(), clubNombre, periodoNombre,
                i.getFechaIngreso(), i.getFechaRetiro(), i.getEstado(), i.isSobrecupoAutorizado(), cursos);
    }
}
