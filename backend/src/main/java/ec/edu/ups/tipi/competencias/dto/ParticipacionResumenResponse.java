package ec.edu.ups.tipi.competencias.dto;

import ec.edu.ups.tipi.competencias.NivelCategoria;
import ec.edu.ups.tipi.competencias.ParticipacionCompetencia;

import java.time.Instant;

public record ParticipacionResumenResponse(
        Long id, Long estudianteId, String estudianteCodigo,
        Long institucionId, String institucionNombre,
        Long clubId, String clubNombre,
        Integer competenciaId, String competenciaNombre,
        Integer edicionId, String edicionNombre, int edicionAnio,
        Integer categoriaId, String categoriaNombre, NivelCategoria categoriaNivel,
        String equipoNombre, Short puesto, String reconocimiento,
        Instant createdAt) implements ParticipacionVista {

    public static ParticipacionResumenResponse de(ParticipacionCompetencia p, String estudianteCodigo,
                                                  ContextoParticipacion c) {
        return new ParticipacionResumenResponse(p.getId(), p.getEstudianteId(), estudianteCodigo,
                p.getInstitucionId(), c.institucionNombre(),
                p.getClubId(), c.clubNombre(),
                p.getCompetenciaId(), c.competenciaNombre(),
                p.getEdicionId(), c.edicionNombre(), c.edicionAnio(),
                p.getCategoriaId(), c.categoriaNombre(), c.categoriaNivel(),
                p.getEquipoNombre(), p.getPuesto(), p.getReconocimiento(),
                p.getCreatedAt());
    }
}
