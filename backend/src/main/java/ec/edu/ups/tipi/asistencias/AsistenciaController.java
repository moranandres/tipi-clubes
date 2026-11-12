package ec.edu.ups.tipi.asistencias;

import ec.edu.ups.tipi.asistencias.dto.AsistenciaVista;
import ec.edu.ups.tipi.asistencias.dto.CorreccionAsistenciaVista;
import ec.edu.ups.tipi.asistencias.dto.PlanillaAsistenciaResponse;
import ec.edu.ups.tipi.asistencias.dto.RegistroAsistenciaRequest;
import ec.edu.ups.tipi.asistencias.dto.ResumenAsistenciaResponse;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Tag(name = "Asistencia", description = "Planilla de asistencia por sesión, correcciones y resumen por club")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AsistenciaController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";

    private final AsistenciaService service;

    @Operation(summary = "Planilla de asistencia de una actividad")
    @GetMapping("/actividades/{id}/asistencia")
    @PreAuthorize(LECTURA)
    public ResponseEntity<PlanillaAsistenciaResponse> planilla(@PathVariable Long id,
                                                               @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.planilla(id, usuario));
    }

    @Operation(summary = "Registra o corrige la asistencia de una actividad")
    @PutMapping("/actividades/{id}/asistencia")
    @PreAuthorize(GESTION)
    public ResponseEntity<PlanillaAsistenciaResponse> registrar(
            @PathVariable Long id,
            @Valid @RequestBody RegistroAsistenciaRequest request,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.registrar(id, request, usuario));
    }

    @Operation(summary = "Correcciones hechas a la asistencia de una actividad")
    @GetMapping("/actividades/{id}/asistencia/correcciones")
    @PreAuthorize(LECTURA)
    public ResponseEntity<List<CorreccionAsistenciaVista>> correcciones(
            @PathVariable Long id,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.correcciones(id, usuario));
    }

    @Operation(summary = "Lista paginada de registros de asistencia dentro del alcance del usuario")
    @GetMapping("/asistencias")
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<AsistenciaVista>> listar(
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) Long cursoId,
            @RequestParam(required = false) Long actividadId,
            @RequestParam(required = false) Long estudianteId,
            @RequestParam(required = false) EstadoAsistencia estado,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(institucionId, clubId, cursoId, actividadId, estudianteId, estado,
                desde, hasta, pagina, tamano, usuario));
    }

    @Operation(summary = "Resumen de asistencia de un club por estudiante")
    @GetMapping("/asistencias/resumen")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ResumenAsistenciaResponse> resumen(
            @RequestParam Long clubId,
            @RequestParam(required = false) Long cursoId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.resumen(clubId, cursoId, desde, hasta, usuario));
    }
}
