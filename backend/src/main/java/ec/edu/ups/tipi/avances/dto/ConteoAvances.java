package ec.edu.ups.tipi.avances.dto;

public record ConteoAvances(long deClub, long deEstudiantes, long deProyectos) {

    public long total() {
        return deClub + deEstudiantes + deProyectos;
    }
}
