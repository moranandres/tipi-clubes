# PASO 2 · Bloque 4: acceso, usuarios y estudiantes

Este bloque aplica el contrato `ResponseEntity<DTO>` y las etiquetas de documentación (`@Tag` y `@Operation`) a 9 controladores: autenticación, recuperación de contraseña, usuarios, roles, auditoría, estudiantes, autorizaciones, historial y catálogo de clubes. Son 31 operaciones. Los cambios ya están aplicados en tu equipo, en la rama `claude/project-thread-vr6pay`, que continúa a partir de la rama de los bloques 1 a 3, y están subidos a GitHub.

## Qué cambia

| Controlador | Ruta base | Operaciones | Altas con 201 y `Location` | Respuestas 204 |
|---|---|---|---|---|
| `AuthController` | `/api/auth` | 5 | 0 | 2 (cerrar sesión y cerrar todas las sesiones) |
| `RecuperacionController` | `/api/auth` | 3 | 0 | 2, más una respuesta 202 |
| `UsuarioController` | `/api/usuarios` | 6 | 1 | 1 (contraseña temporal) |
| `RolController` | `/api/roles` | 1 | 0 | 0 |
| `AuditoriaController` | `/api/auditoria` | 1 | 0 | 0 |
| `EstudianteController` | `/api/estudiantes` | 7 | 1 | 1 (baja) |
| `AutorizacionController` | `/api/estudiantes/{estudianteId}/autorizaciones` | 4 | 0 | 0 |
| `HistorialController` | `/api/estudiantes/{id}/historial` | 1 | 0 | 0 |
| `CatalogoController` | `/api/catalogo` | 3 | 0 | 0 |

Las reglas son las mismas del bloque 1:

- Las consultas, las actualizaciones y las acciones sobre un recurso existente responden `200` con el DTO.
- Las altas responden `201` con el DTO y la cabecera `Location` con la URL del recurso nuevo.
- Las bajas y las acciones sin datos de retorno responden `204` sin cuerpo, con `ResponseEntity<Void>`.
- `@ResponseStatus` se conserva en las altas y en las respuestas sin cuerpo para que el documento OpenAPI declare el código correcto.

Para el frontend actual nada cambia: los códigos de estado y los cuerpos son los mismos de antes. Lo nuevo es la cabecera `Location` en las altas y la documentación.

Ningún servicio, repositorio ni regla de acceso cambia. Las anotaciones `@PreAuthorize` quedan exactamente como estaban.

## Paso 1. Cambiar a la rama del bloque

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
git checkout claude/project-thread-vr6pay
```

## Paso 2. Respuestas HTTP reutilizables

Archivo: `backend/src/main/java/ec/edu/ups/tipi/common/Respuestas.java`

Se agregan dos métodos. `creadoEn` arma el `201` cuando el recurso nuevo vive en una ruta distinta de la que recibió la petición (lo usará el bloque 6 con las evidencias). `aceptado` devuelve el `202` de la solicitud de recuperación de contraseña.

```java
package ec.edu.ups.tipi.common;

import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

public final class Respuestas {

    private Respuestas() {
    }

    public static <T> ResponseEntity<T> creado(Object id, T cuerpo) {
        URI ubicacion = ServletUriComponentsBuilder.fromCurrentRequestUri()
                .path("/{id}")
                .buildAndExpand(id)
                .toUri();
        return ResponseEntity.created(ubicacion).body(cuerpo);
    }

    public static <T> ResponseEntity<T> creadoEn(String ruta, Object id, T cuerpo) {
        URI ubicacion = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path(ruta)
                .path("/{id}")
                .buildAndExpand(id)
                .toUri();
        return ResponseEntity.created(ubicacion).body(cuerpo);
    }

    public static ResponseEntity<Void> sinContenido() {
        return ResponseEntity.noContent().build();
    }

