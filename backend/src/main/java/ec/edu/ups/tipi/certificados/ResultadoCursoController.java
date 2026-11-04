package ec.edu.ups.tipi.certificados;

import ec.edu.ups.tipi.certificados.dto.ParticipanteCursoResponse;
import ec.edu.ups.tipi.certificados.dto.ParticipanteCursoVista;
import ec.edu.ups.tipi.certificados.dto.ResultadoCursoRequest;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ResultadoCursoController {

    private final ResultadoCursoService service;

    @GetMapping("/cursos/{cursoId}/participantes")
    @PreAuthorize("hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')")
    public List<ParticipanteCursoVista> participantes(@PathVariable Long cursoId,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.participantes(cursoId, usuario);
    }

    @PatchMapping("/inscripciones-curso/{id}/resultado")
    @PreAuthorize("hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')")
    public ParticipanteCursoResponse registrarResultado(@PathVariable Long id,
                                                        @RequestBody ResultadoCursoRequest request,
                                                        @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.registrarResultado(id, request, usuario);
    }
}
