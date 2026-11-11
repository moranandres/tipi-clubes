package ec.edu.ups.tipi.panel;

import ec.edu.ups.tipi.actividades.ActividadService;
import ec.edu.ups.tipi.actividades.EstadoActividad;
import ec.edu.ups.tipi.clubes.ClubService;
import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.docentes.DocenteService;
import ec.edu.ups.tipi.inscripciones.EstadoSolicitud;
import ec.edu.ups.tipi.inscripciones.SolicitudInscripcionService;
import ec.edu.ups.tipi.instituciones.InstitucionService;
import ec.edu.ups.tipi.panel.dto.PanelResumenResponse;
import ec.edu.ups.tipi.panel.dto.PanelResumenResponse.IndicadoresPanel;
import ec.edu.ups.tipi.panel.dto.PanelResumenResponse.PendientesPanel;
import ec.edu.ups.tipi.panel.dto.PanelResumenResponse.PeriodoPanel;
import ec.edu.ups.tipi.panel.dto.PanelResumenResponse.SeguimientoPanel;
import ec.edu.ups.tipi.periodos.PeriodoAcademico;
import ec.edu.ups.tipi.periodos.PeriodoRepository;
import ec.edu.ups.tipi.retiros.EstadoRetiro;
import ec.edu.ups.tipi.retiros.SolicitudRetiroService;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.seguimiento.SeguimientoService;
import ec.edu.ups.tipi.seguimiento.dto.ResumenSeguimientoResponse;
import ec.edu.ups.tipi.usuarios.UsuarioService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
public class PanelService {

    private static final ZoneId ZONA = ZoneId.of("America/Guayaquil");
    private static final String ROL_ADMIN = "ADMIN";
    private static final int DIAS_PROXIMOS = 7;

    private final AlcanceInstitucional alcance;
    private final PeriodoRepository periodoRepository;
    private final InstitucionService institucionService;
    private final ClubService clubService;
    private final DocenteService docenteService;
    private final UsuarioService usuarioService;
    private final ActividadService actividadService;
    private final SolicitudInscripcionService solicitudInscripcionService;
    private final SolicitudRetiroService solicitudRetiroService;
    private final SeguimientoService seguimientoService;

    @Transactional(readOnly = true)
    public PanelResumenResponse resumen(UsuarioPrincipal usuario) {
        boolean global = alcance.esGlobal(usuario);
        Long institucionId = global ? null : alcance.institucionPropia(usuario);
        String institucionNombre = institucionId == null
                ? null
                : institucionService.obtener(institucionId, usuario).nombre();
        PeriodoAcademico periodo = periodoRepository.findByActivoTrue().orElse(null);
        LocalDate hoy = LocalDate.now(ZONA);

        return new PanelResumenResponse(
                usuario.getRolCodigo(),
                global,
                institucionId,
                institucionNombre,
                periodo == null ? null : new PeriodoPanel(periodo.getId(), periodo.getNombre(),
                        periodo.getFechaInicio(), periodo.getFechaFin()),
                hoy,
                indicadores(usuario),
                pendientes(usuario, hoy),
                periodo == null ? null : seguimiento(usuario),
                Instant.now());
    }

    private IndicadoresPanel indicadores(UsuarioPrincipal usuario) {
        long instituciones = institucionService.listar(null, null, null, null, 0, 1, usuario).totalElementos();
        long clubes = clubService.listar(null, null, null, null, 0, 1, usuario).totalElementos();
        long clubesActivos = clubService.listar(null, null, null, EstadoClub.ACTIVO, 0, 1, usuario).totalElementos();
        long docentesActivos = docenteService.listar(null, null, true, 0, 1, usuario).totalElementos();
        Long usuariosActivos = ROL_ADMIN.equals(usuario.getRolCodigo())
                ? usuarioService.listar(null, null, null, true, 0, 1).totalElementos()
                : null;
        return new IndicadoresPanel(instituciones, clubes, clubesActivos, docentesActivos, usuariosActivos);
    }

    private PendientesPanel pendientes(UsuarioPrincipal usuario, LocalDate hoy) {
        long sinEjecucion = actividadService.listar(null, null, null, null, null, null, null, null,
                true, false, 0, 1, usuario).totalElementos();
        long proximas = actividadService.listar(null, null, null, null, null, EstadoActividad.PLANIFICADA, hoy,
                hoy.plusDays(DIAS_PROXIMOS), false, true, 0, 1, usuario).totalElementos();
        long inscripciones = solicitudesInscripcion(EstadoSolicitud.PENDIENTE, usuario)
                + solicitudesInscripcion(EstadoSolicitud.EN_REVISION, usuario);
        long retiros = solicitudRetiroService.listar(null, EstadoRetiro.PENDIENTE, null, null, null, null, 0, 1,
                usuario).totalElementos();
        return new PendientesPanel(sinEjecucion, proximas, inscripciones, retiros);
    }

    private long solicitudesInscripcion(EstadoSolicitud estado, UsuarioPrincipal usuario) {
        return solicitudInscripcionService.listar(null, estado, null, null, null, null, null, 0, 1, usuario)
                .totalElementos();
    }

    private SeguimientoPanel seguimiento(UsuarioPrincipal usuario) {
        ResumenSeguimientoResponse resumen = seguimientoService.resumen(null, null, null, null, usuario);
        return new SeguimientoPanel(resumen.totalClubes(), resumen.clubesAdecuados(), resumen.clubesEnRiesgo(),
                resumen.clubesCriticos(), resumen.clubesSinDatos());
    }
}
