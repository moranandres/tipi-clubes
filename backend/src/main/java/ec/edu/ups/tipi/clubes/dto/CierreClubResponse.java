package ec.edu.ups.tipi.clubes.dto;

import ec.edu.ups.tipi.clubes.EstadoClub;

import java.time.LocalDate;
import java.util.List;

public record CierreClubResponse(Long clubId, String clubNombre, EstadoClub estado, boolean puedeCerrar,
                                 LocalDate fechaSalida, long integrantesAFinalizar,
                                 long solicitudesInscripcionACancelar, long solicitudesRetiroACancelar,
                                 List<CursoAbiertoCierre> cursosAbiertos, List<String> bloqueos,
                                 List<String> avisos) {
}
