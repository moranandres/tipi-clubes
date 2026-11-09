package ec.edu.ups.tipi.evidencias;

import ec.edu.ups.tipi.almacenamiento.TipoArchivo;

public record ArchivoPreparado(byte[] contenido, TipoArchivo tipo, String nombreOriginal) {
}
