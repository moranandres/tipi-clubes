# PASO 2 · Cierre: tipos TypeScript generados desde /v3/api-docs

Este cierre deja el puente entre el backend y el nuevo frontend: un comando lee el documento OpenAPI y escribe los tipos de TypeScript de las 152 operaciones y de los 201 esquemas. Tiene dos partes. La parte A termina de preparar el documento OpenAPI. La parte B instala `openapi-typescript` y genera los tipos. Todo está aplicado en tu equipo, en la rama `claude/project-thread-vr6pay`, y subido a GitHub.

## Cómo funciona el puente

1. Spring Boot publica el contrato en `http://localhost:8080/v3/api-docs`.
2. `npm run descargar` guarda una copia ordenada en `herramientas/tipos-api/openapi.json`.
3. `npm run generar` convierte esa copia en `herramientas/tipos-api/tipos-api.d.ts` con `openapi-typescript`.
4. El frontend importa esos tipos. Si un DTO cambia en Java, al regenerar cambia el tipo y el compilador de TypeScript señala cada pantalla afectada.

La copia `openapi.json` se guarda en el repositorio a propósito: permite regenerar los tipos sin levantar el backend y deja a la vista, en cada commit, qué cambió en el contrato.

# Parte A. Documento OpenAPI listo para generar tipos

Al revisar el documento encontré cuatro cosas que afectaban a los tipos generados:

| Problema | Efecto en TypeScript | Solución |
|---|---|---|
| 93 de las 152 operaciones tenían identificadores como `listar_14` o `crear_7`, que cambian al agregar un controlador | Nombres ilegibles e inestables | Identificador `recurso` + `acción`: `clubListar`, `evidenciaRegistrar` |
| Hay dos clases `CursoResponse` (la del curso de un club y la del curso educativo del estudiante) y el documento solo conservaba una | `GET /api/estudiantes/cursos` quedaba con el tipo equivocado | La del estudiante se publica como `CursoEducativoResponse` |
| Los errores no estaban documentados | El frontend no conocía la forma del error | Respuesta `default` con el esquema `ProblemaResponse` en todas las operaciones |
| Los 4 controladores del bloque 1 tenían `@Tag` pero no `@Operation` | Operaciones sin resumen | Se agregó `@Operation` a sus 22 operaciones |

## Paso 1. Cambiar a la rama

```bash
git checkout claude/project-thread-vr6pay
```

## Paso 2. Esquema del error

Archivo: `backend/src/main/java/ec/edu/ups/tipi/common/ProblemaResponse.java`

Describe el cuerpo que ya devuelve `GlobalExceptionHandler` en cada error: los campos estándar de Problem Details y el mapa `errores` con los mensajes de validación por campo. No cambia ninguna respuesta; solo la documenta.

```java
package ec.edu.ups.tipi.common;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Map;

@Schema(name = "ProblemaResponse", description = "Error devuelto por la API con el formato Problem Details")
public record ProblemaResponse(
        String type,
        String title,
        Integer status,
        String detail,
        String instance,
        Map<String, String> errores) {
}
```

## Paso 3. Configuración de OpenAPI

Archivo: `backend/src/main/java/ec/edu/ups/tipi/config/OpenApiConfig.java`

Se agregan dos componentes. `identificadorDeOperacion` forma el identificador con el nombre del controlador sin el sufijo `Controller` y el nombre del método. `respuestasComunes` registra el esquema del error, agrega la respuesta `default` a cada operación y declara la cabecera `Location` en cada respuesta `201`.

