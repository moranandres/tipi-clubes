package ec.edu.ups.tipi.opciones;

import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.opciones.dto.ClubOpcionResponse;
import ec.edu.ups.tipi.opciones.dto.OpcionResponse;
import ec.edu.ups.tipi.opciones.dto.OpcionesResponse;
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

@Tag(name = "Opciones", description = "Búsquedas ligeras para alimentar selectores y cuadros combinados")
@RestController
@RequestMapping("/api/opciones")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')")
public class OpcionesController {

    private final OpcionesService service;

    @Operation(summary = "Instituciones por nombre o código AMIE, solo con id y nombre")
    @GetMapping("/instituciones")
    public ResponseEntity<OpcionesResponse<OpcionResponse>> instituciones(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "20") int limite,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.instituciones(q, limite, usuario));
    }

    @Operation(summary = "Clubes por nombre, solo con id, nombre e institución")
    @GetMapping("/clubes")
    public ResponseEntity<OpcionesResponse<ClubOpcionResponse>> clubes(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Integer periodoId,
            @RequestParam(required = false) EstadoClub estado,
            @RequestParam(defaultValue = "20") int limite,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.clubes(q, institucionId, periodoId, estado, limite, usuario));
    }
}
