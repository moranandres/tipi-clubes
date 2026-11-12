package ec.edu.ups.tipi.actividades;

import ec.edu.ups.tipi.actividades.dto.ActividadActualizarRequest;
import ec.edu.ups.tipi.actividades.dto.ActividadCrearRequest;
import ec.edu.ups.tipi.actividades.dto.ActividadResponse;
import ec.edu.ups.tipi.actividades.dto.CancelacionActividadRequest;
import ec.edu.ups.tipi.actividades.dto.EjecucionActividadRequest;
import ec.edu.ups.tipi.actividades.dto.ReprogramacionResponse;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Tag(name = "Actividades", description = "Sesiones de los clubes: planificación, ejecución, reprogramación y cancelación")
@RestController
@RequestMapping("/api/actividades")
@RequiredArgsConstructor
public class ActividadController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";

    private final ActividadService service;

    @Operation(summary = "Lista paginada de actividades dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<ActividadResponse>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) Long cursoId,
            @RequestParam(required = false) Long responsableId,
            @RequestParam(required = false) EstadoActividad estado,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "false") boolean pendientes,
            @RequestParam(defaultValue = "false") boolean ascendente,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(q, institucionId, clubId, cursoId, responsableId, estado, desde,
                hasta, pendientes, ascendente, pagina, tamano, usuario));
    }

    @Operation(summary = "Detalle de una actividad")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ActividadResponse> obtener(@PathVariable Long id,
                                                     @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Historial de reprogramaciones de una actividad")
    @GetMapping("/{id}/reprogramaciones")
    @PreAuthorize(LECTURA)
    public ResponseEntity<List<ReprogramacionResponse>> reprogramaciones(
            @PathVariable Long id,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.reprogramaciones(id, usuario));
    }

    @Operation(summary = "Planifica una actividad")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(GESTION)
    public ResponseEntity<ActividadResponse> crear(@Valid @RequestBody ActividadCrearRequest request,
                                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        ActividadResponse creada = service.crear(request, usuario);
        return Respuestas.creado(creada.id(), creada);
    }

    @Operation(summary = "Actualiza o reprograma una actividad")
    @PutMapping("/{id}")
    @PreAuthorize(GESTION)
    public ResponseEntity<ActividadResponse> actualizar(@PathVariable Long id,
                                                        @Valid @RequestBody ActividadActualizarRequest request,
                                                        @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(id, request, usuario));
    }

    @Operation(summary = "Registra la ejecución de una actividad")
    @PutMapping("/{id}/ejecucion")
    @PreAuthorize(GESTION)
    public ResponseEntity<ActividadResponse> registrarEjecucion(
            @PathVariable Long id,
            @Valid @RequestBody EjecucionActividadRequest request,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.registrarEjecucion(id, request, usuario));
    }

    @Operation(summary = "Cancela una actividad indicando el motivo")
    @PatchMapping("/{id}/cancelacion")
    @PreAuthorize(GESTION)
    public ResponseEntity<ActividadResponse> cancelar(@PathVariable Long id,
                                                      @Valid @RequestBody CancelacionActividadRequest request,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.cancelar(id, request, usuario));
    }

    @Operation(summary = "Elimina una actividad sin registros asociados")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(GESTION)
    public ResponseEntity<Void> eliminar(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        service.eliminar(id, usuario);
        return Respuestas.sinContenido();
    }
}
