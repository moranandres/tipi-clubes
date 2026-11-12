# PASO 2 · Bloque 5: cursos, inscripciones, competencias y certificados

Este bloque aplica el contrato `ResponseEntity<DTO>` y las etiquetas `@Tag` y `@Operation` a 10 controladores, con 51 operaciones. Los cambios ya están aplicados en tu equipo, en la rama `claude/project-thread-vr6pay`, y subidos a GitHub.

## Qué cambia

| Controlador | Ruta base | Operaciones | Altas con 201 y `Location` | Bajas con 204 |
|---|---|---|---|---|
| `CursoController` | `/api/cursos` | 6 | 1 | 1 |
| `HorarioController` | `/api/cursos/{cursoId}/horarios` | 3 | 1 | 1 |
| `InscripcionController` | `/api/inscripciones` | 1 | 0 | 0 |
| `SolicitudInscripcionController` | `/api/solicitudes-inscripcion` | 8 | 1 | 0 |
| `SolicitudRetiroController` | `/api/solicitudes-retiro` | 7 | 1 | 0 |
| `CatalogoCompetenciaController` | `/api/competencias` | 13 | 3 | 0 |
| `ParticipacionCompetenciaController` | `/api/participaciones-competencia` | 5 | 1 | 1 |
| `CertificadoController` | `/api/certificados` | 5 | 1 | 0 |
| `ResultadoCursoController` | `/api/cursos/{cursoId}/participantes` y `/api/inscripciones-curso/{id}/resultado` | 2 | 0 | 0 |
| `VerificacionPublicaController` | `/api/publico/certificados` | 1 | 0 | 0 |

Dos detalles de este bloque:

- En los recursos anidados la cabecera `Location` conserva la ruta del padre. Al crear un horario en el curso 5, la respuesta trae `Location: /api/cursos/5/horarios/3`. Lo mismo ocurre con las ediciones y las categorías de una competencia.
- Aprobar, rechazar, cancelar o anular son acciones sobre un recurso que ya existe, así que responden `200` con el DTO actualizado.

Las restricciones de la base de datos que evitan inscripciones duplicadas no se tocan: siguen respondiendo `409` desde `GlobalExceptionHandler`.

## Paso 1. Cambiar a la rama del bloque

```bash
git checkout claude/project-thread-vr6pay
```

## Paso 2. Controlador de cursos

Archivo: `backend/src/main/java/ec/edu/ups/tipi/cursos/CursoController.java`

Alta con `201` y `Location`, baja con `204`.

```java
package ec.edu.ups.tipi.cursos;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.cursos.dto.CambioEstadoCursoRequest;
import ec.edu.ups.tipi.cursos.dto.CursoActualizarRequest;
import ec.edu.ups.tipi.cursos.dto.CursoCrearRequest;
import ec.edu.ups.tipi.cursos.dto.CursoResponse;
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

@Tag(name = "Cursos", description = "Cursos de cada club, con nivel, modalidad, cupos y estado")
@RestController
@RequestMapping("/api/cursos")
@RequiredArgsConstructor
public class CursoController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL')";

    private final CursoService service;

    @Operation(summary = "Lista paginada de cursos dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<CursoResponse>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) NivelCurso nivel,
            @RequestParam(required = false) ModalidadCurso modalidad,
            @RequestParam(required = false) EstadoCurso estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(
                service.listar(q, institucionId, clubId, nivel, modalidad, estado, pagina, tamano, usuario));
    }

    @Operation(summary = "Detalle de un curso con sus horarios")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<CursoResponse> obtener(@PathVariable Long id,
                                                 @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Crea un curso en un club")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(GESTION)
    public ResponseEntity<CursoResponse> crear(@Valid @RequestBody CursoCrearRequest request,
                                               @AuthenticationPrincipal UsuarioPrincipal usuario) {
        CursoResponse creado = service.crear(request, usuario);
        return Respuestas.creado(creado.id(), creado);
    }

    @Operation(summary = "Actualiza los datos de un curso")
    @PutMapping("/{id}")
    @PreAuthorize(GESTION)
    public ResponseEntity<CursoResponse> actualizar(@PathVariable Long id,
                                                    @Valid @RequestBody CursoActualizarRequest request,
                                                    @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(id, request, usuario));
    }

    @Operation(summary = "Cambia el estado de un curso")
    @PatchMapping("/{id}/estado")
    @PreAuthorize(GESTION)
    public ResponseEntity<CursoResponse> cambiarEstado(@PathVariable Long id,
                                                       @Valid @RequestBody CambioEstadoCursoRequest request,
                                                       @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.cambiarEstado(id, request, usuario));
    }

    @Operation(summary = "Elimina un curso sin inscripciones")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(GESTION)
    public ResponseEntity<Void> eliminar(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        service.eliminar(id, usuario);
        return Respuestas.sinContenido();
    }
}
```

