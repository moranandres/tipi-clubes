package ec.edu.ups.tipi.actividades;

import ec.edu.ups.tipi.actividades.dto.ActividadActualizarRequest;
import ec.edu.ups.tipi.actividades.dto.ActividadCrearRequest;
import ec.edu.ups.tipi.actividades.dto.ActividadResponse;
import ec.edu.ups.tipi.actividades.dto.CancelacionActividadRequest;
import ec.edu.ups.tipi.actividades.dto.ContenidoResumen;
import ec.edu.ups.tipi.actividades.dto.EjecucionActividadRequest;
import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.clubes.Club;
import ec.edu.ups.tipi.clubes.ClubRepository;
import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.cursos.Curso;
import ec.edu.ups.tipi.cursos.CursoRepository;
import ec.edu.ups.tipi.docentes.Docente;
import ec.edu.ups.tipi.docentes.DocenteRepository;
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

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static ec.edu.ups.tipi.common.CambiosAuditoria.diferencias;
import static ec.edu.ups.tipi.common.CambiosAuditoria.texto;

@Service
@RequiredArgsConstructor
public class ActividadService {

    private static final ZoneId ZONA = ZoneId.of("America/Guayaquil");
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Set<EstadoClub> CLUB_PROGRAMABLE = Set.of(EstadoClub.PLANIFICADO, EstadoClub.ACTIVO);
    private static final Duration DURACION_MAXIMA = Duration.ofHours(8);
    private static final String ENTIDAD = "ACTIVIDAD";