```java
package ec.edu.ups.tipi.config;

import ec.edu.ups.tipi.common.ProblemaResponse;
import io.swagger.v3.core.converter.AnnotatedType;
import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.core.converter.ResolvedSchema;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.headers.Header;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springdoc.core.customizers.OperationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String ESQUEMA_JWT = "bearer-jwt";
    private static final String RESPUESTA_PROBLEMA = "Problema";
    private static final String SUFIJO_CONTROLADOR = "Controller";

    @Bean
    public OpenAPI documentacionApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("TIPI 3.0 - API de gestión de clubes")
                        .version("v1")
                        .description("API REST del sistema de información para la gestión de clubes "
                                + "de robótica y programación del proyecto de vinculación TIPI 3.0."))
                .components(new Components()
                        .addSecuritySchemes(ESQUEMA_JWT, new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList(ESQUEMA_JWT));
    }

    @Bean
    public OperationCustomizer identificadorDeOperacion() {
        return (operacion, metodo) -> {
            String recurso = metodo.getBeanType().getSimpleName().replace(SUFIJO_CONTROLADOR, "");
            String accion = metodo.getMethod().getName();
            operacion.setOperationId(Character.toLowerCase(recurso.charAt(0)) + recurso.substring(1)
                    + Character.toUpperCase(accion.charAt(0)) + accion.substring(1));
            return operacion;
        };
    }

    @Bean
    public OpenApiCustomizer respuestasComunes() {
        return documento -> {
            ResolvedSchema problema = ModelConverters.getInstance(true)
                    .readAllAsResolvedSchema(new AnnotatedType(ProblemaResponse.class));
            problema.referencedSchemas.forEach(documento.getComponents()::addSchemas);
            documento.getComponents().addResponses(RESPUESTA_PROBLEMA, new ApiResponse()
                    .description("Error descrito con el formato Problem Details")
                    .content(new Content().addMediaType("application/problem+json", new MediaType()
                            .schema(new Schema<>().$ref("#/components/schemas/ProblemaResponse")))));
            documento.getPaths().values().forEach(ruta -> ruta.readOperations().forEach(operacion -> {
                operacion.getResponses().addApiResponse("default",
                        new ApiResponse().$ref("#/components/responses/" + RESPUESTA_PROBLEMA));
                ApiResponse creado = operacion.getResponses().get("201");
                if (creado != null) {
                    Schema<String> url = new Schema<>();
                    url.addType("string");
                    url.setFormat("uri");
                    creado.addHeaderObject("Location", new Header()
                            .description("URL del recurso creado")
                            .schema(url));
                }
            }));
        };
    }
}
```

## Paso 4. Nombre del esquema del curso educativo

Archivo: `backend/src/main/java/ec/edu/ups/tipi/estudiantes/dto/CursoResponse.java`

La anotación `@Schema` solo cambia el nombre con que aparece en el documento. La clase Java y el JSON que recibe el frontend actual quedan iguales.

```java
package ec.edu.ups.tipi.estudiantes.dto;

import ec.edu.ups.tipi.estudiantes.CursoEducativo;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "CursoEducativoResponse")
public record CursoResponse(CursoEducativo codigo, String etiqueta, String nivel) {

    public static CursoResponse de(CursoEducativo curso) {
        return new CursoResponse(curso, curso.getEtiqueta(), curso.getNivel());
    }
}
```

## Paso 5. Resúmenes en el controlador de instituciones

Archivo: `backend/src/main/java/ec/edu/ups/tipi/instituciones/InstitucionController.java`

Se agrega `@Operation` a sus 6 operaciones.

