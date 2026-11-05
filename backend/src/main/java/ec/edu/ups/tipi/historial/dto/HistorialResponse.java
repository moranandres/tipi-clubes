package ec.edu.ups.tipi.historial.dto;

import ec.edu.ups.tipi.certificados.dto.CertificadoVista;
import ec.edu.ups.tipi.competencias.dto.ParticipacionVista;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteVista;
import ec.edu.ups.tipi.historial.AlcanceHistorial;
import ec.edu.ups.tipi.inscripciones.dto.InscripcionVista;

import java.util.List;

public record HistorialResponse(EstudianteVista estudiante, AlcanceHistorial alcance, ResumenHistorial resumen,
                                List<InscripcionVista> clubes, List<ParticipacionVista> competencias,
                                List<CertificadoVista> certificados, List<EventoHistorialResponse> lineaDeTiempo) {
}
