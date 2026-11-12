package ec.edu.ups.tipi.evidencias;

import ec.edu.ups.tipi.evidencias.dto.EvidenciaCrearRequest;
import ec.edu.ups.tipi.evidencias.dto.EvidenciaResponse;
import ec.edu.ups.tipi.evidencias.dto.RetiroEvidenciaRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class EvidenciaControllerTest {

    private EvidenciaService service;
    private MockMvc mockMvc;

    @BeforeEach
    void preparar() {
        service = mock(EvidenciaService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new EvidenciaController(service))
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();
    }

    @Test
    void registrarRespondeCreadoConUbicacionDeLaEvidencia() throws Exception {
        when(service.registrar(eq(4L), any(EvidenciaCrearRequest.class), any(), any())).thenReturn(evidencia(9L));

        mockMvc.perform(multipart("/api/actividades/4/evidencias")
                        .param("tipo", "ENLACE")
                        .param("titulo", "Video de la sesión")
                        .param("descripcion", "Demostración del robot seguidor de línea")
                        .param("url", "https://ejemplo.org/video")
                        .param("sinEstudiantesIdentificables", "true"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "http://localhost/api/evidencias/9"))
                .andExpect(jsonPath("$.id").value(9))
                .andExpect(jsonPath("$.titulo").value("Video de la sesión"));
    }

    @Test
    void registrarSinTituloRespondeSolicitudIncorrecta() throws Exception {
        mockMvc.perform(multipart("/api/actividades/4/evidencias")
                        .param("tipo", "ENLACE")
                        .param("descripcion", "Demostración del robot seguidor de línea"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void retirarRespondeOkSinUbicacion() throws Exception {
        when(service.retirar(eq(9L), any(RetiroEvidenciaRequest.class), any())).thenReturn(evidencia(9L));

        mockMvc.perform(post("/api/evidencias/9/retiro").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"Se cargó en la sesión equivocada\"}"))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Location"))
                .andExpect(jsonPath("$.id").value(9));
    }

    private EvidenciaResponse evidencia(Long id) {
        return new EvidenciaResponse(id, 4L, "Sensores", null, null, 2L, "Club de robótica", 1L, "Unidad Educativa",
                TipoEvidencia.ENLACE, "Video de la sesión", "Demostración del robot seguidor de línea", null,
                "https://ejemplo.org/video", null, null, null, null, false, null, null, true, List.of(),
                EstadoEvidencia.values()[0], null, null, null, null, null, null);
    }
}
