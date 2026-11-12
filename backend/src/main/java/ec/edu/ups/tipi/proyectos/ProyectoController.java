package ec.edu.ups.tipi.proyectos;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.proyectos.dto.CancelacionProyectoRequest;
import ec.edu.ups.tipi.proyectos.dto.EvidenciasProyectoRequest;
import ec.edu.ups.tipi.proyectos.dto.FinalizacionProyectoRequest;
import ec.edu.ups.tipi.proyectos.dto.ProyectoActualizarRequest;
import ec.edu.ups.tipi.proyectos.dto.ProyectoCrearRequest;
import ec.edu.ups.tipi.proyectos.dto.ProyectoResponse;
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

@Tag(name = "Proyectos", description = "Proyectos de los estudiantes: registro, evidencias vinculadas, finalización y cancelación")
@RestController
@RequestMapping("/api/proyectos")
@RequiredArgsConstructor
public class ProyectoController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";

    private final ProyectoService service;

    @Operation(summary = "Lista paginada de proyectos dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<ProyectoResponse>> listar(
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) Long estudianteId,
            @RequestParam(required = false) Long docenteId,
            @RequestParam(required = false) EstadoProyecto estado,
            @RequestParam(required = false) TipoProyecto tipo,
            @RequestParam(required = false) Integer periodoId,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(institucionId, clubId, estudianteId, docenteId, estado, tipo,
                periodoId, pagina, tamano, usuario));
    }

    @Operation(summary = "Detalle de un proyecto")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ProyectoResponse> obtener(@PathVariable Long id,
                                                    @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Registra un proyecto")
    @PostMapping
    @PreAuthorize(GESTION)
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<ProyectoResponse> registrar(@Valid @RequestBody ProyectoCrearRequest request,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        ProyectoResponse creado = service.registrar(request, usuario);
        return Respuestas.creado(creado.id(), creado);
    }

    @Operation(summary = "Actualiza los datos de un proyecto")
    @PutMapping("/{id}")
    @PreAuthorize(GESTION)
    public ResponseEntity<ProyectoResponse> actualizar(@PathVariable Long id,
                                                       @Valid @RequestBody ProyectoActualizarRequest request,
                                                       @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(id, request, usuario));
    }

    @Operation(summary = "Define las evidencias vinculadas a un proyecto")
    @PutMapping("/{id}/evidencias")
    @PreAuthorize(GESTION)
    public ResponseEntity<ProyectoResponse> vincularEvidencias(
            @PathVariable Long id,
            @Valid @RequestBody EvidenciasProyectoRequest request,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.vincularEvidencias(id, request, usuario));
    }

    @Operation(summary = "Finaliza un proyecto con su resultado")
    @PostMapping("/{id}/finalizacion")
    @PreAuthorize(GESTION)
    public ResponseEntity<ProyectoResponse> finalizar(@PathVariable Long id,
                                                      @Valid @RequestBody FinalizacionProyectoRequest request,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.finalizar(id, request, usuario));
    }

    @Operation(summary = "Cancela un proyecto indicando el motivo")
    @PostMapping("/{id}/cancelacion")
    @PreAuthorize(GESTION)
    public ResponseEntity<ProyectoResponse> cancelar(@PathVariable Long id,
                                                     @Valid @RequestBody CancelacionProyectoRequest request,
                                                     @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.cancelar(id, request, usuario));
    }
}
