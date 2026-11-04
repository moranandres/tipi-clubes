package ec.edu.ups.tipi.certificados.dto;

import org.springframework.core.io.Resource;

public record CertificadoDescarga(Resource recurso, String nombre, long tamano) {
}