## Paso 3. Controlador de horarios

Archivo: `backend/src/main/java/ec/edu/ups/tipi/cursos/HorarioController.java`

El alta devuelve `Location` dentro del curso: `/api/cursos/{cursoId}/horarios/{id}`.

```java
package ec.edu.ups.tipi.cursos;

import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.cursos.dto.HorarioRequest;
import ec.edu.ups.tipi.cursos.dto.HorarioResponse;
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

@Tag(name = "Horarios de curso", description = "Días y horas en que se dicta cada curso")
@RestController
@RequestMapping("/api/cursos/{cursoId}/horarios")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','RESP_INSTITUCIONAL')")
public class HorarioController {

    private final HorarioService service;

    @Operation(summary = "Agrega un horario a un curso")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<HorarioResponse> crear(@PathVariable Long cursoId,
                                                 @Valid @RequestBody HorarioRequest request,
                                                 @AuthenticationPrincipal UsuarioPrincipal usuario) {
        HorarioResponse creado = service.crear(cursoId, request, usuario);
        return Respuestas.creado(creado.id(), creado);
    }

    @Operation(summary = "Actualiza un horario de un curso")
    @PutMapping("/{horarioId}")
    public ResponseEntity<HorarioResponse> actualizar(@PathVariable Long cursoId,
                                                      @PathVariable Long horarioId,
                                                      @Valid @RequestBody HorarioRequest request,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(cursoId, horarioId, request, usuario));
    }

    @Operation(summary = "Elimina un horario de un curso")
    @DeleteMapping("/{horarioId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> eliminar(@PathVariable Long cursoId,
                                         @PathVariable Long horarioId,
                                         @AuthenticationPrincipal UsuarioPrincipal usuario) {
        service.eliminar(cursoId, horarioId, usuario);
        return Respuestas.sinContenido();
    }
}
```

## Paso 4. Controlador de inscripciones

Archivo: `backend/src/main/java/ec/edu/ups/tipi/inscripciones/InscripcionController.java`

Una consulta paginada.

```java
package ec.edu.ups.tipi.inscripciones;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.inscripciones.dto.InscripcionVista;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Inscripciones", description = "Inscripciones de estudiantes en clubes y cursos")
@RestController
@RequestMapping("/api/inscripciones")
@RequiredArgsConstructor
public class InscripcionController {

    private final InscripcionService service;

    @Operation(summary = "Lista paginada de inscripciones dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')")
    public ResponseEntity<PaginaResponse<InscripcionVista>> listar(
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) Long cursoId,
            @RequestParam(required = false) Long estudianteId,
            @RequestParam(required = false) EstadoInscripcion estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(
                service.listar(institucionId, clubId, cursoId, estudianteId, estado, pagina, tamano, usuario));
    }
}
```

## Paso 5. Controlador de solicitudes de inscripción

Archivo: `backend/src/main/java/ec/edu/ups/tipi/inscripciones/SolicitudInscripcionController.java`

El registro responde `201` con `Location`. Revisión, aprobación, rechazo y cancelación responden `200`.

