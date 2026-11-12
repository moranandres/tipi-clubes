package ec.edu.ups.tipi.evidencias;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.estudiantes.dto.DocumentoDescarga;
import ec.edu.ups.tipi.evidencias.dto.EvidenciaActualizarRequest;
import ec.edu.ups.tipi.evidencias.dto.EvidenciaCrearRequest;
import ec.edu.ups.tipi.evidencias.dto.EvidenciaResponse;
import ec.edu.ups.tipi.evidencias.dto.EvidenciasActividadResponse;
import ec.edu.ups.tipi.evidencias.dto.ResumenEvidenciasResponse;
import ec.edu.ups.tipi.evidencias.dto.RetiroEvidenciaRequest;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

@Tag(name = "Evidencias", description = "Fotografías, informes, enlaces y productos de cada sesión, con su archivo")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class EvidenciaController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String RUTA_EVIDENCIAS = "/api/evidencias";

    private final EvidenciaService service;

    @Operation(summary = "Evidencias de una actividad con el estado de las autorizaciones de imagen")
    @GetMapping("/actividades/{id}/evidencias")
    @PreAuthorize(LECTURA)
    public ResponseEntity<EvidenciasActividadResponse> deActividad(
            @PathVariable Long id,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.deActividad(id, usuario));
    }

    @Operation(summary = "Registra una evidencia en una actividad, con archivo o con enlace")
    @PostMapping(value = "/actividades/{id}/evidencias",
            consumes = {MediaType.MULTIPART_FORM_DATA_VALUE, MediaType.APPLICATION_FORM_URLENCODED_VALUE})
    @PreAuthorize(GESTION)
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<EvidenciaResponse> registrar(
            @PathVariable Long id,
            @Valid @ModelAttribute EvidenciaCrearRequest request,
            @RequestParam(value = "archivo", required = false) MultipartFile archivo,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        EvidenciaResponse creada = service.registrar(id, request, archivo, usuario);
        return Respuestas.creadoEn(RUTA_EVIDENCIAS, creada.id(), creada);
    }

    @Operation(summary = "Lista paginada de evidencias dentro del alcance del usuario")
    @GetMapping("/evidencias")
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<EvidenciaResponse>> listar(
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) Long actividadId,
            @RequestParam(required = false) Long estudianteId,
            @RequestParam(required = false) TipoEvidencia tipo,
            @RequestParam(required = false) EstadoEvidencia estado,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(institucionId, clubId, actividadId, estudianteId, tipo, estado,
                desde, hasta, pagina, tamano, usuario));
    }

    @Operation(summary = "Resumen de evidencias por club")
    @GetMapping("/evidencias/resumen")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ResumenEvidenciasResponse> resumen(
            @RequestParam(required = false) Integer periodoId,
            @RequestParam(required = false) Long institucionId,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.resumen(periodoId, institucionId, usuario));
    }

    @Operation(summary = "Detalle de una evidencia")
    @GetMapping("/evidencias/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<EvidenciaResponse> obtener(@PathVariable Long id,
                                                     @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Actualiza los datos de una evidencia")
    @PutMapping("/evidencias/{id}")
    @PreAuthorize(GESTION)
    public ResponseEntity<EvidenciaResponse> actualizar(@PathVariable Long id,
                                                        @Valid @RequestBody EvidenciaActualizarRequest request,
                                                        @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(id, request, usuario));
    }

    @Operation(summary = "Retira una evidencia indicando el motivo")
    @PostMapping("/evidencias/{id}/retiro")
    @PreAuthorize(GESTION)
    public ResponseEntity<EvidenciaResponse> retirar(@PathVariable Long id,
                                                     @Valid @RequestBody RetiroEvidenciaRequest request,
                                                     @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.retirar(id, request, usuario));
    }

    @Operation(summary = "Descarga el archivo de una evidencia")
    @ApiResponse(responseCode = "200", description = "Archivo de la evidencia",
            content = @Content(mediaType = MediaType.APPLICATION_OCTET_STREAM_VALUE,
                    schema = @Schema(type = "string", format = "binary")))
    @GetMapping("/evidencias/{id}/archivo")
    @PreAuthorize(LECTURA)
    public ResponseEntity<Resource> descargar(@PathVariable Long id,
                                              @AuthenticationPrincipal UsuarioPrincipal usuario) {
        DocumentoDescarga archivo = service.descargar(id, usuario);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(archivo.tipoMime()))
                .contentLength(archivo.tamano())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(archivo.nombre(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'; sandbox")
                .cacheControl(CacheControl.noStore())
                .body(archivo.recurso());
    }
}
