package ec.edu.ups.tipi.avances.dto;

public record ConteoProyectos(long enDesarrollo, long finalizados, long prototiposFinalizados, long cancelados) {

    public long validos() {
        return enDesarrollo + finalizados;
    }
}
