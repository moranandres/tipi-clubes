package ec.edu.ups.tipi.seguimiento;

import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.seguimiento.dto.ParametrosSeguimientoRequest;
import ec.edu.ups.tipi.seguimiento.dto.ParametrosSeguimientoResponse;
import ec.edu.ups.tipi.seguimiento.dto.ResumenSeguimientoResponse;
import ec.edu.ups.tipi.seguimiento.dto.SeguimientoClubResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@Tag(name = "Seguimiento", description = "Semáforo de cumplimiento de actividades por club y sus parámetros")
@RestController
@RequestMapping("/api/seguimiento")
@RequiredArgsConstructor
public class SeguimientoController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";

    private final SeguimientoService service;
    private final ParametrosSeguimientoService parametros;

    @Operation(summary = "Semáforo de seguimiento de los clubes dentro del alcance del usuario")
    @GetMapping("/resumen")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ResumenSeguimientoResponse> resumen(
            @RequestParam(required = false) Integer periodoId,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.resumen(periodoId, institucionId, desde, hasta, usuario));
    }

    @Operation(summary = "Seguimiento detallado de un club")
    @GetMapping("/clubes/{clubId}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<SeguimientoClubResponse> club(
            @PathVariable Long clubId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.club(clubId, desde, hasta, usuario));
    }

    @Operation(summary = "Umbrales vigentes del semáforo de seguimiento")
    @GetMapping("/parametros")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ParametrosSeguimientoResponse> obtenerParametros() {
        return ResponseEntity.ok(parametros.obtener());
    }

    @Operation(summary = "Actualiza los umbrales del semáforo de seguimiento")
    @PutMapping("/parametros")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ParametrosSeguimientoResponse> actualizarParametros(
            @Valid @RequestBody ParametrosSeguimientoRequest request,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(parametros.actualizar(request, usuario));
    }
}
