package ec.edu.ups.tipi.panel;

import ec.edu.ups.tipi.panel.dto.PanelResumenResponse;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Panel", description = "Resumen del panel principal según el rol y la institución del usuario")
@RestController
@RequestMapping("/api/panel")
@RequiredArgsConstructor
public class PanelController {

    private final PanelService service;

    @Operation(summary = "Indicadores, pendientes y semáforo de seguimiento del usuario autenticado")
    @GetMapping("/resumen")
    @PreAuthorize("hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')")
    public ResponseEntity<PanelResumenResponse> resumen(@AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(service.resumen(usuario));
    }
}
