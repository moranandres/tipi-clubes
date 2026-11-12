package ec.edu.ups.tipi.cursos;

import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.cursos.dto.HorarioRequest;
import ec.edu.ups.tipi.cursos.dto.HorarioResponse;
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

@Tag(name = "Horarios de curso", description = "Días y horas en que se dicta cada curso")
@RestController
@RequestMapping("/api/cursos/{cursoId}/horarios")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','RESP_INSTITUCIONAL')")
public class HorarioController {

    private final HorarioService service;

    @Operation(summary = "Agrega un horario a un curso")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<HorarioResponse> crear(@PathVariable Long cursoId,
                                                 @Valid @RequestBody HorarioRequest request,
                                                 @AuthenticationPrincipal UsuarioPrincipal usuario) {
        HorarioResponse creado = service.crear(cursoId, request, usuario);
        return Respuestas.creado(creado.id(), creado);
    }

    @Operation(summary = "Actualiza un horario de un curso")
    @PutMapping("/{horarioId}")
    public ResponseEntity<HorarioResponse> actualizar(@PathVariable Long cursoId,
                                                      @PathVariable Long horarioId,
                                                      @Valid @RequestBody HorarioRequest request,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(cursoId, horarioId, request, usuario));
    }

    @Operation(summary = "Elimina un horario de un curso")
    @DeleteMapping("/{horarioId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> eliminar(@PathVariable Long cursoId,
                                         @PathVariable Long horarioId,
                                         @AuthenticationPrincipal UsuarioPrincipal usuario) {
        service.eliminar(cursoId, horarioId, usuario);
        return Respuestas.sinContenido();
    }
}
