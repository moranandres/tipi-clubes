package ec.edu.ups.tipi.almacenamiento;

import java.util.Optional;

public enum TipoArchivo {
    PDF("application/pdf", "pdf"),
    JPEG("image/jpeg", "jpg"),
    PNG("image/png", "png");

    private final String mime;
    private final String extension;

    TipoArchivo(String mime, String extension) {
        this.mime = mime;
        this.extension = extension;
    }

    public String mime() {
        return mime;
    }

    public String extension() {
        return extension;
    }

    public static Optional<TipoArchivo> detectar(byte[] contenido) {
        if (empiezaCon(contenido, 0x25, 0x50, 0x44, 0x46, 0x2D)) {
            return Optional.of(PDF);
        }
        if (empiezaCon(contenido, 0xFF, 0xD8, 0xFF)) {
            return Optional.of(JPEG);
        }
        if (empiezaCon(contenido, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) {
            return Optional.of(PNG);
        }
        return Optional.empty();
    }

    private static boolean empiezaCon(byte[] contenido, int... firma) {
        if (contenido.length < firma.length) {
            return false;
        }
        for (int i = 0; i < firma.length; i++) {
            if ((contenido[i] & 0xFF) != firma[i]) {
                return false;
            }
        }
        return true;
    }
}