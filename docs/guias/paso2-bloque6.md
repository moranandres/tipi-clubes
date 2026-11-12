# PASO 2 · Bloque 6: actividades, asistencia, evidencias, proyectos y seguimiento

Este bloque completa el contrato `ResponseEntity<DTO>` y las etiquetas `@Tag` y `@Operation` en los 7 controladores que faltaban, con 44 operaciones. Con él, los 33 controladores del backend usan el mismo contrato. Los cambios ya están aplicados en tu equipo, en la rama `claude/project-thread-vr6pay`, y subidos a GitHub.

## Qué cambia

| Controlador | Ruta base | Operaciones | Altas con 201 y `Location` | Bajas con 204 |
|---|---|---|---|---|
| `ActividadController` | `/api/actividades` | 8 | 1 | 1 |
| `ContenidoCatalogoController` | `/api/contenidos` | 5 | 1 | 0 |
| `AsistenciaController` | `/api/actividades/{id}/asistencia` y `/api/asistencias` | 5 | 0 | 0 |
| `EvidenciaController` | `/api/actividades/{id}/evidencias` y `/api/evidencias` | 8 | 1 | 0 |
| `ProyectoController` | `/api/proyectos` | 7 | 1 | 0 |
| `AvanceController` | `/api/avances`, `/api/estudiantes/{id}/progreso` y `/api/resultados/resumen` | 7 | 1 | 0 |
| `SeguimientoController` | `/api/seguimiento` | 4 | 0 | 0 |

El caso particular es el de las evidencias. Se registran con `POST /api/actividades/{id}/evidencias`, pero cada evidencia se consulta en `/api/evidencias/{id}`. Por eso la cabecera `Location` apunta a esa segunda ruta, con el método `Respuestas.creadoEn` que se agregó en el bloque 4.

El registro de asistencia usa `PUT` sobre la planilla de la sesión y responde `200`: reemplaza la planilla completa, no crea un recurso nuevo. La restricción que impide asistencias duplicadas en una misma sesión sigue en la base de datos.

## Paso 1. Cambiar a la rama del bloque

```bash
git checkout claude/project-thread-vr6pay
```

## Paso 2. Controlador de actividades

Archivo: `backend/src/main/java/ec/edu/ups/tipi/actividades/ActividadController.java`

Alta con `201` y `Location`, baja con `204`. Ejecución y cancelación responden `200`.

```java
package ec.edu.ups.tipi.actividades;

import ec.edu.ups.tipi.actividades.dto.ActividadActualizarRequest;
import ec.edu.ups.tipi.actividades.dto.ActividadCrearRequest;
import ec.edu.ups.tipi.actividades.dto.ActividadResponse;
import ec.edu.ups.tipi.actividades.dto.CancelacionActividadRequest;
import ec.edu.ups.tipi.actividades.dto.EjecucionActividadRequest;
import ec.edu.ups.tipi.actividades.dto.ReprogramacionResponse;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Tag(name = "Actividades", description = "Sesiones de los clubes: planificación, ejecución, reprogramación y cancelación")
@RestController
@RequestMapping("/api/actividades")
@RequiredArgsConstructor
public class ActividadController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";

    private final ActividadService service;

    @Operation(summary = "Lista paginada de actividades dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<ActividadResponse>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) Long cursoId,
            @RequestParam(required = false) Long responsableId,
            @RequestParam(required = false) EstadoActividad estado,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "false") boolean pendientes,
            @RequestParam(defaultValue = "false") boolean ascendente,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(q, institucionId, clubId, cursoId, responsableId, estado, desde,
                hasta, pendientes, ascendente, pagina, tamano, usuario));
    }

    @Operation(summary = "Detalle de una actividad")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ActividadResponse> obtener(@PathVariable Long id,
                                                     @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Historial de reprogramaciones de una actividad")
    @GetMapping("/{id}/reprogramaciones")
    @PreAuthorize(LECTURA)
    public ResponseEntity<List<ReprogramacionResponse>> reprogramaciones(
            @PathVariable Long id,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.reprogramaciones(id, usuario));
    }

    @Operation(summary = "Planifica una actividad")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(GESTION)
    public ResponseEntity<ActividadResponse> crear(@Valid @RequestBody ActividadCrearRequest request,
                                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        ActividadResponse creada = service.crear(request, usuario);
        return Respuestas.creado(creada.id(), creada);
    }

    @Operation(summary = "Actualiza o reprograma una actividad")
    @PutMapping("/{id}")
    @PreAuthorize(GESTION)
    public ResponseEntity<ActividadResponse> actualizar(@PathVariable Long id,
                                                        @Valid @RequestBody ActividadActualizarRequest request,
                                                        @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(id, request, usuario));
    }

    @Operation(summary = "Registra la ejecución de una actividad")
    @PutMapping("/{id}/ejecucion")
    @PreAuthorize(GESTION)
    public ResponseEntity<ActividadResponse> registrarEjecucion(
            @PathVariable Long id,
            @Valid @RequestBody EjecucionActividadRequest request,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.registrarEjecucion(id, request, usuario));
    }

    @Operation(summary = "Cancela una actividad indicando el motivo")
    @PatchMapping("/{id}/cancelacion")
    @PreAuthorize(GESTION)
    public ResponseEntity<ActividadResponse> cancelar(@PathVariable Long id,
                                                      @Valid @RequestBody CancelacionActividadRequest request,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.cancelar(id, request, usuario));
    }

    @Operation(summary = "Elimina una actividad sin registros asociados")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(GESTION)
    public ResponseEntity<Void> eliminar(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        service.eliminar(id, usuario);
        return Respuestas.sinContenido();
    }
}
```

