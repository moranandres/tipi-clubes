package ec.edu.ups.tipi.catalogo;

import ec.edu.ups.tipi.catalogo.dto.CatalogoClubDetalleResponse;
import ec.edu.ups.tipi.catalogo.dto.CatalogoClubResponse;
import ec.edu.ups.tipi.catalogo.dto.CatalogoInstitucionResponse;
import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.cursos.ModalidadCurso;
import ec.edu.ups.tipi.cursos.NivelCurso;
import ec.edu.ups.tipi.instituciones.EstadoAdhesion;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/catalogo")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')")
public class CatalogoController {

    private final CatalogoService service;

    @GetMapping("/instituciones")
    public List<CatalogoInstitucionResponse> instituciones(
            @RequestParam(required = false) Integer periodoId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) EstadoAdhesion estadoAdhesion) {
        return service.listarInstituciones(periodoId, q, estadoAdhesion);
    }

    @GetMapping("/clubes")
    public PaginaResponse<CatalogoClubResponse> clubes(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Integer periodoId,
            @RequestParam(required = false) EstadoClub estado,
            @RequestParam(required = false) Boolean abiertos,
            @RequestParam(required = false) Boolean conCupo,
            @RequestParam(required = false) NivelCurso nivel,
            @RequestParam(required = false) ModalidadCurso modalidad,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano) {
        return service.listarClubes(q, institucionId, periodoId, estado, abiertos, conCupo, nivel, modalidad,
                pagina, tamano);
    }

    @GetMapping("/clubes/{id}")
    public CatalogoClubDetalleResponse club(@PathVariable Long id) {
        return service.obtenerClub(id);
    }
}
