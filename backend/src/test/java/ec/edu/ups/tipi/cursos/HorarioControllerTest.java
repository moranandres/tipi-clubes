package ec.edu.ups.tipi.cursos;

import ec.edu.ups.tipi.cursos.dto.HorarioRequest;
import ec.edu.ups.tipi.cursos.dto.HorarioResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class HorarioControllerTest {

    private static final String CUERPO =
            "{\"diaSemana\":2,\"horaInicio\":\"14:00:00\",\"horaFin\":\"16:00:00\",\"tipoSesion\":\"PRESENCIAL\"}";

    private HorarioService service;
    private MockMvc mockMvc;

    @BeforeEach
    void preparar() {
        service = mock(HorarioService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new HorarioController(service))
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();
    }

    @Test
    void crearRespondeCreadoConUbicacionDentroDelCurso() throws Exception {
        when(service.crear(eq(5L), any(HorarioRequest.class), any())).thenReturn(horario(3L));

        mockMvc.perform(post("/api/cursos/5/horarios").contentType(MediaType.APPLICATION_JSON).content(CUERPO))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "http://localhost/api/cursos/5/horarios/3"))
                .andExpect(jsonPath("$.id").value(3))
                .andExpect(jsonPath("$.dia").value("Martes"));
    }

    @Test
    void actualizarRespondeOkSinUbicacion() throws Exception {
        when(service.actualizar(eq(5L), eq(3L), any(HorarioRequest.class), any())).thenReturn(horario(3L));

        mockMvc.perform(put("/api/cursos/5/horarios/3").contentType(MediaType.APPLICATION_JSON).content(CUERPO))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Location"))
                .andExpect(jsonPath("$.id").value(3));
    }

    @Test
    void eliminarRespondeSinContenido() throws Exception {
        mockMvc.perform(delete("/api/cursos/5/horarios/3"))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        verify(service).eliminar(eq(5L), eq(3L), any());
    }

    @Test
    void crearConDatosInvalidosRespondeSolicitudIncorrecta() throws Exception {
        mockMvc.perform(post("/api/cursos/5/horarios").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    private HorarioResponse horario(Long id) {
        return new HorarioResponse(id, (short) 2, "Martes", LocalTime.of(14, 0), LocalTime.of(16, 0), 120,
                TipoSesion.PRESENCIAL, List.of());
    }
}
