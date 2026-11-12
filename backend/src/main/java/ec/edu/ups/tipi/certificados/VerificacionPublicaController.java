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
