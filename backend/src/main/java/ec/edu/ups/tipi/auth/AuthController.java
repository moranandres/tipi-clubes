package ec.edu.ups.tipi.auth;

import ec.edu.ups.tipi.auth.dto.LoginRequest;
import ec.edu.ups.tipi.auth.dto.LoginResponse;
import ec.edu.ups.tipi.auth.dto.UsuarioResumen;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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

    /** Endpoint protegido para comprobar que el token funciona. */
    @GetMapping("/me")
    public UsuarioResumen me(@AuthenticationPrincipal UsuarioPrincipal principal) {
        return UsuarioResumen.de(principal.getUsuario());
    }
}