```java
package ec.edu.ups.tipi.inscripciones;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.cursos.NivelCurso;
import ec.edu.ups.tipi.inscripciones.dto.MotivoRequest;
import ec.edu.ups.tipi.inscripciones.dto.SolicitudAprobarRequest;
import ec.edu.ups.tipi.inscripciones.dto.SolicitudCrearRequest;
import ec.edu.ups.tipi.inscripciones.dto.SolicitudResponse;
import ec.edu.ups.tipi.inscripciones.dto.SolicitudVista;
import ec.edu.ups.tipi.inscripciones.dto.VerificacionResponse;
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

@Tag(name = "Solicitudes de inscripción", description = "Solicitudes de inscripción a clubes: registro, verificación, aprobación, rechazo y cancelación")
@RestController
@RequestMapping("/api/solicitudes-inscripcion")
@RequiredArgsConstructor
public class SolicitudInscripcionController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String REGISTRO = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String RESOLUCION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL')";

    private final SolicitudInscripcionService service;
    private final VerificacionSolicitudService verificacion;

    @Operation(summary = "Lista paginada de solicitudes de inscripción dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<SolicitudVista>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) EstadoSolicitud estado,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) Long cursoId,
            @RequestParam(required = false) Long estudianteId,
            @RequestParam(required = false) NivelCurso nivel,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(q, estado, institucionId, clubId, cursoId, estudianteId, nivel,
                pagina, tamano, usuario));
    }

    @Operation(summary = "Detalle de una solicitud de inscripción")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<SolicitudVista> obtener(@PathVariable Long id,
                                                  @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Verifica los requisitos de una solicitud antes de aprobarla")
    @GetMapping("/{id}/verificacion")
    @PreAuthorize(RESOLUCION)
    public ResponseEntity<VerificacionResponse> verificar(@PathVariable Long id,
                                                          @RequestParam(required = false) Long cursoId,
                                                          @RequestParam(required = false) NivelCurso nivelAsignado,
                                                          @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(verificacion.verificar(id, cursoId, nivelAsignado, usuario));
    }

    @Operation(summary = "Registra una solicitud de inscripción")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(REGISTRO)
    public ResponseEntity<SolicitudResponse> crear(@Valid @RequestBody SolicitudCrearRequest request,
                                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        SolicitudResponse creada = service.crear(request, usuario);
        return Respuestas.creado(creada.id(), creada);
    }

    @Operation(summary = "Pone una solicitud en revisión")
    @PatchMapping("/{id}/revision")
    @PreAuthorize(RESOLUCION)
    public ResponseEntity<SolicitudResponse> tomarEnRevision(@PathVariable Long id,
                                                             @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.tomarEnRevision(id, usuario));
    }

    @Operation(summary = "Aprueba una solicitud y genera la inscripción")
    @PatchMapping("/{id}/aprobacion")
    @PreAuthorize(RESOLUCION)
    public ResponseEntity<SolicitudResponse> aprobar(@PathVariable Long id,
                                                     @Valid @RequestBody SolicitudAprobarRequest request,
                                                     @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.aprobar(id, request, usuario));
    }

    @Operation(summary = "Rechaza una solicitud indicando el motivo")
    @PatchMapping("/{id}/rechazo")
    @PreAuthorize(RESOLUCION)
    public ResponseEntity<SolicitudResponse> rechazar(@PathVariable Long id,
                                                      @Valid @RequestBody MotivoRequest request,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.rechazar(id, request, usuario));
    }

    @Operation(summary = "Cancela una solicitud indicando el motivo")
    @PatchMapping("/{id}/cancelacion")
    @PreAuthorize(REGISTRO)
    public ResponseEntity<SolicitudResponse> cancelar(@PathVariable Long id,
                                                      @Valid @RequestBody MotivoRequest request,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.cancelar(id, request, usuario));
    }
}
```

## Paso 6. Controlador de solicitudes de retiro

Archivo: `backend/src/main/java/ec/edu/ups/tipi/retiros/SolicitudRetiroController.java`

Misma forma que el anterior. La aprobación conserva su cuerpo opcional.

