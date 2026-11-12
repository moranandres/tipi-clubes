package ec.edu.ups.tipi.historial;

import ec.edu.ups.tipi.historial.dto.HistorialResponse;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Historial del estudiante", description = "Trayectoria del estudiante en clubes, cursos, competencias y certificados")
@RestController
@RequestMapping("/api/estudiantes")
@RequiredArgsConstructor
public class HistorialController {

    private final HistorialService service;

    @Operation(summary = "Historial completo de un estudiante")
    @GetMapping("/{id}/historial")
    @PreAuthorize("hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')")
    public ResponseEntity<HistorialResponse> historial(@PathVariable Long id,
                                                       @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }
}
