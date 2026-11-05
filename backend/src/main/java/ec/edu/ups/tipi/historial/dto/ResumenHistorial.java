package ec.edu.ups.tipi.historial.dto;

import java.time.LocalDate;

public record ResumenHistorial(LocalDate primerIngreso, long periodos, long clubes, long clubesActivos,
                               long cursos, long cursosEnMarcha, long cursosFinalizados, long cursosAprobados,
                               long competencias, long competenciasConResultado, long podios,
                               long certificadosVigentes, long certificadosAnulados) {
}
