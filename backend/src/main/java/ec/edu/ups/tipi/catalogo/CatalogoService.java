package ec.edu.ups.tipi.catalogo;

import ec.edu.ups.tipi.catalogo.dto.CatalogoClubDetalleResponse;
import ec.edu.ups.tipi.catalogo.dto.CatalogoClubResponse;
import ec.edu.ups.tipi.catalogo.dto.CatalogoCursoResponse;
import ec.edu.ups.tipi.catalogo.dto.CatalogoInstitucionResponse;
import ec.edu.ups.tipi.catalogo.dto.TrayectoriaClubResponse;
import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.cursos.Horario;
import ec.edu.ups.tipi.cursos.HorarioRepository;
import ec.edu.ups.tipi.cursos.ModalidadCurso;
import ec.edu.ups.tipi.cursos.NivelCurso;
import ec.edu.ups.tipi.cursos.dto.HorarioResponse;
import ec.edu.ups.tipi.instituciones.EstadoAdhesion;
import ec.edu.ups.tipi.periodos.PeriodoAcademico;
import ec.edu.ups.tipi.periodos.PeriodoRepository;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CatalogoService {

    private final CatalogoInstitucionRepository institucionRepository;
    private final CatalogoClubRepository clubRepository;
    private final CatalogoCursoRepository cursoRepository;
    private final HorarioRepository horarioRepository;
    private final PeriodoRepository periodoRepository;

    @Transactional(readOnly = true)
    public List<CatalogoInstitucionResponse> listarInstituciones(Integer periodoId, String q,
                                                                 EstadoAdhesion estadoAdhesion) {
        Integer periodo = periodoConsultado(periodoId);
        Specification<CatalogoInstitucion> spec = (root, cq, cb) -> cb.equal(root.get("periodoId"), periodo);

        if (StringUtils.hasText(q)) {
            String patron = "%" + q.trim().toLowerCase() + "%";
            spec = spec.and((root, cq, cb) -> cb.or(
                    cb.like(cb.lower(root.get("nombre")), patron),
                    cb.like(cb.lower(root.get("codigoAmie")), patron),
                    cb.like(cb.lower(root.get("canton")), patron)));
        }
        if (estadoAdhesion != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("estadoAdhesion"), estadoAdhesion));
        }
        return institucionRepository.findAll(spec, Sort.by("nombre")).stream()
                .map(CatalogoInstitucionResponse::de)
                .toList();
    }

    @Transactional(readOnly = true)
    public PaginaResponse<CatalogoClubResponse> listarClubes(String q, Long institucionId, Integer periodoId,
                                                             EstadoClub estado, Boolean abiertos, Boolean conCupo,
                                                             NivelCurso nivel, ModalidadCurso modalidad,
                                                             int pagina, int tamano) {
        Specification<CatalogoClub> spec = (root, cq, cb) -> cb.conjunction();

        if (StringUtils.hasText(q)) {
            String patron = "%" + q.trim().toLowerCase() + "%";
            spec = spec.and((root, cq, cb) -> cb.or(
                    cb.like(cb.lower(root.get("nombre")), patron),
                    cb.like(cb.lower(root.get("institucionNombre")), patron),
                    cb.like(cb.lower(root.get("codigoAmie")), patron)));
        }
        if (institucionId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), institucionId));
        }
        if (periodoId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("periodoId"), periodoId));
        }
        if (estado != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("estado"), estado));
        }
        if (abiertos != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("admiteInscripciones"), abiertos));
        }
        if (conCupo != null) {
            spec = spec.and((root, cq, cb) -> conCupo
                    ? cb.greaterThan(root.<Long>get("cuposDisponibles"), 0L)
                    : cb.equal(root.<Long>get("cuposDisponibles"), 0L));
        }
        if (nivel != null || modalidad != null) {
            spec = spec.and((root, cq, cb) -> {
                Subquery<Long> conCursos = cq.subquery(Long.class);
                Root<CatalogoCurso> curso = conCursos.from(CatalogoCurso.class);
                conCursos.select(curso.get("clubId")).where(cb.and(
                        cb.isTrue(curso.<Boolean>get("admiteInscripciones")),
                        nivel != null ? cb.equal(curso.get("nivel"), nivel) : cb.conjunction(),
                        modalidad != null ? cb.equal(curso.get("modalidad"), modalidad) : cb.conjunction()));
                return root.get("id").in(conCursos);
            });
        }

        Pageable pageable = PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamano, 1), 100),
                Sort.by("institucionNombre", "nombre", "id"));
        return PaginaResponse.de(clubRepository.findAll(spec, pageable).map(CatalogoClubResponse::de));
    }

    @Transactional(readOnly = true)
    public CatalogoClubDetalleResponse obtenerClub(Long id) {
        CatalogoClub club = clubRepository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Club no encontrado."));
        List<CatalogoCurso> cursos = cursoRepository.findByClubIdOrderByFechaInicioAscNombreAsc(id);
        Map<Long, List<HorarioResponse>> horarios = cursos.isEmpty() ? Map.of()
                : horarioRepository.findByCursoIdInOrderByDiaSemanaAscHoraInicioAsc(
                                cursos.stream().map(CatalogoCurso::getId).toList()).stream()
                        .collect(Collectors.groupingBy(Horario::getCursoId,
                                Collectors.mapping(HorarioResponse::de, Collectors.toList())));
        List<CatalogoCursoResponse> detalleCursos = cursos.stream()
                .map(c -> CatalogoCursoResponse.de(c, horarios.getOrDefault(c.getId(), List.of())))
                .toList();
        return new CatalogoClubDetalleResponse(CatalogoClubResponse.de(club), TrayectoriaClubResponse.de(club),
                detalleCursos);
    }

    private Integer periodoConsultado(Integer periodoId) {
        if (periodoId != null) {
            if (!periodoRepository.existsById(periodoId)) {
                throw new ApiException(HttpStatus.NOT_FOUND, "El período académico indicado no existe.");
            }
            return periodoId;
        }
        return periodoRepository.findByActivoTrue().map(PeriodoAcademico::getId).orElseThrow(() ->
                new ApiException(HttpStatus.CONFLICT,
                        "No hay un período académico activo; indique el período a consultar con periodoId."));
    }
}
