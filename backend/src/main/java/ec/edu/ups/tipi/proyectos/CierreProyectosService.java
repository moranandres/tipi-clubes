package ec.edu.ups.tipi.proyectos;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CierreProyectosService {

    private static final int MAXIMO_LISTADOS = 5;

    private final ProyectoRepository repository;

    @Transactional(readOnly = true)
    public List<Proyecto> enDesarrolloDelClub(Long clubId) {
        return repository.findByClubIdAndEstadoOrderByTituloAsc(clubId, EstadoProyecto.EN_DESARROLLO);
    }

    public String mensajeEnDesarrollo(List<Proyecto> proyectos, String accion) {
        String lista = proyectos.stream().limit(MAXIMO_LISTADOS)
                .map(p -> "«" + p.getTitulo() + "»")
                .collect(Collectors.joining(", "));
        if (proyectos.size() > MAXIMO_LISTADOS) {
            lista += " y " + (proyectos.size() - MAXIMO_LISTADOS) + " más";
        }
        return "El club tiene proyectos en desarrollo (" + proyectos.size() + "): " + lista
                + ". Finalícelos o cancélelos antes de " + accion + ".";
    }
}
