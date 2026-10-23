package ec.edu.ups.tipi.estudiantes;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.estudiantes.dto.CambioEstadoEstudianteRequest;
import ec.edu.ups.tipi.estudiantes.dto.CursoResponse;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteActualizarRequest;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteCrearRequest;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteResponse;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteVista;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/estudiantes")
@RequiredArgsConstructor
public class EstudianteController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String ESCRITURA = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL')";

    private final EstudianteService service;

    @GetMapping("/cursos")
    @PreAuthorize(LECTURA)
    public List<CursoResponse> cursos() {
        return Arrays.stream(CursoEducativo.values()).map(CursoResponse::de).toList();
    }

    @GetMapping
    @PreAuthorize(LECTURA)
    public PaginaResponse<EstudianteVista> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) CursoEducativo curso,
            @RequestParam(required = false) EstadoEstudiante estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.listar(q, institucionId, curso, estado, pagina, tamano, usuario);
    }

    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public EstudianteVista obtener(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.obtener(id, usuario);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(ESCRITURA)
    public EstudianteResponse crear(@Valid @RequestBody EstudianteCrearRequest request,
                                    @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.crear(request, usuario);
    }

    @PutMapping("/{id}")
    @PreAuthorize(ESCRITURA)
    public EstudianteResponse actualizar(@PathVariable Long id,
                                         @Valid @RequestBody EstudianteActualizarRequest request,
                                         @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.actualizar(id, request, usuario);
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize(GESTION)
    public EstudianteVista cambiarEstado(@PathVariable Long id,
                                         @Valid @RequestBody CambioEstadoEstudianteRequest request,
                                         @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.cambiarEstado(id, request.estado(), usuario);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(GESTION)
    public void eliminar(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        service.eliminar(id, usuario);
    }
}