```java
package ec.edu.ups.tipi.instituciones;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.instituciones.dto.InstitucionContactoRequest;
import ec.edu.ups.tipi.instituciones.dto.InstitucionRequest;
import ec.edu.ups.tipi.instituciones.dto.InstitucionResponse;
import ec.edu.ups.tipi.instituciones.dto.ResponsableRequest;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Instituciones", description = "Instituciones educativas adheridas, contacto y responsable institucional")
@RestController
@RequestMapping("/api/instituciones")
@RequiredArgsConstructor
public class InstitucionController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";

    private final InstitucionService service;

    @Operation(summary = "Lista paginada de instituciones dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<InstitucionResponse>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String provincia,
            @RequestParam(required = false) String canton,
            @RequestParam(required = false) EstadoAdhesion estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(q, provincia, canton, estado, pagina, tamano, usuario));
    }

    @Operation(summary = "Detalle de una institución")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<InstitucionResponse> obtener(@PathVariable Long id,
                                                       @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Registra una institución con su código AMIE")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InstitucionResponse> crear(@Valid @RequestBody InstitucionRequest request) {
        InstitucionResponse creada = service.crear(request);
        return Respuestas.creado(creada.id(), creada);
    }

    @Operation(summary = "Actualiza los datos de una institución")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InstitucionResponse> actualizar(@PathVariable Long id,
                                                          @Valid @RequestBody InstitucionRequest request) {
        return ResponseEntity.ok(service.actualizar(id, request));
    }

    @Operation(summary = "Actualiza los datos de contacto de una institución")
    @PutMapping("/{id}/contacto")
    @PreAuthorize("hasAnyRole('ADMIN','RESP_INSTITUCIONAL')")
    public ResponseEntity<InstitucionResponse> actualizarContacto(
            @PathVariable Long id,
            @Valid @RequestBody InstitucionContactoRequest request,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizarContacto(id, request, usuario));
    }

    @Operation(summary = "Asigna el responsable institucional")
    @PutMapping("/{id}/responsable")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InstitucionResponse> asignarResponsable(@PathVariable Long id,
                                                                  @Valid @RequestBody ResponsableRequest request) {
        return ResponseEntity.ok(service.asignarResponsable(id, request.usuarioId()));
    }
}
```

## Paso 6. Resúmenes en el controlador de clubes

Archivo: `backend/src/main/java/ec/edu/ups/tipi/clubes/ClubController.java`

Se agrega `@Operation` a sus 6 operaciones.

```java
package ec.edu.ups.tipi.clubes;

import ec.edu.ups.tipi.clubes.dto.CambioEstadoClubRequest;
import ec.edu.ups.tipi.clubes.dto.CierreClubResponse;
import ec.edu.ups.tipi.clubes.dto.ClubActualizarRequest;
import ec.edu.ups.tipi.clubes.dto.ClubCrearRequest;
import ec.edu.ups.tipi.clubes.dto.ClubResponse;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Clubes", description = "Clubes de robótica y programación, cambios de estado y cierre")
@RestController
@RequestMapping("/api/clubes")
@RequiredArgsConstructor
public class ClubController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String ESCRITURA = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL')";

    private final ClubService service;
    private final CierreClubService cierre;

    @Operation(summary = "Lista paginada de clubes dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<ClubResponse>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Integer periodoId,
            @RequestParam(required = false) EstadoClub estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(q, institucionId, periodoId, estado, pagina, tamano, usuario));
    }

    @Operation(summary = "Detalle de un club")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ClubResponse> obtener(@PathVariable Long id,
                                                @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Vista previa de los efectos de cerrar un club")
    @GetMapping("/{id}/cierre")
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<CierreClubResponse> previsualizarCierre(
            @PathVariable Long id,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(cierre.previsualizar(id, usuario));
    }

    @Operation(summary = "Crea un club en una institución")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<ClubResponse> crear(@Valid @RequestBody ClubCrearRequest request,
                                              @AuthenticationPrincipal UsuarioPrincipal usuario) {
        ClubResponse creado = service.crear(request, usuario);
        return Respuestas.creado(creado.id(), creado);
    }

    @Operation(summary = "Actualiza los datos de un club")
    @PutMapping("/{id}")
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<ClubResponse> actualizar(@PathVariable Long id,
                                                   @Valid @RequestBody ClubActualizarRequest request,
                                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(id, request, usuario));
    }

    @Operation(summary = "Cambia el estado de un club")
    @PatchMapping("/{id}/estado")
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<ClubResponse> cambiarEstado(@PathVariable Long id,
                                                      @Valid @RequestBody CambioEstadoClubRequest request,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.cambiarEstado(id, request, usuario));
    }
}
```

## Paso 7. Resúmenes en el controlador de períodos

Archivo: `backend/src/main/java/ec/edu/ups/tipi/periodos/PeriodoController.java`

Se agrega `@Operation` a sus 4 operaciones.

