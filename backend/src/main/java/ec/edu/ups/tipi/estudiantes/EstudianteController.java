package ec.edu.ups.tipi.estudiantes;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.estudiantes.dto.CambioEstadoEstudianteRequest;
import ec.edu.ups.tipi.estudiantes.dto.CursoResponse;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteActualizarRequest;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteCrearRequest;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteResponse;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteVista;
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

import java.util.Arrays;
import java.util.List;

@Tag(name = "Estudiantes", description = "Estudiantes de las instituciones, su estado y su curso educativo")
@RestController
@RequestMapping("/api/estudiantes")
@RequiredArgsConstructor
public class EstudianteController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String ESCRITURA = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL')";

    private final EstudianteService service;

    @Operation(summary = "Catálogo de cursos educativos (grados y años de bachillerato)")
    @GetMapping("/cursos")
    @PreAuthorize(LECTURA)
    public ResponseEntity<List<CursoResponse>> cursos() {
        return ResponseEntity.ok(Arrays.stream(CursoEducativo.values()).map(CursoResponse::de).toList());
    }

    @Operation(summary = "Lista paginada de estudiantes dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<EstudianteVista>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) CursoEducativo curso,
            @RequestParam(required = false) EstadoEstudiante estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(q, institucionId, curso, estado, pagina, tamano, usuario));
    }

    @Operation(summary = "Detalle de un estudiante")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<EstudianteVista> obtener(@PathVariable Long id,
                                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Registra un estudiante")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<EstudianteResponse> crear(@Valid @RequestBody EstudianteCrearRequest request,
                                                    @AuthenticationPrincipal UsuarioPrincipal usuario) {
        EstudianteResponse creado = service.crear(request, usuario);
        return Respuestas.creado(creado.id(), creado);
    }

    @Operation(summary = "Actualiza los datos de un estudiante")
    @PutMapping("/{id}")
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<EstudianteResponse> actualizar(@PathVariable Long id,
                                                         @Valid @RequestBody EstudianteActualizarRequest request,
                                                         @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(id, request, usuario));
    }

    @Operation(summary = "Cambia el estado de un estudiante")
    @PatchMapping("/{id}/estado")
    @PreAuthorize(GESTION)
    public ResponseEntity<EstudianteVista> cambiarEstado(@PathVariable Long id,
                                                         @Valid @RequestBody CambioEstadoEstudianteRequest request,
                                                         @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.cambiarEstado(id, request.estado(), usuario));
    }

    @Operation(summary = "Elimina un estudiante sin registros asociados")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(GESTION)
    public ResponseEntity<Void> eliminar(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        service.eliminar(id, usuario);
        return Respuestas.sinContenido();
    }
}
