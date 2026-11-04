package ec.edu.ups.tipi.retiros.dto;

public record CupoEfecto(String tipo, Long id, Long inscripcionCursoId, String nombre, int cupoMaximo,
                         long activosAhora, long disponiblesAhora, long disponiblesTrasAprobar) {

    public static CupoEfecto de(String tipo, Long id, Long inscripcionCursoId, String nombre, int cupoMaximo,
                                long activosAhora) {
        return new CupoEfecto(tipo, id, inscripcionCursoId, nombre, cupoMaximo, activosAhora,
                Math.max(cupoMaximo - activosAhora, 0), Math.max(cupoMaximo - (activosAhora - 1), 0));
    }
}