```java
package ec.edu.ups.tipi.periodos;

import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.periodos.dto.PeriodoRequest;
import ec.edu.ups.tipi.periodos.dto.PeriodoResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Períodos académicos", description = "Períodos académicos y activación del período vigente")
@RestController
@RequestMapping("/api/periodos")
@RequiredArgsConstructor
public class PeriodoController {

    private final PeriodoService service;

    @Operation(summary = "Lista de períodos académicos")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')")
    public ResponseEntity<List<PeriodoResponse>> listar() {
        return ResponseEntity.ok(service.listar());
    }

    @Operation(summary = "Crea un período académico")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PeriodoResponse> crear(@Valid @RequestBody PeriodoRequest request) {
        PeriodoResponse creado = service.crear(request);
        return Respuestas.creado(creado.id(), creado);
    }

    @Operation(summary = "Actualiza un período académico")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PeriodoResponse> actualizar(@PathVariable Integer id,
                                                      @Valid @RequestBody PeriodoRequest request) {
        return ResponseEntity.ok(service.actualizar(id, request));
    }

    @Operation(summary = "Define el período académico vigente")
    @PatchMapping("/{id}/activar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PeriodoResponse> activar(@PathVariable Integer id) {
        return ResponseEntity.ok(service.activar(id));
    }
}
```

## Paso 8. Resúmenes en el controlador de docentes

Archivo: `backend/src/main/java/ec/edu/ups/tipi/docentes/DocenteController.java`

Se agrega `@Operation` a sus 6 operaciones.

```java
package ec.edu.ups.tipi.docentes;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.docentes.dto.CuentaDocenteResponse;
import ec.edu.ups.tipi.docentes.dto.DocenteActualizarRequest;
import ec.edu.ups.tipi.docentes.dto.DocenteCrearRequest;
import ec.edu.ups.tipi.docentes.dto.DocenteResponse;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.usuarios.dto.EstadoRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Docentes", description = "Docentes coordinadores de club y sus cuentas de usuario")
@RestController
@RequestMapping("/api/docentes")
@RequiredArgsConstructor
public class DocenteController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String ESCRITURA = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL')";

    private final DocenteService service;

    @Operation(summary = "Lista paginada de docentes dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<DocenteResponse>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Boolean activo,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(q, institucionId, activo, pagina, tamano, usuario));
    }

    @Operation(summary = "Cuentas de usuario disponibles para vincular a un docente")
    @GetMapping("/cuentas-disponibles")
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<List<CuentaDocenteResponse>> cuentasDisponibles(
            @RequestParam Long institucionId,
            @RequestParam(required = false) Long docenteId,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.cuentasDisponibles(institucionId, docenteId, usuario));
    }

    @Operation(summary = "Detalle de un docente")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<DocenteResponse> obtener(@PathVariable Long id,
                                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Registra un docente")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<DocenteResponse> crear(@Valid @RequestBody DocenteCrearRequest request,
                                                 @AuthenticationPrincipal UsuarioPrincipal usuario) {
        DocenteResponse creado = service.crear(request, usuario);
        return Respuestas.creado(creado.id(), creado);
    }

    @Operation(summary = "Actualiza los datos de un docente")
    @PutMapping("/{id}")
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<DocenteResponse> actualizar(@PathVariable Long id,
                                                      @Valid @RequestBody DocenteActualizarRequest request,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(id, request, usuario));
    }

    @Operation(summary = "Activa o desactiva un docente")
    @PatchMapping("/{id}/estado")
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<DocenteResponse> cambiarEstado(@PathVariable Long id,
                                                         @Valid @RequestBody EstadoRequest request,
                                                         @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.cambiarEstado(id, request.activo(), usuario));
    }
}
```

## Paso 9. Prueba del documento OpenAPI

Archivo: `backend/src/test/java/ec/edu/ups/tipi/config/OpenApiDocumentoTest.java`

Levanta la aplicación, pide `/v3/api-docs` y comprueba cuatro reglas: toda operación tiene resumen, etiqueta y respuesta de error; los identificadores son únicos y sin sufijos numéricos; toda alta declara `201` con `Location` y toda baja declara `204`; y los dos esquemas de curso existen por separado. Si en una fase futura se agrega un endpoint sin documentar, esta prueba falla.

