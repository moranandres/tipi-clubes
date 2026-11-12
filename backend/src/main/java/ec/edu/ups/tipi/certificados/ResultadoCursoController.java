package ec.edu.ups.tipi.certificados;

import ec.edu.ups.tipi.certificados.dto.ParticipanteCursoResponse;
import ec.edu.ups.tipi.certificados.dto.ParticipanteCursoVista;
import ec.edu.ups.tipi.certificados.dto.ResultadoCursoRequest;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Resultados de curso", description = "Participantes de un curso y registro de su resultado final")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ResultadoCursoController {

    private final ResultadoCursoService service;

    @Operation(summary = "Participantes de un curso con su resultado")
    @GetMapping("/cursos/{cursoId}/participantes")
    @PreAuthorize("hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')")
    public ResponseEntity<List<ParticipanteCursoVista>> participantes(
            @PathVariable Long cursoId,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.participantes(cursoId, usuario));
    }

    @Operation(summary = "Registra el resultado final de un participante en un curso")
    @PatchMapping("/inscripciones-curso/{id}/resultado")
    @PreAuthorize("hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')")
    public ResponseEntity<ParticipanteCursoResponse> registrarResultado(
            @PathVariable Long id,
            @RequestBody ResultadoCursoRequest request,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.registrarResultado(id, request, usuario));
    }
}
