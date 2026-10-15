package ec.edu.ups.tipi.common;

import java.util.Map;
import java.util.Objects;

public final class CambiosAuditoria {

    private CambiosAuditoria() {
    }

    public static String texto(Object valor) {
        return valor == null ? "" : valor.toString();
    }

    public static String diferencias(Map<String, String> antes, Map<String, String> despues) {
        StringBuilder sb = new StringBuilder();
        despues.forEach((campo, nuevo) -> {
            String viejo = antes.get(campo);
            if (!Objects.equals(viejo, nuevo)) {
                if (sb.length() > 0) {
                    sb.append("; ");
                }
                sb.append(campo).append(": '").append(viejo).append("' -> '").append(nuevo).append("'");
            }
        });
        return sb.length() == 0 ? "Sin cambios" : sb.toString();
    }
}