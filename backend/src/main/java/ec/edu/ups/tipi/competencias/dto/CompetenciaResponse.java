package ec.edu.ups.tipi.competencias.dto;

import ec.edu.ups.tipi.competencias.Competencia;

public record CompetenciaResponse(Integer id, String nombre, String organizador, String sitioWeb, boolean activa,
                                  long ediciones, long categoriasBasicas, long categoriasAvanzadas) {

    public static CompetenciaResponse de(Competencia c, long ediciones, long basicas, long avanzadas) {
        return new CompetenciaResponse(c.getId(), c.getNombre(), c.getOrganizador(), c.getSitioWeb(), c.isActiva(),
                ediciones, basicas, avanzadas);
    }
}
