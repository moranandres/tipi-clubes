package ec.edu.ups.tipi.certificados;

public enum TipoCertificado {
    PARTICIPACION_CURSO, APROBACION_CURSO, PARTICIPACION_COMPETENCIA, RECONOCIMIENTO_COMPETENCIA;

    public boolean deCurso() {
        return this == PARTICIPACION_CURSO || this == APROBACION_CURSO;
    }
}
