package ec.edu.ups.tipi.cursos;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.cursos.dto.CambioEstadoCursoRequest;
import ec.edu.ups.tipi.cursos.dto.CursoActualizarRequest;
import ec.edu.ups.tipi.cursos.dto.CursoCrearRequest;
import ec.edu.ups.tipi.cursos.dto.CursoResponse;
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

@Tag(name = "Cursos", description = "Cursos de cada club, con nivel, modalidad, cupos y estado")
@RestController
@RequestMapping("/api/cursos")
@RequiredArgsConstructor
public class CursoController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL')";

    private final CursoService service;

    @Operation(summary = "Lista paginada de cursos dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<CursoResponse>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) NivelCurso nivel,
            @RequestParam(required = false) ModalidadCurso modalidad,
            @RequestParam(required = false) EstadoCurso estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(
                service.listar(q, institucionId, clubId, nivel, modalidad, estado, pagina, tamano, usuario));
    }

    @Operation(summary = "Detalle de un curso con sus horarios")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<CursoResponse> obtener(@PathVariable Long id,
                                                 @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Crea un curso en un club")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(GESTION)
    public ResponseEntity<CursoResponse> crear(@Valid @RequestBody CursoCrearRequest request,
                                               @AuthenticationPrincipal UsuarioPrincipal usuario) {
        CursoResponse creado = service.crear(request, usuario);
        return Respuestas.creado(creado.id(), creado);
    }

    @Operation(summary = "Actualiza los datos de un curso")
    @PutMapping("/{id}")
    @PreAuthorize(GESTION)
    public ResponseEntity<CursoResponse> actualizar(@PathVariable Long id,
                                                    @Valid @RequestBody CursoActualizarRequest request,
                                                    @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(id, request, usuario));
    }

    @Operation(summary = "Cambia el estado de un curso")
    @PatchMapping("/{id}/estado")
    @PreAuthorize(GESTION)
    public ResponseEntity<CursoResponse> cambiarEstado(@PathVariable Long id,
                                                       @Valid @RequestBody CambioEstadoCursoRequest request,
                                                       @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.cambiarEstado(id, request, usuario));
    }

    @Operation(summary = "Elimina un curso sin inscripciones")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(GESTION)
    public ResponseEntity<Void> eliminar(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        service.eliminar(id, usuario);
        return Respuestas.sinContenido();
    }
}
