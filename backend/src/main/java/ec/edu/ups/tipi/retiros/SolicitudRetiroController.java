package ec.edu.ups.tipi.retiros;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.inscripciones.dto.MotivoRequest;
import ec.edu.ups.tipi.retiros.dto.EfectosRetiroResponse;
import ec.edu.ups.tipi.retiros.dto.RetiroAprobarRequest;
import ec.edu.ups.tipi.retiros.dto.RetiroCrearRequest;
import ec.edu.ups.tipi.retiros.dto.RetiroResponse;
import ec.edu.ups.tipi.retiros.dto.RetiroVista;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/solicitudes-retiro")
@RequiredArgsConstructor
public class SolicitudRetiroController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String REGISTRO = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String RESOLUCION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL')";

    private final SolicitudRetiroService service;

    @GetMapping
    @PreAuthorize(LECTURA)
    public PaginaResponse<RetiroVista> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) EstadoRetiro estado,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) Long estudianteId,
            @RequestParam(required = false) Long inscripcionId,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.listar(q, estado, institucionId, clubId, estudianteId, inscripcionId, pagina, tamano, usuario);
    }

    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public RetiroVista obtener(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.obtener(id, usuario);
    }

    @GetMapping("/{id}/efectos")
    @PreAuthorize(RESOLUCION)
    public EfectosRetiroResponse efectos(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.efectos(id, usuario);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(REGISTRO)
    public RetiroResponse crear(@Valid @RequestBody RetiroCrearRequest request,
                                @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.crear(request, usuario);
    }

    @PatchMapping("/{id}/aprobacion")
    @PreAuthorize(RESOLUCION)
    public RetiroResponse aprobar(@PathVariable Long id,
                                  @Valid @RequestBody(required = false) RetiroAprobarRequest request,
                                  @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.aprobar(id, request, usuario);
    }

    @PatchMapping("/{id}/rechazo")
    @PreAuthorize(RESOLUCION)
    public RetiroResponse rechazar(@PathVariable Long id,
                                   @Valid @RequestBody MotivoRequest request,
                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.rechazar(id, request, usuario);
    }

    @PatchMapping("/{id}/cancelacion")
    @PreAuthorize(REGISTRO)
    public RetiroResponse cancelar(@PathVariable Long id,
                                   @Valid @RequestBody MotivoRequest request,
                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.cancelar(id, request, usuario);
    }
}
