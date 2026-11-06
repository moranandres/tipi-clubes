package ec.edu.ups.tipi.asistencias;

import ec.edu.ups.tipi.asistencias.dto.AsistenciaVista;
import ec.edu.ups.tipi.asistencias.dto.CorreccionAsistenciaVista;
import ec.edu.ups.tipi.asistencias.dto.PlanillaAsistenciaResponse;
import ec.edu.ups.tipi.asistencias.dto.RegistroAsistenciaRequest;
import ec.edu.ups.tipi.asistencias.dto.ResumenAsistenciaResponse;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AsistenciaController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";

    private final AsistenciaService service;

    @GetMapping("/actividades/{id}/asistencia")
    @PreAuthorize(LECTURA)
    public PlanillaAsistenciaResponse planilla(@PathVariable Long id,
                                               @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.planilla(id, usuario);
    }

    @PutMapping("/actividades/{id}/asistencia")
    @PreAuthorize(GESTION)
    public PlanillaAsistenciaResponse registrar(@PathVariable Long id,
                                                @Valid @RequestBody RegistroAsistenciaRequest request,
                                                @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.registrar(id, request, usuario);
    }

    @GetMapping("/actividades/{id}/asistencia/correcciones")
    @PreAuthorize(LECTURA)
    public List<CorreccionAsistenciaVista> correcciones(@PathVariable Long id,
                                                        @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.correcciones(id, usuario);
    }

    @GetMapping("/asistencias")
    @PreAuthorize(LECTURA)
    public PaginaResponse<AsistenciaVista> listar(
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
        return service.listar(institucionId, clubId, cursoId, actividadId, estudianteId, estado, desde, hasta,
                pagina, tamano, usuario);
    }

    @GetMapping("/asistencias/resumen")
    @PreAuthorize(LECTURA)
    public ResumenAsistenciaResponse resumen(
            @RequestParam Long clubId,
            @RequestParam(required = false) Long cursoId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.resumen(clubId, cursoId, desde, hasta, usuario);
    }
}
