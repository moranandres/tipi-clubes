package ec.edu.ups.tipi.recuperacion;

import ec.edu.ups.tipi.recuperacion.dto.RecuperarRequest;
import ec.edu.ups.tipi.recuperacion.dto.RestablecerRequest;
import ec.edu.ups.tipi.recuperacion.dto.ValidarTokenRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class RecuperacionController {

    private final RecuperacionService service;

    @PostMapping("/recuperar")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void recuperar(@Valid @RequestBody RecuperarRequest request, HttpServletRequest peticion) {
        service.solicitar(request.identificador(), peticion.getRemoteAddr());
    }

    @PostMapping("/restablecer/validar")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void validar(@Valid @RequestBody ValidarTokenRequest request) {
        service.validar(request.token());
    }

    @PostMapping("/restablecer")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void restablecer(@Valid @RequestBody RestablecerRequest request) {
        service.restablecer(request.token(), request.passwordNueva());
    }
}