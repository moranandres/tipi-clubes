package ec.edu.ups.tipi.catalogo.dto;

import ec.edu.ups.tipi.catalogo.CatalogoInstitucion;
import ec.edu.ups.tipi.instituciones.EstadoAdhesion;

public record CatalogoInstitucionResponse(
        Long institucionId, String codigoAmie, String nombre, String provincia, String canton,
        EstadoAdhesion estadoAdhesion, Integer periodoId, String periodoNombre, boolean periodoActivo,
        long clubesTotal, long clubesPlanificados, long clubesActivos, long clubesSuspendidos,
        long clubesCerrados, long clubesAbiertos, long cuposDisponibles, long cursosAbiertos,
        long estudiantesActivos) {

    public static CatalogoInstitucionResponse de(CatalogoInstitucion c) {
        return new CatalogoInstitucionResponse(c.getInstitucionId(), c.getCodigoAmie(), c.getNombre(),
                c.getProvincia(), c.getCanton(), c.getEstadoAdhesion(), c.getPeriodoId(), c.getPeriodoNombre(),
                c.isPeriodoActivo(), c.getClubesTotal(), c.getClubesPlanificados(), c.getClubesActivos(),
                c.getClubesSuspendidos(), c.getClubesCerrados(), c.getClubesAbiertos(), c.getCuposDisponibles(),
                c.getCursosAbiertos(), c.getEstudiantesActivos());
    }
}
