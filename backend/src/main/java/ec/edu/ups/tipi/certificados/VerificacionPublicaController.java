package ec.edu.ups.tipi.certificados;

import ec.edu.ups.tipi.certificados.dto.VerificacionPublicaResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/publico/certificados")
@RequiredArgsConstructor
public class VerificacionPublicaController {

    private final CertificadoService service;

    @GetMapping("/{codigo}")
    public ResponseEntity<VerificacionPublicaResponse> verificar(@PathVariable String codigo) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(service.verificarPublico(codigo));
    }
}
