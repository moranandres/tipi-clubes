package ec.edu.ups.tipi.evidencias.dto;

import ec.edu.ups.tipi.clubes.EstadoClub;

public record ClubEvidenciasResponse(
        Long clubId, String clubNombre, EstadoClub estadoClub, Long institucionId, String institucionNombre,
        long actividadesEjecutadas, long actividadesConEvidencia, boolean conEvidencia, ConteoEvidencias conteo) {
}
