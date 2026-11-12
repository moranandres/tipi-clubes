package ec.edu.ups.tipi.competencias;

import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.competencias.dto.CategoriaRequest;
import ec.edu.ups.tipi.competencias.dto.CategoriaResponse;
import ec.edu.ups.tipi.competencias.dto.CompetenciaRequest;
import ec.edu.ups.tipi.competencias.dto.CompetenciaResponse;
import ec.edu.ups.tipi.competencias.dto.EdicionRequest;
import ec.edu.ups.tipi.competencias.dto.EdicionResponse;
import ec.edu.ups.tipi.competencias.dto.EstadoCatalogoRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Competencias", description = "Catálogo de competencias con sus ediciones y categorías")
@RestController
@RequestMapping("/api/competencias")
@RequiredArgsConstructor
public class CatalogoCompetenciaController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasRole('ADMIN')";

    private final CatalogoCompetenciaService service;

    @Operation(summary = "Lista de competencias")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<List<CompetenciaResponse>> listar(@RequestParam(required = false) Boolean activa) {
        return ResponseEntity.ok(service.listarCompetencias(activa));
    }

    @Operation(summary = "Detalle de una competencia")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<CompetenciaResponse> obtener(@PathVariable Integer id) {
        return ResponseEntity.ok(service.obtenerCompetencia(id));
    }

    @Operation(summary = "Crea una competencia")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(GESTION)
    public ResponseEntity<CompetenciaResponse> crear(@Valid @RequestBody CompetenciaRequest request) {
        CompetenciaResponse creada = service.crearCompetencia(request);
        return Respuestas.creado(creada.id(), creada);
    }

    @Operation(summary = "Actualiza una competencia")
    @PutMapping("/{id}")
    @PreAuthorize(GESTION)
    public ResponseEntity<CompetenciaResponse> actualizar(@PathVariable Integer id,
                                                          @Valid @RequestBody CompetenciaRequest request) {
        return ResponseEntity.ok(service.actualizarCompetencia(id, request));
    }

    @Operation(summary = "Activa o desactiva una competencia")
    @PatchMapping("/{id}/estado")
    @PreAuthorize(GESTION)
    public ResponseEntity<CompetenciaResponse> cambiarEstado(@PathVariable Integer id,
                                                             @Valid @RequestBody EstadoCatalogoRequest request) {
        return ResponseEntity.ok(service.cambiarEstadoCompetencia(id, request));
    }

    @Operation(summary = "Ediciones de una competencia")
    @GetMapping("/{competenciaId}/ediciones")
    @PreAuthorize(LECTURA)
    public ResponseEntity<List<EdicionResponse>> listarEdiciones(@PathVariable Integer competenciaId,
                                                                 @RequestParam(required = false) Integer anio,
                                                                 @RequestParam(required = false) Boolean activa) {
        return ResponseEntity.ok(service.listarEdiciones(competenciaId, anio, activa));
    }

    @Operation(summary = "Crea una edición de una competencia")
    @PostMapping("/{competenciaId}/ediciones")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(GESTION)
    public ResponseEntity<EdicionResponse> crearEdicion(@PathVariable Integer competenciaId,
                                                        @Valid @RequestBody EdicionRequest request) {
        EdicionResponse creada = service.crearEdicion(competenciaId, request);
        return Respuestas.creado(creada.id(), creada);
    }

    @Operation(summary = "Actualiza una edición de una competencia")
    @PutMapping("/{competenciaId}/ediciones/{id}")
    @PreAuthorize(GESTION)
    public ResponseEntity<EdicionResponse> actualizarEdicion(@PathVariable Integer competenciaId,
                                                             @PathVariable Integer id,
                                                             @Valid @RequestBody EdicionRequest request) {
        return ResponseEntity.ok(service.actualizarEdicion(competenciaId, id, request));
    }

    @Operation(summary = "Activa o desactiva una edición")
    @PatchMapping("/{competenciaId}/ediciones/{id}/estado")
    @PreAuthorize(GESTION)
    public ResponseEntity<EdicionResponse> cambiarEstadoEdicion(@PathVariable Integer competenciaId,
                                                                @PathVariable Integer id,
                                                                @Valid @RequestBody EstadoCatalogoRequest request) {
        return ResponseEntity.ok(service.cambiarEstadoEdicion(competenciaId, id, request));
    }

    @Operation(summary = "Categorías de una competencia")
    @GetMapping("/{competenciaId}/categorias")
    @PreAuthorize(LECTURA)
    public ResponseEntity<List<CategoriaResponse>> listarCategorias(
            @PathVariable Integer competenciaId,
            @RequestParam(required = false) NivelCategoria nivel,
            @RequestParam(required = false) Boolean activa,
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(service.listarCategorias(competenciaId, nivel, activa, q));
    }

    @Operation(summary = "Crea una categoría de una competencia")
    @PostMapping("/{competenciaId}/categorias")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(GESTION)
    public ResponseEntity<CategoriaResponse> crearCategoria(@PathVariable Integer competenciaId,
                                                            @Valid @RequestBody CategoriaRequest request) {
        CategoriaResponse creada = service.crearCategoria(competenciaId, request);
        return Respuestas.creado(creada.id(), creada);
    }

    @Operation(summary = "Actualiza una categoría de una competencia")
    @PutMapping("/{competenciaId}/categorias/{id}")
    @PreAuthorize(GESTION)
    public ResponseEntity<CategoriaResponse> actualizarCategoria(@PathVariable Integer competenciaId,
                                                                 @PathVariable Integer id,
                                                                 @Valid @RequestBody CategoriaRequest request) {
        return ResponseEntity.ok(service.actualizarCategoria(competenciaId, id, request));
    }

    @Operation(summary = "Activa o desactiva una categoría")
    @PatchMapping("/{competenciaId}/categorias/{id}/estado")
    @PreAuthorize(GESTION)
    public ResponseEntity<CategoriaResponse> cambiarEstadoCategoria(@PathVariable Integer competenciaId,
                                                                    @PathVariable Integer id,
                                                                    @Valid @RequestBody EstadoCatalogoRequest request) {
        return ResponseEntity.ok(service.cambiarEstadoCategoria(competenciaId, id, request));
    }
}