## Paso 3. Controlador de contenidos

Archivo: `backend/src/main/java/ec/edu/ups/tipi/actividades/ContenidoCatalogoController.java`

Alta con `201` y `Location`.

```java
package ec.edu.ups.tipi.actividades;

import ec.edu.ups.tipi.actividades.dto.ContenidoEstadoRequest;
import ec.edu.ups.tipi.actividades.dto.ContenidoRequest;
import ec.edu.ups.tipi.actividades.dto.ContenidoResponse;
import ec.edu.ups.tipi.common.Respuestas;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Contenidos", description = "Catálogo de contenidos y competencias que se trabajan en las actividades")
@RestController
@RequestMapping("/api/contenidos")
@RequiredArgsConstructor
public class ContenidoCatalogoController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasRole('ADMIN')";

    private final ContenidoCatalogoService service;

    @Operation(summary = "Lista de contenidos con filtros por tipo, estado y texto")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<List<ContenidoResponse>> listar(@RequestParam(required = false) TipoContenido tipo,
                                                          @RequestParam(required = false) Boolean activo,
                                                          @RequestParam(required = false) String q) {
        return ResponseEntity.ok(service.listar(tipo, activo, q));
    }

    @Operation(summary = "Detalle de un contenido")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ContenidoResponse> obtener(@PathVariable Integer id) {
        return ResponseEntity.ok(service.obtener(id));
    }

    @Operation(summary = "Crea un contenido")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(GESTION)
    public ResponseEntity<ContenidoResponse> crear(@Valid @RequestBody ContenidoRequest request) {
        ContenidoResponse creado = service.crear(request);
        return Respuestas.creado(creado.id(), creado);
    }

    @Operation(summary = "Actualiza un contenido")
    @PutMapping("/{id}")
    @PreAuthorize(GESTION)
    public ResponseEntity<ContenidoResponse> actualizar(@PathVariable Integer id,
                                                        @Valid @RequestBody ContenidoRequest request) {
        return ResponseEntity.ok(service.actualizar(id, request));
    }

    @Operation(summary = "Activa o desactiva un contenido")
    @PatchMapping("/{id}/estado")
    @PreAuthorize(GESTION)
    public ResponseEntity<ContenidoResponse> cambiarEstado(@PathVariable Integer id,
                                                           @Valid @RequestBody ContenidoEstadoRequest request) {
        return ResponseEntity.ok(service.cambiarEstado(id, request));
    }
}
```

## Paso 4. Controlador de asistencia

Archivo: `backend/src/main/java/ec/edu/ups/tipi/asistencias/AsistenciaController.java`

Cinco operaciones con `200`.