```java
package ec.edu.ups.tipi.retiros;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.inscripciones.dto.MotivoRequest;
import ec.edu.ups.tipi.retiros.dto.EfectosRetiroResponse;
import ec.edu.ups.tipi.retiros.dto.RetiroAprobarRequest;
import ec.edu.ups.tipi.retiros.dto.RetiroCrearRequest;
import ec.edu.ups.tipi.retiros.dto.RetiroResponse;
import ec.edu.ups.tipi.retiros.dto.RetiroVista;
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

@Tag(name = "Solicitudes de retiro", description = "Solicitudes de retiro de un club: registro, efectos, aprobación, rechazo y cancelación")
@RestController
@RequestMapping("/api/solicitudes-retiro")
@RequiredArgsConstructor
public class SolicitudRetiroController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String REGISTRO = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String RESOLUCION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL')";

    private final SolicitudRetiroService service;

    @Operation(summary = "Lista paginada de solicitudes de retiro dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<RetiroVista>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) EstadoRetiro estado,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) Long estudianteId,
            @RequestParam(required = false) Long inscripcionId,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(q, estado, institucionId, clubId, estudianteId, inscripcionId,
                pagina, tamano, usuario));
    }

    @Operation(summary = "Detalle de una solicitud de retiro")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<RetiroVista> obtener(@PathVariable Long id,
                                               @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Efectos que tendría aprobar el retiro: cursos afectados y cupos liberados")
    @GetMapping("/{id}/efectos")
    @PreAuthorize(RESOLUCION)
    public ResponseEntity<EfectosRetiroResponse> efectos(@PathVariable Long id,
                                                         @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.efectos(id, usuario));
    }

    @Operation(summary = "Registra una solicitud de retiro")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(REGISTRO)
    public ResponseEntity<RetiroResponse> crear(@Valid @RequestBody RetiroCrearRequest request,
                                                @AuthenticationPrincipal UsuarioPrincipal usuario) {
        RetiroResponse creado = service.crear(request, usuario);
        return Respuestas.creado(creado.id(), creado);
    }

    @Operation(summary = "Aprueba un retiro y libera los cupos")
    @PatchMapping("/{id}/aprobacion")
    @PreAuthorize(RESOLUCION)
    public ResponseEntity<RetiroResponse> aprobar(@PathVariable Long id,
                                                  @Valid @RequestBody(required = false) RetiroAprobarRequest request,
                                                  @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.aprobar(id, request, usuario));
    }

    @Operation(summary = "Rechaza un retiro indicando el motivo")
    @PatchMapping("/{id}/rechazo")
    @PreAuthorize(RESOLUCION)
    public ResponseEntity<RetiroResponse> rechazar(@PathVariable Long id,
                                                   @Valid @RequestBody MotivoRequest request,
                                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.rechazar(id, request, usuario));
    }

    @Operation(summary = "Cancela una solicitud de retiro indicando el motivo")
    @PatchMapping("/{id}/cancelacion")
    @PreAuthorize(REGISTRO)
    public ResponseEntity<RetiroResponse> cancelar(@PathVariable Long id,
                                                   @Valid @RequestBody MotivoRequest request,
                                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.cancelar(id, request, usuario));
    }
}
```

## Paso 7. Controlador del catálogo de competencias

Archivo: `backend/src/main/java/ec/edu/ups/tipi/competencias/CatalogoCompetenciaController.java`

Tres altas con `201`: competencia, edición y categoría. Las dos últimas devuelven `Location` dentro de la competencia.

