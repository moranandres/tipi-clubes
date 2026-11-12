package ec.edu.ups.tipi.config;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {"springdoc.api-docs.enabled=true", "springdoc.swagger-ui.enabled=false"})
class OpenApiDocumentoTest {

    @Autowired
    private WebApplicationContext contexto;

    private String documento;

    @BeforeEach
    void cargarDocumento() throws Exception {
        MockMvc mockMvc = MockMvcBuilders.webAppContextSetup(contexto).build();
        documento = mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
    }

    @Test
    void todasLasOperacionesTienenResumenEtiquetaYRespuestaDeError() {
        List<Map<String, Object>> operaciones = JsonPath.read(documento, "$.paths.*.*");

        assertFalse(operaciones.isEmpty());
        for (Map<String, Object> operacion : operaciones) {
            Object id = operacion.get("operationId");
            assertNotNull(operacion.get("summary"), "Falta el resumen en " + id);
            assertFalse(((List<?>) operacion.get("tags")).isEmpty(), "Falta la etiqueta en " + id);
            assertTrue(((Map<?, ?>) operacion.get("responses")).containsKey("default"),
                    "Falta la respuesta de error en " + id);
        }
    }

    @Test
    void losIdentificadoresDeOperacionSonUnicosYEstables() {
        List<String> identificadores = JsonPath.read(documento, "$.paths.*.*.operationId");

        assertEquals(identificadores.size(), new HashSet<>(identificadores).size());
        assertTrue(identificadores.stream().noneMatch(id -> id.matches(".*_\\d+$")));
        assertTrue(identificadores.contains("clubListar"));
        assertTrue(identificadores.contains("evidenciaRegistrar"));
    }

    @Test
    void lasAltasDeclaranCreadoConUbicacionYLasBajasSinContenido() {
        List<Map<String, Object>> creados = JsonPath.read(documento, "$.paths.*.post.responses.201");
        List<Map<String, Object>> bajas = JsonPath.read(documento, "$.paths.*.delete.responses");

        assertFalse(creados.isEmpty());
        for (Map<String, Object> creado : creados) {
            assertTrue(((Map<?, ?>) creado.get("headers")).containsKey("Location"));
        }
        assertFalse(bajas.isEmpty());
        for (Map<String, Object> baja : bajas) {
            assertTrue(baja.containsKey("204"));
            assertFalse(baja.containsKey("200"));
        }
    }

    @Test
    void losEsquemasConElMismoNombreNoSePisan() {
        Map<String, Object> esquemas = JsonPath.read(documento, "$.components.schemas");

        assertTrue(esquemas.containsKey("CursoResponse"));
        assertTrue(esquemas.containsKey("CursoEducativoResponse"));
        assertTrue(esquemas.containsKey("ProblemaResponse"));
    }
}