```java
package ec.edu.ups.tipi.asistencias;

import ec.edu.ups.tipi.asistencias.dto.AsistenciaVista;
import ec.edu.ups.tipi.asistencias.dto.CorreccionAsistenciaVista;
import ec.edu.ups.tipi.asistencias.dto.PlanillaAsistenciaResponse;
import ec.edu.ups.tipi.asistencias.dto.RegistroAsistenciaRequest;
import ec.edu.ups.tipi.asistencias.dto.ResumenAsistenciaResponse;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Tag(name = "Asistencia", description = "Planilla de asistencia por sesión, correcciones y resumen por club")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AsistenciaController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";

    private final AsistenciaService service;

    @Operation(summary = "Planilla de asistencia de una actividad")
    @GetMapping("/actividades/{id}/asistencia")
    @PreAuthorize(LECTURA)
    public ResponseEntity<PlanillaAsistenciaResponse> planilla(@PathVariable Long id,
                                                               @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.planilla(id, usuario));
    }

    @Operation(summary = "Registra o corrige la asistencia de una actividad")
    @PutMapping("/actividades/{id}/asistencia")
    @PreAuthorize(GESTION)
    public ResponseEntity<PlanillaAsistenciaResponse> registrar(
            @PathVariable Long id,
            @Valid @RequestBody RegistroAsistenciaRequest request,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.registrar(id, request, usuario));
    }

    @Operation(summary = "Correcciones hechas a la asistencia de una actividad")
    @GetMapping("/actividades/{id}/asistencia/correcciones")
    @PreAuthorize(LECTURA)
    public ResponseEntity<List<CorreccionAsistenciaVista>> correcciones(
            @PathVariable Long id,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.correcciones(id, usuario));
    }

    @Operation(summary = "Lista paginada de registros de asistencia dentro del alcance del usuario")
    @GetMapping("/asistencias")
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<AsistenciaVista>> listar(
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) Long cursoId,
            @RequestParam(required = false) Long actividadId,
            @RequestParam(required = false) Long estudianteId,
            @RequestParam(required = false) EstadoAsistencia estado,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(institucionId, clubId, cursoId, actividadId, estudianteId, estado,
                desde, hasta, pagina, tamano, usuario));
    }

    @Operation(summary = "Resumen de asistencia de un club por estudiante")
    @GetMapping("/asistencias/resumen")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ResumenAsistenciaResponse> resumen(
            @RequestParam Long clubId,
            @RequestParam(required = false) Long cursoId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.resumen(clubId, cursoId, desde, hasta, usuario));
    }
}
```

## Paso 5. Controlador de evidencias

Archivo: `backend/src/main/java/ec/edu/ups/tipi/evidencias/EvidenciaController.java`

El registro responde `201` con `Location: /api/evidencias/{id}`. La descarga declara en la documentación que devuelve un archivo binario y conserva sus cabeceras de seguridad.

