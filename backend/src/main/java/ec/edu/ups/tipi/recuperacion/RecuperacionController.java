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
