package ec.edu.ups.tipi.inscripciones;

import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.clubes.Club;
import ec.edu.ups.tipi.clubes.ClubRepository;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.cursos.Curso;
import ec.edu.ups.tipi.cursos.CursoRepository;
import ec.edu.ups.tipi.cursos.NivelCurso;
import ec.edu.ups.tipi.docentes.Docente;
import ec.edu.ups.tipi.docentes.DocenteRepository;
import ec.edu.ups.tipi.estudiantes.Estudiante;
import ec.edu.ups.tipi.estudiantes.EstudianteRepository;
import ec.edu.ups.tipi.inscripciones.dto.MotivoRequest;
import ec.edu.ups.tipi.inscripciones.dto.SolicitudAprobarRequest;
import ec.edu.ups.tipi.inscripciones.dto.SolicitudCrearRequest;
import ec.edu.ups.tipi.inscripciones.dto.SolicitudResponse;
import ec.edu.ups.tipi.inscripciones.dto.SolicitudResumenResponse;
import ec.edu.ups.tipi.inscripciones.dto.SolicitudVista;
import ec.edu.ups.tipi.instituciones.Institucion;
import ec.edu.ups.tipi.instituciones.InstitucionRepository;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.usuarios.Usuario;
import ec.edu.ups.tipi.usuarios.UsuarioRepository;
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

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SolicitudInscripcionService {

    private static final ZoneId ZONA = ZoneId.of("America/Guayaquil");
    private static final Set<EstadoSolicitud> ABIERTAS = Set.of(EstadoSolicitud.PENDIENTE, EstadoSolicitud.EN_REVISION);
    private static final String ENTIDAD = "SOLICITUD_INSCRIPCION";

    private final SolicitudInscripcionRepository solicitudRepository;
    private final InscripcionRepository inscripcionRepository;
    private final InscripcionCursoRepository inscripcionCursoRepository;
    private final EstudianteRepository estudianteRepository;
    private final ReglasInscripcion reglas;
    private final ClubRepository clubRepository;
    private final CursoRepository cursoRepository;
    private final InstitucionRepository institucionRepository;
    private final DocenteRepository docenteRepository;
    private final UsuarioRepository usuarioRepository;
    private final AlcanceInstitucional alcance;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public PaginaResponse<SolicitudVista> listar(String q, EstadoSolicitud estado, Long institucionId, Long clubId,
                                                 Long cursoId, Long estudianteId, NivelCurso nivel,
                                                 int pagina, int tamano, UsuarioPrincipal usuario) {
        boolean minima = alcance.soloDatosMinimos(usuario);
        Specification<SolicitudInscripcion> spec = (root, cq, cb) -> cb.conjunction();

        if (alcance.esGlobal(usuario)) {
            if (institucionId != null) {
                spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), institucionId));
            }
        } else if (esDocente(usuario)) {
            Long docenteId = docentePropio(usuario).getId();
            Long usuarioId = usuario.getId();
            spec = spec.and((root, cq, cb) -> {
                Subquery<Long> clubesDelDocente = cq.subquery(Long.class);
                Root<Club> club = clubesDelDocente.from(Club.class);
                clubesDelDocente.select(club.get("id")).where(cb.equal(club.get("docenteId"), docenteId));
                return cb.or(root.get("clubId").in(clubesDelDocente),
                        cb.equal(root.get("solicitadoPor"), usuarioId));
            });
        } else {
            Long propia = alcance.institucionPropia(usuario);
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), propia));
        }
        if (StringUtils.hasText(q)) {
            String patron = "%" + q.trim().toLowerCase() + "%";
            spec = spec.and((root, cq, cb) -> {
                Subquery<Long> coincidencias = cq.subquery(Long.class);
                Root<Estudiante> e = coincidencias.from(Estudiante.class);
                coincidencias.select(e.get("id")).where(minima
                        ? cb.like(cb.lower(e.get("codigoInterno")), patron)
                        : cb.or(cb.like(cb.lower(e.get("nombres")), patron),
                                cb.like(cb.lower(e.get("apellidos")), patron),
                                cb.like(cb.lower(e.get("codigoInterno")), patron)));
                return root.get("estudianteId").in(coincidencias);
            });
        }
        if (estado != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("estado"), estado));
        }
        if (clubId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("clubId"), clubId));
        }
        if (cursoId != null) {
            spec = spec.and((root, cq, cb) -> cb.or(cb.equal(root.get("cursoId"), cursoId),
                    cb.equal(root.get("cursoAsignadoId"), cursoId)));
        }
        if (estudianteId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("estudianteId"), estudianteId));
        }
        if (nivel != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("nivel"), nivel));
        }

        Pageable pageable = PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamano, 1), 100),
                Sort.by(Sort.Direction.DESC, "fechaSolicitud"));
        Page<SolicitudInscripcion> resultado = solicitudRepository.findAll(spec, pageable);
        return PaginaResponse.de(new PageImpl<>(armar(resultado.getContent(), minima), pageable,
                resultado.getTotalElements()));
    }

    @Transactional(readOnly = true)
    public SolicitudVista obtener(Long id, UsuarioPrincipal usuario) {
        SolicitudInscripcion solicitud = buscar(id);
        verificarLectura(usuario, solicitud);
        return armar(List.of(solicitud), alcance.soloDatosMinimos(usuario)).get(0);
    }

    @Transactional
    public SolicitudResponse crear(SolicitudCrearRequest request, UsuarioPrincipal usuario) {
        Club club = clubRepository.findById(request.clubId()).orElseThrow(() ->
                new ApiException(HttpStatus.BAD_REQUEST, "El club indicado no existe."));
        if (esDocente(usuario)) {
            if (!docentePropio(usuario).getId().equals(club.getDocenteId())) {
                throw new ApiException(HttpStatus.FORBIDDEN,
                        "Solo puede registrar solicitudes para los clubes que coordina.");
            }
        } else {
            alcance.verificar(usuario, club.getInstitucionId());
        }
        Estudiante estudiante = estudianteRepository.findById(request.estudianteId())
                .filter(e -> e.getInstitucionId().equals(club.getInstitucionId()))
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST,
                        "El estudiante indicado no existe en la institución del club."));

        Curso curso = null;
        if (request.cursoId() != null) {
            curso = cursoRepository.findById(request.cursoId())
                    .filter(c -> c.getClubId().equals(club.getId()))
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST,
                            "El curso indicado no pertenece al club de la solicitud."));
        }

        String conocimientos = limpiar(request.conocimientos());
        String experiencia = limpiar(request.experienciaPrevia());
        validarFormulario(request.nivel(), conocimientos, experiencia);

        if (solicitudRepository.existsByEstudianteIdAndClubIdAndEstadoIn(estudiante.getId(), club.getId(), ABIERTAS)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El estudiante ya tiene una solicitud pendiente o en revisión para este club.");
        }
        boolean integrante = reglas.esIntegranteActivo(estudiante.getId(), club.getId());
        if (integrante && curso == null) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El estudiante ya es integrante activo del club. Para inscribirlo en un curso, indique el curso.");
        }
        if (curso != null && reglas.estaEnCurso(estudiante.getId(), curso.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "El estudiante ya está inscrito en ese curso.");
        }

        SolicitudInscripcion solicitud = new SolicitudInscripcion();
        solicitud.setEstudianteId(estudiante.getId());
        solicitud.setInstitucionId(club.getInstitucionId());
        solicitud.setClubId(club.getId());
        solicitud.setCursoId(curso == null ? null : curso.getId());
        solicitud.setNivel(request.nivel());
        solicitud.setConocimientos(conocimientos);
        solicitud.setExperienciaPrevia(experiencia);
        solicitud.setMotivacion(request.motivacion().trim());
        solicitud.setSolicitadoPor(usuario.getId());
        solicitud.setFechaSolicitud(Instant.now());
        solicitud = solicitudRepository.saveAndFlush(solicitud);

        List<String> advertencias = new ArrayList<>();
        if (!reglas.participacionOtorgada(estudiante.getId())) {
            advertencias.add("El estudiante aún no tiene la autorización de participación otorgada; "
                    + "sin ella la solicitud no podrá aprobarse.");
        }
        if (!integrante && inscripcionRepository.countByClubIdAndEstado(club.getId(), EstadoInscripcion.ACTIVA)
                >= club.getCupoMaximo()) {
            advertencias.add("El club no tiene cupos disponibles en este momento.");
        }
        if (curso != null) {
            if (curso.getNivel() != request.nivel()) {
                advertencias.add("El nivel declarado (" + request.nivel() + ") no coincide con el nivel del curso ("
                        + curso.getNivel() + "). Quien apruebe definirá el nivel y el curso definitivos.");
            }
            if (inscripcionCursoRepository.countByCursoIdAndEstado(curso.getId(), EstadoInscripcionCurso.ACTIVA)
                    >= curso.getCupoMaximo()) {
                advertencias.add("El curso no tiene cupos disponibles en este momento.");
            }
            String cruce = solicitudRepository.cruceHorario(estudiante.getId(), curso.getId());
            if (cruce != null) {
                advertencias.add("El horario del curso se cruza con el curso " + cruce
                        + " en el que el estudiante ya está inscrito.");
            }
        }

        auditoria.registrar("SOLICITUD_INSCRIPCION_CREADA", ENTIDAD, solicitud.getId(),
                "codigo=" + estudiante.getCodigoInterno() + ", clubId=" + club.getId()
                        + ", cursoId=" + texto(solicitud.getCursoId()) + ", nivel=" + solicitud.getNivel());
        return completo(solicitud, advertencias);
    }

    @Transactional
    public SolicitudResponse tomarEnRevision(Long id, UsuarioPrincipal usuario) {
        SolicitudInscripcion solicitud = bloquear(id);
        alcance.verificar(usuario, solicitud.getInstitucionId());
        exigirEstado(solicitud, EstadoSolicitud.PENDIENTE, "tomar en revisión");
        if (solicitud.getSolicitadoPor().equals(usuario.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Quien registró la solicitud no puede tomarla en revisión.");
        }

        solicitud.setEstado(EstadoSolicitud.EN_REVISION);
        solicitud.setRevisadoPor(usuario.getId());
        solicitud.setFechaRevision(Instant.now());
        solicitud = solicitudRepository.saveAndFlush(solicitud);

        auditoria.registrar("SOLICITUD_INSCRIPCION_EN_REVISION", ENTIDAD, id,
                "codigo=" + codigoEstudiante(solicitud) + "; estado: 'PENDIENTE' -> 'EN_REVISION'");
        return completo(solicitud, List.of());
    }

    @Transactional
    public SolicitudResponse aprobar(Long id, SolicitudAprobarRequest request, UsuarioPrincipal usuario) {
        SolicitudInscripcion solicitud = bloquear(id);
        alcance.verificar(usuario, solicitud.getInstitucionId());
        exigirEstado(solicitud, EstadoSolicitud.EN_REVISION, "aprobar");
        exigirResolutorDistinto(solicitud, usuario);

        boolean sobrecupo = Boolean.TRUE.equals(request.autorizarSobrecupo());
        String observacion = limpiar(request.observacion());
        if (sobrecupo) {
            if (!"ADMIN".equals(usuario.getRolCodigo())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Solo un administrador puede autorizar un sobrecupo.");
            }
            if (observacion == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Debe justificar en la observación la autorización del sobrecupo.");
            }
        }

        Club club = clubRepository.findById(solicitud.getClubId()).orElseThrow();
        Long cursoAsignadoId = request.cursoId() != null ? request.cursoId() : solicitud.getCursoId();
        if (cursoAsignadoId != null) {
            Curso curso = cursoRepository.findById(cursoAsignadoId)
                    .filter(c -> c.getClubId().equals(club.getId()))
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST,
                            "El curso asignado debe pertenecer al club de la solicitud."));
            if (curso.getNivel() != request.nivelAsignado()) {
                throw new ApiException(HttpStatus.CONFLICT, "El curso asignado es de nivel " + curso.getNivel()
                        + " y no coincide con el nivel asignado al estudiante (" + request.nivelAsignado() + ").");
            }
        }

        LocalDate hoy = LocalDate.now(ZONA);
        Inscripcion inscripcion = inscripcionRepository
                .findByEstudianteIdAndClubId(solicitud.getEstudianteId(), club.getId())
                .orElse(null);
        String movimientoClub;
        if (inscripcion == null) {
            inscripcion = new Inscripcion();
            inscripcion.setEstudianteId(solicitud.getEstudianteId());
            inscripcion.setClubId(club.getId());
            inscripcion.setInstitucionId(club.getInstitucionId());
            inscripcion.setPeriodoId(club.getPeriodoId());
            inscripcion.setFechaIngreso(hoy);
            inscripcion.setEstado(EstadoInscripcion.ACTIVA);
            inscripcion.setSobrecupoAutorizado(sobrecupo);
            movimientoClub = "nueva";
        } else if (inscripcion.getEstado() != EstadoInscripcion.ACTIVA) {
            movimientoClub = "reactivada desde " + inscripcion.getEstado()
                    + " (ingreso anterior " + inscripcion.getFechaIngreso() + ")";
            inscripcion.setEstado(EstadoInscripcion.ACTIVA);
            inscripcion.setFechaIngreso(hoy);
            inscripcion.setFechaRetiro(null);
            inscripcion.setSobrecupoAutorizado(sobrecupo);
        } else {
            if (cursoAsignadoId == null) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "El estudiante ya es integrante activo del club y la aprobación no asigna ningún curso.");
            }
            if (sobrecupo) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "El estudiante ya es integrante del club; no corresponde autorizar sobrecupo.");
            }
            movimientoClub = "ya era integrante";
        }
        inscripcion = inscripcionRepository.saveAndFlush(inscripcion);

        InscripcionCurso inscripcionCurso = null;
        if (cursoAsignadoId != null) {
            inscripcionCurso = inscripcionCursoRepository
                    .findByEstudianteIdAndCursoId(solicitud.getEstudianteId(), cursoAsignadoId)
                    .orElse(null);
            if (inscripcionCurso == null) {
                inscripcionCurso = new InscripcionCurso();
                inscripcionCurso.setEstudianteId(solicitud.getEstudianteId());
                inscripcionCurso.setCursoId(cursoAsignadoId);
                inscripcionCurso.setClubId(club.getId());
            } else if (inscripcionCurso.getEstado() == EstadoInscripcionCurso.ACTIVA) {
                throw new ApiException(HttpStatus.CONFLICT, "El estudiante ya está inscrito en el curso asignado.");
            }
            inscripcionCurso.setFechaIngreso(hoy);
            inscripcionCurso.setFechaFin(null);
            inscripcionCurso.setResultado(null);
            inscripcionCurso.setEstado(EstadoInscripcionCurso.ACTIVA);
            inscripcionCurso = inscripcionCursoRepository.saveAndFlush(inscripcionCurso);
        }

        solicitud.setEstado(EstadoSolicitud.APROBADA);
        solicitud.setResueltoPor(usuario.getId());
        solicitud.setFechaResolucion(Instant.now());
        solicitud.setNivelAsignado(request.nivelAsignado());
        solicitud.setCursoAsignadoId(cursoAsignadoId);
        solicitud.setInscripcionId(inscripcion.getId());
        solicitud.setInscripcionCursoId(inscripcionCurso == null ? null : inscripcionCurso.getId());
        solicitud.setSobrecupoAutorizado(sobrecupo);
        solicitud.setObservacionResolucion(observacion);
        solicitud = solicitudRepository.saveAndFlush(solicitud);

        auditoria.registrar("SOLICITUD_INSCRIPCION_APROBADA", ENTIDAD, id,
                "codigo=" + codigoEstudiante(solicitud) + ", clubId=" + club.getId()
                        + ", nivelAsignado=" + request.nivelAsignado()
                        + ", cursoAsignadoId=" + texto(cursoAsignadoId)
                        + ", inscripcionId=" + inscripcion.getId() + " (" + movimientoClub + ")"
                        + (inscripcionCurso != null ? ", inscripcionCursoId=" + inscripcionCurso.getId() : "")
                        + (sobrecupo ? ", sobrecupo autorizado" : ""));
        return completo(solicitud, List.of());
    }

    @Transactional
    public SolicitudResponse rechazar(Long id, MotivoRequest request, UsuarioPrincipal usuario) {
        SolicitudInscripcion solicitud = bloquear(id);
        alcance.verificar(usuario, solicitud.getInstitucionId());
        exigirEstado(solicitud, EstadoSolicitud.EN_REVISION, "rechazar");
        exigirResolutorDistinto(solicitud, usuario);

        solicitud.setEstado(EstadoSolicitud.RECHAZADA);
        solicitud.setResueltoPor(usuario.getId());
        solicitud.setFechaResolucion(Instant.now());
        solicitud.setObservacionResolucion(request.motivo().trim());
        solicitud = solicitudRepository.saveAndFlush(solicitud);

        auditoria.registrar("SOLICITUD_INSCRIPCION_RECHAZADA", ENTIDAD, id,
                "codigo=" + codigoEstudiante(solicitud) + "; estado: 'EN_REVISION' -> 'RECHAZADA'; motivo registrado");
        return completo(solicitud, List.of());
    }

    @Transactional
    public SolicitudResponse cancelar(Long id, MotivoRequest request, UsuarioPrincipal usuario) {
        SolicitudInscripcion solicitud = bloquear(id);
        if (esDocente(usuario)) {
            if (!solicitud.getSolicitadoPor().equals(usuario.getId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Solo puede cancelar las solicitudes que usted registró.");
            }
        } else {
            alcance.verificar(usuario, solicitud.getInstitucionId());
        }
        if (!ABIERTAS.contains(solicitud.getEstado())) {
            throw new ApiException(HttpStatus.CONFLICT, "Solo se pueden cancelar solicitudes pendientes o en revisión. "
                    + "Estado actual: " + solicitud.getEstado() + ".");
        }

        EstadoSolicitud anterior = solicitud.getEstado();
        solicitud.setEstado(EstadoSolicitud.CANCELADA);
        solicitud.setResueltoPor(usuario.getId());
        solicitud.setFechaResolucion(Instant.now());
        solicitud.setObservacionResolucion(request.motivo().trim());
        solicitud = solicitudRepository.saveAndFlush(solicitud);

        auditoria.registrar("SOLICITUD_INSCRIPCION_CANCELADA", ENTIDAD, id,
                "codigo=" + codigoEstudiante(solicitud) + "; estado: '" + anterior + "' -> 'CANCELADA'; motivo registrado");
        return completo(solicitud, List.of());
    }

    private SolicitudInscripcion buscar(Long id) {
        return solicitudRepository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Solicitud de inscripción no encontrada."));
    }

    private SolicitudInscripcion bloquear(Long id) {
        return solicitudRepository.bloquear(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Solicitud de inscripción no encontrada."));
    }

    private void exigirEstado(SolicitudInscripcion solicitud, EstadoSolicitud requerido, String accion) {
        if (solicitud.getEstado() != requerido) {
            throw new ApiException(HttpStatus.CONFLICT, "Para " + accion + " una solicitud debe estar en estado "
                    + requerido + ". Estado actual: " + solicitud.getEstado() + ".");
        }
    }

    private void exigirResolutorDistinto(SolicitudInscripcion solicitud, UsuarioPrincipal usuario) {
        if (solicitud.getSolicitadoPor().equals(usuario.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Quien registró la solicitud no puede aprobarla ni rechazarla.");
        }
    }

    private void validarFormulario(NivelCurso nivel, String conocimientos, String experiencia) {
        if (nivel != NivelCurso.PRINCIPIANTE && conocimientos == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Para el nivel " + nivel + " debe describir los conocimientos del estudiante.");
        }
        if (nivel == NivelCurso.AVANZADO && experiencia == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Para el nivel AVANZADO debe describir la experiencia previa del estudiante.");
        }
    }

    private boolean esDocente(UsuarioPrincipal usuario) {
        return "DOCENTE".equals(usuario.getRolCodigo());
    }

    private Docente docentePropio(UsuarioPrincipal usuario) {
        return docenteRepository.findByUsuarioId(usuario.getId()).orElseThrow(() ->
                new ApiException(HttpStatus.FORBIDDEN, "Su usuario no está vinculado a un registro de docente."));
    }

    private void verificarLectura(UsuarioPrincipal usuario, SolicitudInscripcion solicitud) {
        if (alcance.esGlobal(usuario)) {
            return;
        }
        if (esDocente(usuario)) {
            Long docenteId = docentePropio(usuario).getId();
            boolean coordina = clubRepository.findById(solicitud.getClubId())
                    .map(club -> docenteId.equals(club.getDocenteId()))
                    .orElse(false);
            if (!coordina && !solicitud.getSolicitadoPor().equals(usuario.getId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "No tiene permisos sobre esta solicitud.");
            }
            return;
        }
        alcance.verificar(usuario, solicitud.getInstitucionId());
    }

    private String codigoEstudiante(SolicitudInscripcion solicitud) {
        return estudianteRepository.findById(solicitud.getEstudianteId())
                .map(Estudiante::getCodigoInterno)
                .orElse("?");
    }

    private SolicitudResponse completo(SolicitudInscripcion solicitud, List<String> advertencias) {
        SolicitudResponse respuesta = (SolicitudResponse) armar(List.of(solicitud), false).get(0);
        return advertencias.isEmpty() ? respuesta : respuesta.conAdvertencias(List.copyOf(advertencias));
    }

    private List<SolicitudVista> armar(List<SolicitudInscripcion> solicitudes, boolean minima) {
        if (solicitudes.isEmpty()) {
            return List.of();
        }
        Map<Long, Estudiante> estudiantes = estudianteRepository.findAllById(
                        solicitudes.stream().map(SolicitudInscripcion::getEstudianteId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Estudiante::getId, Function.identity()));
        Map<Long, String> instituciones = institucionRepository.findAllById(
                        solicitudes.stream().map(SolicitudInscripcion::getInstitucionId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Institucion::getId, Institucion::getNombre));
        Map<Long, String> clubes = clubRepository.findAllById(
                        solicitudes.stream().map(SolicitudInscripcion::getClubId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Club::getId, Club::getNombre));
        Set<Long> cursoIds = new HashSet<>();
        solicitudes.forEach(s -> {
            cursoIds.add(s.getCursoId());
            cursoIds.add(s.getCursoAsignadoId());
        });
        Map<Long, String> cursos = cursosPorId(cursoIds);

        if (minima) {
            return solicitudes.stream()
                    .map(s -> (SolicitudVista) SolicitudResumenResponse.de(s,
                            estudiantes.get(s.getEstudianteId()).getCodigoInterno(),
                            instituciones.get(s.getInstitucionId()), clubes.get(s.getClubId()), cursos))
                    .toList();
        }
        Map<Long, String> usuarios = usuariosPorId(solicitudes);
        return solicitudes.stream()
                .map(s -> (SolicitudVista) SolicitudResponse.de(s, estudiantes.get(s.getEstudianteId()),
                        instituciones.get(s.getInstitucionId()), clubes.get(s.getClubId()),
                        cursos, usuarios, List.of()))
                .toList();
    }

    private Map<Long, String> cursosPorId(Set<Long> ids) {
        Set<Long> validos = ids.stream().filter(Objects::nonNull).collect(Collectors.toSet());
        if (validos.isEmpty()) {
            return Collections.emptyMap();
        }
        return cursoRepository.findAllById(validos).stream()
                .collect(Collectors.toMap(Curso::getId, Curso::getNombre));
    }

    private Map<Long, String> usuariosPorId(List<SolicitudInscripcion> solicitudes) {
        Set<Long> ids = new HashSet<>();
        solicitudes.forEach(s -> {
            ids.add(s.getSolicitadoPor());
            ids.add(s.getRevisadoPor());
            ids.add(s.getResueltoPor());
        });
        ids.remove(null);
        if (ids.isEmpty()) {
            return Collections.emptyMap();
        }
        return usuarioRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Usuario::getId, u -> u.getNombres() + " " + u.getApellidos()));
    }

    private String texto(Object valor) {
        return valor == null ? "ninguno" : valor.toString();
    }

    private String limpiar(String valor) {
        if (valor == null) {
            return null;
        }
        String recortado = valor.trim();
        return recortado.isEmpty() ? null : recortado;
    }
}
