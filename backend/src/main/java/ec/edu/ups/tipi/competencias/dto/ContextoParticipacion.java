package ec.edu.ups.tipi.competencias.dto;

import ec.edu.ups.tipi.competencias.NivelCategoria;

public record ContextoParticipacion(String institucionNombre, String clubNombre, String competenciaNombre,
                                    String edicionNombre, int edicionAnio, String categoriaNombre,
                                    NivelCategoria categoriaNivel) {
}
