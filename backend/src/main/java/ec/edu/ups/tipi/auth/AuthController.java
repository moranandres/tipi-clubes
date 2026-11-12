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
