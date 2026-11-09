package ec.edu.ups.tipi.proyectos;

import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.clubes.Club;
import ec.edu.ups.tipi.clubes.ClubRepository;
import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.docentes.Docente;
import ec.edu.ups.tipi.docentes.DocenteRepository;
import ec.edu.ups.tipi.estudiantes.Estudiante;
import ec.edu.ups.tipi.estudiantes.EstudianteRepository;
import ec.edu.ups.tipi.evidencias.EstadoEvidencia;
import ec.edu.ups.tipi.evidencias.Evidencia;
import ec.edu.ups.tipi.evidencias.EvidenciaRepository;
import ec.edu.ups.tipi.instituciones.Institucion;
import ec.edu.ups.tipi.instituciones.InstitucionRepository;
import ec.edu.ups.tipi.periodos.PeriodoAcademico;
import ec.edu.ups.tipi.periodos.PeriodoRepository;
import ec.edu.ups.tipi.proyectos.dto.CancelacionProyectoRequest;
import ec.edu.ups.tipi.proyectos.dto.EvidenciaVinculadaResponse;
import ec.edu.ups.tipi.proyectos.dto.EvidenciasProyectoRequest;
import ec.edu.ups.tipi.proyectos.dto.FinalizacionProyectoRequest;
import ec.edu.ups.tipi.proyectos.dto.IntegranteProyectoMinimaResponse;
import ec.edu.ups.tipi.proyectos.dto.IntegranteProyectoResponse;
import ec.edu.ups.tipi.proyectos.dto.IntegranteProyectoVista;
import ec.edu.ups.tipi.proyectos.dto.ProyectoActualizarRequest;
import ec.edu.ups.tipi.proyectos.dto.ProyectoCrearRequest;
import ec.edu.ups.tipi.proyectos.dto.ProyectoResponse;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.usuarios.Usuario;
import ec.edu.ups.tipi.usuarios.UsuarioRepository;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class ProyectoService {

    public static final int MAXIMO_INTEGRANTES = 30;
    public static final int MAXIMO_EVIDENCIAS = 30;

    private static final ZoneId ZONA = ZoneId.of("America/Guayaquil");
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Set<String> ROLES_GESTION = Set.of("ADMIN", "RESP_INSTITUCIONAL", "DOCENTE");
    private static final String INDICE_TITULO = "ux_proyectos_club_titulo";
    private static final String ENTIDAD = "PROYECTO";

    private final ProyectoRepository proyectoRepository;
    private final ClubRepository clubRepository;
    private final DocenteRepository docenteRepository;
    private final EstudianteRepository estudianteRepository;
    private final EvidenciaRepository evidenciaRepository;
    private final InstitucionRepository institucionRepository;
    private final PeriodoRepository periodoRepository;
    private final UsuarioRepository usuarioRepository;
    private final AlcanceInstitucional alcance;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public ProyectoResponse obtener(Long id, UsuarioPrincipal usuario) {
        Proyecto proyecto = buscar(id);
        verificarLectura(usuario, proyecto, clubDe(proyecto));
        return armar(List.of(proyecto), usuario).get(0);
    }

    @Transactional(readOnly = true)
    public PaginaResponse<ProyectoResponse> listar(Long institucionId, Long clubId, Long estudianteId, Long docenteId,
                                                   EstadoProyecto estado, TipoProyecto tipo, Integer periodoId,
                                                   int pagina, int tamano, UsuarioPrincipal usuario) {
        Specification<Proyecto> spec = (root, cq, cb) -> cb.conjunction();
        if (alcance.esGlobal(usuario)) {
            if (institucionId != null) {
                spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), institucionId));
            }
        } else if (esDocente(usuario)) {
            Long propio = docentePropio(usuario).getId();
            spec = spec.and((root, cq, cb) -> {
                Subquery<Long> susClubes = cq.subquery(Long.class);
                Root<Club> club = susClubes.from(Club.class);
                susClubes.select(club.get("id")).where(cb.equal(club.get("docenteId"), propio));
                return cb.or(root.get("clubId").in(susClubes), cb.equal(root.get("docenteId"), propio));
            });
        } else {
            Long propia = alcance.institucionPropia(usuario);
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), propia));
        }
        if (clubId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("clubId"), clubId));
        }
        if (estudianteId != null) {
            spec = spec.and((root, cq, cb) -> cb.isMember(estudianteId, root.<Collection<Long>>get("estudianteIds")));
        }
        if (docenteId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("docenteId"), docenteId));
        }
        if (estado != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("estado"), estado));
        }
        if (tipo != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("tipo"), tipo));
        }
        if (periodoId != null) {
            spec = spec.and((root, cq, cb) -> {
                Subquery<Long> delPeriodo = cq.subquery(Long.class);
                Root<Club> club = delPeriodo.from(Club.class);
                delPeriodo.select(club.get("id")).where(cb.equal(club.get("periodoId"), periodoId));
                return root.get("clubId").in(delPeriodo);
            });
        }

        Pageable pageable = PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamano, 1), 100),
                Sort.by(Sort.Order.desc("fechaInicio"), Sort.Order.desc("id")));
        Page<Proyecto> resultado = proyectoRepository.findAll(spec, pageable);
        return PaginaResponse.de(new PageImpl<>(armar(resultado.getContent(), usuario), pageable,
                resultado.getTotalElements()));
    }

    @Transactional
    public ProyectoResponse registrar(ProyectoCrearRequest request, UsuarioPrincipal usuario) {
        Club club = clubRepository.findById(request.clubId()).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Club no encontrado."));
        if (esDocente(usuario)) {
            if (!docentePropio(usuario).getId().equals(club.getDocenteId())) {
                throw new ApiException(HttpStatus.FORBIDDEN,
                        "Solo puede registrar proyectos en los clubes que coordina.");
            }
        } else {
            alcance.verificar(usuario, club.getInstitucionId());
        }
        if (club.getEstado() != EstadoClub.ACTIVO) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Solo se registran proyectos en clubes activos; el club está en estado " + club.getEstado() + ".");
        }

        Long tutorId = request.docenteId() != null ? request.docenteId() : club.getDocenteId();
        validarTutor(tutorId, club);
        LocalDate inicio = request.fechaInicio() != null ? request.fechaInicio() : LocalDate.now(ZONA);
        validarFechas(inicio, request.fechaFinPrevista(), club);
        String titulo = request.titulo().trim();
        verificarTituloLibre(club.getId(), titulo, null);
        Set<Long> integrantes = normalizar(request.estudianteIds());
        validarIntegrantes(club, integrantes);

        Proyecto proyecto = new Proyecto();
        proyecto.setClubId(club.getId());
        proyecto.setInstitucionId(club.getInstitucionId());
        proyecto.setDocenteId(tutorId);
        proyecto.setTipo(request.tipo());
        proyecto.setTitulo(titulo);
        proyecto.setObjetivo(request.objetivo().trim());
        proyecto.setDescripcion(limpiar(request.descripcion()));
        proyecto.setFechaInicio(inicio);
        proyecto.setFechaFinPrevista(request.fechaFinPrevista());
        proyecto.setCreadoPor(usuario.getId());
        proyecto.setEstudianteIds(new HashSet<>(integrantes));
        proyecto = guardar(proyecto);

        auditoria.registrar("PROYECTO_REGISTRADO", ENTIDAD, proyecto.getId(), "clubId=" + club.getId()
                + "; tipo=" + proyecto.getTipo() + "; titulo=" + titulo + "; docenteId=" + tutorId
                + "; fechaInicio=" + inicio + "; estudianteIds=" + new TreeSet<>(integrantes));
        return armar(List.of(proyecto), usuario).get(0);
    }

    @Transactional
    public ProyectoResponse actualizar(Long id, ProyectoActualizarRequest request, UsuarioPrincipal usuario) {
        Proyecto proyecto = bloquearYBuscar(id);
        Club club = clubDe(proyecto);
        verificarEscritura(usuario, proyecto, club);
        verificarModificable(proyecto, club);

        if (!request.docenteId().equals(proyecto.getDocenteId())) {
            validarTutor(request.docenteId(), club);
        }
        validarFechas(request.fechaInicio(), request.fechaFinPrevista(), club);
        String titulo = request.titulo().trim();
        if (!titulo.equalsIgnoreCase(proyecto.getTitulo())) {
            verificarTituloLibre(club.getId(), titulo, proyecto.getId());
        }
        Set<Long> integrantes = normalizar(request.estudianteIds());
        Set<Long> agregados = new TreeSet<>(integrantes);
        agregados.removeAll(proyecto.getEstudianteIds());
        Set<Long> quitados = new TreeSet<>(proyecto.getEstudianteIds());
        quitados.removeAll(integrantes);
        validarIntegrantes(club, agregados);

        String objetivo = request.objetivo().trim();
        String descripcion = limpiar(request.descripcion());
        List<String> cambios = new ArrayList<>();
        if (request.tipo() != proyecto.getTipo()) {
            cambios.add("tipo: '" + proyecto.getTipo() + "' -> '" + request.tipo() + "'");
        }
        if (!titulo.equals(proyecto.getTitulo())) {
            cambios.add("titulo: '" + proyecto.getTitulo() + "' -> '" + titulo + "'");
        }
        if (!objetivo.equals(proyecto.getObjetivo())) {
            cambios.add("objetivo modificado");
        }
        if (!Objects.equals(descripcion, proyecto.getDescripcion())) {
            cambios.add("descripcion modificada");
        }
        if (!request.docenteId().equals(proyecto.getDocenteId())) {
            cambios.add("docenteId: '" + proyecto.getDocenteId() + "' -> '" + request.docenteId() + "'");
        }
        if (!request.fechaInicio().equals(proyecto.getFechaInicio())) {
            cambios.add("fechaInicio: '" + proyecto.getFechaInicio() + "' -> '" + request.fechaInicio() + "'");
        }
        if (!Objects.equals(request.fechaFinPrevista(), proyecto.getFechaFinPrevista())) {
            cambios.add("fechaFinPrevista: '" + proyecto.getFechaFinPrevista() + "' -> '"
                    + request.fechaFinPrevista() + "'");
        }
        if (!agregados.isEmpty()) {
            cambios.add("estudiantes agregados=" + agregados);
        }
        if (!quitados.isEmpty()) {
            cambios.add("estudiantes quitados=" + quitados);
        }
        if (cambios.isEmpty()) {
            return armar(List.of(proyecto), usuario).get(0);
        }

        proyecto.setTipo(request.tipo());
        proyecto.setTitulo(titulo);
        proyecto.setObjetivo(objetivo);
        proyecto.setDescripcion(descripcion);
        proyecto.setDocenteId(request.docenteId());
        proyecto.setFechaInicio(request.fechaInicio());
        proyecto.setFechaFinPrevista(request.fechaFinPrevista());
        proyecto.getEstudianteIds().removeAll(quitados);
        proyecto.getEstudianteIds().addAll(agregados);
        proyecto.setActualizadoEn(Instant.now());
        proyecto = guardar(proyecto);
        auditoria.registrar("PROYECTO_ACTUALIZADO", ENTIDAD, proyecto.getId(), String.join("; ", cambios));
        return armar(List.of(proyecto), usuario).get(0);
    }

    @Transactional
    public ProyectoResponse vincularEvidencias(Long id, EvidenciasProyectoRequest request, UsuarioPrincipal usuario) {
        Proyecto proyecto = bloquearYBuscar(id);
        Club club = clubDe(proyecto);
        verificarEscritura(usuario, proyecto, club);
        if (club.getEstado() == EstadoClub.CERRADO) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El club está cerrado; sus proyectos forman parte del historial y ya no se modifican.");
        }
        if (proyecto.getEstado() == EstadoProyecto.CANCELADO) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El proyecto fue cancelado; sus evidencias vinculadas ya no se modifican.");
        }

        Set<Long> nuevas = normalizar(request.evidenciaIds());
        Set<Long> agregadas = new TreeSet<>(nuevas);
        agregadas.removeAll(proyecto.getEvidenciaIds());
        Set<Long> quitadas = new TreeSet<>(proyecto.getEvidenciaIds());
        quitadas.removeAll(nuevas);
        if (agregadas.isEmpty() && quitadas.isEmpty()) {
            return armar(List.of(proyecto), usuario).get(0);
        }
        validarEvidencias(proyecto, agregadas);

        proyecto.getEvidenciaIds().removeAll(quitadas);
        proyecto.getEvidenciaIds().addAll(agregadas);
        proyectoRepository.saveAndFlush(proyecto);
        auditoria.registrar("PROYECTO_EVIDENCIAS_ACTUALIZADAS", ENTIDAD, proyecto.getId(),
                "agregadas=" + agregadas + "; quitadas=" + quitadas);
        return armar(List.of(proyecto), usuario).get(0);
    }

    @Transactional
    public ProyectoResponse finalizar(Long id, FinalizacionProyectoRequest request, UsuarioPrincipal usuario) {
        Proyecto proyecto = bloquearYBuscar(id);
        Club club = clubDe(proyecto);
        verificarEscritura(usuario, proyecto, club);
        verificarModificable(proyecto, club);
        if (proyecto.getEstudianteIds().isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El proyecto no tiene integrantes; registre al menos un estudiante antes de finalizarlo.");
        }
        LocalDate hoy = LocalDate.now(ZONA);
        LocalDate fecha = request.fechaFinalizacion() != null ? request.fechaFinalizacion() : hoy;
        if (fecha.isBefore(proyecto.getFechaInicio()) || fecha.isAfter(hoy)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha de finalización debe estar entre la fecha de "
                    + "inicio del proyecto (" + proyecto.getFechaInicio().format(FECHA) + ") y hoy.");
        }

        Set<Long> agregadas = new TreeSet<>();
        Set<Long> quitadas = new TreeSet<>();
        if (request.evidenciaIds() != null) {
            Set<Long> nuevas = normalizar(request.evidenciaIds());
            agregadas.addAll(nuevas);
            agregadas.removeAll(proyecto.getEvidenciaIds());
            quitadas.addAll(proyecto.getEvidenciaIds());
            quitadas.removeAll(nuevas);
            validarEvidencias(proyecto, agregadas);
        }

        Instant ahora = Instant.now();
        String resultado = request.resultadoFinal().trim();
        proyecto.setEstado(EstadoProyecto.FINALIZADO);
        proyecto.setResultadoFinal(resultado);
        proyecto.setFechaFinalizacion(fecha);
        proyecto.setFinalizadoPor(usuario.getId());
        proyecto.setActualizadoEn(ahora);
        proyecto.getEvidenciaIds().removeAll(quitadas);
        proyecto.getEvidenciaIds().addAll(agregadas);
        proyecto = proyectoRepository.saveAndFlush(proyecto);

        StringBuilder detalle = new StringBuilder("estado: 'EN_DESARROLLO' -> 'FINALIZADO'; fechaFinalizacion=" + fecha
                + "; integrantes=" + proyecto.getEstudianteIds().size());
        if (!agregadas.isEmpty()) {
            detalle.append("; evidencias agregadas=").append(agregadas);
        }
        if (!quitadas.isEmpty()) {
            detalle.append("; evidencias quitadas=").append(quitadas);
        }
        auditoria.registrar("PROYECTO_FINALIZADO", ENTIDAD, proyecto.getId(), detalle.toString());
        return armar(List.of(proyecto), usuario).get(0);
    }

    @Transactional
    public ProyectoResponse cancelar(Long id, CancelacionProyectoRequest request, UsuarioPrincipal usuario) {
        Proyecto proyecto = bloquearYBuscar(id);
        Club club = clubDe(proyecto);
        verificarEscritura(usuario, proyecto, club);
        verificarModificable(proyecto, club);

        Instant ahora = Instant.now();
        String motivo = request.motivo().trim();
        proyecto.setEstado(EstadoProyecto.CANCELADO);
        proyecto.setMotivoCancelacion(motivo);
        proyecto.setCanceladoPor(usuario.getId());
        proyecto.setFechaCancelacion(ahora);
        proyecto.setActualizadoEn(ahora);
        proyecto = proyectoRepository.saveAndFlush(proyecto);
        auditoria.registrar("PROYECTO_CANCELADO", ENTIDAD, proyecto.getId(),
                "estado: 'EN_DESARROLLO' -> 'CANCELADO'; motivo=" + motivo);
        return armar(List.of(proyecto), usuario).get(0);
    }

    private List<ProyectoResponse> armar(List<Proyecto> proyectos, UsuarioPrincipal usuario) {
        if (proyectos.isEmpty()) {
            return List.of();
        }
        boolean minima = alcance.soloDatosMinimos(usuario);
        Optional<Long> docenteUsuario = esDocente(usuario)
                ? docenteRepository.findByUsuarioId(usuario.getId()).map(Docente::getId)
                : Optional.empty();
        Map<Long, Club> clubes = porId(clubRepository.findAllById(ids(proyectos, Proyecto::getClubId)), Club::getId);
        Map<Long, String> instituciones = institucionRepository.findAllById(ids(proyectos, Proyecto::getInstitucionId))
                .stream().collect(Collectors.toMap(Institucion::getId, Institucion::getNombre));
        Map<Long, String> docentes = docenteRepository.findAllById(ids(proyectos, Proyecto::getDocenteId)).stream()
                .collect(Collectors.toMap(Docente::getId, d -> d.getApellidos() + " " + d.getNombres()));
        Map<Long, String> usuarios = nombresUsuarios(proyectos.stream()
                .flatMap(p -> Stream.of(p.getCreadoPor(), p.getFinalizadoPor(), p.getCanceladoPor())));
        Set<Long> integrantes = proyectos.stream().flatMap(p -> p.getEstudianteIds().stream())
                .collect(Collectors.toSet());
        Map<Long, Estudiante> estudiantes = integrantes.isEmpty() ? Map.of()
                : porId(estudianteRepository.findAllById(integrantes), Estudiante::getId);
        Set<Long> vinculadas = proyectos.stream().flatMap(p -> p.getEvidenciaIds().stream())
                .collect(Collectors.toSet());
        Map<Long, Evidencia> evidencias = vinculadas.isEmpty() ? Map.of()
                : porId(evidenciaRepository.findAllById(vinculadas), Evidencia::getId);
        Map<Long, Object[]> seguimiento = proyectoRepository.seguimiento(ids(proyectos, Proyecto::getId)).stream()
                .collect(Collectors.toMap(f -> ((Number) f[0]).longValue(), Function.identity()));
        Map<Long, Set<Long>> activosPorClub = new HashMap<>();
        proyectos.stream().collect(Collectors.groupingBy(Proyecto::getClubId)).forEach((clubId, delClub) -> {
            Set<Long> ids = delClub.stream().flatMap(p -> p.getEstudianteIds().stream()).collect(Collectors.toSet());
            activosPorClub.put(clubId, ids.isEmpty() ? Set.of()
                    : new HashSet<>(proyectoRepository.integrantesActivos(clubId, ids)));
        });

        return proyectos.stream().map(p -> {
            Club club = clubes.get(p.getClubId());
            Set<Long> activos = activosPorClub.getOrDefault(p.getClubId(), Set.of());
            List<IntegranteProyectoVista> equipo = p.getEstudianteIds().stream()
                    .map(estudiantes::get)
                    .filter(Objects::nonNull)
                    .sorted(Comparator.comparing(e -> claveOrden(e, minima)))
                    .map(e -> minima
                            ? (IntegranteProyectoVista) new IntegranteProyectoMinimaResponse(e.getId(),
                            e.getCodigoInterno(), activos.contains(e.getId()))
                            : new IntegranteProyectoResponse(e.getId(), e.getCodigoInterno(), e.getNombres(),
                            e.getApellidos(), activos.contains(e.getId())))
                    .toList();
            List<EvidenciaVinculadaResponse> productos = p.getEvidenciaIds().stream()
                    .map(evidencias::get)
                    .filter(Objects::nonNull)
                    .sorted(Comparator.comparing(Evidencia::getFechaEvidencia).thenComparing(Evidencia::getId))
                    .map(e -> new EvidenciaVinculadaResponse(e.getId(), e.getActividadId(), e.getTipo(), e.getTitulo(),
                            e.getFechaEvidencia(), e.getEstado()))
                    .toList();
            Object[] avance = seguimiento.get(p.getId());
            long registrados = avance == null ? 0 : ((Number) avance[1]).longValue();
            LocalDate ultimo = avance == null ? null : fecha(avance[2]);
            Integer porcentaje = p.getEstado() == EstadoProyecto.FINALIZADO ? Integer.valueOf(100)
                    : avance == null || avance[3] == null ? null : ((Number) avance[3]).intValue();
            String motivo = puedeGestionar(usuario, docenteUsuario, p, club)
                    ? motivoBloqueo(p, club)
                    : "Su rol solo permite consultar este proyecto.";
            return new ProyectoResponse(p.getId(), p.getClubId(), club.getNombre(), p.getInstitucionId(),
                    instituciones.get(p.getInstitucionId()), p.getDocenteId(), docentes.get(p.getDocenteId()),
                    p.getTipo(), p.getTitulo(), p.getObjetivo(), p.getDescripcion(), p.getFechaInicio(),
                    p.getFechaFinPrevista(), p.getEstado(), porcentaje, registrados, ultimo, equipo, productos,
                    p.getResultadoFinal(), p.getFechaFinalizacion(),
                    p.getFinalizadoPor() == null ? null : usuarios.get(p.getFinalizadoPor()),
                    p.getMotivoCancelacion(), p.getCanceladoPor() == null ? null : usuarios.get(p.getCanceladoPor()),
                    p.getFechaCancelacion(), usuarios.get(p.getCreadoPor()), p.getFechaRegistro(),
                    p.getActualizadoEn(), motivo == null, motivo);
        }).toList();
    }

    private void validarTutor(Long docenteId, Club club) {
        Docente tutor = docenteRepository.findById(docenteId).orElse(null);
        if (tutor == null || !tutor.getInstitucionId().equals(club.getInstitucionId()) || !tutor.isActivo()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "El docente tutor debe ser un docente activo de la institución del club.");
        }
    }

    private void validarFechas(LocalDate inicio, LocalDate finPrevista, Club club) {
        PeriodoAcademico periodo = periodoRepository.findById(club.getPeriodoId()).orElseThrow(() ->
                new ApiException(HttpStatus.CONFLICT, "El período académico del club no existe."));
        LocalDate hoy = LocalDate.now(ZONA);
        LocalDate limite = periodo.getFechaFin().isBefore(hoy) ? periodo.getFechaFin() : hoy;
        if (inicio.isBefore(periodo.getFechaInicio()) || inicio.isAfter(limite)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha de inicio del proyecto debe estar dentro del "
                    + "período académico del club (" + periodo.getFechaInicio().format(FECHA) + " a "
                    + periodo.getFechaFin().format(FECHA) + ") y no puede ser posterior a hoy.");
        }
        if (finPrevista != null) {
            if (finPrevista.isBefore(inicio)) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "La fecha prevista de finalización no puede ser anterior a la fecha de inicio.");
            }
            if (finPrevista.isAfter(periodo.getFechaFin())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha prevista de finalización no puede superar "
                        + "el fin del período académico del club (" + periodo.getFechaFin().format(FECHA) + ").");
            }
        }
    }

    private void verificarTituloLibre(Long clubId, String titulo, Long excluirId) {
        proyectoRepository.conMismoTitulo(clubId, titulo, excluirId).stream().findFirst().ifPresent(p -> {
            throw new ApiException(HttpStatus.CONFLICT, "El club ya tiene un proyecto con el título «" + p.getTitulo()
                    + "» (" + p.getEstado() + "). Use otro título o cancele el proyecto anterior.");
        });
    }

    private void validarIntegrantes(Club club, Set<Long> estudianteIds) {
        if (estudianteIds.isEmpty()) {
            return;
        }
        if (estudianteIds.size() > MAXIMO_INTEGRANTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Un proyecto admite máximo " + MAXIMO_INTEGRANTES + " integrantes.");
        }
        Set<Long> activos = new HashSet<>(proyectoRepository.integrantesActivos(club.getId(), estudianteIds));
        List<Long> fuera = estudianteIds.stream().filter(id -> !activos.contains(id)).sorted().toList();
        if (!fuera.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, (fuera.size() == 1
                    ? "El estudiante con id " + fuera.get(0) + " no es integrante activo del club «"
                    : "Los estudiantes con id " + fuera + " no son integrantes activos del club «")
                    + club.getNombre() + "»; solo los integrantes activos se suman a un proyecto.");
        }
    }

    private void validarEvidencias(Proyecto proyecto, Set<Long> evidenciaIds) {
        if (proyecto.getEvidenciaIds().size() + evidenciaIds.size() > MAXIMO_EVIDENCIAS) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Un proyecto admite máximo " + MAXIMO_EVIDENCIAS + " evidencias vinculadas.");
        }
        if (evidenciaIds.isEmpty()) {
            return;
        }
        Map<Long, Evidencia> encontradas = porId(evidenciaRepository.findAllById(evidenciaIds), Evidencia::getId);
        for (Long id : evidenciaIds) {
            Evidencia evidencia = encontradas.get(id);
            if (evidencia == null || !evidencia.getClubId().equals(proyecto.getClubId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "La evidencia con id " + id + " no existe o no pertenece al club del proyecto.");
            }
            if (evidencia.getEstado() != EstadoEvidencia.ACTIVA) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "La evidencia «" + evidencia.getTitulo() + "» fue retirada y no se vincula con proyectos.");
            }
        }
    }

    private void verificarModificable(Proyecto proyecto, Club club) {
        String bloqueo = motivoBloqueo(proyecto, club);
        if (bloqueo != null) {
            throw new ApiException(HttpStatus.CONFLICT, bloqueo);
        }
    }

    private String motivoBloqueo(Proyecto proyecto, Club club) {
        if (club.getEstado() == EstadoClub.CERRADO) {
            return "El club está cerrado; sus proyectos forman parte del historial y ya no se modifican.";
        }
        if (proyecto.getEstado() == EstadoProyecto.FINALIZADO) {
            return "El proyecto ya fue finalizado; solo se pueden ajustar sus evidencias vinculadas.";
        }
        if (proyecto.getEstado() == EstadoProyecto.CANCELADO) {
            return "El proyecto fue cancelado y ya no se modifica.";
        }
        return null;
    }

    private Proyecto guardar(Proyecto proyecto) {
        try {
            return proyectoRepository.saveAndFlush(proyecto);
        } catch (DataIntegrityViolationException ex) {
            String detalle = ex.getMostSpecificCause().getMessage();
            if (detalle != null && detalle.contains(INDICE_TITULO)) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Otra persona registró al mismo tiempo un proyecto con este título en el club.");
            }
            throw ex;
        }
    }

    private Proyecto bloquearYBuscar(Long id) {
        proyectoRepository.bloquear(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Proyecto no encontrado."));
        return buscar(id);
    }

    private Proyecto buscar(Long id) {
        return proyectoRepository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Proyecto no encontrado."));
    }

    private Club clubDe(Proyecto proyecto) {
        return clubRepository.findById(proyecto.getClubId()).orElseThrow(() ->
                new ApiException(HttpStatus.CONFLICT, "El club del proyecto no existe."));
    }

    private void verificarLectura(UsuarioPrincipal usuario, Proyecto proyecto, Club club) {
        if (alcance.esGlobal(usuario)) {
            return;
        }
        if (esDocente(usuario)) {
            if (!esDelDocente(docentePropio(usuario).getId(), proyecto, club)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "No tiene permisos sobre este proyecto.");
            }
            return;
        }
        alcance.verificar(usuario, proyecto.getInstitucionId());
    }

    private void verificarEscritura(UsuarioPrincipal usuario, Proyecto proyecto, Club club) {
        if (esDocente(usuario)) {
            if (!esDelDocente(docentePropio(usuario).getId(), proyecto, club)) {
                throw new ApiException(HttpStatus.FORBIDDEN,
                        "Solo puede gestionar los proyectos de los clubes que coordina o de los que es tutor.");
            }
            return;
        }
        alcance.verificar(usuario, proyecto.getInstitucionId());
    }

    private boolean puedeGestionar(UsuarioPrincipal usuario, Optional<Long> docenteUsuario, Proyecto proyecto,
                                   Club club) {
        if (!ROLES_GESTION.contains(usuario.getRolCodigo())) {
            return false;
        }
        if (esDocente(usuario)) {
            return docenteUsuario.map(d -> esDelDocente(d, proyecto, club)).orElse(false);
        }
        return alcance.esGlobal(usuario) || proyecto.getInstitucionId().equals(usuario.getInstitucionId());
    }

    private boolean esDelDocente(Long docenteId, Proyecto proyecto, Club club) {
        return docenteId.equals(club.getDocenteId()) || docenteId.equals(proyecto.getDocenteId());
    }

    private boolean esDocente(UsuarioPrincipal usuario) {
        return "DOCENTE".equals(usuario.getRolCodigo());
    }

    private Docente docentePropio(UsuarioPrincipal usuario) {
        return docenteRepository.findByUsuarioId(usuario.getId()).orElseThrow(() ->
                new ApiException(HttpStatus.FORBIDDEN, "Su usuario no está vinculado a un registro de docente."));
    }

    private Set<Long> normalizar(List<Long> ids) {
        return ids == null ? new LinkedHashSet<>() : new LinkedHashSet<>(ids);
    }

    private String claveOrden(Estudiante e, boolean minima) {
        return minima ? e.getCodigoInterno()
                : (e.getApellidos() + " " + e.getNombres()).toLowerCase() + " " + e.getCodigoInterno();
    }

    private LocalDate fecha(Object valor) {
        if (valor == null) {
            return null;
        }
        if (valor instanceof LocalDate local) {
            return local;
        }
        return ((Date) valor).toLocalDate();
    }

    private Map<Long, String> nombresUsuarios(Stream<Long> ids) {
        Set<Long> conjunto = ids.filter(Objects::nonNull).collect(Collectors.toSet());
        if (conjunto.isEmpty()) {
            return Map.of();
        }
        return usuarioRepository.findAllById(conjunto).stream()
                .collect(Collectors.toMap(Usuario::getId, u -> u.getNombres() + " " + u.getApellidos()));
    }

    private <K> Set<K> ids(List<Proyecto> proyectos, Function<Proyecto, K> campo) {
        return proyectos.stream().map(campo).filter(Objects::nonNull).collect(Collectors.toCollection(HashSet::new));
    }

    private <K, V> Map<K, V> porId(Collection<V> valores, Function<V, K> clave) {
        return valores.stream().collect(Collectors.toMap(clave, Function.identity()));
    }

    private String limpiar(String valor) {
        if (valor == null) {
            return null;
        }
        String recortado = valor.trim();
        return recortado.isEmpty() ? null : recortado;
    }
}