    public static ResponseEntity<Void> aceptado() {
        return ResponseEntity.accepted().build();
    }
}
```

## Paso 3. Controlador de autenticación

Archivo: `backend/src/main/java/ec/edu/ups/tipi/auth/AuthController.java`

El inicio de sesión se marca con `@SecurityRequirements` vacío para que la documentación lo muestre como público. Cerrar sesión y cerrar todas las sesiones devuelven `204` con `ResponseEntity<Void>`.

```java
package ec.edu.ups.tipi.auth;

import ec.edu.ups.tipi.auth.dto.CambiarPasswordRequest;
import ec.edu.ups.tipi.auth.dto.LoginRequest;
import ec.edu.ups.tipi.auth.dto.LoginResponse;
import ec.edu.ups.tipi.auth.dto.UsuarioResumen;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.security.JwtAuthFilter;
import ec.edu.ups.tipi.security.TokenValidado;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Autenticación", description = "Inicio y cierre de sesión, datos del usuario autenticado y cambio de contraseña")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Inicia sesión y entrega el token JWT")
    @SecurityRequirements
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @Operation(summary = "Datos del usuario autenticado")
    @GetMapping("/me")
    public ResponseEntity<UsuarioResumen> me(@AuthenticationPrincipal UsuarioPrincipal principal) {
        return ResponseEntity.ok(UsuarioResumen.de(principal.getUsuario()));
    }

    @Operation(summary = "Cambia la contraseña propia y entrega un token nuevo")
    @PostMapping("/cambiar-password")
    public ResponseEntity<LoginResponse> cambiarPassword(@AuthenticationPrincipal UsuarioPrincipal principal,
                                                         @Valid @RequestBody CambiarPasswordRequest request) {
        return ResponseEntity.ok(authService.cambiarPassword(principal, request));
    }

    @Operation(summary = "Cierra la sesión actual y revoca su token")
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> logout(@AuthenticationPrincipal UsuarioPrincipal principal,
                                       @RequestAttribute(JwtAuthFilter.ATRIBUTO_TOKEN) TokenValidado token) {
        authService.logout(principal, token);
        return Respuestas.sinContenido();
    }

    @Operation(summary = "Cierra todas las sesiones abiertas del usuario")
    @PostMapping("/cerrar-sesiones")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> cerrarSesiones(@AuthenticationPrincipal UsuarioPrincipal principal) {
        authService.cerrarSesiones(principal);
        return Respuestas.sinContenido();
    }
}
```

## Paso 4. Controlador de recuperación de contraseña

Archivo: `backend/src/main/java/ec/edu/ups/tipi/recuperacion/RecuperacionController.java`

Los tres endpoints son públicos, por eso `@SecurityRequirements` va en la clase. La solicitud responde `202` porque el correo se envía después; validar y restablecer responden `204`.

```java
package ec.edu.ups.tipi.recuperacion;