```java
package ec.edu.ups.tipi.evidencias;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.estudiantes.dto.DocumentoDescarga;
import ec.edu.ups.tipi.evidencias.dto.EvidenciaActualizarRequest;
import ec.edu.ups.tipi.evidencias.dto.EvidenciaCrearRequest;
import ec.edu.ups.tipi.evidencias.dto.EvidenciaResponse;
import ec.edu.ups.tipi.evidencias.dto.EvidenciasActividadResponse;
import ec.edu.ups.tipi.evidencias.dto.ResumenEvidenciasResponse;
import ec.edu.ups.tipi.evidencias.dto.RetiroEvidenciaRequest;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

@Tag(name = "Evidencias", description = "Fotografías, informes, enlaces y productos de cada sesión, con su archivo")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class EvidenciaController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String RUTA_EVIDENCIAS = "/api/evidencias";

    private final EvidenciaService service;

    @Operation(summary = "Evidencias de una actividad con el estado de las autorizaciones de imagen")
    @GetMapping("/actividades/{id}/evidencias")
    @PreAuthorize(LECTURA)
    public ResponseEntity<EvidenciasActividadResponse> deActividad(
            @PathVariable Long id,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.deActividad(id, usuario));
    }

    @Operation(summary = "Registra una evidencia en una actividad, con archivo o con enlace")
    @PostMapping(value = "/actividades/{id}/evidencias",
            consumes = {MediaType.MULTIPART_FORM_DATA_VALUE, MediaType.APPLICATION_FORM_URLENCODED_VALUE})
    @PreAuthorize(GESTION)
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<EvidenciaResponse> registrar(
            @PathVariable Long id,
            @Valid @ModelAttribute EvidenciaCrearRequest request,
            @RequestParam(value = "archivo", required = false) MultipartFile archivo,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        EvidenciaResponse creada = service.registrar(id, request, archivo, usuario);
        return Respuestas.creadoEn(RUTA_EVIDENCIAS, creada.id(), creada);
    }

    @Operation(summary = "Lista paginada de evidencias dentro del alcance del usuario")
    @GetMapping("/evidencias")
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<EvidenciaResponse>> listar(
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) Long actividadId,
            @RequestParam(required = false) Long estudianteId,
            @RequestParam(required = false) TipoEvidencia tipo,
            @RequestParam(required = false) EstadoEvidencia estado,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(institucionId, clubId, actividadId, estudianteId, tipo, estado,
                desde, hasta, pagina, tamano, usuario));
    }

    @Operation(summary = "Resumen de evidencias por club")
    @GetMapping("/evidencias/resumen")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ResumenEvidenciasResponse> resumen(
            @RequestParam(required = false) Integer periodoId,
            @RequestParam(required = false) Long institucionId,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.resumen(periodoId, institucionId, usuario));
    }

    @Operation(summary = "Detalle de una evidencia")
    @GetMapping("/evidencias/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<EvidenciaResponse> obtener(@PathVariable Long id,
                                                     @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Actualiza los datos de una evidencia")
    @PutMapping("/evidencias/{id}")
    @PreAuthorize(GESTION)
    public ResponseEntity<EvidenciaResponse> actualizar(@PathVariable Long id,
                                                        @Valid @RequestBody EvidenciaActualizarRequest request,
                                                        @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(id, request, usuario));
    }

    @Operation(summary = "Retira una evidencia indicando el motivo")
    @PostMapping("/evidencias/{id}/retiro")
    @PreAuthorize(GESTION)
    public ResponseEntity<EvidenciaResponse> retirar(@PathVariable Long id,
                                                     @Valid @RequestBody RetiroEvidenciaRequest request,
                                                     @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.retirar(id, request, usuario));
    }

    @Operation(summary = "Descarga el archivo de una evidencia")
    @ApiResponse(responseCode = "200", description = "Archivo de la evidencia",
            content = @Content(mediaType = MediaType.APPLICATION_OCTET_STREAM_VALUE,
                    schema = @Schema(type = "string", format = "binary")))
    @GetMapping("/evidencias/{id}/archivo")
    @PreAuthorize(LECTURA)
    public ResponseEntity<Resource> descargar(@PathVariable Long id,
                                              @AuthenticationPrincipal UsuarioPrincipal usuario) {
        DocumentoDescarga archivo = service.descargar(id, usuario);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(archivo.tipoMime()))
                .contentLength(archivo.tamano())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(archivo.nombre(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'; sandbox")
                .cacheControl(CacheControl.noStore())
                .body(archivo.recurso());
    }
}
```

## Paso 6. Controlador de proyectos

Archivo: `backend/src/main/java/ec/edu/ups/tipi/proyectos/ProyectoController.java`

Alta con `201` y `Location`. Finalización y cancelación responden `200`.

```java
package ec.edu.ups.tipi.proyectos;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.proyectos.dto.CancelacionProyectoRequest;
import ec.edu.ups.tipi.proyectos.dto.EvidenciasProyectoRequest;
import ec.edu.ups.tipi.proyectos.dto.FinalizacionProyectoRequest;
import ec.edu.ups.tipi.proyectos.dto.ProyectoActualizarRequest;
import ec.edu.ups.tipi.proyectos.dto.ProyectoCrearRequest;
import ec.edu.ups.tipi.proyectos.dto.ProyectoResponse;
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

@Tag(name = "Proyectos", description = "Proyectos de los estudiantes: registro, evidencias vinculadas, finalización y cancelación")
@RestController
@RequestMapping("/api/proyectos")
@RequiredArgsConstructor
public class ProyectoController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";

    private final ProyectoService service;

    @Operation(summary = "Lista paginada de proyectos dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<ProyectoResponse>> listar(
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) Long estudianteId,
            @RequestParam(required = false) Long docenteId,
            @RequestParam(required = false) EstadoProyecto estado,
            @RequestParam(required = false) TipoProyecto tipo,
            @RequestParam(required = false) Integer periodoId,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(institucionId, clubId, estudianteId, docenteId, estado, tipo,
                periodoId, pagina, tamano, usuario));
    }

    @Operation(summary = "Detalle de un proyecto")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ProyectoResponse> obtener(@PathVariable Long id,
                                                    @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Registra un proyecto")
    @PostMapping
    @PreAuthorize(GESTION)
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<ProyectoResponse> registrar(@Valid @RequestBody ProyectoCrearRequest request,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        ProyectoResponse creado = service.registrar(request, usuario);
        return Respuestas.creado(creado.id(), creado);
    }

    @Operation(summary = "Actualiza los datos de un proyecto")
    @PutMapping("/{id}")
    @PreAuthorize(GESTION)
    public ResponseEntity<ProyectoResponse> actualizar(@PathVariable Long id,
                                                       @Valid @RequestBody ProyectoActualizarRequest request,
                                                       @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(id, request, usuario));
    }

    @Operation(summary = "Define las evidencias vinculadas a un proyecto")
    @PutMapping("/{id}/evidencias")
    @PreAuthorize(GESTION)
    public ResponseEntity<ProyectoResponse> vincularEvidencias(
            @PathVariable Long id,
            @Valid @RequestBody EvidenciasProyectoRequest request,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.vincularEvidencias(id, request, usuario));
    }

    @Operation(summary = "Finaliza un proyecto con su resultado")
    @PostMapping("/{id}/finalizacion")
    @PreAuthorize(GESTION)
    public ResponseEntity<ProyectoResponse> finalizar(@PathVariable Long id,
                                                      @Valid @RequestBody FinalizacionProyectoRequest request,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.finalizar(id, request, usuario));
    }

    @Operation(summary = "Cancela un proyecto indicando el motivo")
    @PostMapping("/{id}/cancelacion")
    @PreAuthorize(GESTION)
    public ResponseEntity<ProyectoResponse> cancelar(@PathVariable Long id,
                                                     @Valid @RequestBody CancelacionProyectoRequest request,
                                                     @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.cancelar(id, request, usuario));
    }
}
```

