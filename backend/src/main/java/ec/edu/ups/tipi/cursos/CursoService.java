package ec.edu.ups.tipi.cursos;

import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.clubes.Club;
import ec.edu.ups.tipi.clubes.ClubRepository;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.cursos.dto.CambioEstadoCursoRequest;
import ec.edu.ups.tipi.cursos.dto.CursoActualizarRequest;
import ec.edu.ups.tipi.cursos.dto.CursoCrearRequest;
import ec.edu.ups.tipi.cursos.dto.CursoResponse;
import ec.edu.ups.tipi.cursos.dto.HorarioResponse;
import ec.edu.ups.tipi.docentes.Docente;
import ec.edu.ups.tipi.docentes.DocenteRepository;
import ec.edu.ups.tipi.instituciones.Institucion;
import ec.edu.ups.tipi.instituciones.InstitucionRepository;
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
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import static ec.edu.ups.tipi.common.CambiosAuditoria.diferencias;
import static ec.edu.ups.tipi.common.CambiosAuditoria.texto;

@Service
@RequiredArgsConstructor
public class CursoService {

    static final Set<EstadoCurso> ESTADOS_EDITABLES = Set.of(EstadoCurso.PLANIFICADO, EstadoCurso.EN_CURSO);

    private static final Map<EstadoCurso, Set<EstadoCurso>> TRANSICIONES = Map.of(
            EstadoCurso.PLANIFICADO, Set.of(EstadoCurso.EN_CURSO, EstadoCurso.CANCELADO),
            EstadoCurso.EN_CURSO, Set.of(EstadoCurso.FINALIZADO, EstadoCurso.CANCELADO),
            EstadoCurso.FINALIZADO, Set.of(),
            EstadoCurso.CANCELADO, Set.of());

