package ec.edu.ups.tipi.retiros.dto;

import java.util.List;

public record EfectosRetiroResponse(Long solicitudId, Long inscripcionId, String estudianteCodigo,
                                    boolean aprobable, List<String> impedimentos,
                                    CupoEfecto club, List<CupoEfecto> cursos,
                                    List<Long> solicitudesInscripcionACancelar) {
}
