package ec.edu.ups.tipi.publico;

import ec.edu.ups.tipi.publico.dto.EstadisticasPublicasResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Público", description = "Información agregada del proyecto disponible sin iniciar sesión")
@RestController
@RequestMapping("/api/publico/estadisticas")
@RequiredArgsConstructor
public class EstadisticasPublicasController {

    private final EstadisticasPublicasService service;

    @Operation(summary = "Cifras agregadas del proyecto TIPI 3.0, sin datos personales")
    @SecurityRequirements
    @GetMapping
    public ResponseEntity<EstadisticasPublicasResponse> obtener() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(service.vigencia()).cachePublic())
                .body(service.obtener());
    }
}
