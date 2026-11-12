package ec.edu.ups.tipi.avances;

import ec.edu.ups.tipi.avances.dto.AnulacionAvanceRequest;
import ec.edu.ups.tipi.avances.dto.AvanceActualizarRequest;
import ec.edu.ups.tipi.avances.dto.AvanceCrearRequest;
import ec.edu.ups.tipi.avances.dto.AvanceResponse;
import ec.edu.ups.tipi.avances.dto.ProgresoEstudianteResponse;
import ec.edu.ups.tipi.avances.dto.ResumenResultadosResponse;
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

@Tag(name = "Avances", description = "Avances de estudiantes y proyectos con evaluación de competencias, progreso y resultados del período")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AvanceController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";

    private final AvanceService service;
    private final ResultadosService resultados;

    @Operation(summary = "Lista paginada de avances dentro del alcance del usuario")
    @GetMapping("/avances")
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<AvanceResponse>> listar(
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) AlcanceAvance alcance,
            @RequestParam(required = false) Long estudianteId,
            @RequestParam(required = false) Long proyectoId,
            @RequestParam(required = false) Long actividadId,
            @RequestParam(required = false) EstadoAvance estado,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(institucionId, clubId, alcance, estudianteId, proyectoId,
                actividadId, estado, desde, hasta, pagina, tamano, usuario));
    }

    @Operation(summary = "Detalle de un avance")
    @GetMapping("/avances/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<AvanceResponse> obtener(@PathVariable Long id,
                                                  @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Registra un avance de un estudiante o de un proyecto")
    @PostMapping("/avances")
    @PreAuthorize(GESTION)
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<AvanceResponse> registrar(@Valid @RequestBody AvanceCrearRequest request,
                                                    @AuthenticationPrincipal UsuarioPrincipal usuario) {
        AvanceResponse creado = service.registrar(request, usuario);
        return Respuestas.creado(creado.id(), creado);
    }

    @Operation(summary = "Actualiza un avance")
    @PutMapping("/avances/{id}")
    @PreAuthorize(GESTION)
    public ResponseEntity<AvanceResponse> actualizar(@PathVariable Long id,
                                                     @Valid @RequestBody AvanceActualizarRequest request,
                                                     @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(id, request, usuario));
    }

    @Operation(summary = "Anula un avance indicando el motivo")
    @PostMapping("/avances/{id}/anulacion")
    @PreAuthorize(GESTION)
    public ResponseEntity<AvanceResponse> anular(@PathVariable Long id,
                                                 @Valid @RequestBody AnulacionAvanceRequest request,
                                                 @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.anular(id, request, usuario));
    }

    @Operation(summary = "Progreso de un estudiante por competencia en un período")
    @GetMapping("/estudiantes/{id}/progreso")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ProgresoEstudianteResponse> progreso(
            @PathVariable Long id,
            @RequestParam(required = false) Integer periodoId,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.progreso(id, periodoId, usuario));
    }

    @Operation(summary = "Resumen de resultados del período por club y por competencia")
    @GetMapping("/resultados/resumen")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ResumenResultadosResponse> resumen(
            @RequestParam(required = false) Integer periodoId,
            @RequestParam(required = false) Long institucionId,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(resultados.resumen(periodoId, institucionId, usuario));
    }
}
