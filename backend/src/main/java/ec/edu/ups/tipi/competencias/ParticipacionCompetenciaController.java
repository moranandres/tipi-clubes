package ec.edu.ups.tipi.competencias;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.competencias.dto.ParticipacionActualizarRequest;
import ec.edu.ups.tipi.competencias.dto.ParticipacionCrearRequest;
import ec.edu.ups.tipi.competencias.dto.ParticipacionResponse;
import ec.edu.ups.tipi.competencias.dto.ParticipacionVista;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/participaciones-competencia")
@RequiredArgsConstructor
public class ParticipacionCompetenciaController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String REGISTRO = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";

    private final ParticipacionCompetenciaService service;

    @GetMapping
    @PreAuthorize(LECTURA)
    public PaginaResponse<ParticipacionVista> listar(
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
        return service.listar(q, institucionId, clubId, estudianteId, competenciaId, edicionId, categoriaId, nivel,
                equipo, pagina, tamano, usuario);
    }

    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ParticipacionVista obtener(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.obtener(id, usuario);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(REGISTRO)
    public ParticipacionResponse crear(@Valid @RequestBody ParticipacionCrearRequest request,
                                       @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.crear(request, usuario);
    }

    @PutMapping("/{id}")
    @PreAuthorize(REGISTRO)
    public ParticipacionResponse actualizar(@PathVariable Long id,
                                            @Valid @RequestBody ParticipacionActualizarRequest request,
                                            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.actualizar(id, request, usuario);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(REGISTRO)
    public void eliminar(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        service.eliminar(id, usuario);
    }
}
