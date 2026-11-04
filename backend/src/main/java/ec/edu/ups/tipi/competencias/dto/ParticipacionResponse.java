package ec.edu.ups.tipi.competencias.dto;

import ec.edu.ups.tipi.competencias.NivelCategoria;
import ec.edu.ups.tipi.competencias.ParticipacionCompetencia;
import ec.edu.ups.tipi.estudiantes.Estudiante;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record ParticipacionResponse(
        Long id,
        Long inscripcionId, Long estudianteId, String estudianteCodigo, String estudianteNombres,
        String estudianteApellidos,
        Long institucionId, String institucionNombre,
        Long clubId, String clubNombre,
        Integer competenciaId, String competenciaNombre,
        Integer edicionId, String edicionNombre, int edicionAnio,
        Integer categoriaId, String categoriaNombre, NivelCategoria categoriaNivel,
        String equipoNombre, Short puesto, String reconocimiento, String observaciones,
        Long registradoPorId, String registradoPorNombre, Instant createdAt,
        Long actualizadoPorId, String actualizadoPorNombre, Instant updatedAt,
        List<String> avisos) implements ParticipacionVista {

    public static ParticipacionResponse de(ParticipacionCompetencia p, Estudiante e, ContextoParticipacion c,
                                           Map<Long, String> usuarios) {
        return new ParticipacionResponse(p.getId(),
                p.getInscripcionId(), e.getId(), e.getCodigoInterno(), e.getNombres(), e.getApellidos(),
                p.getInstitucionId(), c.institucionNombre(),
                p.getClubId(), c.clubNombre(),
                p.getCompetenciaId(), c.competenciaNombre(),
                p.getEdicionId(), c.edicionNombre(), c.edicionAnio(),
                p.getCategoriaId(), c.categoriaNombre(), c.categoriaNivel(),
                p.getEquipoNombre(), p.getPuesto(), p.getReconocimiento(), p.getObservaciones(),
                p.getRegistradoPor(), usuarios.get(p.getRegistradoPor()), p.getCreatedAt(),
                p.getActualizadoPor(), usuarios.get(p.getActualizadoPor()), p.getUpdatedAt(),
                List.of());
    }

    public ParticipacionResponse conAvisos(List<String> nuevos) {
        return new ParticipacionResponse(id, inscripcionId, estudianteId, estudianteCodigo, estudianteNombres,
                estudianteApellidos, institucionId, institucionNombre, clubId, clubNombre,
                competenciaId, competenciaNombre, edicionId, edicionNombre, edicionAnio,
                categoriaId, categoriaNombre, categoriaNivel, equipoNombre, puesto, reconocimiento, observaciones,
                registradoPorId, registradoPorNombre, createdAt, actualizadoPorId, actualizadoPorNombre, updatedAt,
                nuevos);
    }
}
