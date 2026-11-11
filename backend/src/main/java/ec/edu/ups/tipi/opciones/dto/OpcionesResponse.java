package ec.edu.ups.tipi.opciones.dto;

import java.util.List;

public record OpcionesResponse<T>(List<T> opciones, boolean hayMas) {
}