    private final ActividadRepository actividadRepository;
    private final ContenidoCatalogoRepository contenidoRepository;
    private final ClubRepository clubRepository;
    private final CursoRepository cursoRepository;
    private final DocenteRepository docenteRepository;
    private final InstitucionRepository institucionRepository;
    private final UsuarioRepository usuarioRepository;
    private final AlcanceInstitucional alcance;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public PaginaResponse<ActividadResponse> listar(String q, Long institucionId, Long clubId, Long cursoId,
                                                    Long responsableId, EstadoActividad estado, LocalDate desde,
                                                    LocalDate hasta, boolean pendientes, boolean ascendente,
                                                    int pagina, int tamano, UsuarioPrincipal usuario) {
        if (desde != null && hasta != null && hasta.isBefore(desde)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha «hasta» no puede ser anterior a «desde».");
        }
        Specification<Actividad> spec = (root, cq, cb) -> cb.conjunction();

        if (alcance.esGlobal(usuario)) {
            if (institucionId != null) {
                spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), institucionId));
            }
        } else if (esDocente(usuario)) {
            Long docenteId = docentePropio(usuario).getId();
            spec = spec.and((root, cq, cb) -> {
                Subquery<Long> susClubes = cq.subquery(Long.class);
                Root<Club> club = susClubes.from(Club.class);
                susClubes.select(club.get("id")).where(cb.equal(club.get("docenteId"), docenteId));
                return cb.or(root.get("clubId").in(susClubes), cb.equal(root.get("responsableId"), docenteId));
            });
        } else {
            Long propia = alcance.institucionPropia(usuario);
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), propia));
        }
        if (StringUtils.hasText(q)) {
            String patron = "%" + q.trim().toLowerCase() + "%";
            spec = spec.and((root, cq, cb) -> cb.like(cb.lower(root.get("tema")), patron));
        }
        if (clubId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("clubId"), clubId));
        }
        if (cursoId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("cursoId"), cursoId));
        }
        if (responsableId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("responsableId"), responsableId));
        }
        if (estado != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("estado"), estado));
        }
        if (desde != null) {
            spec = spec.and((root, cq, cb) -> cb.greaterThanOrEqualTo(root.get("fecha"), desde));
        }
        if (hasta != null) {
            spec = spec.and((root, cq, cb) -> cb.lessThanOrEqualTo(root.get("fecha"), hasta));
        }
        if (pendientes) {
            LocalDate hoy = hoy();
            spec = spec.and((root, cq, cb) -> cb.and(
                    cb.equal(root.get("estado"), EstadoActividad.PLANIFICADA),
                    cb.lessThanOrEqualTo(root.get("fecha"), hoy)));
        }

        Sort.Direction direccion = ascendente ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamano, 1), 100),
                Sort.by(direccion, "fecha", "horaInicio", "id"));
        Page<Actividad> resultado = actividadRepository.findAll(spec, pageable);
        return PaginaResponse.de(new PageImpl<>(armar(resultado.getContent()), pageable,
                resultado.getTotalElements()));
    }

    @Transactional(readOnly = true)
    public ActividadResponse obtener(Long id, UsuarioPrincipal usuario) {
        Actividad actividad = buscar(id);
        verificarLectura(usuario, actividad);
        return armar(List.of(actividad)).get(0);
    }

    @Transactional
    public ActividadResponse crear(ActividadCrearRequest request, UsuarioPrincipal usuario) {
        Club club = clubRepository.findById(request.clubId()).orElseThrow(() ->
                new ApiException(HttpStatus.BAD_REQUEST, "El club indicado no existe."));
        if (esDocente(usuario)) {
            if (!docentePropio(usuario).getId().equals(club.getDocenteId())) {
                throw new ApiException(HttpStatus.FORBIDDEN,
                        "Solo puede programar actividades en los clubes que coordina.");
            }
        } else {
            alcance.verificar(usuario, club.getInstitucionId());
        }
        verificarClubProgramable(club);

        ActividadActualizarRequest datos = request.datos();
        Actividad actividad = new Actividad();
        actividad.setClubId(club.getId());
        actividad.setInstitucionId(club.getInstitucionId());
        actividad.setCreadoPor(usuario.getId());
        aplicar(actividad, club, datos);
        if (actividad.getLugar() == null) {
            actividad.setLugar(club.getLugar());
        }
        if (datos.contenidoIds() != null) {
            actividad.getContenidoIds().addAll(validarContenidos(datos.contenidoIds(), Set.of()));
        }
        actividad = actividadRepository.saveAndFlush(actividad);

        auditoria.registrar("ACTIVIDAD_CREADA", ENTIDAD, actividad.getId(),
                "clubId=" + actividad.getClubId()
                        + (actividad.getCursoId() != null ? ", cursoId=" + actividad.getCursoId() : "")
                        + ", fecha=" + actividad.getFecha()
                        + ", horario=" + actividad.getHoraInicio() + "-" + actividad.getHoraFin()
                        + ", tema=" + actividad.getTema()
                        + ", responsableId=" + actividad.getResponsableId()
                        + ", contenidos=" + ordenados(actividad.getContenidoIds()));
        return armar(List.of(actividad)).get(0);
    }

    @Transactional
    public ActividadResponse actualizar(Long id, ActividadActualizarRequest datos, UsuarioPrincipal usuario) {
        Actividad actividad = buscar(id);
        Club club = clubDe(actividad);
        verificarEscritura(usuario, actividad, club);
        if (actividad.getEstado() == EstadoActividad.EJECUTADA) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "La actividad ya fue ejecutada; solo se pueden corregir los datos de su ejecución.");
        }
        if (actividad.getEstado() == EstadoActividad.CANCELADA) {
            throw new ApiException(HttpStatus.CONFLICT, "La actividad está cancelada y ya no se modifica.");
        }
        verificarClubProgramable(club);

        Map<String, String> antes = instantanea(actividad);
        Set<Integer> contenidosAntes = new TreeSet<>(actividad.getContenidoIds());
        String objetivoAnterior = actividad.getObjetivo();
        String descripcionAnterior = actividad.getDescripcion();

        aplicar(actividad, club, datos);
        if (datos.contenidoIds() != null) {
            reemplazarContenidos(actividad, validarContenidos(datos.contenidoIds(), actividad.getContenidoIds()));
        }
        actividad.setActualizadoEn(Instant.now());
        actividad = actividadRepository.saveAndFlush(actividad);

        List<String> partes = new ArrayList<>();
        String cambios = diferencias(antes, instantanea(actividad));
        if (!"Sin cambios".equals(cambios)) {
            partes.add(cambios);
        }
        if (!Objects.equals(objetivoAnterior, actividad.getObjetivo())) {
            partes.add("objetivo modificado");
        }
        if (!Objects.equals(descripcionAnterior, actividad.getDescripcion())) {
            partes.add("descripcion modificada");
        }
        String contenidos = cambiosContenidos(contenidosAntes, actividad.getContenidoIds());
        if (contenidos != null) {
            partes.add(contenidos);
        }
        auditoria.registrar("ACTIVIDAD_ACTUALIZADA", ENTIDAD, id,
                partes.isEmpty() ? "Sin cambios" : String.join("; ", partes));
        return armar(List.of(actividad)).get(0);
    }

    @Transactional
    public ActividadResponse registrarEjecucion(Long id, EjecucionActividadRequest request, UsuarioPrincipal usuario) {
        Actividad actividad = buscar(id);
        Club club = clubDe(actividad);
        verificarEscritura(usuario, actividad, club);
        if (actividad.getEstado() == EstadoActividad.CANCELADA) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "La actividad está cancelada; no se puede registrar su ejecución.");
        }
        boolean primera = actividad.getEstado() == EstadoActividad.PLANIFICADA;
        if (primera) {
            if (club.getEstado() != EstadoClub.ACTIVO) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Solo se registra la ejecución de actividades de un club activo; el club está en estado "
                                + club.getEstado() + ".");
            }
            if (actividad.getFecha().isAfter(hoy())) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "La actividad está programada para el " + actividad.getFecha().format(FECHA)
                                + " y no puede registrarse como ejecutada antes de esa fecha.");
            }
        }

        Set<Integer> contenidosAntes = new TreeSet<>(actividad.getContenidoIds());
        String resumenAnterior = actividad.getResumenEjecucion();
        String observacionesAnteriores = actividad.getObservaciones();

        reemplazarContenidos(actividad, validarContenidos(request.contenidoIds(), actividad.getContenidoIds()));
        actividad.setResumenEjecucion(request.resumen().trim());
        actividad.setObservaciones(limpiar(request.observaciones()));
        if (primera) {
            actividad.setEstado(EstadoActividad.EJECUTADA);
            actividad.setEjecutadaPor(usuario.getId());
            actividad.setFechaRegistroEjecucion(Instant.now());
        }
        actividad.setActualizadoEn(Instant.now());
        actividad = actividadRepository.saveAndFlush(actividad);

        if (primera) {
            auditoria.registrar("ACTIVIDAD_EJECUTADA", ENTIDAD, id,
                    "estado: 'PLANIFICADA' -> 'EJECUTADA'; fecha=" + actividad.getFecha()
                            + "; contenidos=" + ordenados(actividad.getContenidoIds()));
        } else {
            List<String> partes = new ArrayList<>();
            if (!Objects.equals(resumenAnterior, actividad.getResumenEjecucion())) {
                partes.add("resumen modificado");
            }
            if (!Objects.equals(observacionesAnteriores, actividad.getObservaciones())) {
                partes.add("observaciones modificadas");
            }
            String contenidos = cambiosContenidos(contenidosAntes, actividad.getContenidoIds());
            if (contenidos != null) {
                partes.add(contenidos);
            }
            auditoria.registrar("ACTIVIDAD_EJECUCION_CORREGIDA", ENTIDAD, id,
                    partes.isEmpty() ? "Sin cambios" : String.join("; ", partes));
        }
        return armar(List.of(actividad)).get(0);
    }

    @Transactional
    public ActividadResponse cancelar(Long id, CancelacionActividadRequest request, UsuarioPrincipal usuario) {
        Actividad actividad = buscar(id);
        Club club = clubDe(actividad);
        verificarEscritura(usuario, actividad, club);
        if (actividad.getEstado() != EstadoActividad.PLANIFICADA) {
            throw new ApiException(HttpStatus.CONFLICT, "Solo se cancelan actividades planificadas; esta actividad está "
                    + (actividad.getEstado() == EstadoActividad.EJECUTADA ? "ejecutada." : "cancelada."));
        }
        String motivo = request.motivo().trim();
        actividad.setEstado(EstadoActividad.CANCELADA);
        actividad.setMotivoCancelacion(motivo);
        actividad.setCanceladaPor(usuario.getId());
        actividad.setFechaCancelacion(Instant.now());
        actividad.setActualizadoEn(Instant.now());
        actividad = actividadRepository.saveAndFlush(actividad);

        auditoria.registrar("ACTIVIDAD_CANCELADA", ENTIDAD, id,
                "fecha=" + actividad.getFecha() + "; estado: 'PLANIFICADA' -> 'CANCELADA'; motivo=" + motivo);
        return armar(List.of(actividad)).get(0);
    }

    @Transactional
    public void eliminar(Long id, UsuarioPrincipal usuario) {
        Actividad actividad = buscar(id);
        Club club = clubDe(actividad);
        verificarEscritura(usuario, actividad, club);
        if (actividad.getEstado() != EstadoActividad.PLANIFICADA) {
            throw new ApiException(HttpStatus.CONFLICT, "La actividad está "
                    + (actividad.getEstado() == EstadoActividad.EJECUTADA ? "ejecutada" : "cancelada")
                    + " y forma parte del historial del club; no se elimina.");
        }
        actividadRepository.delete(actividad);
        actividadRepository.flush();

        auditoria.registrar("ACTIVIDAD_ELIMINADA", ENTIDAD, id,
                "clubId=" + actividad.getClubId() + ", fecha=" + actividad.getFecha()
                        + ", tema=" + actividad.getTema());
    }

    private Actividad buscar(Long id) {
        return actividadRepository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Actividad no encontrada."));
    }

    private Club clubDe(Actividad actividad) {
        return clubRepository.findById(actividad.getClubId()).orElseThrow(() ->
                new ApiException(HttpStatus.CONFLICT, "El club de la actividad no existe."));
    }

    private void verificarClubProgramable(Club club) {
        if (!CLUB_PROGRAMABLE.contains(club.getEstado())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El club está en estado " + club.getEstado() + " y no admite programar ni modificar actividades.");
        }
    }

    private void verificarLectura(UsuarioPrincipal usuario, Actividad actividad) {
        if (alcance.esGlobal(usuario)) {
            return;
        }
        if (esDocente(usuario)) {
            if (!esDelDocente(docentePropio(usuario).getId(), actividad, clubDe(actividad))) {
                throw new ApiException(HttpStatus.FORBIDDEN, "No tiene permisos sobre esta actividad.");
            }
            return;
        }
        alcance.verificar(usuario, actividad.getInstitucionId());
    }

    private void verificarEscritura(UsuarioPrincipal usuario, Actividad actividad, Club club) {
        if (esDocente(usuario)) {
            if (!esDelDocente(docentePropio(usuario).getId(), actividad, club)) {
                throw new ApiException(HttpStatus.FORBIDDEN,
                        "Solo puede gestionar actividades de los clubes que coordina o de las que es responsable.");
            }
            return;
        }
        alcance.verificar(usuario, actividad.getInstitucionId());
    }

    private boolean esDelDocente(Long docenteId, Actividad actividad, Club club) {
        return docenteId.equals(club.getDocenteId()) || docenteId.equals(actividad.getResponsableId());
    }

    private void aplicar(Actividad actividad, Club club, ActividadActualizarRequest datos) {
        if (!datos.horaFin().isAfter(datos.horaInicio())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La hora de fin debe ser posterior a la hora de inicio.");
        }
        if (Duration.between(datos.horaInicio(), datos.horaFin()).compareTo(DURACION_MAXIMA) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Una actividad puede durar como máximo 8 horas.");
        }
        if (datos.cursoId() != null) {
            Curso curso = cursoRepository.findById(datos.cursoId()).orElseThrow(() ->
                    new ApiException(HttpStatus.BAD_REQUEST, "El curso indicado no existe."));
            if (!curso.getClubId().equals(club.getId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "El curso indicado no pertenece al club de la actividad.");
            }
        }

        Long responsableId = datos.responsableId() != null ? datos.responsableId()
                : actividad.getResponsableId() != null ? actividad.getResponsableId() : club.getDocenteId();
        if (!responsableId.equals(actividad.getResponsableId())) {
            Docente responsable = docenteRepository.findById(responsableId).orElseThrow(() ->
                    new ApiException(HttpStatus.BAD_REQUEST, "El docente responsable indicado no existe."));
            if (!responsable.getInstitucionId().equals(club.getInstitucionId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "El docente responsable debe pertenecer a la institución del club.");
            }
            if (!responsable.isActivo()) {
                throw new ApiException(HttpStatus.CONFLICT, "El docente responsable indicado está inactivo.");
            }
        }

        actividad.setCursoId(datos.cursoId());
        actividad.setResponsableId(responsableId);
        actividad.setFecha(datos.fecha());
        actividad.setHoraInicio(datos.horaInicio());
        actividad.setHoraFin(datos.horaFin());
        actividad.setTema(normalizar(datos.tema()));
        actividad.setObjetivo(datos.objetivo().trim());
        actividad.setDescripcion(limpiar(datos.descripcion()));
        actividad.setLugar(limpiar(datos.lugar()));
    }

    private Set<Integer> validarContenidos(List<Integer> ids, Set<Integer> actuales) {
        Set<Integer> solicitados = new LinkedHashSet<>(ids);
        if (solicitados.isEmpty()) {
            return solicitados;
        }
        Map<Integer, ContenidoCatalogo> encontrados = contenidoRepository.findAllById(solicitados).stream()
                .collect(Collectors.toMap(ContenidoCatalogo::getId, Function.identity()));
        for (Integer id : solicitados) {
            ContenidoCatalogo contenido = encontrados.get(id);
            if (contenido == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "No existe el contenido con id " + id + ".");
            }
            if (!contenido.isActivo() && !actuales.contains(id)) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "El contenido «" + contenido.getNombre() + "» está inactivo en el catálogo y no se puede asignar.");
            }
        }
        return solicitados;
    }

    private void reemplazarContenidos(Actividad actividad, Set<Integer> nuevos) {
        actividad.getContenidoIds().retainAll(nuevos);
        actividad.getContenidoIds().addAll(nuevos);
    }

    private String cambiosContenidos(Set<Integer> antes, Set<Integer> despues) {
        Set<Integer> agregados = new TreeSet<>(despues);
        agregados.removeAll(antes);
        Set<Integer> quitados = new TreeSet<>(antes);
        quitados.removeAll(despues);
        if (agregados.isEmpty() && quitados.isEmpty()) {
            return null;
        }
        List<String> partes = new ArrayList<>();
        if (!agregados.isEmpty()) {
            partes.add("contenidos agregados=" + agregados);
        }
        if (!quitados.isEmpty()) {
            partes.add("contenidos quitados=" + quitados);
        }
        return String.join(", ", partes);
    }

    private List<ActividadResponse> armar(List<Actividad> actividades) {
        if (actividades.isEmpty()) {
            return List.of();
        }
        Map<Long, Club> clubes = porId(clubRepository.findAllById(ids(actividades, Actividad::getClubId)), Club::getId);
        Map<Long, String> instituciones = institucionRepository.findAllById(ids(actividades, Actividad::getInstitucionId))
                .stream().collect(Collectors.toMap(Institucion::getId, Institucion::getNombre));
        Map<Long, String> cursos = cursoRepository.findAllById(ids(actividades, Actividad::getCursoId)).stream()
                .collect(Collectors.toMap(Curso::getId, Curso::getNombre));
        Map<Long, String> docentes = docenteRepository.findAllById(ids(actividades, Actividad::getResponsableId))
                .stream().collect(Collectors.toMap(Docente::getId, d -> d.getApellidos() + " " + d.getNombres()));
        Set<Long> usuarioIds = actividades.stream()
                .flatMap(a -> Stream.of(a.getEjecutadaPor(), a.getCanceladaPor(), a.getCreadoPor()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, String> usuarios = usuarioRepository.findAllById(usuarioIds).stream()
                .collect(Collectors.toMap(Usuario::getId, u -> u.getNombres() + " " + u.getApellidos()));
        Set<Integer> contenidoIds = actividades.stream()
                .flatMap(a -> a.getContenidoIds().stream())
                .collect(Collectors.toSet());
        Map<Integer, ContenidoCatalogo> contenidos = porId(contenidoRepository.findAllById(contenidoIds),
                ContenidoCatalogo::getId);
        LocalDate hoy = hoy();

        return actividades.stream().map(a -> {
            List<ContenidoResumen> lista = a.getContenidoIds().stream()
                    .map(contenidos::get)
                    .filter(Objects::nonNull)
                    .sorted(Comparator.comparing(ContenidoCatalogo::getTipo).thenComparing(ContenidoCatalogo::getNombre))
                    .map(ContenidoResumen::de)
                    .toList();
            Club club = clubes.get(a.getClubId());
            return new ActividadResponse(a.getId(), a.getClubId(), club == null ? null : club.getNombre(),
                    a.getInstitucionId(), instituciones.get(a.getInstitucionId()),
                    a.getCursoId(), a.getCursoId() == null ? null : cursos.get(a.getCursoId()),
                    a.getResponsableId(), docentes.get(a.getResponsableId()),
                    a.getFecha(), a.getHoraInicio(), a.getHoraFin(),
                    Duration.between(a.getHoraInicio(), a.getHoraFin()).toMinutes(),
                    a.getTema(), a.getObjetivo(), a.getDescripcion(), a.getLugar(),
                    a.getEstado(),
                    a.getEstado() == EstadoActividad.PLANIFICADA && !a.getFecha().isAfter(hoy),
                    lista, a.getResumenEjecucion(), a.getObservaciones(),
                    a.getEjecutadaPor() == null ? null : usuarios.get(a.getEjecutadaPor()),
                    a.getFechaRegistroEjecucion(), a.getMotivoCancelacion(),
                    a.getCanceladaPor() == null ? null : usuarios.get(a.getCanceladaPor()),
                    a.getFechaCancelacion(), usuarios.get(a.getCreadoPor()), a.getCreatedAt(), a.getActualizadoEn());
        }).toList();
    }

    private <K> Set<K> ids(List<Actividad> actividades, Function<Actividad, K> campo) {
        return actividades.stream().map(campo).filter(Objects::nonNull).collect(Collectors.toCollection(HashSet::new));
    }

    private <K, V> Map<K, V> porId(Collection<V> valores, Function<V, K> clave) {
        return valores.stream().collect(Collectors.toMap(clave, Function.identity()));
    }

    private Map<String, String> instantanea(Actividad a) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("cursoId", texto(a.getCursoId()));
        m.put("responsableId", texto(a.getResponsableId()));
        m.put("fecha", texto(a.getFecha()));
        m.put("horaInicio", texto(a.getHoraInicio()));
        m.put("horaFin", texto(a.getHoraFin()));
        m.put("tema", texto(a.getTema()));
        m.put("lugar", texto(a.getLugar()));
        return m;
    }

    private String ordenados(Set<Integer> ids) {
        return new TreeSet<>(ids).toString();
    }

    private boolean esDocente(UsuarioPrincipal usuario) {
        return "DOCENTE".equals(usuario.getRolCodigo());
    }

    private Docente docentePropio(UsuarioPrincipal usuario) {
        return docenteRepository.findByUsuarioId(usuario.getId()).orElseThrow(() ->
                new ApiException(HttpStatus.FORBIDDEN, "Su usuario no está vinculado a un registro de docente."));
    }

    private LocalDate hoy() {
        return LocalDate.now(ZONA);
    }

    private String normalizar(String valor) {
        return valor.trim().replaceAll("\\s+", " ");
    }

    private String limpiar(String valor) {
        if (valor == null) {
            return null;
        }
        String recortado = valor.trim();
        return recortado.isEmpty() ? null : recortado;
    }
}
