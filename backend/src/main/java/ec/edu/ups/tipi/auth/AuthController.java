package ec.edu.ups.tipi.auth;

import ec.edu.ups.tipi.auth.dto.CambiarPasswordRequest;
import ec.edu.ups.tipi.auth.dto.LoginRequest;
import ec.edu.ups.tipi.auth.dto.LoginResponse;
import ec.edu.ups.tipi.auth.dto.UsuarioResumen;
import ec.edu.ups.tipi.security.JwtAuthFilter;
import ec.edu.ups.tipi.security.TokenValidado;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public UsuarioResumen me(@AuthenticationPrincipal UsuarioPrincipal principal) {
        return UsuarioResumen.de(principal.getUsuario());
    }

    @PostMapping("/cambiar-password")
    public LoginResponse cambiarPassword(@AuthenticationPrincipal UsuarioPrincipal principal,
                                         @Valid @RequestBody CambiarPasswordRequest request) {
        return authService.cambiarPassword(principal, request);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@AuthenticationPrincipal UsuarioPrincipal principal,
                       @RequestAttribute(JwtAuthFilter.ATRIBUTO_TOKEN) TokenValidado token) {
        authService.logout(principal, token);
    }

    @PostMapping("/cerrar-sesiones")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cerrarSesiones(@AuthenticationPrincipal UsuarioPrincipal principal) {
        authService.cerrarSesiones(principal);
    }
}