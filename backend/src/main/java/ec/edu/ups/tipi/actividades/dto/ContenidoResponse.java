package ec.edu.ups.tipi.actividades.dto;

import ec.edu.ups.tipi.actividades.ContenidoCatalogo;
import ec.edu.ups.tipi.actividades.TipoContenido;

public record ContenidoResponse(Integer id, TipoContenido tipo, String nombre, String descripcion,
                                boolean activo, long actividades) {

    public static ContenidoResponse de(ContenidoCatalogo c, long actividades) {
        return new ContenidoResponse(c.getId(), c.getTipo(), c.getNombre(), c.getDescripcion(),
                c.isActivo(), actividades);
    }
}
