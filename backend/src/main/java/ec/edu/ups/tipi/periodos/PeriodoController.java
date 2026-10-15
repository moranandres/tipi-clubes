package ec.edu.ups.tipi.periodos;

import ec.edu.ups.tipi.periodos.dto.PeriodoRequest;
import ec.edu.ups.tipi.periodos.dto.PeriodoResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/periodos")
@RequiredArgsConstructor
public class PeriodoController {

    private final PeriodoService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')")
    public List<PeriodoResponse> listar() {
        return service.listar();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public PeriodoResponse crear(@Valid @RequestBody PeriodoRequest request) {
        return service.crear(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public PeriodoResponse actualizar(@PathVariable Integer id, @Valid @RequestBody PeriodoRequest request) {
        return service.actualizar(id, request);
    }

    @PatchMapping("/{id}/activar")
    @PreAuthorize("hasRole('ADMIN')")
    public PeriodoResponse activar(@PathVariable Integer id) {
        return service.activar(id);
    }
}