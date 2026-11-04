package ec.edu.ups.tipi.cursos;

import ec.edu.ups.tipi.cursos.dto.HorarioRequest;
import ec.edu.ups.tipi.cursos.dto.HorarioResponse;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cursos/{cursoId}/horarios")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','RESP_INSTITUCIONAL')")
public class HorarioController {

    private final HorarioService service;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public HorarioResponse crear(@PathVariable Long cursoId,
                                 @Valid @RequestBody HorarioRequest request,
                                 @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.crear(cursoId, request, usuario);
    }

    @PutMapping("/{horarioId}")
    public HorarioResponse actualizar(@PathVariable Long cursoId,
                                      @PathVariable Long horarioId,
                                      @Valid @RequestBody HorarioRequest request,
                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.actualizar(cursoId, horarioId, request, usuario);
    }

    @DeleteMapping("/{horarioId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long cursoId,
                         @PathVariable Long horarioId,
                         @AuthenticationPrincipal UsuarioPrincipal usuario) {
        service.eliminar(cursoId, horarioId, usuario);
    }
}