package ec.edu.ups.tipi.almacenamiento;

public record ArchivoGuardado(String ruta, String nombreOriginal, String tipoMime, long tamano, String hash) {
}