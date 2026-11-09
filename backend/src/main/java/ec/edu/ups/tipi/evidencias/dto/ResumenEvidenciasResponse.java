package ec.edu.ups.tipi.evidencias.dto;

import java.util.List;

public record ResumenEvidenciasResponse(
        Integer periodoId, String periodoNombre, Long institucionId, long totalClubes, long clubesConEvidencia,
        Double porcentajeClubesConEvidencia, long actividadesEjecutadas, long actividadesConEvidencia,
        Double porcentajeActividadesConEvidencia, ConteoEvidencias conteo, List<ClubEvidenciasResponse> clubes) {
}
