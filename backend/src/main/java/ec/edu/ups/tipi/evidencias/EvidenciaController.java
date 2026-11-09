package ec.edu.ups.tipi.evidencias;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.estudiantes.dto.DocumentoDescarga;
import ec.edu.ups.tipi.evidencias.dto.EvidenciaActualizarRequest;
import ec.edu.ups.tipi.evidencias.dto.EvidenciaCrearRequest;
import ec.edu.ups.tipi.evidencias.dto.EvidenciaResponse;
import ec.edu.ups.tipi.evidencias.dto.EvidenciasActividadResponse;
import ec.edu.ups.tipi.evidencias.dto.ResumenEvidenciasResponse;
import ec.edu.ups.tipi.evidencias.dto.RetiroEvidenciaRequest;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
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

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class EvidenciaController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";

    private final EvidenciaService service;

    @GetMapping("/actividades/{id}/evidencias")
    @PreAuthorize(LECTURA)
    public EvidenciasActividadResponse deActividad(@PathVariable Long id,
                                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.deActividad(id, usuario);
    }

    @PostMapping(value = "/actividades/{id}/evidencias",
            consumes = {MediaType.MULTIPART_FORM_DATA_VALUE, MediaType.APPLICATION_FORM_URLENCODED_VALUE})
    @PreAuthorize(GESTION)
    @ResponseStatus(HttpStatus.CREATED)
    public EvidenciaResponse registrar(@PathVariable Long id,
                                       @Valid @ModelAttribute EvidenciaCrearRequest request,
                                       @RequestParam(value = "archivo", required = false) MultipartFile archivo,
                                       @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.registrar(id, request, archivo, usuario);
    }

    @GetMapping("/evidencias")
    @PreAuthorize(LECTURA)
    public PaginaResponse<EvidenciaResponse> listar(
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
        return service.listar(institucionId, clubId, actividadId, estudianteId, tipo, estado, desde, hasta,
                pagina, tamano, usuario);
    }

    @GetMapping("/evidencias/resumen")
    @PreAuthorize(LECTURA)
    public ResumenEvidenciasResponse resumen(@RequestParam(required = false) Integer periodoId,
                                             @RequestParam(required = false) Long institucionId,
                                             @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.resumen(periodoId, institucionId, usuario);
    }

    @GetMapping("/evidencias/{id}")
    @PreAuthorize(LECTURA)
    public EvidenciaResponse obtener(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.obtener(id, usuario);
    }

    @PutMapping("/evidencias/{id}")
    @PreAuthorize(GESTION)
    public EvidenciaResponse actualizar(@PathVariable Long id,
                                        @Valid @RequestBody EvidenciaActualizarRequest request,
                                        @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.actualizar(id, request, usuario);
    }

    @PostMapping("/evidencias/{id}/retiro")
    @PreAuthorize(GESTION)
    public EvidenciaResponse retirar(@PathVariable Long id,
                                     @Valid @RequestBody RetiroEvidenciaRequest request,
                                     @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.retirar(id, request, usuario);
    }

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
