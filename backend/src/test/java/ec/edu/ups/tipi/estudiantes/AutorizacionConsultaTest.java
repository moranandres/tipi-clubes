package ec.edu.ups.tipi.estudiantes;

import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.GlobalExceptionHandler;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.instituciones.Institucion;
import ec.edu.ups.tipi.instituciones.InstitucionRepository;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.usuarios.Rol;
import ec.edu.ups.tipi.usuarios.Usuario;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AutorizacionConsultaTest {

    private AutorizacionRepository autorizaciones;
    private EstudianteRepository estudiantes;
    private InstitucionRepository instituciones;
    private AutorizacionConsultaService service;

    @BeforeEach
    void preparar() {
        autorizaciones = mock(AutorizacionRepository.class);
        estudiantes = mock(EstudianteRepository.class);
        instituciones = mock(InstitucionRepository.class);
        service = new AutorizacionConsultaService(autorizaciones, estudiantes, instituciones, new AlcanceInstitucional());
    }

    @Test
    void elEndpointSoloAdmiteAdministradorResponsableYDocente() throws Exception {
        PreAuthorize regla = AutorizacionConsultaController.class
                .getMethod("listar", EstadoAutorizacion.class, TipoAutorizacion.class, Long.class, Long.class,
                        int.class, int.class, UsuarioPrincipal.class)
                .getAnnotation(PreAuthorize.class);

        assertThat(regla.value()).isEqualTo("hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')");
    }

    @Test
    void elControladorEntregaFiltrosYPaginacionAlServicio() throws Exception {
        AutorizacionConsultaService simulado = mock(AutorizacionConsultaService.class);
        when(simulado.listar(any(), any(), any(), any(), anyInt(), anyInt(), any()))
                .thenReturn(new PaginaResponse<>(List.of(), 1, 20, 0, 0));
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new AutorizacionConsultaController(simulado))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();

        mockMvc.perform(get("/api/autorizaciones")
                        .param("estado", "PENDIENTE").param("tipo", "USO_IMAGEN")
                        .param("institucionId", "3").param("estudianteId", "9")
                        .param("pagina", "1").param("tamano", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pagina").value(1));

        verify(simulado).listar(eq(EstadoAutorizacion.PENDIENTE), eq(TipoAutorizacion.USO_IMAGEN), eq(3L), eq(9L),
                eq(1), eq(20), isNull());

        mockMvc.perform(get("/api/autorizaciones").param("estado", "VIGENTE"))
                .andExpect(status().isBadRequest());
    }

    @ParameterizedTest
    @ValueSource(strings = {"COORDINADOR", "CONSULTA"})
    void losRolesDeVistaMinimaNoConsultanAutorizaciones(String rol) {
        assertThatThrownBy(() -> service.listar(null, null, null, null, 0, 10, usuario(rol, null)))
                .isInstanceOf(ApiException.class)
                .extracting(error -> ((ApiException) error).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);

        verify(autorizaciones, never()).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void unResponsableNoPuedePedirOtraInstitucion() {
        assertThatThrownBy(() -> service.listar(null, null, 2L, null, 0, 10, usuario("RESP_INSTITUCIONAL", 1L)))
                .isInstanceOf(ApiException.class)
                .extracting(error -> ((ApiException) error).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void unDocenteRecibeSoloAutorizacionesDeSuInstitucionConNombreDelEstudiante() {
        Autorizacion autorizacion = new Autorizacion();
        autorizacion.setId(4L);
        autorizacion.setEstudianteId(9L);
        autorizacion.setTipo(TipoAutorizacion.PARTICIPACION);
        autorizacion.setEstado(EstadoAutorizacion.PENDIENTE);
        Estudiante estudiante = new Estudiante();
        estudiante.setId(9L);
        estudiante.setInstitucionId(1L);
        estudiante.setCodigoInterno("EST-000009");
        estudiante.setNombres("Ana");
        estudiante.setApellidos("Bravo");
        estudiante.setCurso(CursoEducativo.EGB_8);
        Institucion institucion = new Institucion();
        institucion.setId(1L);
        institucion.setNombre("Unidad Educativa Uno");

        when(autorizaciones.findAll(any(Specification.class), any(Pageable.class)))
                .thenAnswer(invocacion -> new PageImpl<>(List.of(autorizacion), invocacion.getArgument(1), 1));
        when(estudiantes.findAllById(any())).thenReturn(List.of(estudiante));
        when(instituciones.findAllById(any())).thenReturn(List.of(institucion));

        var pagina = service.listar(EstadoAutorizacion.PENDIENTE, null, null, null, 0, 500, usuario("DOCENTE", 1L));

        assertThat(pagina.totalElementos()).isEqualTo(1);
        assertThat(pagina.tamano()).isEqualTo(100);
        assertThat(pagina.contenido()).singleElement().satisfies(fila -> {
            assertThat(fila.estudianteCodigo()).isEqualTo("EST-000009");
            assertThat(fila.institucionNombre()).isEqualTo("Unidad Educativa Uno");
            assertThat(fila.estudianteCursoEtiqueta()).isEqualTo("8.º EGB");
            assertThat(fila.representante()).isNull();
        });

        ArgumentCaptor<Pageable> paginacion = ArgumentCaptor.forClass(Pageable.class);
        verify(autorizaciones).findAll(any(Specification.class), paginacion.capture());
        assertThat(paginacion.getValue().getSort().getOrderFor("actualizadoEn")).isNotNull();
    }

    @Test
    void unDocenteSinInstitucionAsignadaNoConsulta() {
        assertThatThrownBy(() -> service.listar(null, null, null, null, 0, 10, usuario("DOCENTE", null)))
                .isInstanceOf(ApiException.class)
                .extracting(error -> ((ApiException) error).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);
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
}
