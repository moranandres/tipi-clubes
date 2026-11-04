package ec.edu.ups.tipi.inscripciones;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.cursos.NivelCurso;
import ec.edu.ups.tipi.inscripciones.dto.MotivoRequest;
import ec.edu.ups.tipi.inscripciones.dto.SolicitudAprobarRequest;
import ec.edu.ups.tipi.inscripciones.dto.SolicitudCrearRequest;
import ec.edu.ups.tipi.inscripciones.dto.SolicitudResponse;
import ec.edu.ups.tipi.inscripciones.dto.SolicitudVista;
import ec.edu.ups.tipi.inscripciones.dto.VerificacionResponse;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

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

    @GetMapping
    @PreAuthorize(LECTURA)
    public PaginaResponse<SolicitudVista> listar(
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
        return service.listar(q, estado, institucionId, clubId, cursoId, estudianteId, nivel, pagina, tamano, usuario);
    }

    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public SolicitudVista obtener(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.obtener(id, usuario);
    }

    @GetMapping("/{id}/verificacion")
    @PreAuthorize(RESOLUCION)
    public VerificacionResponse verificar(@PathVariable Long id,
                                          @RequestParam(required = false) Long cursoId,
                                          @RequestParam(required = false) NivelCurso nivelAsignado,
                                          @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return verificacion.verificar(id, cursoId, nivelAsignado, usuario);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(REGISTRO)
    public SolicitudResponse crear(@Valid @RequestBody SolicitudCrearRequest request,
                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.crear(request, usuario);
    }

    @PatchMapping("/{id}/revision")
    @PreAuthorize(RESOLUCION)
    public SolicitudResponse tomarEnRevision(@PathVariable Long id,
                                             @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.tomarEnRevision(id, usuario);
    }

    @PatchMapping("/{id}/aprobacion")
    @PreAuthorize(RESOLUCION)
    public SolicitudResponse aprobar(@PathVariable Long id,
                                     @Valid @RequestBody SolicitudAprobarRequest request,
                                     @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.aprobar(id, request, usuario);
    }

    @PatchMapping("/{id}/rechazo")
    @PreAuthorize(RESOLUCION)
    public SolicitudResponse rechazar(@PathVariable Long id,
                                      @Valid @RequestBody MotivoRequest request,
                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.rechazar(id, request, usuario);
    }

    @PatchMapping("/{id}/cancelacion")
    @PreAuthorize(REGISTRO)
    public SolicitudResponse cancelar(@PathVariable Long id,
                                      @Valid @RequestBody MotivoRequest request,
                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.cancelar(id, request, usuario);
    }
}
