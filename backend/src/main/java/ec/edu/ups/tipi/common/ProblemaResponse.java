package ec.edu.ups.tipi.common;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Map;

@Schema(name = "ProblemaResponse", description = "Error devuelto por la API con el formato Problem Details")
public record ProblemaResponse(
        String type,
        String title,
        Integer status,
        String detail,
        String instance,
        Map<String, String> errores) {
}