## Paso 7. Controlador de avances

Archivo: `backend/src/main/java/ec/edu/ups/tipi/avances/AvanceController.java`

Alta con `201` y `Location`. La anulación responde `200`.

```java
package ec.edu.ups.tipi.avances;

import ec.edu.ups.tipi.avances.dto.AnulacionAvanceRequest;
import ec.edu.ups.tipi.avances.dto.AvanceActualizarRequest;
import ec.edu.ups.tipi.avances.dto.AvanceCrearRequest;
import ec.edu.ups.tipi.avances.dto.AvanceResponse;
import ec.edu.ups.tipi.avances.dto.ProgresoEstudianteResponse;
import ec.edu.ups.tipi.avances.dto.ResumenResultadosResponse;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@Tag(name = "Avances", description = "Avances de estudiantes y proyectos con evaluación de competencias, progreso y resultados del período")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AvanceController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";

    private final AvanceService service;
    private final ResultadosService resultados;

    @Operation(summary = "Lista paginada de avances dentro del alcance del usuario")
    @GetMapping("/avances")
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<AvanceResponse>> listar(
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) AlcanceAvance alcance,
            @RequestParam(required = false) Long estudianteId,
            @RequestParam(required = false) Long proyectoId,
            @RequestParam(required = false) Long actividadId,
            @RequestParam(required = false) EstadoAvance estado,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(institucionId, clubId, alcance, estudianteId, proyectoId,
                actividadId, estado, desde, hasta, pagina, tamano, usuario));
    }

    @Operation(summary = "Detalle de un avance")
    @GetMapping("/avances/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<AvanceResponse> obtener(@PathVariable Long id,
                                                  @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Registra un avance de un estudiante o de un proyecto")
    @PostMapping("/avances")
    @PreAuthorize(GESTION)
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<AvanceResponse> registrar(@Valid @RequestBody AvanceCrearRequest request,
                                                    @AuthenticationPrincipal UsuarioPrincipal usuario) {
        AvanceResponse creado = service.registrar(request, usuario);
        return Respuestas.creado(creado.id(), creado);
    }

    @Operation(summary = "Actualiza un avance")
    @PutMapping("/avances/{id}")
    @PreAuthorize(GESTION)
    public ResponseEntity<AvanceResponse> actualizar(@PathVariable Long id,
                                                     @Valid @RequestBody AvanceActualizarRequest request,
                                                     @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(id, request, usuario));
    }

    @Operation(summary = "Anula un avance indicando el motivo")
    @PostMapping("/avances/{id}/anulacion")
    @PreAuthorize(GESTION)
    public ResponseEntity<AvanceResponse> anular(@PathVariable Long id,
                                                 @Valid @RequestBody AnulacionAvanceRequest request,
                                                 @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.anular(id, request, usuario));
    }

    @Operation(summary = "Progreso de un estudiante por competencia en un período")
    @GetMapping("/estudiantes/{id}/progreso")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ProgresoEstudianteResponse> progreso(
            @PathVariable Long id,
            @RequestParam(required = false) Integer periodoId,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.progreso(id, periodoId, usuario));
    }

    @Operation(summary = "Resumen de resultados del período por club y por competencia")
    @GetMapping("/resultados/resumen")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ResumenResultadosResponse> resumen(
            @RequestParam(required = false) Integer periodoId,
            @RequestParam(required = false) Long institucionId,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(resultados.resumen(periodoId, institucionId, usuario));
    }
}
```