import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.recuperacion.dto.RecuperarRequest;
import ec.edu.ups.tipi.recuperacion.dto.RestablecerRequest;
import ec.edu.ups.tipi.recuperacion.dto.ValidarTokenRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Recuperación de contraseña", description = "Solicitud del enlace de recuperación y restablecimiento sin iniciar sesión")
@SecurityRequirements
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class RecuperacionController {

    private final RecuperacionService service;

    @Operation(summary = "Solicita el correo con el enlace de recuperación")
    @PostMapping("/recuperar")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ResponseEntity<Void> recuperar(@Valid @RequestBody RecuperarRequest request,
                                          HttpServletRequest peticion) {
        service.solicitar(request.identificador(), peticion.getRemoteAddr());
        return Respuestas.aceptado();
    }

    @Operation(summary = "Comprueba que el enlace de recuperación siga vigente")
    @PostMapping("/restablecer/validar")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> validar(@Valid @RequestBody ValidarTokenRequest request) {
        service.validar(request.token());
        return Respuestas.sinContenido();
    }

    @Operation(summary = "Define la contraseña nueva con el enlace de recuperación")
    @PostMapping("/restablecer")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> restablecer(@Valid @RequestBody RestablecerRequest request) {
        service.restablecer(request.token(), request.passwordNueva());
        return Respuestas.sinContenido();
    }
}
```

## Paso 5. Controlador de usuarios

Archivo: `backend/src/main/java/ec/edu/ups/tipi/usuarios/UsuarioController.java`

El alta responde `201` con `Location` hacia `/api/usuarios/{id}`. Asignar una contraseña temporal responde `204`.

```java
package ec.edu.ups.tipi.usuarios;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.usuarios.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Usuarios", description = "Cuentas de usuario, roles asignados, estado y contraseñas temporales")
@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UsuarioController {

    private final UsuarioService service;

    @Operation(summary = "Lista paginada de usuarios con filtros por texto, rol, institución y estado")
    @GetMapping
    public ResponseEntity<PaginaResponse<UsuarioDetalleResponse>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String rol,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Boolean activo,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano) {
        return ResponseEntity.ok(service.listar(q, rol, institucionId, activo, pagina, tamano));
    }

    @Operation(summary = "Detalle de un usuario")
    @GetMapping("/{id}")
    public ResponseEntity<UsuarioDetalleResponse> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(service.obtener(id));
    }

    @Operation(summary = "Crea un usuario con contraseña temporal")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<UsuarioDetalleResponse> crear(@Valid @RequestBody UsuarioCrearRequest request) {
        UsuarioDetalleResponse creado = service.crear(request);
        return Respuestas.creado(creado.id(), creado);
    }

    @Operation(summary = "Actualiza los datos de un usuario")
    @PutMapping("/{id}")
    public ResponseEntity<UsuarioDetalleResponse> actualizar(@PathVariable Long id,
                                                             @Valid @RequestBody UsuarioActualizarRequest request) {
        return ResponseEntity.ok(service.actualizar(id, request));
    }

    @Operation(summary = "Activa o desactiva un usuario")
    @PatchMapping("/{id}/estado")
    public ResponseEntity<UsuarioDetalleResponse> cambiarEstado(@PathVariable Long id,
                                                                @Valid @RequestBody EstadoRequest request) {
        return ResponseEntity.ok(service.cambiarEstado(id, request.activo()));
    }

    @Operation(summary = "Asigna una contraseña temporal a un usuario")
    @PostMapping("/{id}/restablecer-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> restablecerPassword(@PathVariable Long id,
                                                    @Valid @RequestBody PasswordTemporalRequest request) {
        service.restablecerPassword(id, request.passwordTemporal());
        return Respuestas.sinContenido();
    }
}
```

## Paso 6. Controlador de roles

Archivo: `backend/src/main/java/ec/edu/ups/tipi/usuarios/RolController.java`

Una sola consulta, ahora con `ResponseEntity<List<RolResponse>>`.

```java
package ec.edu.ups.tipi.usuarios;

import ec.edu.ups.tipi.usuarios.dto.RolResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Roles", description = "Roles disponibles para asignar a los usuarios")
@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RolController {

    private final RolRepository rolRepository;

    @Operation(summary = "Lista de roles del sistema")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RolResponse>> listar() {
        return ResponseEntity.ok(rolRepository.findAll(Sort.by("id")).stream()
                .map(r -> new RolResponse(r.getCodigo(), r.getNombre(), r.getDescripcion()))
                .toList());
    }
}
```

## Paso 7. Controlador de auditoría

Archivo: `backend/src/main/java/ec/edu/ups/tipi/auditoria/AuditoriaController.java`

Una sola consulta paginada. Conserva el `@PreAuthorize` de clase para administrador y consulta.

```java
package ec.edu.ups.tipi.auditoria;

import ec.edu.ups.tipi.common.PaginaResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@Tag(name = "Auditoría", description = "Registro de las acciones realizadas en el sistema")
@RestController
@RequestMapping("/api/auditoria")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','CONSULTA')")
public class AuditoriaController {

