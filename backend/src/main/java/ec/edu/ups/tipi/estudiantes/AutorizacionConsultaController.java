package ec.edu.ups.tipi.estudiantes;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.estudiantes.dto.AutorizacionListadoResponse;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Autorizaciones de estudiantes", description = "Autorizaciones de participación y de uso de imagen, con su documento de respaldo")
@RestController
@RequestMapping("/api/autorizaciones")
@RequiredArgsConstructor
public class AutorizacionConsultaController {

    static final String ROLES_CON_ACCESO = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";

    private final AutorizacionConsultaService service;

    @Operation(summary = "Lista paginada de autorizaciones dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize(ROLES_CON_ACCESO)
    public ResponseEntity<PaginaResponse<AutorizacionListadoResponse>> listar(
            @RequestParam(required = false) EstadoAutorizacion estado,
            @RequestParam(required = false) TipoAutorizacion tipo,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long estudianteId,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(estado, tipo, institucionId, estudianteId, pagina, tamano, usuario));
    }
}
