package ec.edu.ups.tipi.estudiantes;

import ec.edu.ups.tipi.estudiantes.dto.AnonimizacionRequest;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class EstudianteControllerTest {

    private EstudianteService service;
    private MockMvc mockMvc;

    @BeforeEach
    void preparar() {
        service = mock(EstudianteService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new EstudianteController(service))
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();
    }

    @Test
    void anonimizarRespondeOkConElEstudianteAnonimizado() throws Exception {
        Instant fecha = Instant.parse("2026-11-19T15:00:00Z");
        when(service.anonimizar(eq(7L), any(AnonimizacionRequest.class), any())).thenReturn(
                new EstudianteResponse(7L, "EST-000007", Estudiante.NOMBRE_ANONIMIZADO, "", 1L, "Unidad Educativa",
                        CursoEducativo.EGB_8, "8.º de EGB", "EGB Superior", EstadoEstudiante.EGRESADO,
                        EstadoAutorizacion.OTORGADA, EstadoAutorizacion.PENDIENTE, fecha,
                        true, fecha, "Solicitud del representante legal"));

        mockMvc.perform(post("/api/estudiantes/7/anonimizar").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"Solicitud del representante legal\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.anonimizado").value(true))
                .andExpect(jsonPath("$.nombres").value(Estudiante.NOMBRE_ANONIMIZADO))
                .andExpect(jsonPath("$.codigoInterno").value("EST-000007"));
    }

    @Test
    void anonimizarSinMotivoRespondeSolicitudIncorrecta() throws Exception {
        mockMvc.perform(post("/api/estudiantes/7/anonimizar").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"   \"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/estudiantes/7/anonimizar").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"corto\"}"))
                .andExpect(status().isBadRequest());
        verify(service, never()).anonimizar(any(), any(), any());
    }
}
