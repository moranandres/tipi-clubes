package ec.edu.ups.tipi.actividades;

import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CierreActividadesService {

    private static final ZoneId ZONA = ZoneId.of("America/Guayaquil");
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final int MAXIMO_EN_MENSAJE = 5;

    private final ActividadRepository repository;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public List<Actividad> sinRegistrarDelClub(Long clubId) {
        return repository.findByClubIdAndEstadoAndFechaLessThanEqualOrderByFechaAscHoraInicioAsc(
                clubId, EstadoActividad.PLANIFICADA, hoy());
    }

    @Transactional(readOnly = true)
    public List<Actividad> futurasDelClub(Long clubId) {
        return repository.findByClubIdAndEstadoAndFechaGreaterThanOrderByFechaAscHoraInicioAsc(
                clubId, EstadoActividad.PLANIFICADA, hoy());
    }

    @Transactional(readOnly = true)
    public List<Actividad> sinRegistrarDelCurso(Long cursoId) {
        return repository.findByCursoIdAndEstadoAndFechaLessThanEqualOrderByFechaAscHoraInicioAsc(
                cursoId, EstadoActividad.PLANIFICADA, hoy());
    }

    @Transactional(readOnly = true)
    public List<Actividad> futurasDelCurso(Long cursoId) {
        return repository.findByCursoIdAndEstadoAndFechaGreaterThanOrderByFechaAscHoraInicioAsc(
                cursoId, EstadoActividad.PLANIFICADA, hoy());
    }

    public String mensajeSinRegistrar(String sujeto, List<Actividad> pendientes, String accion) {
        String lista = pendientes.stream()
                .limit(MAXIMO_EN_MENSAJE)
                .map(a -> "«" + a.getTema() + "» (" + a.getFecha().format(FECHA) + ")")
                .collect(Collectors.joining(", "));
        if (pendientes.size() > MAXIMO_EN_MENSAJE) {
            lista += " y " + (pendientes.size() - MAXIMO_EN_MENSAJE) + " más";
        }
        return sujeto + " tiene actividades de hoy o de fechas pasadas sin registrar (" + pendientes.size() + "): "
                + lista + ". Registre su ejecución o cancélelas antes de " + accion + ".";
    }

    @Transactional
    public int cancelar(List<Actividad> actividades, UsuarioPrincipal usuario, String motivo) {
        Instant ahora = Instant.now();
        for (Actividad actividad : actividades) {
            actividad.setEstado(EstadoActividad.CANCELADA);
            actividad.setMotivoCancelacion(motivo);
            actividad.setCanceladaPor(usuario.getId());
            actividad.setFechaCancelacion(ahora);
            actividad.setActualizadoEn(ahora);
        }
        repository.saveAll(actividades);
        repository.flush();
        for (Actividad actividad : actividades) {
            auditoria.registrar("ACTIVIDAD_CANCELADA", "ACTIVIDAD", actividad.getId(),
                    "fecha=" + actividad.getFecha() + "; estado: 'PLANIFICADA' -> 'CANCELADA'; motivo=" + motivo);
        }
        return actividades.size();
    }

    private LocalDate hoy() {
        return LocalDate.now(ZONA);
    }
}
