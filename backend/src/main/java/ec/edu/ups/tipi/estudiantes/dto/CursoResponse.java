package ec.edu.ups.tipi.estudiantes.dto;

import ec.edu.ups.tipi.estudiantes.CursoEducativo;

public record CursoResponse(CursoEducativo codigo, String etiqueta, String nivel) {

    public static CursoResponse de(CursoEducativo curso) {
        return new CursoResponse(curso, curso.getEtiqueta(), curso.getNivel());
    }
}