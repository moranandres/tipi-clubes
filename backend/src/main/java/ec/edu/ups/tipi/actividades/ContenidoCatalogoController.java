package ec.edu.ups.tipi.actividades;

import ec.edu.ups.tipi.actividades.dto.ContenidoEstadoRequest;
import ec.edu.ups.tipi.actividades.dto.ContenidoRequest;
import ec.edu.ups.tipi.actividades.dto.ContenidoResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contenidos")
@RequiredArgsConstructor
public class ContenidoCatalogoController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasRole('ADMIN')";

    private final ContenidoCatalogoService service;

    @GetMapping
    @PreAuthorize(LECTURA)
    public List<ContenidoResponse> listar(@RequestParam(required = false) TipoContenido tipo,
                                          @RequestParam(required = false) Boolean activo,
                                          @RequestParam(required = false) String q) {
        return service.listar(tipo, activo, q);
    }

    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ContenidoResponse obtener(@PathVariable Integer id) {
        return service.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(GESTION)
    public ContenidoResponse crear(@Valid @RequestBody ContenidoRequest request) {
        return service.crear(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize(GESTION)
    public ContenidoResponse actualizar(@PathVariable Integer id, @Valid @RequestBody ContenidoRequest request) {
        return service.actualizar(id, request);
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize(GESTION)
    public ContenidoResponse cambiarEstado(@PathVariable Integer id,
                                           @Valid @RequestBody ContenidoEstadoRequest request) {
        return service.cambiarEstado(id, request);
    }
}
