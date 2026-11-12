package ec.edu.ups.tipi.clubes;

import ec.edu.ups.tipi.clubes.dto.CambioEstadoClubRequest;
import ec.edu.ups.tipi.clubes.dto.CierreClubResponse;
import ec.edu.ups.tipi.clubes.dto.ClubActualizarRequest;
import ec.edu.ups.tipi.clubes.dto.ClubCrearRequest;
import ec.edu.ups.tipi.clubes.dto.ClubResponse;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Clubes", description = "Clubes de robótica y programación, cambios de estado y cierre")
@RestController
@RequestMapping("/api/clubes")
@RequiredArgsConstructor
public class ClubController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String ESCRITURA = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL')";

    private final ClubService service;
    private final CierreClubService cierre;

    @Operation(summary = "Lista paginada de clubes dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<ClubResponse>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Integer periodoId,
            @RequestParam(required = false) EstadoClub estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(q, institucionId, periodoId, estado, pagina, tamano, usuario));
    }

    @Operation(summary = "Detalle de un club")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ClubResponse> obtener(@PathVariable Long id,
                                                @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Vista previa de los efectos de cerrar un club")
    @GetMapping("/{id}/cierre")
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<CierreClubResponse> previsualizarCierre(
            @PathVariable Long id,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(cierre.previsualizar(id, usuario));
    }

    @Operation(summary = "Crea un club en una institución")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<ClubResponse> crear(@Valid @RequestBody ClubCrearRequest request,
                                              @AuthenticationPrincipal UsuarioPrincipal usuario) {
        ClubResponse creado = service.crear(request, usuario);
        return Respuestas.creado(creado.id(), creado);
    }

    @Operation(summary = "Actualiza los datos de un club")
    @PutMapping("/{id}")
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<ClubResponse> actualizar(@PathVariable Long id,
                                                   @Valid @RequestBody ClubActualizarRequest request,
                                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(id, request, usuario));
    }

    @Operation(summary = "Cambia el estado de un club")
    @PatchMapping("/{id}/estado")
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<ClubResponse> cambiarEstado(@PathVariable Long id,
                                                      @Valid @RequestBody CambioEstadoClubRequest request,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.cambiarEstado(id, request, usuario));
    }
}
