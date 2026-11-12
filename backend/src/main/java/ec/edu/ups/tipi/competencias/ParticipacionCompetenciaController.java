package ec.edu.ups.tipi.competencias;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.competencias.dto.ParticipacionActualizarRequest;
import ec.edu.ups.tipi.competencias.dto.ParticipacionCrearRequest;
import ec.edu.ups.tipi.competencias.dto.ParticipacionResponse;
import ec.edu.ups.tipi.competencias.dto.ParticipacionVista;
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

@Tag(name = "Participaciones en competencias", description = "Participación de los estudiantes en ediciones y categorías de competencias")
@RestController
@RequestMapping("/api/participaciones-competencia")
@RequiredArgsConstructor
public class ParticipacionCompetenciaController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String REGISTRO = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";

    private final ParticipacionCompetenciaService service;

    @Operation(summary = "Lista paginada de participaciones dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<ParticipacionVista>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) Long estudianteId,
            @RequestParam(required = false) Integer competenciaId,
            @RequestParam(required = false) Integer edicionId,
            @RequestParam(required = false) Integer categoriaId,
            @RequestParam(required = false) NivelCategoria nivel,
            @RequestParam(required = false) String equipo,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(q, institucionId, clubId, estudianteId, competenciaId, edicionId,
                categoriaId, nivel, equipo, pagina, tamano, usuario));
    }

    @Operation(summary = "Detalle de una participación")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ParticipacionVista> obtener(@PathVariable Long id,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Registra la participación de un estudiante en una competencia")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(REGISTRO)
    public ResponseEntity<ParticipacionResponse> crear(@Valid @RequestBody ParticipacionCrearRequest request,
                                                       @AuthenticationPrincipal UsuarioPrincipal usuario) {
        ParticipacionResponse creada = service.crear(request, usuario);
        return Respuestas.creado(creada.id(), creada);
    }

    @Operation(summary = "Actualiza una participación y su resultado")
    @PutMapping("/{id}")
    @PreAuthorize(REGISTRO)
    public ResponseEntity<ParticipacionResponse> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody ParticipacionActualizarRequest request,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(id, request, usuario));
    }

    @Operation(summary = "Elimina una participación")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(REGISTRO)
    public ResponseEntity<Void> eliminar(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        service.eliminar(id, usuario);
        return Respuestas.sinContenido();
    }
}