    private final AuditoriaService service;

    @Operation(summary = "Lista paginada de registros de auditoría con filtros por usuario, acción, entidad y fechas")
    @GetMapping
    public ResponseEntity<PaginaResponse<AuditoriaResponse>> listar(
            @RequestParam(required = false) String usuario,
            @RequestParam(required = false) String accion,
            @RequestParam(required = false) String entidad,
            @RequestParam(required = false) Long entidadId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano) {
        return ResponseEntity.ok(service.listar(usuario, accion, entidad, entidadId, desde, hasta, pagina, tamano));
    }
}
```

## Paso 8. Controlador de estudiantes

Archivo: `backend/src/main/java/ec/edu/ups/tipi/estudiantes/EstudianteController.java`

El alta responde `201` con `Location` y la baja responde `204`. Las reglas de acceso por rol no cambian: el alcance por institución lo sigue aplicando `EstudianteService` con el usuario autenticado.

```java
package ec.edu.ups.tipi.estudiantes;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.estudiantes.dto.CambioEstadoEstudianteRequest;
import ec.edu.ups.tipi.estudiantes.dto.CursoResponse;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteActualizarRequest;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteCrearRequest;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteResponse;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteVista;
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

import java.util.Arrays;
import java.util.List;

@Tag(name = "Estudiantes", description = "Estudiantes de las instituciones, su estado y su curso educativo")
@RestController
@RequestMapping("/api/estudiantes")
@RequiredArgsConstructor
public class EstudianteController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String ESCRITURA = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL')";

    private final EstudianteService service;

    @Operation(summary = "Catálogo de cursos educativos (grados y años de bachillerato)")
    @GetMapping("/cursos")
    @PreAuthorize(LECTURA)
    public ResponseEntity<List<CursoResponse>> cursos() {
        return ResponseEntity.ok(Arrays.stream(CursoEducativo.values()).map(CursoResponse::de).toList());
    }

    @Operation(summary = "Lista paginada de estudiantes dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<EstudianteVista>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) CursoEducativo curso,
            @RequestParam(required = false) EstadoEstudiante estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(q, institucionId, curso, estado, pagina, tamano, usuario));
    }

    @Operation(summary = "Detalle de un estudiante")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<EstudianteVista> obtener(@PathVariable Long id,
                                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Registra un estudiante")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<EstudianteResponse> crear(@Valid @RequestBody EstudianteCrearRequest request,
                                                    @AuthenticationPrincipal UsuarioPrincipal usuario) {
        EstudianteResponse creado = service.crear(request, usuario);
        return Respuestas.creado(creado.id(), creado);
    }

    @Operation(summary = "Actualiza los datos de un estudiante")
    @PutMapping("/{id}")
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<EstudianteResponse> actualizar(@PathVariable Long id,
                                                         @Valid @RequestBody EstudianteActualizarRequest request,
                                                         @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(id, request, usuario));
    }

    @Operation(summary = "Cambia el estado de un estudiante")
    @PatchMapping("/{id}/estado")
    @PreAuthorize(GESTION)
    public ResponseEntity<EstudianteVista> cambiarEstado(@PathVariable Long id,
                                                         @Valid @RequestBody CambioEstadoEstudianteRequest request,
                                                         @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.cambiarEstado(id, request.estado(), usuario));
    }

    @Operation(summary = "Elimina un estudiante sin registros asociados")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(GESTION)
    public ResponseEntity<Void> eliminar(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        service.eliminar(id, usuario);
        return Respuestas.sinContenido();
    }
}
```

## Paso 9. Controlador de autorizaciones

Archivo: `backend/src/main/java/ec/edu/ups/tipi/estudiantes/AutorizacionController.java`

La carga del documento responde `200` porque actualiza una autorización que ya existe. La descarga declara en la documentación que devuelve un archivo binario, de modo que los tipos generados no la confundan con JSON.

```java
package ec.edu.ups.tipi.estudiantes;

