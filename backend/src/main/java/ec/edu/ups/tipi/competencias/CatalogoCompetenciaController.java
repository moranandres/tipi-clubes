package ec.edu.ups.tipi.competencias;

import ec.edu.ups.tipi.competencias.dto.CategoriaRequest;
import ec.edu.ups.tipi.competencias.dto.CategoriaResponse;
import ec.edu.ups.tipi.competencias.dto.CompetenciaRequest;
import ec.edu.ups.tipi.competencias.dto.CompetenciaResponse;
import ec.edu.ups.tipi.competencias.dto.EdicionRequest;
import ec.edu.ups.tipi.competencias.dto.EdicionResponse;
import ec.edu.ups.tipi.competencias.dto.EstadoCatalogoRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/competencias")
@RequiredArgsConstructor
public class CatalogoCompetenciaController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasRole('ADMIN')";

    private final CatalogoCompetenciaService service;

    @GetMapping
    @PreAuthorize(LECTURA)
    public List<CompetenciaResponse> listar(@RequestParam(required = false) Boolean activa) {
        return service.listarCompetencias(activa);
    }

    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public CompetenciaResponse obtener(@PathVariable Integer id) {
        return service.obtenerCompetencia(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(GESTION)
    public CompetenciaResponse crear(@Valid @RequestBody CompetenciaRequest request) {
        return service.crearCompetencia(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize(GESTION)
    public CompetenciaResponse actualizar(@PathVariable Integer id, @Valid @RequestBody CompetenciaRequest request) {
        return service.actualizarCompetencia(id, request);
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize(GESTION)
    public CompetenciaResponse cambiarEstado(@PathVariable Integer id,
                                             @Valid @RequestBody EstadoCatalogoRequest request) {
        return service.cambiarEstadoCompetencia(id, request);
    }

    @GetMapping("/{competenciaId}/ediciones")
    @PreAuthorize(LECTURA)
    public List<EdicionResponse> listarEdiciones(@PathVariable Integer competenciaId,
                                                 @RequestParam(required = false) Integer anio,
                                                 @RequestParam(required = false) Boolean activa) {
        return service.listarEdiciones(competenciaId, anio, activa);
    }

    @PostMapping("/{competenciaId}/ediciones")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(GESTION)
    public EdicionResponse crearEdicion(@PathVariable Integer competenciaId,
                                        @Valid @RequestBody EdicionRequest request) {
        return service.crearEdicion(competenciaId, request);
    }

    @PutMapping("/{competenciaId}/ediciones/{id}")
    @PreAuthorize(GESTION)
    public EdicionResponse actualizarEdicion(@PathVariable Integer competenciaId, @PathVariable Integer id,
                                             @Valid @RequestBody EdicionRequest request) {
        return service.actualizarEdicion(competenciaId, id, request);
    }

    @PatchMapping("/{competenciaId}/ediciones/{id}/estado")
    @PreAuthorize(GESTION)
    public EdicionResponse cambiarEstadoEdicion(@PathVariable Integer competenciaId, @PathVariable Integer id,
                                                @Valid @RequestBody EstadoCatalogoRequest request) {
        return service.cambiarEstadoEdicion(competenciaId, id, request);
    }

    @GetMapping("/{competenciaId}/categorias")
    @PreAuthorize(LECTURA)
    public List<CategoriaResponse> listarCategorias(@PathVariable Integer competenciaId,
                                                    @RequestParam(required = false) NivelCategoria nivel,
                                                    @RequestParam(required = false) Boolean activa,
                                                    @RequestParam(required = false) String q) {
        return service.listarCategorias(competenciaId, nivel, activa, q);
    }

    @PostMapping("/{competenciaId}/categorias")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(GESTION)
    public CategoriaResponse crearCategoria(@PathVariable Integer competenciaId,
                                            @Valid @RequestBody CategoriaRequest request) {
        return service.crearCategoria(competenciaId, request);
    }

    @PutMapping("/{competenciaId}/categorias/{id}")
    @PreAuthorize(GESTION)
    public CategoriaResponse actualizarCategoria(@PathVariable Integer competenciaId, @PathVariable Integer id,
                                                 @Valid @RequestBody CategoriaRequest request) {
        return service.actualizarCategoria(competenciaId, id, request);
    }

    @PatchMapping("/{competenciaId}/categorias/{id}/estado")
    @PreAuthorize(GESTION)
    public CategoriaResponse cambiarEstadoCategoria(@PathVariable Integer competenciaId, @PathVariable Integer id,
                                                    @Valid @RequestBody EstadoCatalogoRequest request) {
        return service.cambiarEstadoCategoria(competenciaId, id, request);
    }
}
