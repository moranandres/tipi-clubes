package ec.edu.ups.tipi.evidencias.dto;

public record ConteoEvidencias(long fotografias, long documentos, long enlaces, long productos) {

    public long total() {
        return fotografias + documentos + enlaces + productos;
    }
}