```java
package ec.edu.ups.tipi.competencias;

import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.competencias.dto.CategoriaRequest;
import ec.edu.ups.tipi.competencias.dto.CategoriaResponse;
import ec.edu.ups.tipi.competencias.dto.CompetenciaRequest;
import ec.edu.ups.tipi.competencias.dto.CompetenciaResponse;
import ec.edu.ups.tipi.competencias.dto.EdicionRequest;
import ec.edu.ups.tipi.competencias.dto.EdicionResponse;
import ec.edu.ups.tipi.competencias.dto.EstadoCatalogoRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Competencias", description = "Catálogo de competencias con sus ediciones y categorías")
@RestController
@RequestMapping("/api/competencias")
@RequiredArgsConstructor
public class CatalogoCompetenciaController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasRole('ADMIN')";

    private final CatalogoCompetenciaService service;

    @Operation(summary = "Lista de competencias")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<List<CompetenciaResponse>> listar(@RequestParam(required = false) Boolean activa) {
        return ResponseEntity.ok(service.listarCompetencias(activa));
    }

    @Operation(summary = "Detalle de una competencia")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<CompetenciaResponse> obtener(@PathVariable Integer id) {
        return ResponseEntity.ok(service.obtenerCompetencia(id));
    }

    @Operation(summary = "Crea una competencia")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(GESTION)
    public ResponseEntity<CompetenciaResponse> crear(@Valid @RequestBody CompetenciaRequest request) {
        CompetenciaResponse creada = service.crearCompetencia(request);
        return Respuestas.creado(creada.id(), creada);
    }

    @Operation(summary = "Actualiza una competencia")
    @PutMapping("/{id}")
    @PreAuthorize(GESTION)
    public ResponseEntity<CompetenciaResponse> actualizar(@PathVariable Integer id,
                                                          @Valid @RequestBody CompetenciaRequest request) {
        return ResponseEntity.ok(service.actualizarCompetencia(id, request));
    }

    @Operation(summary = "Activa o desactiva una competencia")
    @PatchMapping("/{id}/estado")
    @PreAuthorize(GESTION)
    public ResponseEntity<CompetenciaResponse> cambiarEstado(@PathVariable Integer id,
                                                             @Valid @RequestBody EstadoCatalogoRequest request) {
        return ResponseEntity.ok(service.cambiarEstadoCompetencia(id, request));
    }

    @Operation(summary = "Ediciones de una competencia")
    @GetMapping("/{competenciaId}/ediciones")
    @PreAuthorize(LECTURA)
    public ResponseEntity<List<EdicionResponse>> listarEdiciones(@PathVariable Integer competenciaId,
                                                                 @RequestParam(required = false) Integer anio,
                                                                 @RequestParam(required = false) Boolean activa) {
        return ResponseEntity.ok(service.listarEdiciones(competenciaId, anio, activa));
    }

    @Operation(summary = "Crea una edición de una competencia")
    @PostMapping("/{competenciaId}/ediciones")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(GESTION)
    public ResponseEntity<EdicionResponse> crearEdicion(@PathVariable Integer competenciaId,
                                                        @Valid @RequestBody EdicionRequest request) {
        EdicionResponse creada = service.crearEdicion(competenciaId, request);
        return Respuestas.creado(creada.id(), creada);
    }

    @Operation(summary = "Actualiza una edición de una competencia")
    @PutMapping("/{competenciaId}/ediciones/{id}")
    @PreAuthorize(GESTION)
    public ResponseEntity<EdicionResponse> actualizarEdicion(@PathVariable Integer competenciaId,
                                                             @PathVariable Integer id,
                                                             @Valid @RequestBody EdicionRequest request) {
        return ResponseEntity.ok(service.actualizarEdicion(competenciaId, id, request));
    }

    @Operation(summary = "Activa o desactiva una edición")
    @PatchMapping("/{competenciaId}/ediciones/{id}/estado")
    @PreAuthorize(GESTION)
    public ResponseEntity<EdicionResponse> cambiarEstadoEdicion(@PathVariable Integer competenciaId,
                                                                @PathVariable Integer id,
                                                                @Valid @RequestBody EstadoCatalogoRequest request) {
        return ResponseEntity.ok(service.cambiarEstadoEdicion(competenciaId, id, request));
    }

    @Operation(summary = "Categorías de una competencia")
    @GetMapping("/{competenciaId}/categorias")
    @PreAuthorize(LECTURA)
    public ResponseEntity<List<CategoriaResponse>> listarCategorias(
            @PathVariable Integer competenciaId,
            @RequestParam(required = false) NivelCategoria nivel,
            @RequestParam(required = false) Boolean activa,
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(service.listarCategorias(competenciaId, nivel, activa, q));
    }

    @Operation(summary = "Crea una categoría de una competencia")
    @PostMapping("/{competenciaId}/categorias")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(GESTION)
    public ResponseEntity<CategoriaResponse> crearCategoria(@PathVariable Integer competenciaId,
                                                            @Valid @RequestBody CategoriaRequest request) {
        CategoriaResponse creada = service.crearCategoria(competenciaId, request);
        return Respuestas.creado(creada.id(), creada);
    }

    @Operation(summary = "Actualiza una categoría de una competencia")
    @PutMapping("/{competenciaId}/categorias/{id}")
    @PreAuthorize(GESTION)
    public ResponseEntity<CategoriaResponse> actualizarCategoria(@PathVariable Integer competenciaId,
                                                                 @PathVariable Integer id,
                                                                 @Valid @RequestBody CategoriaRequest request) {
        return ResponseEntity.ok(service.actualizarCategoria(competenciaId, id, request));
    }

    @Operation(summary = "Activa o desactiva una categoría")
    @PatchMapping("/{competenciaId}/categorias/{id}/estado")
    @PreAuthorize(GESTION)
    public ResponseEntity<CategoriaResponse> cambiarEstadoCategoria(@PathVariable Integer competenciaId,
                                                                    @PathVariable Integer id,
                                                                    @Valid @RequestBody EstadoCatalogoRequest request) {
        return ResponseEntity.ok(service.cambiarEstadoCategoria(competenciaId, id, request));
    }
}
```

## Paso 8. Controlador de participaciones en competencias

Archivo: `backend/src/main/java/ec/edu/ups/tipi/competencias/ParticipacionCompetenciaController.java`

Alta con `201` y `Location`, baja con `204`.