import ec.edu.ups.tipi.estudiantes.dto.AutorizacionRequest;
import ec.edu.ups.tipi.estudiantes.dto.AutorizacionResponse;
import ec.edu.ups.tipi.estudiantes.dto.DocumentoDescarga;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Tag(name = "Autorizaciones de estudiantes", description = "Autorizaciones de participación y de uso de imagen, con su documento de respaldo")
@RestController
@RequestMapping("/api/estudiantes/{estudianteId}/autorizaciones")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')")
public class AutorizacionController {

    private final AutorizacionService service;

    @Operation(summary = "Autorizaciones de un estudiante")
    @GetMapping
    public ResponseEntity<List<AutorizacionResponse>> listar(@PathVariable Long estudianteId,
                                                             @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(estudianteId, usuario));
    }

    @Operation(summary = "Registra o actualiza una autorización por tipo")
    @PutMapping("/{tipo}")
    public ResponseEntity<AutorizacionResponse> actualizar(@PathVariable Long estudianteId,
                                                           @PathVariable TipoAutorizacion tipo,
                                                           @Valid @RequestBody AutorizacionRequest request,
                                                           @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(estudianteId, tipo, request, usuario));
    }

    @Operation(summary = "Carga el documento de respaldo de una autorización")
    @PostMapping(value = "/{tipo}/documento", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AutorizacionResponse> cargarDocumento(@PathVariable Long estudianteId,
                                                                @PathVariable TipoAutorizacion tipo,
                                                                @RequestParam("archivo") MultipartFile archivo,
                                                                @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.cargarDocumento(estudianteId, tipo, archivo, usuario));
    }

    @Operation(summary = "Descarga el documento de respaldo de una autorización")
    @ApiResponse(responseCode = "200", description = "Archivo del documento",
            content = @Content(mediaType = MediaType.APPLICATION_OCTET_STREAM_VALUE,
                    schema = @Schema(type = "string", format = "binary")))
    @GetMapping("/{tipo}/documento")
    public ResponseEntity<Resource> descargarDocumento(@PathVariable Long estudianteId,
                                                       @PathVariable TipoAutorizacion tipo,
                                                       @AuthenticationPrincipal UsuarioPrincipal usuario) {
        DocumentoDescarga documento = service.descargarDocumento(estudianteId, tipo, usuario);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(documento.tipoMime()))
                .contentLength(documento.tamano())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(documento.nombre(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.noStore())
                .body(documento.recurso());
    }
}
```

## Paso 10. Controlador de historial

Archivo: `backend/src/main/java/ec/edu/ups/tipi/historial/HistorialController.java`

Una sola consulta con el historial completo del estudiante.

```java
package ec.edu.ups.tipi.historial;

import ec.edu.ups.tipi.historial.dto.HistorialResponse;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Historial del estudiante", description = "Trayectoria del estudiante en clubes, cursos, competencias y certificados")
@RestController
@RequestMapping("/api/estudiantes")
@RequiredArgsConstructor
public class HistorialController {

    private final HistorialService service;

    @Operation(summary = "Historial completo de un estudiante")
    @GetMapping("/{id}/historial")
    @PreAuthorize("hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')")
    public ResponseEntity<HistorialResponse> historial(@PathVariable Long id,
                                                       @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }
}
```

## Paso 11. Controlador del catálogo de clubes

Archivo: `backend/src/main/java/ec/edu/ups/tipi/catalogo/CatalogoController.java`

Tres consultas de solo lectura.

```java
package ec.edu.ups.tipi.catalogo;

