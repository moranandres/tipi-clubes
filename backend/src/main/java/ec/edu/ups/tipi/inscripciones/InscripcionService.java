package ec.edu.ups.tipi.inscripciones;

import ec.edu.ups.tipi.clubes.Club;
import ec.edu.ups.tipi.clubes.ClubRepository;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.cursos.Curso;
import ec.edu.ups.tipi.cursos.CursoRepository;
import ec.edu.ups.tipi.docentes.Docente;
import ec.edu.ups.tipi.docentes.DocenteRepository;
import ec.edu.ups.tipi.estudiantes.Estudiante;
import ec.edu.ups.tipi.estudiantes.EstudianteRepository;
import ec.edu.ups.tipi.inscripciones.dto.InscripcionCursoResponse;
import ec.edu.ups.tipi.inscripciones.dto.InscripcionResponse;
import ec.edu.ups.tipi.inscripciones.dto.InscripcionResumenResponse;
import ec.edu.ups.tipi.inscripciones.dto.InscripcionVista;
import ec.edu.ups.tipi.instituciones.Institucion;
import ec.edu.ups.tipi.instituciones.InstitucionRepository;
import ec.edu.ups.tipi.periodos.PeriodoAcademico;
import ec.edu.ups.tipi.periodos.PeriodoRepository;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InscripcionService {

    private final InscripcionRepository inscripcionRepository;
    private final InscripcionCursoRepository inscripcionCursoRepository;
    private final EstudianteRepository estudianteRepository;
    private final ClubRepository clubRepository;
    private final CursoRepository cursoRepository;
    private final InstitucionRepository institucionRepository;
    private final PeriodoRepository periodoRepository;
    private final DocenteRepository docenteRepository;
    private final AlcanceInstitucional alcance;

    @Transactional(readOnly = true)
    public PaginaResponse<InscripcionVista> listar(Long institucionId, Long clubId, Long cursoId, Long estudianteId,
                                                   EstadoInscripcion estado, int pagina, int tamano,
                                                   UsuarioPrincipal usuario) {
        Specification<Inscripcion> spec = (root, cq, cb) -> cb.conjunction();

        if (alcance.esGlobal(usuario)) {
            if (institucionId != null) {
                spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), institucionId));
            }
        } else if ("DOCENTE".equals(usuario.getRolCodigo())) {
            Long docenteId = docentePropio(usuario).getId();
            spec = spec.and((root, cq, cb) -> {
                Subquery<Long> clubesDelDocente = cq.subquery(Long.class);
                Root<Club> club = clubesDelDocente.from(Club.class);
                clubesDelDocente.select(club.get("id")).where(cb.equal(club.get("docenteId"), docenteId));
                return root.get("clubId").in(clubesDelDocente);
            });
        } else {
            Long propia = alcance.institucionPropia(usuario);
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), propia));
        }
        if (clubId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("clubId"), clubId));
        }
        if (cursoId != null) {
            spec = spec.and((root, cq, cb) -> {
                Subquery<Long> enCurso = cq.subquery(Long.class);
                Root<InscripcionCurso> ic = enCurso.from(InscripcionCurso.class);
                enCurso.select(ic.get("estudianteId")).where(cb.equal(ic.get("cursoId"), cursoId),
                        cb.equal(ic.get("clubId"), root.get("clubId")));
                return root.get("estudianteId").in(enCurso);
            });
        }
        if (estudianteId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("estudianteId"), estudianteId));
        }
        if (estado != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("estado"), estado));
        }

        Pageable pageable = PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamano, 1), 100),
                Sort.by(Sort.Direction.DESC, "fechaIngreso").and(Sort.by("id")));
        Page<Inscripcion> resultado = inscripcionRepository.findAll(spec, pageable);
        return PaginaResponse.de(new PageImpl<>(armar(resultado.getContent(), alcance.soloDatosMinimos(usuario)),
                pageable, resultado.getTotalElements()));
    }

    private Docente docentePropio(UsuarioPrincipal usuario) {
        return docenteRepository.findByUsuarioId(usuario.getId()).orElseThrow(() ->
                new ApiException(HttpStatus.FORBIDDEN, "Su usuario no está vinculado a un registro de docente."));
    }

    private List<InscripcionVista> armar(List<Inscripcion> inscripciones, boolean minima) {
        if (inscripciones.isEmpty()) {
            return List.of();
        }
        Set<Long> estudianteIds = inscripciones.stream().map(Inscripcion::getEstudianteId).collect(Collectors.toSet());
        Set<Long> clubIds = inscripciones.stream().map(Inscripcion::getClubId).collect(Collectors.toSet());

        Map<Long, Estudiante> estudiantes = estudianteRepository.findAllById(estudianteIds).stream()
                .collect(Collectors.toMap(Estudiante::getId, Function.identity()));
        Map<Long, Club> clubes = clubRepository.findAllById(clubIds).stream()
                .collect(Collectors.toMap(Club::getId, Function.identity()));
        Map<Long, String> instituciones = institucionRepository.findAllById(
                        inscripciones.stream().map(Inscripcion::getInstitucionId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Institucion::getId, Institucion::getNombre));
        Map<Integer, String> periodos = periodoRepository.findAllById(
                        inscripciones.stream().map(Inscripcion::getPeriodoId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(PeriodoAcademico::getId, PeriodoAcademico::getNombre));

        List<InscripcionCurso> enCursos = inscripcionCursoRepository.findByClubIdInAndEstudianteIdIn(clubIds, estudianteIds);
        Map<Long, Curso> cursos = cursoRepository.findAllById(
                        enCursos.stream().map(InscripcionCurso::getCursoId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Curso::getId, Function.identity()));
        Map<String, List<InscripcionCursoResponse>> cursosPorMembresia = new HashMap<>();
        for (InscripcionCurso ic : enCursos) {
            Curso curso = cursos.get(ic.getCursoId());
            cursosPorMembresia.computeIfAbsent(ic.getEstudianteId() + "-" + ic.getClubId(), k -> new ArrayList<>())
                    .add(InscripcionCursoResponse.de(ic, curso.getNombre(), curso.getNivel()));
        }

        return inscripciones.stream()
                .map(i -> {
                    Estudiante e = estudiantes.get(i.getEstudianteId());
                    String club = clubes.get(i.getClubId()).getNombre();
                    String institucion = instituciones.get(i.getInstitucionId());
                    String periodo = periodos.get(i.getPeriodoId());
                    List<InscripcionCursoResponse> susCursos =
                            cursosPorMembresia.getOrDefault(i.getEstudianteId() + "-" + i.getClubId(), List.of());
                    return minima
                            ? (InscripcionVista) InscripcionResumenResponse.de(i, e, institucion, club, periodo, susCursos)
                            : (InscripcionVista) InscripcionResponse.de(i, e, institucion, club, periodo, susCursos);
                })
                .toList();
    }
}
