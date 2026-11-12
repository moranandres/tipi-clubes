package ec.edu.ups.tipi.inscripciones;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.cursos.NivelCurso;
import ec.edu.ups.tipi.inscripciones.dto.MotivoRequest;
import ec.edu.ups.tipi.inscripciones.dto.SolicitudAprobarRequest;
import ec.edu.ups.tipi.inscripciones.dto.SolicitudCrearRequest;
import ec.edu.ups.tipi.inscripciones.dto.SolicitudResponse;
import ec.edu.ups.tipi.inscripciones.dto.SolicitudVista;
import ec.edu.ups.tipi.inscripciones.dto.VerificacionResponse;
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

@Tag(name = "Solicitudes de inscripción", description = "Solicitudes de inscripción a clubes: registro, verificación, aprobación, rechazo y cancelación")
@RestController
@RequestMapping("/api/solicitudes-inscripcion")
@RequiredArgsConstructor
public class SolicitudInscripcionController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String REGISTRO = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String RESOLUCION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL')";

    private final SolicitudInscripcionService service;
    private final VerificacionSolicitudService verificacion;

    @Operation(summary = "Lista paginada de solicitudes de inscripción dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<SolicitudVista>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) EstadoSolicitud estado,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) Long cursoId,
            @RequestParam(required = false) Long estudianteId,
            @RequestParam(required = false) NivelCurso nivel,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(q, estado, institucionId, clubId, cursoId, estudianteId, nivel,
                pagina, tamano, usuario));
    }

    @Operation(summary = "Detalle de una solicitud de inscripción")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<SolicitudVista> obtener(@PathVariable Long id,
                                                  @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Verifica los requisitos de una solicitud antes de aprobarla")
    @GetMapping("/{id}/verificacion")
    @PreAuthorize(RESOLUCION)
    public ResponseEntity<VerificacionResponse> verificar(@PathVariable Long id,
                                                          @RequestParam(required = false) Long cursoId,
                                                          @RequestParam(required = false) NivelCurso nivelAsignado,
                                                          @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(verificacion.verificar(id, cursoId, nivelAsignado, usuario));
    }

    @Operation(summary = "Registra una solicitud de inscripción")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(REGISTRO)
    public ResponseEntity<SolicitudResponse> crear(@Valid @RequestBody SolicitudCrearRequest request,
                                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        SolicitudResponse creada = service.crear(request, usuario);
        return Respuestas.creado(creada.id(), creada);
    }

    @Operation(summary = "Pone una solicitud en revisión")
    @PatchMapping("/{id}/revision")
    @PreAuthorize(RESOLUCION)
    public ResponseEntity<SolicitudResponse> tomarEnRevision(@PathVariable Long id,
                                                             @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.tomarEnRevision(id, usuario));
    }

    @Operation(summary = "Aprueba una solicitud y genera la inscripción")
    @PatchMapping("/{id}/aprobacion")
    @PreAuthorize(RESOLUCION)
    public ResponseEntity<SolicitudResponse> aprobar(@PathVariable Long id,
                                                     @Valid @RequestBody SolicitudAprobarRequest request,
                                                     @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.aprobar(id, request, usuario));
    }

    @Operation(summary = "Rechaza una solicitud indicando el motivo")
    @PatchMapping("/{id}/rechazo")
    @PreAuthorize(RESOLUCION)
    public ResponseEntity<SolicitudResponse> rechazar(@PathVariable Long id,
                                                      @Valid @RequestBody MotivoRequest request,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.rechazar(id, request, usuario));
    }

    @Operation(summary = "Cancela una solicitud indicando el motivo")
    @PatchMapping("/{id}/cancelacion")
    @PreAuthorize(REGISTRO)
    public ResponseEntity<SolicitudResponse> cancelar(@PathVariable Long id,
                                                      @Valid @RequestBody MotivoRequest request,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.cancelar(id, request, usuario));
    }
}
