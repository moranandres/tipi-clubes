package ec.edu.ups.tipi.avances;

import ec.edu.ups.tipi.avances.dto.AnulacionAvanceRequest;
import ec.edu.ups.tipi.avances.dto.AvanceActualizarRequest;
import ec.edu.ups.tipi.avances.dto.AvanceCrearRequest;
import ec.edu.ups.tipi.avances.dto.AvanceResponse;
import ec.edu.ups.tipi.avances.dto.ProgresoEstudianteResponse;
import ec.edu.ups.tipi.avances.dto.ResumenResultadosResponse;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AvanceController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";

    private final AvanceService service;
    private final ResultadosService resultados;

    @GetMapping("/avances")
    @PreAuthorize(LECTURA)
    public PaginaResponse<AvanceResponse> listar(
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
        return service.listar(institucionId, clubId, alcance, estudianteId, proyectoId, actividadId, estado, desde,
                hasta, pagina, tamano, usuario);
    }

    @GetMapping("/avances/{id}")
    @PreAuthorize(LECTURA)
    public AvanceResponse obtener(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.obtener(id, usuario);
    }

    @PostMapping("/avances")
    @PreAuthorize(GESTION)
    @ResponseStatus(HttpStatus.CREATED)
    public AvanceResponse registrar(@Valid @RequestBody AvanceCrearRequest request,
                                    @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.registrar(request, usuario);
    }

    @PutMapping("/avances/{id}")
    @PreAuthorize(GESTION)
    public AvanceResponse actualizar(@PathVariable Long id, @Valid @RequestBody AvanceActualizarRequest request,
                                     @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.actualizar(id, request, usuario);
    }

    @PostMapping("/avances/{id}/anulacion")
    @PreAuthorize(GESTION)
    public AvanceResponse anular(@PathVariable Long id, @Valid @RequestBody AnulacionAvanceRequest request,
                                 @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.anular(id, request, usuario);
    }

    @GetMapping("/estudiantes/{id}/progreso")
    @PreAuthorize(LECTURA)
    public ProgresoEstudianteResponse progreso(@PathVariable Long id,
                                               @RequestParam(required = false) Integer periodoId,
                                               @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.progreso(id, periodoId, usuario);
    }

    @GetMapping("/resultados/resumen")
    @PreAuthorize(LECTURA)
    public ResumenResultadosResponse resumen(@RequestParam(required = false) Integer periodoId,
                                             @RequestParam(required = false) Long institucionId,
                                             @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return resultados.resumen(periodoId, institucionId, usuario);
    }
}
