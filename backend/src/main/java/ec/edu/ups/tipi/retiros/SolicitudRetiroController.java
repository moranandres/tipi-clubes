package ec.edu.ups.tipi.retiros;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.inscripciones.dto.MotivoRequest;
import ec.edu.ups.tipi.retiros.dto.EfectosRetiroResponse;
import ec.edu.ups.tipi.retiros.dto.RetiroAprobarRequest;
import ec.edu.ups.tipi.retiros.dto.RetiroCrearRequest;
import ec.edu.ups.tipi.retiros.dto.RetiroResponse;
import ec.edu.ups.tipi.retiros.dto.RetiroVista;
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

@Tag(name = "Solicitudes de retiro", description = "Solicitudes de retiro de un club: registro, efectos, aprobación, rechazo y cancelación")
@RestController
@RequestMapping("/api/solicitudes-retiro")
@RequiredArgsConstructor
public class SolicitudRetiroController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String REGISTRO = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String RESOLUCION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL')";

    private final SolicitudRetiroService service;

    @Operation(summary = "Lista paginada de solicitudes de retiro dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<RetiroVista>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) EstadoRetiro estado,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) Long estudianteId,
            @RequestParam(required = false) Long inscripcionId,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(q, estado, institucionId, clubId, estudianteId, inscripcionId,
                pagina, tamano, usuario));
    }

    @Operation(summary = "Detalle de una solicitud de retiro")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<RetiroVista> obtener(@PathVariable Long id,
                                               @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Efectos que tendría aprobar el retiro: cursos afectados y cupos liberados")
    @GetMapping("/{id}/efectos")
    @PreAuthorize(RESOLUCION)
    public ResponseEntity<EfectosRetiroResponse> efectos(@PathVariable Long id,
                                                         @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.efectos(id, usuario));
    }

    @Operation(summary = "Registra una solicitud de retiro")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(REGISTRO)
    public ResponseEntity<RetiroResponse> crear(@Valid @RequestBody RetiroCrearRequest request,
                                                @AuthenticationPrincipal UsuarioPrincipal usuario) {
        RetiroResponse creado = service.crear(request, usuario);
        return Respuestas.creado(creado.id(), creado);
    }

    @Operation(summary = "Aprueba un retiro y libera los cupos")
    @PatchMapping("/{id}/aprobacion")
    @PreAuthorize(RESOLUCION)
    public ResponseEntity<RetiroResponse> aprobar(@PathVariable Long id,
                                                  @Valid @RequestBody(required = false) RetiroAprobarRequest request,
                                                  @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.aprobar(id, request, usuario));
    }

    @Operation(summary = "Rechaza un retiro indicando el motivo")
    @PatchMapping("/{id}/rechazo")
    @PreAuthorize(RESOLUCION)
    public ResponseEntity<RetiroResponse> rechazar(@PathVariable Long id,
                                                   @Valid @RequestBody MotivoRequest request,
                                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.rechazar(id, request, usuario));
    }

    @Operation(summary = "Cancela una solicitud de retiro indicando el motivo")
    @PatchMapping("/{id}/cancelacion")
    @PreAuthorize(REGISTRO)
    public ResponseEntity<RetiroResponse> cancelar(@PathVariable Long id,
                                                   @Valid @RequestBody MotivoRequest request,
                                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.cancelar(id, request, usuario));
    }
}
