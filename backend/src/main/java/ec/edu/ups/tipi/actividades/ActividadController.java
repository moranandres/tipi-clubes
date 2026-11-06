package ec.edu.ups.tipi.actividades;

import ec.edu.ups.tipi.actividades.dto.ActividadActualizarRequest;
import ec.edu.ups.tipi.actividades.dto.ActividadCrearRequest;
import ec.edu.ups.tipi.actividades.dto.ActividadResponse;
import ec.edu.ups.tipi.actividades.dto.CancelacionActividadRequest;
import ec.edu.ups.tipi.actividades.dto.EjecucionActividadRequest;
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
@RequestMapping("/api/actividades")
@RequiredArgsConstructor
public class ActividadController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";

    private final ActividadService service;

    @GetMapping
    @PreAuthorize(LECTURA)
    public PaginaResponse<ActividadResponse> listar(
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
        return service.listar(q, institucionId, clubId, cursoId, responsableId, estado, desde, hasta,
                pendientes, ascendente, pagina, tamano, usuario);
    }

    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ActividadResponse obtener(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.obtener(id, usuario);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(GESTION)
    public ActividadResponse crear(@Valid @RequestBody ActividadCrearRequest request,
                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.crear(request, usuario);
    }

    @PutMapping("/{id}")
    @PreAuthorize(GESTION)
    public ActividadResponse actualizar(@PathVariable Long id,
                                        @Valid @RequestBody ActividadActualizarRequest request,
                                        @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.actualizar(id, request, usuario);
    }

    @PutMapping("/{id}/ejecucion")
    @PreAuthorize(GESTION)
    public ActividadResponse registrarEjecucion(@PathVariable Long id,
                                                @Valid @RequestBody EjecucionActividadRequest request,
                                                @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.registrarEjecucion(id, request, usuario);
    }

    @PatchMapping("/{id}/cancelacion")
    @PreAuthorize(GESTION)
    public ActividadResponse cancelar(@PathVariable Long id,
                                      @Valid @RequestBody CancelacionActividadRequest request,
                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.cancelar(id, request, usuario);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(GESTION)
    public void eliminar(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        service.eliminar(id, usuario);
    }
}
