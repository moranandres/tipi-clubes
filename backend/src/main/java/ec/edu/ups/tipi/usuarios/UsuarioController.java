package ec.edu.ups.tipi.usuarios;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.usuarios.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UsuarioController {

    private final UsuarioService service;

    @GetMapping
    public PaginaResponse<UsuarioDetalleResponse> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String rol,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Boolean activo,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano) {
        return service.listar(q, rol, institucionId, activo, pagina, tamano);
    }

    @GetMapping("/{id}")
    public UsuarioDetalleResponse obtener(@PathVariable Long id) {
        return service.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioDetalleResponse crear(@Valid @RequestBody UsuarioCrearRequest request) {
        return service.crear(request);
    }

    @PutMapping("/{id}")
    public UsuarioDetalleResponse actualizar(@PathVariable Long id,
                                             @Valid @RequestBody UsuarioActualizarRequest request) {
        return service.actualizar(id, request);
    }

    @PatchMapping("/{id}/estado")
    public UsuarioDetalleResponse cambiarEstado(@PathVariable Long id,
                                                @Valid @RequestBody EstadoRequest request) {
        return service.cambiarEstado(id, request.activo());
    }

    @PostMapping("/{id}/restablecer-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void restablecerPassword(@PathVariable Long id,
                                    @Valid @RequestBody PasswordTemporalRequest request) {
        service.restablecerPassword(id, request.passwordTemporal());
    }
}