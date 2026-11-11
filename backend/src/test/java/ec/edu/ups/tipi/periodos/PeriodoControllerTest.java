package ec.edu.ups.tipi.periodos;

import ec.edu.ups.tipi.periodos.dto.PeriodoRequest;
import ec.edu.ups.tipi.periodos.dto.PeriodoResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PeriodoControllerTest {

    private static final String CUERPO =
            "{\"nombre\":\"2027-2028\",\"fechaInicio\":\"2027-09-01\",\"fechaFin\":\"2028-07-31\"}";

    private PeriodoService service;
    private MockMvc mockMvc;

    @BeforeEach
    void preparar() {
        service = mock(PeriodoService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new PeriodoController(service)).build();
    }

    @Test
    void crearRespondeCreadoConUbicacionDelRecurso() throws Exception {
        when(service.crear(any(PeriodoRequest.class))).thenReturn(periodo(7));

        mockMvc.perform(post("/api/periodos").contentType(MediaType.APPLICATION_JSON).content(CUERPO))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "http://localhost/api/periodos/7"))
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.nombre").value("2027-2028"));
    }

    @Test
    void listarRespondeOkConLaLista() throws Exception {
        when(service.listar()).thenReturn(List.of(periodo(7)));

        mockMvc.perform(get("/api/periodos"))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Location"))
                .andExpect(jsonPath("$[0].id").value(7));
    }

    @Test
    void actualizarRespondeOkSinUbicacion() throws Exception {
        when(service.actualizar(eq(7), any(PeriodoRequest.class))).thenReturn(periodo(7));

        mockMvc.perform(put("/api/periodos/7").contentType(MediaType.APPLICATION_JSON).content(CUERPO))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Location"))
                .andExpect(jsonPath("$.id").value(7));
    }

    @Test
    void crearConDatosInvalidosRespondeSolicitudIncorrecta() throws Exception {
        mockMvc.perform(post("/api/periodos").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    private PeriodoResponse periodo(int id) {
        return new PeriodoResponse(id, "2027-2028", LocalDate.of(2027, 9, 1), LocalDate.of(2028, 7, 31), false);
    }
}