## Paso 8. Controlador de seguimiento

Archivo: `backend/src/main/java/ec/edu/ups/tipi/seguimiento/SeguimientoController.java`

Cuatro operaciones con `200`.

```java
package ec.edu.ups.tipi.seguimiento;

import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.seguimiento.dto.ParametrosSeguimientoRequest;
import ec.edu.ups.tipi.seguimiento.dto.ParametrosSeguimientoResponse;
import ec.edu.ups.tipi.seguimiento.dto.ResumenSeguimientoResponse;
import ec.edu.ups.tipi.seguimiento.dto.SeguimientoClubResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@Tag(name = "Seguimiento", description = "Semáforo de cumplimiento de actividades por club y sus parámetros")
@RestController
@RequestMapping("/api/seguimiento")
@RequiredArgsConstructor
public class SeguimientoController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";

    private final SeguimientoService service;
    private final ParametrosSeguimientoService parametros;

    @Operation(summary = "Semáforo de seguimiento de los clubes dentro del alcance del usuario")
    @GetMapping("/resumen")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ResumenSeguimientoResponse> resumen(
            @RequestParam(required = false) Integer periodoId,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.resumen(periodoId, institucionId, desde, hasta, usuario));
    }

    @Operation(summary = "Seguimiento detallado de un club")
    @GetMapping("/clubes/{clubId}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<SeguimientoClubResponse> club(
            @PathVariable Long clubId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.club(clubId, desde, hasta, usuario));
    }

    @Operation(summary = "Umbrales vigentes del semáforo de seguimiento")
    @GetMapping("/parametros")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ParametrosSeguimientoResponse> obtenerParametros() {
        return ResponseEntity.ok(parametros.obtener());
    }

    @Operation(summary = "Actualiza los umbrales del semáforo de seguimiento")
    @PutMapping("/parametros")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ParametrosSeguimientoResponse> actualizarParametros(
            @Valid @RequestBody ParametrosSeguimientoRequest request,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(parametros.actualizar(request, usuario));
    }
}
```

## Paso 9. Compilar y reiniciar el backend

Desde la carpeta `backend`:

```bash
./mvnw spring-boot:run
```

En http://localhost:8080/swagger-ui.html deben aparecer las secciones **Actividades**, **Contenidos**, **Asistencia**, **Evidencias**, **Proyectos**, **Avances** y **Seguimiento**. En total, Swagger UI muestra 33 secciones y 152 operaciones, todas con resumen.

## Paso 10. Comprobar el contrato

Registra una evidencia de tipo enlace en una sesión ejecutada con `POST /api/actividades/{id}/evidencias`. Debe responder `201` y la cabecera `Location` debe terminar en `/api/evidencias/{id}`, no en la ruta de la actividad.

## Resultado de mis comprobaciones

En el puerto 8081, con el administrador, respondieron `200`: `GET /api/actividades`, `/api/evidencias`, `/api/proyectos`, `/api/avances`, `/api/contenidos` y `/api/asistencias`.

`GET /api/seguimiento/resumen`, `/api/resultados/resumen` y `/api/evidencias/resumen` respondieron `400` con el mensaje "No hay un período académico activo; indique el período en «periodoId»". Es el comportamiento esperado cuando no existe un período activo, y la base de datos de este equipo no tiene ninguno.

`EvidenciaControllerTest` (3 casos) comprueba el `201` con `Location: /api/evidencias/9`, el `400` cuando falta el título y el `200` del retiro.

Resumen del documento OpenAPI al terminar los bloques 4 a 6:

| Método | Código declarado | Operaciones |
|---|---|---|
| GET | 200 | 70 |
| POST | 201 | 20 |
| POST | 200 | 7 |
| POST | 204 | 5 |
| POST | 202 | 1 |
| PUT | 200 | 24 |
| PATCH | 200 | 20 |
| DELETE | 204 | 5 |
| **Total** | | **152** |

