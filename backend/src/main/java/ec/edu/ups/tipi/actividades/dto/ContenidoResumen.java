package ec.edu.ups.tipi.actividades.dto;

import ec.edu.ups.tipi.actividades.ContenidoCatalogo;
import ec.edu.ups.tipi.actividades.TipoContenido;

public record ContenidoResumen(Integer id, TipoContenido tipo, String nombre, boolean activo) {

    public static ContenidoResumen de(ContenidoCatalogo c) {
        return new ContenidoResumen(c.getId(), c.getTipo(), c.getNombre(), c.isActivo());
    }
}
