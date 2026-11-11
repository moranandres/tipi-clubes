package ec.edu.ups.tipi.panel;

import ec.edu.ups.tipi.actividades.ActividadService;
import ec.edu.ups.tipi.clubes.ClubService;
import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.docentes.DocenteService;
import ec.edu.ups.tipi.inscripciones.EstadoSolicitud;
import ec.edu.ups.tipi.inscripciones.SolicitudInscripcionService;
import ec.edu.ups.tipi.instituciones.InstitucionService;
import ec.edu.ups.tipi.instituciones.dto.InstitucionResponse;
import ec.edu.ups.tipi.panel.dto.PanelResumenResponse;
import ec.edu.ups.tipi.periodos.PeriodoAcademico;
import ec.edu.ups.tipi.periodos.PeriodoRepository;
import ec.edu.ups.tipi.retiros.EstadoRetiro;
import ec.edu.ups.tipi.retiros.SolicitudRetiroService;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.seguimiento.SeguimientoService;
import ec.edu.ups.tipi.seguimiento.dto.ResumenSeguimientoResponse;
import ec.edu.ups.tipi.usuarios.Rol;
import ec.edu.ups.tipi.usuarios.Usuario;
import ec.edu.ups.tipi.usuarios.UsuarioService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class PanelServiceTest {

    private PeriodoRepository periodoRepository;
    private InstitucionService institucionService;
    private ClubService clubService;
    private DocenteService docenteService;
    private UsuarioService usuarioService;
    private ActividadService actividadService;
    private SolicitudInscripcionService solicitudInscripcionService;
    private SolicitudRetiroService solicitudRetiroService;
    private SeguimientoService seguimientoService;
    private PanelService service;

    @BeforeEach
    void preparar() {
        periodoRepository = mock(PeriodoRepository.class);
        institucionService = mock(InstitucionService.class);
        clubService = mock(ClubService.class);
        docenteService = mock(DocenteService.class);
        usuarioService = mock(UsuarioService.class);
        actividadService = mock(ActividadService.class);
        solicitudInscripcionService = mock(SolicitudInscripcionService.class);
        solicitudRetiroService = mock(SolicitudRetiroService.class);
        seguimientoService = mock(SeguimientoService.class);
        service = new PanelService(new AlcanceInstitucional(), periodoRepository, institucionService, clubService,
                docenteService, usuarioService, actividadService, solicitudInscripcionService,
                solicitudRetiroService, seguimientoService);

        when(periodoRepository.findByActivoTrue()).thenReturn(Optional.of(periodo()));
        when(institucionService.listar(any(), any(), any(), any(), anyInt(), anyInt(), any()))
                .thenReturn(pagina(7));
        when(institucionService.obtener(eq(1L), any())).thenReturn(institucion());
        when(clubService.listar(any(), any(), any(), isNull(), anyInt(), anyInt(), any()))
                .thenReturn(pagina(54));
        when(clubService.listar(any(), any(), any(), eq(EstadoClub.ACTIVO), anyInt(), anyInt(), any()))
                .thenReturn(pagina(46));
        when(docenteService.listar(any(), any(), eq(true), anyInt(), anyInt(), any()))
                .thenReturn(pagina(47));
        when(usuarioService.listar(any(), any(), any(), eq(true), anyInt(), anyInt()))
                .thenReturn(pagina(120));
        when(actividadService.listar(any(), any(), any(), any(), any(), any(), any(), any(), eq(true),
                anyBoolean(), anyInt(), anyInt(), any())).thenReturn(pagina(7));
        when(actividadService.listar(any(), any(), any(), any(), any(), any(), any(), any(), eq(false),
                anyBoolean(), anyInt(), anyInt(), any())).thenReturn(pagina(8));
        when(solicitudInscripcionService.listar(any(), eq(EstadoSolicitud.PENDIENTE), any(), any(), any(), any(),
                any(), anyInt(), anyInt(), any())).thenReturn(pagina(3));
        when(solicitudInscripcionService.listar(any(), eq(EstadoSolicitud.EN_REVISION), any(), any(), any(), any(),
                any(), anyInt(), anyInt(), any())).thenReturn(pagina(2));
        when(solicitudRetiroService.listar(any(), eq(EstadoRetiro.PENDIENTE), any(), any(), any(), any(),
                anyInt(), anyInt(), any())).thenReturn(pagina(1));
        when(seguimientoService.resumen(any(), any(), any(), any(), any())).thenReturn(seguimiento());
    }

    @Test
    void administradorRecibeAlcanceGlobalYUsuariosActivos() {
        PanelResumenResponse resumen = service.resumen(usuario("ADMIN", null));

        assertEquals("ADMIN", resumen.rol());
        assertTrue(resumen.alcanceGlobal());
        assertNull(resumen.institucionId());
        assertNull(resumen.institucionNombre());
        assertEquals("2026-2027", resumen.periodoActivo().nombre());
        assertEquals(7, resumen.indicadores().instituciones());
        assertEquals(54, resumen.indicadores().clubes());
        assertEquals(46, resumen.indicadores().clubesActivos());
        assertEquals(47, resumen.indicadores().docentesActivos());
        assertEquals(120L, resumen.indicadores().usuariosActivos());
        assertEquals(7, resumen.pendientes().sesionesSinEjecucion());
        assertEquals(8, resumen.pendientes().sesionesProximosSieteDias());
        assertEquals(5, resumen.pendientes().solicitudesInscripcionPorResolver());
        assertEquals(1, resumen.pendientes().solicitudesRetiroPorResolver());
        assertEquals(3, resumen.seguimiento().clubesCriticos());
        assertNotNull(resumen.generadoEn());
        verify(institucionService, never()).obtener(any(), any());
    }

    @Test
    void responsableRecibeSuInstitucionYNoVeUsuarios() {
        UsuarioPrincipal responsable = usuario("RESP_INSTITUCIONAL", 1L);

        PanelResumenResponse resumen = service.resumen(responsable);

        assertFalse(resumen.alcanceGlobal());
        assertEquals(1L, resumen.institucionId());
        assertEquals("Unidad Educativa de Prueba", resumen.institucionNombre());
        assertNull(resumen.indicadores().usuariosActivos());
        verifyNoInteractions(usuarioService);
        verify(clubService).listar(isNull(), isNull(), isNull(), isNull(), eq(0), eq(1), eq(responsable));
        verify(seguimientoService).resumen(isNull(), isNull(), isNull(), isNull(), eq(responsable));
    }

    @Test
    void docenteConsultaConSuPropioAlcance() {
        UsuarioPrincipal docente = usuario("DOCENTE", 1L);

        PanelResumenResponse resumen = service.resumen(docente);

        assertEquals("DOCENTE", resumen.rol());
        assertFalse(resumen.alcanceGlobal());
        assertNull(resumen.indicadores().usuariosActivos());
        verifyNoInteractions(usuarioService);
        verify(actividadService).listar(isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(),
                isNull(), eq(true), eq(false), eq(0), eq(1), eq(docente));
    }

    @Test
    void usuarioSinInstitucionAsignadaEsRechazado() {
        assertThrows(ApiException.class, () -> service.resumen(usuario("DOCENTE", null)));
    }

    @Test
    void sinPeriodoActivoNoCalculaSeguimiento() {
        when(periodoRepository.findByActivoTrue()).thenReturn(Optional.empty());

        PanelResumenResponse resumen = service.resumen(usuario("COORDINADOR", null));

        assertNull(resumen.periodoActivo());
        assertNull(resumen.seguimiento());
        verifyNoInteractions(seguimientoService);
    }

    private <T> PaginaResponse<T> pagina(long total) {
        return new PaginaResponse<>(List.of(), 0, 1, total, (int) total);
    }

    private UsuarioPrincipal usuario(String rolCodigo, Long institucionId) {
        Rol rol = new Rol();
        rol.setCodigo(rolCodigo);
        Usuario usuario = new Usuario();
        usuario.setId(10L);
        usuario.setUsername("prueba");
        usuario.setRol(rol);
        usuario.setInstitucionId(institucionId);
        return new UsuarioPrincipal(usuario);
    }

    private PeriodoAcademico periodo() {
        PeriodoAcademico periodo = new PeriodoAcademico();
        periodo.setId(1);
        periodo.setNombre("2026-2027");
        periodo.setFechaInicio(LocalDate.of(2026, 9, 1));
        periodo.setFechaFin(LocalDate.of(2027, 7, 31));
        periodo.setActivo(true);
        return periodo;
    }

    private InstitucionResponse institucion() {
        return new InstitucionResponse(1L, "09H00001", "Unidad Educativa de Prueba", "8", null, "Guayas",
                "Guayaquil", null, null, null, null, null, null, null, null);
    }

    private ResumenSeguimientoResponse seguimiento() {
        return new ResumenSeguimientoResponse(1, "2026-2027", null, null, null, null, null, null,
                53, 13, 0, 3, 37, null, List.of(), List.of(), List.of());
    }
}
