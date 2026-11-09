package ec.edu.ups.tipi.seguimiento;

import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.seguimiento.dto.ParametrosSeguimientoRequest;
import ec.edu.ups.tipi.seguimiento.dto.ParametrosSeguimientoResponse;
import ec.edu.ups.tipi.seguimiento.dto.ResumenSeguimientoResponse;
import ec.edu.ups.tipi.seguimiento.dto.SeguimientoClubResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
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

@RestController
@RequestMapping("/api/seguimiento")
@RequiredArgsConstructor
public class SeguimientoController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";

    private final SeguimientoService service;
    private final ParametrosSeguimientoService parametros;

    @GetMapping("/resumen")
    @PreAuthorize(LECTURA)
    public ResumenSeguimientoResponse resumen(
            @RequestParam(required = false) Integer periodoId,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.resumen(periodoId, institucionId, desde, hasta, usuario);
    }

    @GetMapping("/clubes/{clubId}")
    @PreAuthorize(LECTURA)
    public SeguimientoClubResponse club(
            @PathVariable Long clubId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.club(clubId, desde, hasta, usuario);
    }

    @GetMapping("/parametros")
    @PreAuthorize(LECTURA)
    public ParametrosSeguimientoResponse obtenerParametros() {
        return parametros.obtener();
    }

    @PutMapping("/parametros")
    @PreAuthorize("hasRole('ADMIN')")
    public ParametrosSeguimientoResponse actualizarParametros(@Valid @RequestBody ParametrosSeguimientoRequest request,
                                                              @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return parametros.actualizar(request, usuario);
    }
}
