package ec.edu.ups.tipi.estudiantes;

import ec.edu.ups.tipi.common.GlobalExceptionHandler;
import ec.edu.ups.tipi.estudiantes.dto.AutorizacionRequest;
import ec.edu.ups.tipi.estudiantes.dto.AutorizacionResponse;
import ec.edu.ups.tipi.estudiantes.dto.RepresentanteResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AutorizacionControllerTest {

    private static final String RUTA = "/api/estudiantes/7/autorizaciones/PARTICIPACION";

    private AutorizacionService service;
    private MockMvc mockMvc;

    @BeforeEach
    void preparar() {
        service = mock(AutorizacionService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new AutorizacionController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();
    }

    @Test
    void registraLaAutorizacionConLosDatosDelRepresentante() throws Exception {
        when(service.actualizar(eq(7L), eq(TipoAutorizacion.PARTICIPACION), any(AutorizacionRequest.class), any()))
                .thenReturn(respuesta());

        mockMvc.perform(put(RUTA).contentType(MediaType.APPLICATION_JSON).content(cuerpo(
                        "\"nombres\":\"María José\",\"apellidos\":\"Pérez Loor\",\"cedula\":\"0926687856\","
                                + "\"parentesco\":\"MADRE\",\"telefono\":\"0991234567\",\"correo\":\"maria@correo.ec\"")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("OTORGADA"))
                .andExpect(jsonPath("$.representante.cedula").value("0926687856"))
                .andExpect(jsonPath("$.representante.parentesco").value("MADRE"));

        ArgumentCaptor<AutorizacionRequest> captura = ArgumentCaptor.forClass(AutorizacionRequest.class);
        verify(service).actualizar(eq(7L), eq(TipoAutorizacion.PARTICIPACION), captura.capture(), any());
        assertThat(captura.getValue().representante().telefono()).isEqualTo("0991234567");
        assertThat(captura.getValue().representante().parentesco()).isEqualTo(Parentesco.MADRE);
    }

    @Test
    void exigeLosDatosDelRepresentante() throws Exception {
        mockMvc.perform(put(RUTA).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"estado\":\"OTORGADA\",\"fechaRegistro\":\"2026-11-10\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.representante").exists());

        verify(service, never()).actualizar(any(), any(), any(), any());
    }

    @Test
    void rechazaCedulaTelefonoYCorreoInvalidosCampoPorCampo() throws Exception {
        mockMvc.perform(put(RUTA).contentType(MediaType.APPLICATION_JSON).content(cuerpo(
                        "\"nombres\":\"María\",\"apellidos\":\"Pérez\",\"cedula\":\"1712345678\","
                                + "\"parentesco\":\"MADRE\",\"telefono\":\"12345\",\"correo\":\"maria@correo\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores['representante.cedula']").exists())
                .andExpect(jsonPath("$.errores['representante.telefono']").exists())
                .andExpect(jsonPath("$.errores['representante.correo']").exists());

        verify(service, never()).actualizar(any(), any(), any(), any());
    }

    @Test
    void exigeNombresParentescoYTelefono() throws Exception {
        mockMvc.perform(put(RUTA).contentType(MediaType.APPLICATION_JSON).content(cuerpo(
                        "\"nombres\":\" \",\"apellidos\":\"Pérez\",\"cedula\":\"0926687856\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores['representante.nombres']").exists())
                .andExpect(jsonPath("$.errores['representante.parentesco']").exists())
                .andExpect(jsonPath("$.errores['representante.telefono']").exists());
    }

    @Test
    void rechazaUnParentescoQueNoExiste() throws Exception {
        mockMvc.perform(put(RUTA).contentType(MediaType.APPLICATION_JSON).content(cuerpo(
                        "\"nombres\":\"María\",\"apellidos\":\"Pérez\",\"cedula\":\"0926687856\","
                                + "\"parentesco\":\"VECINO\",\"telefono\":\"0991234567\"")))
                .andExpect(status().isBadRequest());
    }

    private String cuerpo(String representante) {
        return "{\"estado\":\"OTORGADA\",\"fechaRegistro\":\"2026-11-10\",\"representante\":{" + representante + "}}";
    }

    private AutorizacionResponse respuesta() {
        return new AutorizacionResponse(TipoAutorizacion.PARTICIPACION, EstadoAutorizacion.OTORGADA,
                LocalDate.of(2026, 11, 10), null, true, "autorizacion.pdf", "application/pdf", 1200L,
                Instant.parse("2026-11-10T15:00:00Z"), null, Instant.parse("2026-11-10T15:05:00Z"),
                new RepresentanteResponse("María José", "Pérez Loor", "0926687856", Parentesco.MADRE,
                        "0991234567", "maria@correo.ec"),
                null);
    }
}
