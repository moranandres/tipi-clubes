package ec.edu.ups.tipi.proyectos;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.proyectos.dto.CancelacionProyectoRequest;
import ec.edu.ups.tipi.proyectos.dto.EvidenciasProyectoRequest;
import ec.edu.ups.tipi.proyectos.dto.FinalizacionProyectoRequest;
import ec.edu.ups.tipi.proyectos.dto.ProyectoActualizarRequest;
import ec.edu.ups.tipi.proyectos.dto.ProyectoCrearRequest;
import ec.edu.ups.tipi.proyectos.dto.ProyectoResponse;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/proyectos")
@RequiredArgsConstructor
public class ProyectoController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";

    private final ProyectoService service;

    @GetMapping
    @PreAuthorize(LECTURA)
    public PaginaResponse<ProyectoResponse> listar(@RequestParam(required = false) Long institucionId,
                                                   @RequestParam(required = false) Long clubId,
                                                   @RequestParam(required = false) Long estudianteId,
                                                   @RequestParam(required = false) Long docenteId,
                                                   @RequestParam(required = false) EstadoProyecto estado,
                                                   @RequestParam(required = false) TipoProyecto tipo,
                                                   @RequestParam(required = false) Integer periodoId,
                                                   @RequestParam(defaultValue = "0") int pagina,
                                                   @RequestParam(defaultValue = "20") int tamano,
                                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.listar(institucionId, clubId, estudianteId, docenteId, estado, tipo, periodoId, pagina, tamano,
                usuario);
    }

    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ProyectoResponse obtener(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.obtener(id, usuario);
    }

    @PostMapping
    @PreAuthorize(GESTION)
    @ResponseStatus(HttpStatus.CREATED)
    public ProyectoResponse registrar(@Valid @RequestBody ProyectoCrearRequest request,
                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.registrar(request, usuario);
    }

    @PutMapping("/{id}")
    @PreAuthorize(GESTION)
    public ProyectoResponse actualizar(@PathVariable Long id, @Valid @RequestBody ProyectoActualizarRequest request,
                                       @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.actualizar(id, request, usuario);
    }

    @PutMapping("/{id}/evidencias")
    @PreAuthorize(GESTION)
    public ProyectoResponse vincularEvidencias(@PathVariable Long id,
                                               @Valid @RequestBody EvidenciasProyectoRequest request,
                                               @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.vincularEvidencias(id, request, usuario);
    }

    @PostMapping("/{id}/finalizacion")
    @PreAuthorize(GESTION)
    public ProyectoResponse finalizar(@PathVariable Long id, @Valid @RequestBody FinalizacionProyectoRequest request,
                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.finalizar(id, request, usuario);
    }

    @PostMapping("/{id}/cancelacion")
    @PreAuthorize(GESTION)
    public ProyectoResponse cancelar(@PathVariable Long id, @Valid @RequestBody CancelacionProyectoRequest request,
                                     @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.cancelar(id, request, usuario);
    }
}