```java
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
```

## Paso 10. Prueba del controlador de horarios

Archivo: `backend/src/test/java/ec/edu/ups/tipi/cursos/HorarioControllerTest.java`

Cubre el alta en un recurso anidado, la actualización, la baja y la validación.

```java
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
```

## Paso 11. Prueba del controlador de evidencias

Archivo: `backend/src/test/java/ec/edu/ups/tipi/evidencias/EvidenciaControllerTest.java`

Cubre el alta con formulario y la cabecera `Location` hacia `/api/evidencias/{id}`.

```java
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
```

## Paso 12. Prueba del controlador de recuperación

Archivo: `backend/src/test/java/ec/edu/ups/tipi/recuperacion/RecuperacionControllerTest.java`

Cubre las respuestas `202` y `204` sin cuerpo.

```java
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
```

## Paso 13. Ejecutar las pruebas

Desde la carpeta `backend`, con PostgreSQL encendido:

```bash
./mvnw test
```

Debe terminar con `Tests run: 40, Failures: 0, Errors: 0`: las 25 anteriores y 15 nuevas.

# Parte B. Generar los tipos con openapi-typescript

## Paso 14. Instalar Node.js

Este equipo no tiene Node.js instalado. Abre PowerShell y ejecuta:

```bash
winget install OpenJS.NodeJS.LTS
```

Cierra y vuelve a abrir la terminal para que tome la nueva ruta. Después comprueba la instalación:

```bash
node --version
```

Debe mostrar una versión 22 o superior. Yo verifiqué todo con la 26.13.1, que es la LTS vigente.

## Paso 15. Paquete de la herramienta

Archivo: `herramientas/tipos-api/package.json`

Sigue la misma idea de `herramientas/vendor`. Las versiones van fijas para que la generación sea repetible. `typescript` queda en 5.9.3 porque `openapi-typescript` 7 exige la serie 5. `openapi-fetch` es el cliente HTTP que usará el frontend: pesa unos 6 kB y toma los tipos generados.

```json
{
  "name": "tipi-tipos-api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Genera los tipos de TypeScript de la API de TIPI 3.0 a partir del documento OpenAPI",
  "scripts": {
    "descargar": "node descargar-openapi.mjs",
    "generar": "openapi-typescript openapi.json -o tipos-api.d.ts",
    "tipos": "npm run descargar && npm run generar",
    "verificar": "tsc --noEmit"
  },
  "dependencies": {
    "openapi-fetch": "0.17.0"
  },
  "devDependencies": {
    "openapi-typescript": "7.13.0",
    "typescript": "5.9.3"
  }
}
```

## Paso 16. Descarga del documento

Archivo: `herramientas/tipos-api/descargar-openapi.mjs`

Pide el documento al backend, quita el bloque `servers` (trae el puerto de la máquina donde se generó), ordena las claves y lo guarda. Con las claves ordenadas, dos descargas del mismo contrato producen el mismo archivo. La variable `API_DOCS_URL` permite apuntar a otro puerto o servidor.

```javascript
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = dirname(fileURLToPath(import.meta.url));
const origen = process.env.API_DOCS_URL ?? 'http://localhost:8080/v3/api-docs';
const destino = join(raiz, 'openapi.json');

function ordenar(valor) {
  if (Array.isArray(valor)) {
    return valor.map(ordenar);
  }
  if (valor !== null && typeof valor === 'object') {
    return Object.fromEntries(
      Object.keys(valor)
        .sort()
        .map(clave => [clave, ordenar(valor[clave])])
    );
  }
  return valor;
}

let respuesta;
try {
  respuesta = await fetch(origen, { headers: { Accept: 'application/json' } });
} catch (error) {
  console.error(`No se pudo conectar con ${origen}. Verifique que el backend esté en ejecución.`);
  process.exit(1);
}

if (!respuesta.ok) {
  console.error(`${origen} respondió ${respuesta.status}. Verifique que OPENAPI_ENABLED no esté en false.`);
  process.exit(1);
}

const documento = await respuesta.json();
delete documento.servers;
if (Array.isArray(documento.tags)) {
  documento.tags.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

const operaciones = Object.values(documento.paths ?? {})
  .reduce((total, ruta) => total + Object.keys(ruta).length, 0);

writeFileSync(destino, `${JSON.stringify(ordenar(documento), null, 2)}\n`);

console.log(`Documento OpenAPI ${documento.openapi} guardado en ${destino}`);
console.log(`${Object.keys(documento.paths ?? {}).length} rutas, ${operaciones} operaciones`);
```

