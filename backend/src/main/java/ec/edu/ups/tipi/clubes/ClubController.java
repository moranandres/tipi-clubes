package ec.edu.ups.tipi.clubes;

import ec.edu.ups.tipi.clubes.dto.ClubActualizarRequest;
import ec.edu.ups.tipi.clubes.dto.ClubCrearRequest;
import ec.edu.ups.tipi.clubes.dto.ClubResponse;
import ec.edu.ups.tipi.clubes.dto.CambioEstadoClubRequest;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/clubes")
@RequiredArgsConstructor
public class ClubController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String ESCRITURA = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL')";

    private final ClubService service;

    @GetMapping
    @PreAuthorize(LECTURA)
    public PaginaResponse<ClubResponse> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Integer periodoId,
            @RequestParam(required = false) EstadoClub estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.listar(q, institucionId, periodoId, estado, pagina, tamano, usuario);
    }

    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ClubResponse obtener(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.obtener(id, usuario);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(ESCRITURA)
    public ClubResponse crear(@Valid @RequestBody ClubCrearRequest request,
                              @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.crear(request, usuario);
    }

    @PutMapping("/{id}")
    @PreAuthorize(ESCRITURA)
    public ClubResponse actualizar(@PathVariable Long id,
                                   @Valid @RequestBody ClubActualizarRequest request,
                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.actualizar(id, request, usuario);
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize(ESCRITURA)
    public ClubResponse cambiarEstado(@PathVariable Long id,
                                      @Valid @RequestBody CambioEstadoClubRequest request,
                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.cambiarEstado(id, request, usuario);
    }
}