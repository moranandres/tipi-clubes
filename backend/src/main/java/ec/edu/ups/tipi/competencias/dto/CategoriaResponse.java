package ec.edu.ups.tipi.competencias.dto;

import ec.edu.ups.tipi.competencias.CategoriaCompetencia;
import ec.edu.ups.tipi.competencias.NivelCategoria;

public record CategoriaResponse(Integer id, Integer competenciaId, NivelCategoria nivel, String nombre,
                                String descripcion, boolean activa, long participaciones) {

    public static CategoriaResponse de(CategoriaCompetencia c, long participaciones) {
        return new CategoriaResponse(c.getId(), c.getCompetenciaId(), c.getNivel(), c.getNombre(),
                c.getDescripcion(), c.isActiva(), participaciones);
    }
}