## Paso 17. Configuración de TypeScript

Archivo: `herramientas/tipos-api/tsconfig.json`

Solo se usa para comprobar que los tipos generados y el ejemplo compilan.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["tipos-api.d.ts", "ejemplo.ts"]
}
```

## Paso 18. Ejemplo de uso

Archivo: `herramientas/tipos-api/ejemplo.ts`

Muestra los tres casos del contrato: una consulta paginada, un alta que lee la cabecera `Location` y una baja. No se ejecuta; sirve para que `npm run verificar` confirme que los tipos encajan con el uso real.

```typescript
import createClient from 'openapi-fetch';
import type { components, paths } from './tipos-api';

export type ClubResponse = components['schemas']['ClubResponse'];
export type PeriodoRequest = components['schemas']['PeriodoRequest'];
export type PeriodoResponse = components['schemas']['PeriodoResponse'];
export type ProblemaResponse = components['schemas']['ProblemaResponse'];

const api = createClient<paths>({ baseUrl: 'http://localhost:8080' });

function mensajeDe(problema: ProblemaResponse, respaldo: string): string {
  return problema.detail ?? respaldo;
}

export async function listarClubes(token: string, q: string): Promise<ClubResponse[]> {
  const { data, error } = await api.GET('/api/clubes', {
    params: { query: { q, pagina: 0, tamano: 10 } },
    headers: { Authorization: `Bearer ${token}` }
  });
  if (error) {
    throw new Error(mensajeDe(error, 'No se pudo consultar los clubes'));
  }
  return data.contenido ?? [];
}

export async function crearPeriodo(token: string, periodo: PeriodoRequest): Promise<PeriodoResponse> {
  const { data, error, response } = await api.POST('/api/periodos', {
    body: periodo,
    headers: { Authorization: `Bearer ${token}` }
  });
  if (error) {
    throw new Error(mensajeDe(error, 'No se pudo crear el período'));
  }
  console.log(`Recurso creado en ${response.headers.get('Location')}`);
  return data;
}

export async function eliminarCurso(token: string, id: number): Promise<void> {
  const { error } = await api.DELETE('/api/cursos/{id}', {
    params: { path: { id } },
    headers: { Authorization: `Bearer ${token}` }
  });
  if (error) {
    throw new Error(mensajeDe(error, 'No se pudo eliminar el curso'));
  }
}
```

## Paso 19. Instalar las dependencias

En una terminal:

```bash
cd herramientas/tipos-api
```

```bash
npm install
```

Crea la carpeta `node_modules`, que ya está excluida por `.gitignore`.

## Paso 20. Levantar el backend

En otra terminal, desde la carpeta `backend`:

```bash
./mvnw spring-boot:run
```

Comprueba que http://localhost:8080/v3/api-docs responde con un JSON. En el perfil `dev` la documentación está encendida por defecto.

## Paso 21. Generar los tipos

En la terminal de `herramientas/tipos-api`:

```bash
npm run tipos
```

Ese comando ejecuta `descargar` y luego `generar`. La salida debe ser parecida a esta:

```text
Documento OpenAPI 3.1.0 guardado en ...\herramientas\tipos-api\openapi.json
112 rutas, 152 operaciones

