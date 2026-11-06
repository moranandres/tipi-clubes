package ec.edu.ups.tipi.asistencias.dto;

public record ConteoAsistencia(long presentes, long atrasados, long ausentes, long justificados) {

    public long registrados() {
        return presentes + atrasados + ausentes + justificados;
    }
}
