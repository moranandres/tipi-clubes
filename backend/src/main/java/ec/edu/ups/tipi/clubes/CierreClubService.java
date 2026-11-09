package ec.edu.ups.tipi.clubes;

import ec.edu.ups.tipi.actividades.Actividad;
import ec.edu.ups.tipi.actividades.CierreActividadesService;
import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.clubes.dto.CierreClubResponse;
import ec.edu.ups.tipi.clubes.dto.CursoAbiertoCierre;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.periodos.PeriodoAcademico;
import ec.edu.ups.tipi.periodos.PeriodoRepository;
import ec.edu.ups.tipi.proyectos.CierreProyectosService;
import ec.edu.ups.tipi.proyectos.Proyecto;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CierreClubService {

    private static final ZoneId ZONA = ZoneId.of("America/Guayaquil");
    private static final String OBSERVACION = "Cancelada automáticamente por el cierre del club";
    private static final String ACCION_CIERRE = "cerrar el club";

    private final ClubRepository clubRepository;
    private final PeriodoRepository periodoRepository;
    private final AlcanceInstitucional alcance;
    private final CierreActividadesService actividades;
    private final CierreProyectosService proyectos;
    private final AuditoriaService auditoria;

    public record ResultadoCierre(long integrantesFinalizados, int solicitudesInscripcionCanceladas,
                                  int solicitudesRetiroCanceladas) {
    }

    @Transactional(readOnly = true)
    public CierreClubResponse previsualizar(Long id, UsuarioPrincipal usuario) {
        Club club = clubRepository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Club no encontrado."));
        alcance.verificar(usuario, club.getInstitucionId());

        List<CursoAbiertoCierre> cursos = cursosAbiertos(club.getId());
        long integrantes = integrantesActivos(club.getId());
        long solicitudes = clubRepository.solicitudesInscripcionAbiertas(club.getId()).size();
        long retiros = clubRepository.solicitudesRetiroPendientes(club.getId()).size();
        List<Actividad> sinRegistrar = actividades.sinRegistrarDelClub(club.getId());
        long actividadesFuturas = actividades.futurasDelClub(club.getId()).size();
        List<Proyecto> enDesarrollo = proyectos.enDesarrolloDelClub(club.getId());

        List<String> bloqueos = new ArrayList<>();
        if (club.getEstado() == EstadoClub.CERRADO) {
            bloqueos.add("El club ya está cerrado.");
        }
        if (!cursos.isEmpty()) {
            bloqueos.add(mensajeCursos(cursos));
        }
        if (!sinRegistrar.isEmpty()) {
            bloqueos.add(actividades.mensajeSinRegistrar("El club", sinRegistrar, ACCION_CIERRE));
        }
        if (!enDesarrollo.isEmpty()) {
            bloqueos.add(proyectos.mensajeEnDesarrollo(enDesarrollo, ACCION_CIERRE));
        }

        List<String> avisos = new ArrayList<>();
        if (bloqueos.isEmpty()) {
            if (integrantes > 0) {
                avisos.add(integrantes == 1
                        ? "1 integrante activo pasará a FINALIZADA; su historial se conserva."
                        : integrantes + " integrantes activos pasarán a FINALIZADA; su historial se conserva.");
            }
            if (solicitudes > 0) {
                avisos.add(solicitudes == 1
                        ? "1 solicitud de inscripción abierta se cancelará automáticamente."
                        : solicitudes + " solicitudes de inscripción abiertas se cancelarán automáticamente.");
            }
            if (retiros > 0) {
                avisos.add(retiros == 1
                        ? "1 solicitud de retiro pendiente se cancelará automáticamente."
                        : retiros + " solicitudes de retiro pendientes se cancelarán automáticamente.");
            }
            if (actividadesFuturas > 0) {
                avisos.add(actividadesFuturas == 1
                        ? "1 actividad planificada para una fecha futura se cancelará automáticamente."
                        : actividadesFuturas + " actividades planificadas para fechas futuras se cancelarán automáticamente.");
            }
            avisos.add("Si un administrador reabre el club, los integrantes no se reactivan solos: "
                    + "cada estudiante debe volver a inscribirse con una solicitud aprobada.");
        }

        return new CierreClubResponse(club.getId(), club.getNombre(), club.getEstado(), bloqueos.isEmpty(),
                fechaSalida(club), integrantes, solicitudes, retiros, cursos, bloqueos, avisos);
    }

    @Transactional
    public ResultadoCierre preparar(Club club, UsuarioPrincipal usuario) {
        List<CursoAbiertoCierre> cursos = cursosAbiertos(club.getId());
        if (!cursos.isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT, mensajeCursos(cursos));
        }
        List<Actividad> sinRegistrar = actividades.sinRegistrarDelClub(club.getId());
        if (!sinRegistrar.isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT,
                    actividades.mensajeSinRegistrar("El club", sinRegistrar, ACCION_CIERRE));
        }
        List<Proyecto> enDesarrollo = proyectos.enDesarrolloDelClub(club.getId());
        if (!enDesarrollo.isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT, proyectos.mensajeEnDesarrollo(enDesarrollo, ACCION_CIERRE));
        }
        long integrantes = integrantesActivos(club.getId());

        List<Object[]> solicitudes = clubRepository.solicitudesInscripcionAbiertas(club.getId());
        List<Object[]> retiros = clubRepository.solicitudesRetiroPendientes(club.getId());

        int canceladas = clubRepository.cancelarSolicitudesInscripcion(club.getId(), usuario.getId(), OBSERVACION);
        for (Object[] fila : solicitudes) {
            auditoria.registrar("SOLICITUD_INSCRIPCION_CANCELADA", "SOLICITUD_INSCRIPCION",
                    ((Number) fila[0]).longValue(),
                    "codigo=" + fila[2] + "; estado: '" + fila[1] + "' -> 'CANCELADA'; por cierre del club id="
                            + club.getId());
        }

        int retirosCancelados = clubRepository.cancelarSolicitudesRetiro(club.getId(), usuario.getId(), OBSERVACION);
        for (Object[] fila : retiros) {
            auditoria.registrar("SOLICITUD_RETIRO_CANCELADA", "SOLICITUD_RETIRO", ((Number) fila[0]).longValue(),
                    "codigo=" + fila[1] + "; estado: 'PENDIENTE' -> 'CANCELADA'; por cierre del club id="
                            + club.getId());
        }

        actividades.cancelar(actividades.futurasDelClub(club.getId()), usuario, OBSERVACION);

        return new ResultadoCierre(integrantes, canceladas, retirosCancelados);
    }

    private List<CursoAbiertoCierre> cursosAbiertos(Long clubId) {
        return clubRepository.cursosAbiertos(clubId).stream()
                .map(f -> new CursoAbiertoCierre(((Number) f[0]).longValue(), (String) f[1], (String) f[2]))
                .toList();
    }

    private long integrantesActivos(Long clubId) {
        return clubRepository.contarIntegrantesActivos(List.of(clubId)).stream()
                .mapToLong(f -> ((Number) f[1]).longValue())
                .sum();
    }

    private String mensajeCursos(List<CursoAbiertoCierre> cursos) {
        return "El club tiene cursos planificados o en curso: "
                + cursos.stream().map(c -> "«" + c.nombre() + "» (" + c.estado() + ")")
                .collect(Collectors.joining(", "))
                + ". Finalícelos o cancélelos antes de cerrar el club.";
    }

    private LocalDate fechaSalida(Club club) {
        LocalDate hoy = LocalDate.now(ZONA);
        return periodoRepository.findById(club.getPeriodoId())
                .map(PeriodoAcademico::getFechaFin)
                .filter(fin -> fin.isBefore(hoy))
                .orElse(hoy);
    }
}