✨ openapi-typescript 7.13.0
🚀 openapi.json → tipos-api.d.ts
```

Si tu backend corre en otro puerto, indícalo antes en PowerShell:

```bash
$env:API_DOCS_URL = "http://localhost:8081/v3/api-docs"
```

## Paso 22. Verificar los tipos

```bash
npm run verificar
```

No debe mostrar ningún error. Para ver el puente en acción, abre `ejemplo.ts`, cambia `data.contenido` por `data.contenidos` y ejecuta de nuevo el comando: TypeScript marca el error en esa línea. Deshaz el cambio al terminar.

## Paso 23. Leer los tipos generados

`tipos-api.d.ts` tiene tres bloques:

| Bloque | Contenido | Ejemplo |
|---|---|---|
| `paths` | Cada ruta con sus métodos | `paths["/api/clubes"]["get"]` |
| `components["schemas"]` | Cada DTO de Java | `components["schemas"]["ClubResponse"]` |
| `operations` | Cada operación por su identificador | `operations["clubListar"]` |

Con `openapi-fetch` no hace falta escribir tipos a mano. La ruta, los parámetros, el cuerpo y la respuesta se deducen solos:

```typescript
const { data, error } = await api.GET("/api/clubes", {
  params: { query: { q: "rob", tamano: 10 } }
});
```

Aquí `data` es `PaginaResponseClubResponse` y `error` es `ProblemaResponse`. Si escribes una ruta que no existe o un parámetro mal nombrado, el proyecto no compila.

## Paso 24. Regenerar cuando cambie la API

Cada vez que cambies un controlador o un DTO:

1. Reinicia el backend.
2. Ejecuta `npm run tipos` en `herramientas/tipos-api`.
3. Ejecuta `npm run verificar`.
4. Sube juntos el cambio de Java, `openapi.json` y `tipos-api.d.ts`.

## Resultado de mis comprobaciones

| Comprobación | Resultado |
|---|---|
| Operaciones en el documento | 152, todas con resumen, etiqueta y respuesta de error |
| Identificadores con sufijo numérico | 0 (antes 93) |
| Esquemas | 201, con `CursoResponse` y `CursoEducativoResponse` separados |
| Altas con `201` y cabecera `Location` | 20 |
| Bajas con `204` | 5 |
| Pruebas automáticas | 40 de 40 en verde |
| `npm run tipos` | `tipos-api.d.ts` de 8 605 líneas |
| `npm run verificar` | sin errores |

Como este equipo no tiene Node.js, hice la generación con una copia portátil de Node 26.13.1 en una carpeta temporal, descargada de nodejs.org y con su suma SHA-256 verificada. No instalé nada en el sistema.

## Dos observaciones para el PASO 3

**Campos opcionales.** Los tipos generados marcan todos los campos de las respuestas como opcionales (`id?: number`), porque los DTO de Java no declaran cuáles vienen siempre. Funciona, pero obliga al frontend a comprobar cada campo. Se resuelve indicando en el documento qué campos son obligatorios; conviene hacerlo al empezar el PASO 3, cuando las pantallas muestren cuáles hacen falta.

**Dónde vivirán los tipos.** Cuando exista la aplicación Next.js, el mismo comando escribirá los tipos dentro de ella y `openapi.json` seguirá siendo la copia del contrato en el repositorio.

## Estado del PASO 2

| Bloque | Contenido | Estado |
|---|---|---|
| 1 | springdoc-openapi, CORS por entorno y contrato en gestión institucional | Entregado |
| 2 | `GET /api/panel/resumen` y `GET /api/publico/estadisticas` | Entregado |
| 3 | Opciones ligeras para selectores | Entregado |
| 4 | Contrato en acceso, usuarios y estudiantes | Entregado |
| 5 | Contrato en cursos, inscripciones, competencias y certificados | Entregado |
| 6 | Contrato en actividades, asistencia, evidencias, proyectos y seguimiento | Entregado |
| Cierre | Tipos TypeScript desde `/v3/api-docs` | Entregado |

Queda para una fase posterior, como acordamos, la migración de `unaccent` para que la búsqueda no distinga tildes.