    private final CursoRepository cursoRepository;
    private final HorarioRepository horarioRepository;
    private final ClubRepository clubRepository;
    private final InstitucionRepository institucionRepository;
    private final DocenteRepository docenteRepository;
    private final AlcanceInstitucional alcance;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public PaginaResponse<CursoResponse> listar(String q, Long institucionId, Long clubId, NivelCurso nivel,
                                                ModalidadCurso modalidad, EstadoCurso estado,
                                                int pagina, int tamano, UsuarioPrincipal usuario) {
        Specification<Curso> spec = (root, cq, cb) -> cb.conjunction();

        if (alcance.esGlobal(usuario)) {
            if (institucionId != null) {
                spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), institucionId));
            }
        } else if (esDocente(usuario)) {
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
        if (StringUtils.hasText(q)) {
            String patron = "%" + q.trim().toLowerCase() + "%";
            spec = spec.and((root, cq, cb) -> cb.like(cb.lower(root.get("nombre")), patron));
        }
        if (clubId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("clubId"), clubId));
        }
        if (nivel != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("nivel"), nivel));
        }
        if (modalidad != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("modalidad"), modalidad));
        }
        if (estado != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("estado"), estado));
        }

        Pageable pageable = PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamano, 1), 100),
                Sort.by("fechaInicio").descending().and(Sort.by("nombre")));
        Page<Curso> resultado = cursoRepository.findAll(spec, pageable);
        Page<CursoResponse> respuesta = new PageImpl<>(
                armar(resultado.getContent(), alcance.soloDatosMinimos(usuario)),
                pageable, resultado.getTotalElements());
        return PaginaResponse.de(respuesta);
    }

    @Transactional(readOnly = true)
    public CursoResponse obtener(Long id, UsuarioPrincipal usuario) {
        Curso curso = buscar(id);
        verificarLectura(usuario, curso);
        return armar(List.of(curso), alcance.soloDatosMinimos(usuario)).get(0);
    }

    @Transactional
    public CursoResponse crear(CursoCrearRequest request, UsuarioPrincipal usuario) {
        Club club = clubRepository.findById(request.clubId()).orElseThrow(() ->
                new ApiException(HttpStatus.BAD_REQUEST, "El club indicado no existe."));
        alcance.verificar(usuario, club.getInstitucionId());

        CursoActualizarRequest datos = request.datos();
        String nombre = datos.nombre().trim();
        if (cursoRepository.existsByClubIdAndNombreIgnoreCase(club.getId(), nombre)) {
            throw new ApiException(HttpStatus.CONFLICT, "Ya existe un curso con ese nombre en el club.");
        }

        Curso curso = new Curso();
        curso.setClubId(club.getId());
        curso.setInstitucionId(club.getInstitucionId());
        aplicar(curso, datos);
        curso = cursoRepository.saveAndFlush(curso);

        auditoria.registrar("CURSO_CREADO", "CURSO", curso.getId(),
                "nombre=" + curso.getNombre() + ", clubId=" + curso.getClubId()
                        + ", nivel=" + curso.getNivel() + ", modalidad=" + curso.getModalidad()
                        + ", cupoMaximo=" + curso.getCupoMaximo());
        return armar(List.of(curso), false).get(0);
    }

    @Transactional
    public CursoResponse actualizar(Long id, CursoActualizarRequest datos, UsuarioPrincipal usuario) {
        Curso curso = buscar(id);
        alcance.verificar(usuario, curso.getInstitucionId());
        verificarEditable(curso);

        String nombre = datos.nombre().trim();
        if (cursoRepository.existsByClubIdAndNombreIgnoreCaseAndIdNot(curso.getClubId(), nombre, id)) {
            throw new ApiException(HttpStatus.CONFLICT, "Ya existe otro curso con ese nombre en el club.");
        }
        long inscritos = contarInscritos(List.of(id)).getOrDefault(id, 0L);
        if (datos.cupoMaximo() < inscritos) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El cupo no puede ser menor que los participantes inscritos actualmente (" + inscritos + ").");
        }

        Map<String, String> antes = instantanea(curso);
        String enlaceAnterior = curso.getEnlaceVirtual();
        String descripcionAnterior = curso.getDescripcion();
        aplicar(curso, datos);
        curso = cursoRepository.saveAndFlush(curso);

        List<String> partes = new ArrayList<>();
        String cambios = diferencias(antes, instantanea(curso));
        if (!"Sin cambios".equals(cambios)) {
            partes.add(cambios);
        }
        if (!Objects.equals(descripcionAnterior, curso.getDescripcion())) {
            partes.add("descripcion modificada");
        }
        if (!Objects.equals(enlaceAnterior, curso.getEnlaceVirtual())) {
            partes.add("enlaceVirtual modificado (valor omitido)");
        }
        auditoria.registrar("CURSO_ACTUALIZADO", "CURSO", id,
                partes.isEmpty() ? "Sin cambios" : String.join("; ", partes));
        return armar(List.of(curso), false).get(0);
    }

    @Transactional
    public CursoResponse cambiarEstado(Long id, CambioEstadoCursoRequest request, UsuarioPrincipal usuario) {
        Curso curso = buscar(id);
        alcance.verificar(usuario, curso.getInstitucionId());

        EstadoCurso actual = curso.getEstado();
        EstadoCurso nuevo = request.estado();
        if (actual == nuevo) {
            throw new ApiException(HttpStatus.CONFLICT, "El curso ya se encuentra en el estado indicado.");
        }
        if (!TRANSICIONES.get(actual).contains(nuevo)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Transición de estado no permitida: " + actual + " -> " + nuevo + ".");
        }
        String motivo = StringUtils.hasText(request.motivo()) ? request.motivo().trim() : null;
        if (nuevo == EstadoCurso.CANCELADO && motivo == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Debe indicar el motivo de la cancelación.");
        }

        curso.setEstado(nuevo);
        curso = cursoRepository.saveAndFlush(curso);

        int cerradas = 0;
        if (nuevo == EstadoCurso.FINALIZADO) {
            cerradas = cursoRepository.cerrarInscripcionesActivas(id, "FINALIZADA");
        } else if (nuevo == EstadoCurso.CANCELADO) {
            cerradas = cursoRepository.cerrarInscripcionesActivas(id, "RETIRADA");
        }

        StringBuilder detalle = new StringBuilder("estado: '" + actual + "' -> '" + nuevo + "'");
        if (motivo != null) {
            detalle.append(", motivo=").append(motivo);
        }
        if (cerradas > 0) {
            detalle.append(", inscripciones cerradas=").append(cerradas);
        }
        auditoria.registrar("CURSO_ESTADO_CAMBIADO", "CURSO", id, detalle.toString());
        return armar(List.of(curso), false).get(0);
    }

    @Transactional
    public void eliminar(Long id, UsuarioPrincipal usuario) {
        Curso curso = buscar(id);
        alcance.verificar(usuario, curso.getInstitucionId());
        if (curso.getEstado() != EstadoCurso.PLANIFICADO) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Solo se pueden eliminar cursos planificados. Si el curso ya inició, cancélelo.");
        }
        if (cursoRepository.contarRegistrosVinculados(id) > 0) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El curso tiene inscripciones o solicitudes registradas y no se puede eliminar. Cancélelo.");
        }
        horarioRepository.deleteAll(horarioRepository.findByCursoIdOrderByDiaSemanaAscHoraInicioAsc(id));
        horarioRepository.flush();
        cursoRepository.delete(curso);

        auditoria.registrar("CURSO_ELIMINADO", "CURSO", id,
                "nombre=" + curso.getNombre() + ", clubId=" + curso.getClubId());
    }

    private Curso buscar(Long id) {
        return cursoRepository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Curso no encontrado."));
    }

    private void verificarEditable(Curso curso) {
        if (!ESTADOS_EDITABLES.contains(curso.getEstado())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El curso está " + curso.getEstado().name().toLowerCase() + " y ya no se puede modificar.");
        }
    }

    private boolean esDocente(UsuarioPrincipal usuario) {
        return "DOCENTE".equals(usuario.getRolCodigo());
    }

    private Docente docentePropio(UsuarioPrincipal usuario) {
        return docenteRepository.findByUsuarioId(usuario.getId()).orElseThrow(() ->
                new ApiException(HttpStatus.FORBIDDEN, "Su usuario no está vinculado a un registro de docente."));
    }

    private void verificarLectura(UsuarioPrincipal usuario, Curso curso) {
        if (alcance.esGlobal(usuario)) {
            return;
        }
        if (esDocente(usuario)) {
            Long docenteId = docentePropio(usuario).getId();
            boolean coordina = clubRepository.findById(curso.getClubId())
                    .map(club -> docenteId.equals(club.getDocenteId()))
                    .orElse(false);
            if (!coordina) {
                throw new ApiException(HttpStatus.FORBIDDEN, "No tiene permisos sobre este curso.");
            }
            return;
        }
        alcance.verificar(usuario, curso.getInstitucionId());
    }

    private void aplicar(Curso curso, CursoActualizarRequest datos) {
        if (datos.fechaFin().isBefore(datos.fechaInicio())) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "La fecha de fin no puede ser anterior a la fecha de inicio.");
        }
        String lugar = limpiar(datos.lugar());
        String enlace = limpiar(datos.enlaceVirtual());
        switch (datos.modalidad()) {
            case ONLINE -> {
                if (enlace == null) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Un curso online requiere el enlace de la sala virtual.");
                }
                lugar = null;
            }
            case PRESENCIAL -> {
                if (lugar == null) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Un curso presencial requiere el lugar.");
                }
                enlace = null;
            }
            case HIBRIDO -> {
                if (lugar == null || enlace == null) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Un curso híbrido requiere el lugar y el enlace de la sala virtual.");
                }
            }
        }
        curso.setNombre(datos.nombre().trim());
        curso.setDescripcion(limpiar(datos.descripcion()));
        curso.setNivel(datos.nivel());
        curso.setModalidad(datos.modalidad());
        curso.setLugar(lugar);
        curso.setEnlaceVirtual(enlace);
        curso.setFechaInicio(datos.fechaInicio());
        curso.setFechaFin(datos.fechaFin());
        curso.setDuracionHoras(datos.duracionHoras() == null ? null : datos.duracionHoras().shortValue());
        curso.setCupoMaximo(datos.cupoMaximo());
    }

    private Map<Long, Long> contarInscritos(Collection<Long> ids) {
        Map<Long, Long> conteo = new HashMap<>();
        if (ids.isEmpty()) {
            return conteo;
        }
        for (Object[] fila : cursoRepository.contarInscritosActivos(ids)) {
            conteo.put(((Number) fila[0]).longValue(), ((Number) fila[1]).longValue());
        }
        return conteo;
    }

    private List<CursoResponse> armar(List<Curso> cursos, boolean ocultarEnlace) {
        if (cursos.isEmpty()) {
            return List.of();
        }
        List<Long> ids = cursos.stream().map(Curso::getId).toList();
        Set<Long> clubIds = cursos.stream().map(Curso::getClubId).collect(Collectors.toSet());
        Set<Long> institucionIds = cursos.stream().map(Curso::getInstitucionId).collect(Collectors.toSet());

        Map<Long, String> clubes = clubRepository.findAllById(clubIds).stream()
                .collect(Collectors.toMap(Club::getId, Club::getNombre));
        Map<Long, String> instituciones = institucionRepository.findAllById(institucionIds).stream()
                .collect(Collectors.toMap(Institucion::getId, Institucion::getNombre));
        Map<Long, List<HorarioResponse>> horarios = new HashMap<>();
        for (Horario h : horarioRepository.findByCursoIdInOrderByDiaSemanaAscHoraInicioAsc(ids)) {
            horarios.computeIfAbsent(h.getCursoId(), k -> new ArrayList<>()).add(HorarioResponse.de(h));
        }
        Map<Long, Long> inscritos = contarInscritos(ids);

        return cursos.stream()
                .map(c -> CursoResponse.de(c, clubes.get(c.getClubId()), instituciones.get(c.getInstitucionId()),
                        horarios.getOrDefault(c.getId(), List.of()), inscritos.getOrDefault(c.getId(), 0L),
                        ocultarEnlace))
                .toList();
    }

    private Map<String, String> instantanea(Curso c) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("nombre", texto(c.getNombre()));
        m.put("nivel", texto(c.getNivel()));
        m.put("modalidad", texto(c.getModalidad()));
        m.put("lugar", texto(c.getLugar()));
        m.put("fechaInicio", texto(c.getFechaInicio()));
        m.put("fechaFin", texto(c.getFechaFin()));
        m.put("duracionHoras", texto(c.getDuracionHoras()));
        m.put("cupoMaximo", texto(c.getCupoMaximo()));
        return m;
    }

    private String limpiar(String valor) {
        if (valor == null) {
            return null;
        }
        String recortado = valor.trim();
        return recortado.isEmpty() ? null : recortado;
    }
}