import ec.edu.ups.tipi.catalogo.dto.CatalogoClubDetalleResponse;
import ec.edu.ups.tipi.catalogo.dto.CatalogoClubResponse;
import ec.edu.ups.tipi.catalogo.dto.CatalogoInstitucionResponse;
import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.cursos.ModalidadCurso;
import ec.edu.ups.tipi.cursos.NivelCurso;
import ec.edu.ups.tipi.instituciones.EstadoAdhesion;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Catálogo de clubes", description = "Oferta de clubes y cursos por institución, con cupos y horarios")
@RestController
@RequestMapping("/api/catalogo")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')")
public class CatalogoController {

    private final CatalogoService service;

    @Operation(summary = "Instituciones con el resumen de su oferta de clubes")
    @GetMapping("/instituciones")
    public ResponseEntity<List<CatalogoInstitucionResponse>> instituciones(
            @RequestParam(required = false) Integer periodoId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) EstadoAdhesion estadoAdhesion) {
        return ResponseEntity.ok(service.listarInstituciones(periodoId, q, estadoAdhesion));
    }

    @Operation(summary = "Lista paginada de clubes del catálogo con filtros por cupo, nivel y modalidad")
    @GetMapping("/clubes")
    public ResponseEntity<PaginaResponse<CatalogoClubResponse>> clubes(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Integer periodoId,
            @RequestParam(required = false) EstadoClub estado,
            @RequestParam(required = false) Boolean abiertos,
            @RequestParam(required = false) Boolean conCupo,
            @RequestParam(required = false) NivelCurso nivel,
            @RequestParam(required = false) ModalidadCurso modalidad,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano) {
        return ResponseEntity.ok(service.listarClubes(q, institucionId, periodoId, estado, abiertos, conCupo, nivel,
                modalidad, pagina, tamano));
    }

    @Operation(summary = "Detalle de un club del catálogo con sus cursos y horarios")
    @GetMapping("/clubes/{id}")
    public ResponseEntity<CatalogoClubDetalleResponse> club(@PathVariable Long id) {
        return ResponseEntity.ok(service.obtenerClub(id));
    }
}
```

## Paso 12. Compilar y reiniciar el backend

Desde la carpeta `backend`:

```bash
./mvnw spring-boot:run
```

Abre http://localhost:8080/swagger-ui.html. Deben aparecer las secciones **Autenticación**, **Recuperación de contraseña**, **Usuarios**, **Roles**, **Auditoría**, **Estudiantes**, **Autorizaciones de estudiantes**, **Historial del estudiante** y **Catálogo de clubes**, cada operación con su resumen.

## Paso 13. Comprobar el contrato

En Swagger UI, con el botón **Authorize** y tu token de administrador:

1. `POST /api/auth/login` responde `200` con el token.
2. `GET /api/estudiantes` responde `200` con la página.
3. `GET /api/estudiantes/999999` responde `404` con `Content-Type: application/problem+json`.
4. `POST /api/auth/logout` responde `204` sin cuerpo y, después, el mismo token responde `401`.

## Resultado de mis comprobaciones

Las hice en una segunda instancia en el puerto 8081, con el administrador:

| Petición | Resultado |
|---|---|
| `POST /api/auth/login` | 200 |
| `GET /api/auth/me` | 200 |
| `GET /api/estudiantes?tamano=1` | 200 |
| `GET /api/estudiantes/cursos` | 200 |
| `GET /api/usuarios?tamano=1` | 200 |
| `GET /api/roles` | 200 |
| `GET /api/auditoria?tamano=1` | 200 |
| `GET /api/estudiantes/999999` | 404 en `application/problem+json` |
| `POST /api/auth/restablecer/validar` con un token mal formado | 400 |
| `POST /api/auth/logout` | 204, 0 bytes |
| `GET /api/auth/me` con el token ya cerrado | 401 |

`GET /api/catalogo/instituciones` respondió `409` con el mensaje "No hay un período académico activo". No es un fallo del bloque: la base de datos de este equipo no tiene períodos ni clubes registrados, a diferencia de la del laboratorio.

Las pruebas automáticas nuevas (`RecuperacionControllerTest`, con 4 casos) se entregan en la guía del cierre, junto con el resto.

