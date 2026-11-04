package ec.edu.ups.tipi.retiros.dto;

import java.time.LocalDate;

public record CursoRetiradoResponse(Long inscripcionCursoId, Long cursoId, String cursoNombre, LocalDate fechaFin) {
}