```java
package ec.edu.ups.tipi.competencias;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.competencias.dto.ParticipacionActualizarRequest;
import ec.edu.ups.tipi.competencias.dto.ParticipacionCrearRequest;
import ec.edu.ups.tipi.competencias.dto.ParticipacionResponse;
import ec.edu.ups.tipi.competencias.dto.ParticipacionVista;
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

@Tag(name = "Participaciones en competencias", description = "Participación de los estudiantes en ediciones y categorías de competencias")
@RestController
@RequestMapping("/api/participaciones-competencia")
@RequiredArgsConstructor
public class ParticipacionCompetenciaController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String REGISTRO = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";

    private final ParticipacionCompetenciaService service;

    @Operation(summary = "Lista paginada de participaciones dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<ParticipacionVista>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) Long estudianteId,
            @RequestParam(required = false) Integer competenciaId,
            @RequestParam(required = false) Integer edicionId,
            @RequestParam(required = false) Integer categoriaId,
            @RequestParam(required = false) NivelCategoria nivel,
            @RequestParam(required = false) String equipo,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(q, institucionId, clubId, estudianteId, competenciaId, edicionId,
                categoriaId, nivel, equipo, pagina, tamano, usuario));
    }

    @Operation(summary = "Detalle de una participación")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ParticipacionVista> obtener(@PathVariable Long id,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Registra la participación de un estudiante en una competencia")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(REGISTRO)
    public ResponseEntity<ParticipacionResponse> crear(@Valid @RequestBody ParticipacionCrearRequest request,
                                                       @AuthenticationPrincipal UsuarioPrincipal usuario) {
        ParticipacionResponse creada = service.crear(request, usuario);
        return Respuestas.creado(creada.id(), creada);
    }

    @Operation(summary = "Actualiza una participación y su resultado")
    @PutMapping("/{id}")
    @PreAuthorize(REGISTRO)
    public ResponseEntity<ParticipacionResponse> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody ParticipacionActualizarRequest request,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(id, request, usuario));
    }

    @Operation(summary = "Elimina una participación")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(REGISTRO)
    public ResponseEntity<Void> eliminar(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        service.eliminar(id, usuario);
        return Respuestas.sinContenido();
    }
}
```

## Paso 9. Controlador de certificados

Archivo: `backend/src/main/java/ec/edu/ups/tipi/certificados/CertificadoController.java`

La emisión responde `201` con `Location`. La descarga declara en la documentación que devuelve `application/pdf`.

```java
package ec.edu.ups.tipi.certificados;

import ec.edu.ups.tipi.certificados.dto.AnulacionRequest;
import ec.edu.ups.tipi.certificados.dto.CertificadoDescarga;
import ec.edu.ups.tipi.certificados.dto.CertificadoEmitirRequest;
import ec.edu.ups.tipi.certificados.dto.CertificadoResponse;
import ec.edu.ups.tipi.certificados.dto.CertificadoVista;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
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

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

@Tag(name = "Certificados", description = "Emisión, consulta, descarga en PDF y anulación de certificados")
@RestController
@RequestMapping("/api/certificados")
@RequiredArgsConstructor
public class CertificadoController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String DESCARGA = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String EMISION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL')";

    private final CertificadoService service;

    @Operation(summary = "Lista paginada de certificados dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<CertificadoVista>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) Long estudianteId,
            @RequestParam(required = false) TipoCertificado tipo,
            @RequestParam(required = false) EstadoCertificado estado,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(q, institucionId, clubId, estudianteId, tipo, estado, desde, hasta,
                pagina, tamano, usuario));
    }

    @Operation(summary = "Detalle de un certificado")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<CertificadoVista> obtener(@PathVariable Long id,
                                                    @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Descarga el certificado en PDF")
    @ApiResponse(responseCode = "200", description = "Archivo PDF del certificado",
            content = @Content(mediaType = MediaType.APPLICATION_PDF_VALUE,
                    schema = @Schema(type = "string", format = "binary")))
    @GetMapping("/{id}/pdf")
    @PreAuthorize(DESCARGA)
    public ResponseEntity<Resource> descargar(@PathVariable Long id,
                                              @AuthenticationPrincipal UsuarioPrincipal usuario) {
        CertificadoDescarga descarga = service.descargar(id, usuario);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(descarga.tamano())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(descarga.nombre(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.noStore())
                .body(descarga.recurso());
    }

    @Operation(summary = "Emite un certificado")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(EMISION)
    public ResponseEntity<CertificadoResponse> emitir(@Valid @RequestBody CertificadoEmitirRequest request,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        CertificadoResponse emitido = service.emitir(request, usuario);
        return Respuestas.creado(emitido.id(), emitido);
    }

    @Operation(summary = "Anula un certificado indicando el motivo")
    @PatchMapping("/{id}/anulacion")
    @PreAuthorize(EMISION)
    public ResponseEntity<CertificadoResponse> anular(@PathVariable Long id,
                                                      @Valid @RequestBody AnulacionRequest request,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.anular(id, request, usuario));
    }
}
```

