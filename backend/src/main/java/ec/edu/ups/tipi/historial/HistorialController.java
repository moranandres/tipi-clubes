package ec.edu.ups.tipi.historial;

import ec.edu.ups.tipi.historial.dto.HistorialResponse;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/estudiantes")
@RequiredArgsConstructor
public class HistorialController {

    private final HistorialService service;

    @GetMapping("/{id}/historial")
    @PreAuthorize("hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')")
    public HistorialResponse historial(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.obtener(id, usuario);
    }
}
