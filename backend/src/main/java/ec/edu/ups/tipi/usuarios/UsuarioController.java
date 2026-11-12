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
