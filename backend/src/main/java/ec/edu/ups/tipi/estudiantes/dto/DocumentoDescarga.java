package ec.edu.ups.tipi.estudiantes.dto;

import org.springframework.core.io.Resource;

public record DocumentoDescarga(Resource recurso, String tipoMime, String nombre, long tamano) {
}