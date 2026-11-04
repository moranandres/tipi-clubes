package ec.edu.ups.tipi.cursos;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.cursos.dto.CambioEstadoCursoRequest;
import ec.edu.ups.tipi.cursos.dto.CursoActualizarRequest;
import ec.edu.ups.tipi.cursos.dto.CursoCrearRequest;
import ec.edu.ups.tipi.cursos.dto.CursoResponse;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cursos")
@RequiredArgsConstructor
public class CursoController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL')";

    private final CursoService service;

    @GetMapping
    @PreAuthorize(LECTURA)
    public PaginaResponse<CursoResponse> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) NivelCurso nivel,
            @RequestParam(required = false) ModalidadCurso modalidad,
            @RequestParam(required = false) EstadoCurso estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.listar(q, institucionId, clubId, nivel, modalidad, estado, pagina, tamano, usuario);
    }

    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public CursoResponse obtener(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.obtener(id, usuario);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(GESTION)
    public CursoResponse crear(@Valid @RequestBody CursoCrearRequest request,
                               @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.crear(request, usuario);
    }

    @PutMapping("/{id}")
    @PreAuthorize(GESTION)
    public CursoResponse actualizar(@PathVariable Long id,
                                    @Valid @RequestBody CursoActualizarRequest request,
                                    @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.actualizar(id, request, usuario);
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize(GESTION)
    public CursoResponse cambiarEstado(@PathVariable Long id,
                                       @Valid @RequestBody CambioEstadoCursoRequest request,
                                       @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.cambiarEstado(id, request, usuario);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(GESTION)
    public void eliminar(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        service.eliminar(id, usuario);
    }
}