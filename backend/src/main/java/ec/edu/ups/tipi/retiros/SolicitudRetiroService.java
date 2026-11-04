package ec.edu.ups.tipi.retiros;

import ec.edu.ups.tipi.auditoria.AuditoriaService;
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
import ec.edu.ups.tipi.inscripciones.EstadoInscripcion;
import ec.edu.ups.tipi.inscripciones.EstadoInscripcionCurso;
import ec.edu.ups.tipi.inscripciones.EstadoSolicitud;
import ec.edu.ups.tipi.inscripciones.Inscripcion;
import ec.edu.ups.tipi.inscripciones.InscripcionCurso;
import ec.edu.ups.tipi.inscripciones.InscripcionCursoRepository;
import ec.edu.ups.tipi.inscripciones.InscripcionRepository;
import ec.edu.ups.tipi.inscripciones.SolicitudInscripcion;
import ec.edu.ups.tipi.inscripciones.SolicitudInscripcionRepository;
import ec.edu.ups.tipi.inscripciones.dto.MotivoRequest;
import ec.edu.ups.tipi.instituciones.Institucion;
import ec.edu.ups.tipi.instituciones.InstitucionRepository;
import ec.edu.ups.tipi.retiros.dto.CupoEfecto;
import ec.edu.ups.tipi.retiros.dto.CursoRetiradoResponse;
import ec.edu.ups.tipi.retiros.dto.EfectosRetiroResponse;
import ec.edu.ups.tipi.retiros.dto.RetiroAprobarRequest;
import ec.edu.ups.tipi.retiros.dto.RetiroCrearRequest;
import ec.edu.ups.tipi.retiros.dto.RetiroResponse;
import ec.edu.ups.tipi.retiros.dto.RetiroResumenResponse;
import ec.edu.ups.tipi.retiros.dto.RetiroVista;
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
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SolicitudRetiroService {

    private static final ZoneId ZONA = ZoneId.of("America/Guayaquil");
    private static final Set<EstadoSolicitud> INSCRIPCION_ABIERTA =
            Set.of(EstadoSolicitud.PENDIENTE, EstadoSolicitud.EN_REVISION);
    private static final String ENTIDAD = "SOLICITUD_RETIRO";

    private final SolicitudRetiroRepository retiroRepository;
    private final RetiroCursoRepository retiroCursoRepository;
    private final InscripcionRepository inscripcionRepository;
    private final InscripcionCursoRepository inscripcionCursoRepository;
    private final SolicitudInscripcionRepository solicitudInscripcionRepository;
    private final EstudianteRepository estudianteRepository;
    private final ClubRepository clubRepository;
    private final CursoRepository cursoRepository;
    private final InstitucionRepository institucionRepository;
    private final DocenteRepository docenteRepository;
    private final UsuarioRepository usuarioRepository;
    private final AlcanceInstitucional alcance;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public PaginaResponse<RetiroVista> listar(String q, EstadoRetiro estado, Long institucionId, Long clubId,
                                              Long estudianteId, Long inscripcionId, int pagina, int tamano,
                                              UsuarioPrincipal usuario) {
        boolean minima = alcance.soloDatosMinimos(usuario);
        Specification<SolicitudRetiro> spec = (root, cq, cb) -> cb.conjunction();

        if (alcance.esGlobal(usuario)) {
            if (institucionId != null) {
                spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), institucionId));
            }
        } else if (esDocente(usuario)) {
            Long docenteId = docentePropio(usuario).getId();
            Long usuarioId = usuario.getId();
            spec = spec.and((root, cq, cb) -> {
                Subquery<Long> deSusClubes = cq.subquery(Long.class);
                Root<Inscripcion> i = deSusClubes.from(Inscripcion.class);
                Root<Club> club = deSusClubes.from(Club.class);
                deSusClubes.select(i.get("id")).where(cb.equal(club.get("id"), i.get("clubId")),
                        cb.equal(club.get("docenteId"), docenteId));
                return cb.or(root.get("inscripcionId").in(deSusClubes),
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
                Root<Inscripcion> i = coincidencias.from(Inscripcion.class);
                Root<Estudiante> e = coincidencias.from(Estudiante.class);
                coincidencias.select(i.get("id")).where(cb.equal(e.get("id"), i.get("estudianteId")), minima
                        ? cb.like(cb.lower(e.get("codigoInterno")), patron)
                        : cb.or(cb.like(cb.lower(e.get("nombres")), patron),
                                cb.like(cb.lower(e.get("apellidos")), patron),
                                cb.like(cb.lower(e.get("codigoInterno")), patron)));
                return root.get("inscripcionId").in(coincidencias);
            });
        }
        if (estado != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("estado"), estado));
        }
        if (inscripcionId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("inscripcionId"), inscripcionId));
        }
        if (clubId != null || estudianteId != null) {
            spec = spec.and((root, cq, cb) -> {
                Subquery<Long> filtradas = cq.subquery(Long.class);
                Root<Inscripcion> i = filtradas.from(Inscripcion.class);
                filtradas.select(i.get("id")).where(
                        clubId != null ? cb.equal(i.get("clubId"), clubId) : cb.conjunction(),
                        estudianteId != null ? cb.equal(i.get("estudianteId"), estudianteId) : cb.conjunction());
                return root.get("inscripcionId").in(filtradas);
            });
        }

        Pageable pageable = PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamano, 1), 100),
                Sort.by(Sort.Direction.DESC, "fechaSolicitud").and(Sort.by(Sort.Direction.DESC, "id")));
        Page<SolicitudRetiro> resultado = retiroRepository.findAll(spec, pageable);
        return PaginaResponse.de(new PageImpl<>(armar(resultado.getContent(), minima), pageable,
                resultado.getTotalElements()));
    }

    @Transactional(readOnly = true)
    public RetiroVista obtener(Long id, UsuarioPrincipal usuario) {
        SolicitudRetiro solicitud = buscar(id);
        verificarLectura(usuario, solicitud);
        return armar(List.of(solicitud), alcance.soloDatosMinimos(usuario)).get(0);
    }

    @Transactional(readOnly = true)
    public EfectosRetiroResponse efectos(Long id, UsuarioPrincipal usuario) {
        SolicitudRetiro solicitud = buscar(id);
        alcance.verificar(usuario, solicitud.getInstitucionId());
        Inscripcion inscripcion = inscripcionRepository.findById(solicitud.getInscripcionId()).orElseThrow();
        Club club = clubRepository.findById(inscripcion.getClubId()).orElseThrow();
        Estudiante estudiante = estudianteRepository.findById(inscripcion.getEstudianteId()).orElseThrow();

        List<String> impedimentos = new ArrayList<>();
        if (solicitud.getEstado() != EstadoRetiro.PENDIENTE) {
            impedimentos.add("La solicitud ya está en estado " + solicitud.getEstado() + ".");
        }
        if (solicitud.getSolicitadoPor().equals(usuario.getId())) {
            impedimentos.add("Quien registró la solicitud de retiro no puede aprobarla.");
        }
        if (inscripcion.getEstado() != EstadoInscripcion.ACTIVA) {
            impedimentos.add("La inscripción del estudiante en el club ya no está activa (estado "
                    + inscripcion.getEstado() + ").");
        }

        boolean activa = inscripcion.getEstado() == EstadoInscripcion.ACTIVA;
        CupoEfecto cupoClub = CupoEfecto.de("CLUB", club.getId(), null, club.getNombre(), club.getCupoMaximo(),
                inscripcionRepository.countByClubIdAndEstado(club.getId(), EstadoInscripcion.ACTIVA));

        List<InscripcionCurso> activos = activa
                ? inscripcionCursoRepository.findByEstudianteIdAndClubIdAndEstadoOrderByIdAsc(
                        inscripcion.getEstudianteId(), inscripcion.getClubId(), EstadoInscripcionCurso.ACTIVA)
                : List.of();
        Map<Long, Curso> cursos = cursosPorId(activos.stream().map(InscripcionCurso::getCursoId)
                .collect(Collectors.toSet()));
        List<CupoEfecto> cupoCursos = activos.stream()
                .map(ic -> {
                    Curso curso = cursos.get(ic.getCursoId());
                    return CupoEfecto.de("CURSO", curso.getId(), ic.getId(), curso.getNombre(), curso.getCupoMaximo(),
                            inscripcionCursoRepository.countByCursoIdAndEstado(curso.getId(),
                                    EstadoInscripcionCurso.ACTIVA));
                })
                .toList();

        List<Long> aCancelar = activa
                ? solicitudInscripcionRepository.findByEstudianteIdAndClubIdAndEstadoInOrderByIdAsc(
                        inscripcion.getEstudianteId(), inscripcion.getClubId(), INSCRIPCION_ABIERTA)
                        .stream().map(SolicitudInscripcion::getId).toList()
                : List.of();

        return new EfectosRetiroResponse(solicitud.getId(), inscripcion.getId(), estudiante.getCodigoInterno(),
                impedimentos.isEmpty(), impedimentos, cupoClub, cupoCursos, aCancelar);
    }

    @Transactional
    public RetiroResponse crear(RetiroCrearRequest request, UsuarioPrincipal usuario) {
        Inscripcion inscripcion = inscripcionRepository.findById(request.inscripcionId()).orElseThrow(() ->
                new ApiException(HttpStatus.BAD_REQUEST, "La inscripción indicada no existe."));
        Club club = clubRepository.findById(inscripcion.getClubId()).orElseThrow();
        if (esDocente(usuario)) {
            if (!docentePropio(usuario).getId().equals(club.getDocenteId())) {
                throw new ApiException(HttpStatus.FORBIDDEN,
                        "Solo puede solicitar retiros de estudiantes de los clubes que coordina.");
            }
        } else {
            alcance.verificar(usuario, inscripcion.getInstitucionId());
        }
        if (inscripcion.getEstado() != EstadoInscripcion.ACTIVA) {
            throw new ApiException(HttpStatus.CONFLICT, "El estudiante no es integrante activo del club; "
                    + "su inscripción está en estado " + inscripcion.getEstado() + ".");
        }
        if (retiroRepository.existsByInscripcionIdAndEstado(inscripcion.getId(), EstadoRetiro.PENDIENTE)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Ya existe una solicitud de retiro pendiente para esta inscripción.");
        }

        SolicitudRetiro solicitud = new SolicitudRetiro();
        solicitud.setInscripcionId(inscripcion.getId());
        solicitud.setInstitucionId(inscripcion.getInstitucionId());
        solicitud.setMotivo(request.motivo().trim());
        solicitud.setSolicitadoPor(usuario.getId());
        solicitud.setFechaSolicitud(Instant.now());
        solicitud = retiroRepository.saveAndFlush(solicitud);

        List<String> avisos = new ArrayList<>();
        List<InscripcionCurso> cursosActivos = inscripcionCursoRepository
                .findByEstudianteIdAndClubIdAndEstadoOrderByIdAsc(inscripcion.getEstudianteId(), club.getId(),
                        EstadoInscripcionCurso.ACTIVA);
        if (!cursosActivos.isEmpty()) {
            Map<Long, Curso> cursos = cursosPorId(cursosActivos.stream().map(InscripcionCurso::getCursoId)
                    .collect(Collectors.toSet()));
            avisos.add("Al aprobarse el retiro también se cerrarán sus inscripciones en "
                    + cursosActivos.size() + (cursosActivos.size() == 1 ? " curso" : " cursos") + " del club: "
                    + cursosActivos.stream().map(ic -> "«" + cursos.get(ic.getCursoId()).getNombre() + "»")
                    .collect(Collectors.joining(", ")) + ".");
        }
        int abiertas = solicitudInscripcionRepository.findByEstudianteIdAndClubIdAndEstadoInOrderByIdAsc(
                inscripcion.getEstudianteId(), club.getId(), INSCRIPCION_ABIERTA).size();
        if (abiertas > 0) {
            avisos.add(abiertas == 1
                    ? "El estudiante tiene 1 solicitud de inscripción abierta en este club; se cancelará "
                    + "automáticamente si se aprueba el retiro."
                    : "El estudiante tiene " + abiertas + " solicitudes de inscripción abiertas en este club; "
                    + "se cancelarán automáticamente si se aprueba el retiro.");
        }

        auditoria.registrar("SOLICITUD_RETIRO_CREADA", ENTIDAD, solicitud.getId(),
                "codigo=" + codigoEstudiante(inscripcion) + ", inscripcionId=" + inscripcion.getId()
                        + ", clubId=" + club.getId() + "; motivo registrado");
        return completo(solicitud, avisos);
    }

    @Transactional
    public RetiroResponse aprobar(Long id, RetiroAprobarRequest request, UsuarioPrincipal usuario) {
        SolicitudRetiro solicitud = bloquear(id);
        alcance.verificar(usuario, solicitud.getInstitucionId());
        exigirPendiente(solicitud, "aprobar");
        exigirResolutorDistinto(solicitud, usuario);

        Inscripcion inscripcion = retiroRepository.bloquearInscripcion(solicitud.getInscripcionId()).orElseThrow();
        retiroRepository.bloquearEstudiante(inscripcion.getEstudianteId());
        if (inscripcion.getEstado() != EstadoInscripcion.ACTIVA) {
            throw new ApiException(HttpStatus.CONFLICT, "La inscripción del estudiante en el club ya no está activa "
                    + "(estado " + inscripcion.getEstado() + "). Cancele esta solicitud de retiro.");
        }
        Club club = clubRepository.findById(inscripcion.getClubId()).orElseThrow();
        LocalDate hoy = LocalDate.now(ZONA);

        List<InscripcionCurso> cursosActivos = inscripcionCursoRepository
                .findByEstudianteIdAndClubIdAndEstadoOrderByIdAsc(inscripcion.getEstudianteId(), club.getId(),
                        EstadoInscripcionCurso.ACTIVA);
        for (InscripcionCurso ic : cursosActivos) {
            ic.setEstado(EstadoInscripcionCurso.RETIRADA);
            ic.setFechaFin(posterior(hoy, ic.getFechaIngreso()));
        }
        inscripcionCursoRepository.saveAllAndFlush(cursosActivos);

        List<RetiroCurso> detalle = cursosActivos.stream()
                .map(ic -> {
                    RetiroCurso rc = new RetiroCurso();
                    rc.setSolicitudRetiroId(solicitud.getId());
                    rc.setInscripcionCursoId(ic.getId());
                    rc.setFechaFin(ic.getFechaFin());
                    return rc;
                })
                .toList();
        retiroCursoRepository.saveAllAndFlush(detalle);

        LocalDate fechaRetiro = posterior(hoy, inscripcion.getFechaIngreso());
        inscripcion.setEstado(EstadoInscripcion.RETIRADA);
        inscripcion.setFechaRetiro(fechaRetiro);
        inscripcionRepository.saveAndFlush(inscripcion);

        String codigo = codigoEstudiante(inscripcion);
        List<SolicitudInscripcion> abiertas = solicitudInscripcionRepository
                .findByEstudianteIdAndClubIdAndEstadoInOrderByIdAsc(inscripcion.getEstudianteId(), club.getId(),
                        INSCRIPCION_ABIERTA);
        Instant ahora = Instant.now();
        for (SolicitudInscripcion abierta : abiertas) {
            EstadoSolicitud anterior = abierta.getEstado();
            abierta.setEstado(EstadoSolicitud.CANCELADA);
            abierta.setResueltoPor(usuario.getId());
            abierta.setFechaResolucion(ahora);
            abierta.setObservacionResolucion("Cancelada automáticamente al aprobarse la solicitud de retiro "
                    + solicitud.getId() + ".");
            solicitudInscripcionRepository.saveAndFlush(abierta);
            auditoria.registrar("SOLICITUD_INSCRIPCION_CANCELADA", "SOLICITUD_INSCRIPCION", abierta.getId(),
                    "codigo=" + codigo + "; estado: '" + anterior + "' -> 'CANCELADA'; por retiro aprobado id="
                            + solicitud.getId());
        }

        solicitud.setEstado(EstadoRetiro.APROBADA);
        solicitud.setResueltoPor(usuario.getId());
        solicitud.setFechaResolucion(ahora);
        solicitud.setFechaRetiro(fechaRetiro);
        solicitud.setObservacionResolucion(request == null ? null : limpiar(request.observacion()));
        SolicitudRetiro aprobada = retiroRepository.saveAndFlush(solicitud);

        auditoria.registrar("SOLICITUD_RETIRO_APROBADA", ENTIDAD, id,
                "codigo=" + codigo + ", inscripcionId=" + inscripcion.getId() + ", clubId=" + club.getId()
                        + ", fechaRetiro=" + fechaRetiro
                        + ", inscripcionesCursoRetiradas="
                        + ids(cursosActivos.stream().map(InscripcionCurso::getId).toList())
                        + ", solicitudesInscripcionCanceladas="
                        + ids(abiertas.stream().map(SolicitudInscripcion::getId).toList())
                        + "; estado: 'PENDIENTE' -> 'APROBADA'");

        List<String> avisos = new ArrayList<>();
        long activosClub = inscripcionRepository.countByClubIdAndEstado(club.getId(), EstadoInscripcion.ACTIVA);
        avisos.add("Se liberó un cupo en el club «" + club.getNombre() + "» (disponibles: "
                + Math.max(club.getCupoMaximo() - activosClub, 0) + " de " + club.getCupoMaximo() + ").");
        Map<Long, Curso> cursos = cursosPorId(cursosActivos.stream().map(InscripcionCurso::getCursoId)
                .collect(Collectors.toSet()));
        for (InscripcionCurso ic : cursosActivos) {
            Curso curso = cursos.get(ic.getCursoId());
            long activosCurso = inscripcionCursoRepository.countByCursoIdAndEstado(curso.getId(),
                    EstadoInscripcionCurso.ACTIVA);
            avisos.add("Se liberó un cupo en el curso «" + curso.getNombre() + "» (disponibles: "
                    + Math.max(curso.getCupoMaximo() - activosCurso, 0) + " de " + curso.getCupoMaximo() + ").");
        }
        if (!abiertas.isEmpty()) {
            String lista = abiertas.stream().map(a -> String.valueOf(a.getId())).collect(Collectors.joining(", "));
            avisos.add(abiertas.size() == 1
                    ? "Se canceló automáticamente la solicitud de inscripción " + lista + " del estudiante en este club."
                    : "Se cancelaron automáticamente las solicitudes de inscripción " + lista
                    + " del estudiante en este club.");
        }
        return completo(aprobada, avisos);
    }

    @Transactional
    public RetiroResponse rechazar(Long id, MotivoRequest request, UsuarioPrincipal usuario) {
        SolicitudRetiro solicitud = bloquear(id);
        alcance.verificar(usuario, solicitud.getInstitucionId());
        exigirPendiente(solicitud, "rechazar");
        exigirResolutorDistinto(solicitud, usuario);

        solicitud.setEstado(EstadoRetiro.RECHAZADA);
        solicitud.setResueltoPor(usuario.getId());
        solicitud.setFechaResolucion(Instant.now());
        solicitud.setObservacionResolucion(request.motivo().trim());
        solicitud = retiroRepository.saveAndFlush(solicitud);

        auditoria.registrar("SOLICITUD_RETIRO_RECHAZADA", ENTIDAD, id,
                "codigo=" + codigoEstudiante(solicitud) + "; estado: 'PENDIENTE' -> 'RECHAZADA'; motivo registrado");
        return completo(solicitud, List.of());
    }

    @Transactional
    public RetiroResponse cancelar(Long id, MotivoRequest request, UsuarioPrincipal usuario) {
        SolicitudRetiro solicitud = bloquear(id);
        if (esDocente(usuario)) {
            if (!solicitud.getSolicitadoPor().equals(usuario.getId())) {
                throw new ApiException(HttpStatus.FORBIDDEN,
                        "Solo puede cancelar las solicitudes de retiro que usted registró.");
            }
        } else {
            alcance.verificar(usuario, solicitud.getInstitucionId());
        }
        exigirPendiente(solicitud, "cancelar");

        solicitud.setEstado(EstadoRetiro.CANCELADA);
        solicitud.setResueltoPor(usuario.getId());
        solicitud.setFechaResolucion(Instant.now());
        solicitud.setObservacionResolucion(request.motivo().trim());
        solicitud = retiroRepository.saveAndFlush(solicitud);

        auditoria.registrar("SOLICITUD_RETIRO_CANCELADA", ENTIDAD, id,
                "codigo=" + codigoEstudiante(solicitud) + "; estado: 'PENDIENTE' -> 'CANCELADA'; motivo registrado");
        return completo(solicitud, List.of());
    }

    private SolicitudRetiro buscar(Long id) {
        return retiroRepository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Solicitud de retiro no encontrada."));
    }

    private SolicitudRetiro bloquear(Long id) {
        return retiroRepository.bloquear(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Solicitud de retiro no encontrada."));
    }

    private void exigirPendiente(SolicitudRetiro solicitud, String accion) {
        if (solicitud.getEstado() != EstadoRetiro.PENDIENTE) {
            throw new ApiException(HttpStatus.CONFLICT, "Para " + accion + " una solicitud de retiro debe estar en "
                    + "estado PENDIENTE. Estado actual: " + solicitud.getEstado() + ".");
        }
    }

    private void exigirResolutorDistinto(SolicitudRetiro solicitud, UsuarioPrincipal usuario) {
        if (solicitud.getSolicitadoPor().equals(usuario.getId())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Quien registró la solicitud de retiro no puede aprobarla ni rechazarla.");
        }
    }

    private boolean esDocente(UsuarioPrincipal usuario) {
        return "DOCENTE".equals(usuario.getRolCodigo());
    }

    private Docente docentePropio(UsuarioPrincipal usuario) {
        return docenteRepository.findByUsuarioId(usuario.getId()).orElseThrow(() ->
                new ApiException(HttpStatus.FORBIDDEN, "Su usuario no está vinculado a un registro de docente."));
    }

    private void verificarLectura(UsuarioPrincipal usuario, SolicitudRetiro solicitud) {
        if (alcance.esGlobal(usuario)) {
            return;
        }
        if (esDocente(usuario)) {
            Long docenteId = docentePropio(usuario).getId();
            boolean coordina = inscripcionRepository.findById(solicitud.getInscripcionId())
                    .flatMap(i -> clubRepository.findById(i.getClubId()))
                    .map(club -> docenteId.equals(club.getDocenteId()))
                    .orElse(false);
            if (!coordina && !solicitud.getSolicitadoPor().equals(usuario.getId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "No tiene permisos sobre esta solicitud de retiro.");
            }
            return;
        }
        alcance.verificar(usuario, solicitud.getInstitucionId());
    }

    private String codigoEstudiante(Inscripcion inscripcion) {
        return estudianteRepository.findById(inscripcion.getEstudianteId())
                .map(Estudiante::getCodigoInterno)
                .orElse("?");
    }

    private String codigoEstudiante(SolicitudRetiro solicitud) {
        return inscripcionRepository.findById(solicitud.getInscripcionId())
                .map(this::codigoEstudiante)
                .orElse("?");
    }

    private RetiroResponse completo(SolicitudRetiro solicitud, List<String> avisos) {
        RetiroResponse respuesta = (RetiroResponse) armar(List.of(solicitud), false).get(0);
        return avisos.isEmpty() ? respuesta : respuesta.conAvisos(List.copyOf(avisos));
    }

    private List<RetiroVista> armar(List<SolicitudRetiro> solicitudes, boolean minima) {
        if (solicitudes.isEmpty()) {
            return List.of();
        }
        Map<Long, Inscripcion> inscripciones = inscripcionRepository.findAllById(
                        solicitudes.stream().map(SolicitudRetiro::getInscripcionId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Inscripcion::getId, Function.identity()));
        Map<Long, Estudiante> estudiantes = estudianteRepository.findAllById(
                        inscripciones.values().stream().map(Inscripcion::getEstudianteId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Estudiante::getId, Function.identity()));
        Map<Long, String> clubes = clubRepository.findAllById(
                        inscripciones.values().stream().map(Inscripcion::getClubId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Club::getId, Club::getNombre));
        Map<Long, String> instituciones = institucionRepository.findAllById(
                        solicitudes.stream().map(SolicitudRetiro::getInstitucionId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Institucion::getId, Institucion::getNombre));
        Map<Long, List<CursoRetiradoResponse>> cursosRetirados = cursosRetirados(solicitudes);

        if (minima) {
            return solicitudes.stream()
                    .map(s -> {
                        Inscripcion i = inscripciones.get(s.getInscripcionId());
                        return (RetiroVista) RetiroResumenResponse.de(s, i,
                                estudiantes.get(i.getEstudianteId()).getCodigoInterno(),
                                instituciones.get(s.getInstitucionId()), clubes.get(i.getClubId()),
                                cursosRetirados.getOrDefault(s.getId(), List.of()).size());
                    })
                    .toList();
        }
        Map<Long, String> usuarios = usuariosPorId(solicitudes);
        return solicitudes.stream()
                .map(s -> {
                    Inscripcion i = inscripciones.get(s.getInscripcionId());
                    return (RetiroVista) RetiroResponse.de(s, i, estudiantes.get(i.getEstudianteId()),
                            instituciones.get(s.getInstitucionId()), clubes.get(i.getClubId()), usuarios,
                            cursosRetirados.getOrDefault(s.getId(), List.of()));
                })
                .toList();
    }

    private Map<Long, List<CursoRetiradoResponse>> cursosRetirados(List<SolicitudRetiro> solicitudes) {
        List<RetiroCurso> detalle = retiroCursoRepository.findBySolicitudRetiroIdInOrderByIdAsc(
                solicitudes.stream().map(SolicitudRetiro::getId).collect(Collectors.toSet()));
        if (detalle.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<Long, InscripcionCurso> inscripcionesCurso = inscripcionCursoRepository.findAllById(
                        detalle.stream().map(RetiroCurso::getInscripcionCursoId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(InscripcionCurso::getId, Function.identity()));
        Map<Long, Curso> cursos = cursosPorId(inscripcionesCurso.values().stream()
                .map(InscripcionCurso::getCursoId).collect(Collectors.toSet()));
        Map<Long, List<CursoRetiradoResponse>> resultado = new HashMap<>();
        for (RetiroCurso rc : detalle) {
            Curso curso = cursos.get(inscripcionesCurso.get(rc.getInscripcionCursoId()).getCursoId());
            resultado.computeIfAbsent(rc.getSolicitudRetiroId(), k -> new ArrayList<>())
                    .add(new CursoRetiradoResponse(rc.getInscripcionCursoId(), curso.getId(), curso.getNombre(),
                            rc.getFechaFin()));
        }
        return resultado;
    }

    private Map<Long, Curso> cursosPorId(Set<Long> ids) {
        if (ids.isEmpty()) {
            return Collections.emptyMap();
        }
        return cursoRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Curso::getId, Function.identity()));
    }

    private Map<Long, String> usuariosPorId(List<SolicitudRetiro> solicitudes) {
        Set<Long> ids = new HashSet<>();
        solicitudes.forEach(s -> {
            ids.add(s.getSolicitadoPor());
            ids.add(s.getResueltoPor());
        });
        ids.remove(null);
        if (ids.isEmpty()) {
            return Collections.emptyMap();
        }
        return usuarioRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Usuario::getId, u -> u.getNombres() + " " + u.getApellidos()));
    }

    private LocalDate posterior(LocalDate hoy, LocalDate ingreso) {
        return ingreso != null && ingreso.isAfter(hoy) ? ingreso : hoy;
    }

    private String ids(List<Long> valores) {
        return valores.isEmpty() ? "ninguna" : valores.stream().map(String::valueOf)
                .collect(Collectors.joining(",", "[", "]"));
    }

    private String limpiar(String valor) {
        if (valor == null) {
            return null;
        }
        String recortado = valor.trim();
        return recortado.isEmpty() ? null : recortado;
    }
}
