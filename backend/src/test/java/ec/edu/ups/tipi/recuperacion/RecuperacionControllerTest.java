package ec.edu.ups.tipi.recuperacion;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RecuperacionControllerTest {

    private static final String TOKEN = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ";

    private RecuperacionService service;
    private MockMvc mockMvc;

    @BeforeEach
    void preparar() {
        service = mock(RecuperacionService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new RecuperacionController(service)).build();
    }

    @Test
    void recuperarRespondeAceptadoSinCuerpo() throws Exception {
        mockMvc.perform(post("/api/auth/recuperar").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identificador\":\"docente.prueba\"}"))
                .andExpect(status().isAccepted())
                .andExpect(content().string(""));

        verify(service).solicitar(eq("docente.prueba"), anyString());
    }

    @Test
    void validarRespondeSinContenido() throws Exception {
        mockMvc.perform(post("/api/auth/restablecer/validar").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + TOKEN + "\"}"))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        verify(service).validar(TOKEN);
    }

    @Test
    void restablecerRespondeSinContenido() throws Exception {
        mockMvc.perform(post("/api/auth/restablecer").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + TOKEN + "\",\"passwordNueva\":\"ClaveSegura2026\"}"))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        verify(service).restablecer(TOKEN, "ClaveSegura2026");
    }

    @Test
    void validarConTokenMalFormadoRespondeSolicitudIncorrecta() throws Exception {
        mockMvc.perform(post("/api/auth/restablecer/validar").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"corto\"}"))
                .andExpect(status().isBadRequest());
    }
}