## Paso 10. Controlador de resultados de curso

Archivo: `backend/src/main/java/ec/edu/ups/tipi/certificados/ResultadoCursoController.java`

Una consulta y un registro de resultado, ambos con `200`.

```java
package ec.edu.ups.tipi.certificados;

import ec.edu.ups.tipi.certificados.dto.ParticipanteCursoResponse;
import ec.edu.ups.tipi.certificados.dto.ParticipanteCursoVista;
import ec.edu.ups.tipi.certificados.dto.ResultadoCursoRequest;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Resultados de curso", description = "Participantes de un curso y registro de su resultado final")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ResultadoCursoController {

    private final ResultadoCursoService service;

    @Operation(summary = "Participantes de un curso con su resultado")
    @GetMapping("/cursos/{cursoId}/participantes")
    @PreAuthorize("hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')")
    public ResponseEntity<List<ParticipanteCursoVista>> participantes(
            @PathVariable Long cursoId,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.participantes(cursoId, usuario));
    }

    @Operation(summary = "Registra el resultado final de un participante en un curso")
    @PatchMapping("/inscripciones-curso/{id}/resultado")
    @PreAuthorize("hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')")
    public ResponseEntity<ParticipanteCursoResponse> registrarResultado(
            @PathVariable Long id,
            @RequestBody ResultadoCursoRequest request,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.registrarResultado(id, request, usuario));
    }
}
```

## Paso 11. Controlador de verificación pública

Archivo: `backend/src/main/java/ec/edu/ups/tipi/certificados/VerificacionPublicaController.java`

Ya devolvía `ResponseEntity`. Se agrega su etiqueta propia y se marca como público en la documentación.

```java
package ec.edu.ups.tipi.certificados;

import ec.edu.ups.tipi.certificados.dto.VerificacionPublicaResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Verificación pública de certificados", description = "Consulta de la validez de un certificado sin iniciar sesión")
@RestController
@RequestMapping("/api/publico/certificados")
@RequiredArgsConstructor
public class VerificacionPublicaController {

    private final CertificadoService service;

    @Operation(summary = "Verifica la validez de un certificado por su código, sin iniciar sesión")
    @SecurityRequirements
    @GetMapping("/{codigo}")
    public ResponseEntity<VerificacionPublicaResponse> verificar(@PathVariable String codigo) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(service.verificarPublico(codigo));
    }
}
```

## Paso 12. Compilar y reiniciar el backend

Desde la carpeta `backend`:

```bash
./mvnw spring-boot:run
```

En http://localhost:8080/swagger-ui.html deben aparecer las secciones **Cursos**, **Horarios de curso**, **Inscripciones**, **Solicitudes de inscripción**, **Solicitudes de retiro**, **Competencias**, **Participaciones en competencias**, **Certificados**, **Resultados de curso** y **Verificación pública de certificados**.

## Paso 13. Comprobar el contrato

Con un curso existente, crea un horario desde Swagger UI con `POST /api/cursos/{cursoId}/horarios`. La respuesta debe ser `201` y traer la cabecera `Location` terminada en `/horarios/{id}`. Después elimínalo con `DELETE` sobre esa misma ruta: debe responder `204` sin cuerpo.

## Resultado de mis comprobaciones

En el puerto 8081, con el administrador, respondieron `200`: `GET /api/cursos`, `/api/certificados`, `/api/competencias`, `/api/solicitudes-inscripcion`, `/api/solicitudes-retiro`, `/api/inscripciones` y `/api/participaciones-competencia`.

El alta y la baja de horarios quedan cubiertas por `HorarioControllerTest` (4 casos), que comprueba el `201` con `Location: /api/cursos/5/horarios/3`, el `200` de la actualización, el `204` sin cuerpo de la baja y el `400` con datos inválidos. No creé registros en tu base de datos.

