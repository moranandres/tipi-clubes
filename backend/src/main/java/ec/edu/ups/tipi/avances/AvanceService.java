package ec.edu.ups.tipi.avances;

import ec.edu.ups.tipi.actividades.Actividad;
import ec.edu.ups.tipi.actividades.ActividadRepository;
import ec.edu.ups.tipi.actividades.ContenidoCatalogo;
import ec.edu.ups.tipi.actividades.ContenidoCatalogoRepository;
import ec.edu.ups.tipi.actividades.EstadoActividad;
import ec.edu.ups.tipi.actividades.TipoContenido;
import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.avances.dto.AnulacionAvanceRequest;
import ec.edu.ups.tipi.avances.dto.AvanceActualizarRequest;
import ec.edu.ups.tipi.avances.dto.AvanceCrearRequest;
import ec.edu.ups.tipi.avances.dto.AvanceResponse;
import ec.edu.ups.tipi.avances.dto.CompetenciaEvaluadaRequest;
import ec.edu.ups.tipi.avances.dto.CompetenciaEvaluadaResponse;
import ec.edu.ups.tipi.avances.dto.EstudianteAvanceMinimaResponse;
import ec.edu.ups.tipi.avances.dto.EstudianteAvanceResponse;
import ec.edu.ups.tipi.avances.dto.EstudianteAvanceVista;
import ec.edu.ups.tipi.avances.dto.EvaluacionCompetenciaResponse;
import ec.edu.ups.tipi.avances.dto.ProgresoCompetenciaResponse;
import ec.edu.ups.tipi.avances.dto.ProgresoEstudianteResponse;
import ec.edu.ups.tipi.avances.dto.ProyectoEstudianteResponse;
import ec.edu.ups.tipi.clubes.Club;
import ec.edu.ups.tipi.clubes.ClubRepository;
import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.docentes.Docente;
import ec.edu.ups.tipi.docentes.DocenteRepository;
import ec.edu.ups.tipi.estudiantes.Estudiante;
import ec.edu.ups.tipi.estudiantes.EstudianteRepository;
import ec.edu.ups.tipi.historial.AlcanceHistorial;
import ec.edu.ups.tipi.instituciones.Institucion;
import ec.edu.ups.tipi.instituciones.InstitucionRepository;
import ec.edu.ups.tipi.periodos.PeriodoAcademico;
import ec.edu.ups.tipi.periodos.PeriodoRepository;
import ec.edu.ups.tipi.proyectos.EstadoProyecto;
import ec.edu.ups.tipi.proyectos.Proyecto;
import ec.edu.ups.tipi.proyectos.ProyectoRepository;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.usuarios.Usuario;
import ec.edu.ups.tipi.usuarios.UsuarioRepository;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
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

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class AvanceService {

    private static final ZoneId ZONA = ZoneId.of("America/Guayaquil");
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final String ENTIDAD = "AVANCE";
    private static final Set<String> INDICES_UNICOS = Set.of(
            "ux_avances_club_fecha", "ux_avances_estudiante_fecha", "ux_avances_proyecto_fecha");

    private final AvanceRepository avanceRepository;
    private final ClubRepository clubRepository;
    private final ProyectoRepository proyectoRepository;
    private final ActividadRepository actividadRepository;
    private final ContenidoCatalogoRepository contenidoRepository;
    private final DocenteRepository docenteRepository;
    private final EstudianteRepository estudianteRepository;
    private final InstitucionRepository institucionRepository;
    private final PeriodoRepository periodoRepository;
    private final UsuarioRepository usuarioRepository;
    private final AlcanceInstitucional alcance;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public AvanceResponse obtener(Long id, UsuarioPrincipal usuario) {
        Avance avance = buscar(id);
        Club club = clubDe(avance.getClubId());
        verificarLectura(usuario, club, proyectoDe(avance.getProyectoId()), actividadDe(avance.getActividadId()));
        return armar(List.of(avance), alcance.soloDatosMinimos(usuario)).get(0);
    }

    @Transactional(readOnly = true)
    public PaginaResponse<AvanceResponse> listar(Long institucionId, Long clubId, AlcanceAvance alcanceAvance,
                                                 Long estudianteId, Long proyectoId, Long actividadId,
                                                 EstadoAvance estado, LocalDate desde, LocalDate hasta, int pagina,
                                                 int tamano, UsuarioPrincipal usuario) {
        if (desde != null && hasta != null && hasta.isBefore(desde)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha «hasta» no puede ser anterior a «desde».");
        }
        Specification<Avance> spec = alcanceDelUsuario(usuario, institucionId);
        if (clubId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("clubId"), clubId));
        }
        if (alcanceAvance != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("alcance"), alcanceAvance));
        }
        if (estudianteId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("estudianteId"), estudianteId));
        }
        if (proyectoId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("proyectoId"), proyectoId));
        }
        if (actividadId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("actividadId"), actividadId));
        }
        EstadoAvance filtroEstado = estado != null ? estado : EstadoAvance.ACTIVO;
        spec = spec.and((root, cq, cb) -> cb.equal(root.get("estado"), filtroEstado));
        if (desde != null) {
            spec = spec.and((root, cq, cb) -> cb.greaterThanOrEqualTo(root.get("fecha"), desde));
        }
        if (hasta != null) {
            spec = spec.and((root, cq, cb) -> cb.lessThanOrEqualTo(root.get("fecha"), hasta));
        }

        Pageable pageable = PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamano, 1), 100),
                Sort.by(Sort.Order.desc("fecha"), Sort.Order.desc("id")));
        Page<Avance> resultado = avanceRepository.findAll(spec, pageable);
        return PaginaResponse.de(new PageImpl<>(armar(resultado.getContent(), alcance.soloDatosMinimos(usuario)),
                pageable, resultado.getTotalElements()));
    }

    @Transactional
    public AvanceResponse registrar(AvanceCrearRequest request, UsuarioPrincipal usuario) {
        Club club = clubRepository.findById(request.clubId()).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Club no encontrado."));
        AlcanceAvance tipo = request.alcance();
        validarSujeto(tipo, request.estudianteId(), request.proyectoId(), request.porcentajeAvance(),
                request.competencias());
        Proyecto proyecto = null;
        if (request.proyectoId() != null) {
            proyecto = proyectoRepository.findById(request.proyectoId()).orElseThrow(() ->
                    new ApiException(HttpStatus.NOT_FOUND, "Proyecto no encontrado."));
            if (!proyecto.getClubId().equals(club.getId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "El proyecto no pertenece al club indicado.");
            }
        }
        Actividad actividad = actividadDelClub(request.actividadId(), club);
        verificarEscritura(usuario, club, proyecto, actividad);
        String bloqueo = motivoBloqueo(club, proyecto);
        if (bloqueo != null) {
            throw new ApiException(HttpStatus.CONFLICT, bloqueo);
        }
        if (club.getEstado() == EstadoClub.PLANIFICADO) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El club aún está planificado; los avances se registran desde que el club está activo.");
        }

        LocalDate hoy = LocalDate.now(ZONA);
        LocalDate fecha = request.fecha() != null ? request.fecha() : actividad != null ? actividad.getFecha() : hoy;
        validarFecha(fecha, club, proyecto, actividad);
        Estudiante estudiante = null;
        if (request.estudianteId() != null) {
            estudiante = estudianteDelClub(request.estudianteId(), club, fecha);
        }
        verificarDuplicado(tipo, club, fecha, estudiante, proyecto, null);
        Set<CompetenciaEvaluada> competencias = evaluar(request.competencias(), Set.of());

        Avance avance = new Avance();
        avance.setClubId(club.getId());
        avance.setInstitucionId(club.getInstitucionId());
        avance.setAlcance(tipo);
        avance.setEstudianteId(estudiante == null ? null : estudiante.getId());
        avance.setProyectoId(proyecto == null ? null : proyecto.getId());
        avance.setActividadId(actividad == null ? null : actividad.getId());
        avance.setFecha(fecha);
        avance.setResultados(request.resultados().trim());
        avance.setLogros(limpiar(request.logros()));
        avance.setDificultades(limpiar(request.dificultades()));
        avance.setProximosPasos(limpiar(request.proximosPasos()));
        avance.setPorcentajeAvance(request.porcentajeAvance() == null ? null
                : request.porcentajeAvance().shortValue());
        avance.setRegistradoPor(usuario.getId());
        avance.setCompetencias(competencias);
        avance = guardar(avance);

        StringBuilder detalle = new StringBuilder("clubId=" + club.getId() + "; alcance=" + tipo + "; fecha=" + fecha);
        if (estudiante != null) {
            detalle.append("; estudianteId=").append(estudiante.getId());
        }
        if (proyecto != null) {
            detalle.append("; proyectoId=").append(proyecto.getId())
                    .append("; porcentaje=").append(request.porcentajeAvance());
        }
        if (actividad != null) {
            detalle.append("; actividadId=").append(actividad.getId());
        }
        if (!competencias.isEmpty()) {
            detalle.append("; competencias=").append(textoCompetencias(competencias));
        }
        auditoria.registrar("AVANCE_REGISTRADO", ENTIDAD, avance.getId(), detalle.toString());
        return armar(List.of(avance), false).get(0);
    }

    @Transactional
    public AvanceResponse actualizar(Long id, AvanceActualizarRequest request, UsuarioPrincipal usuario) {
        Avance avance = buscar(id);
        Club club = clubDe(avance.getClubId());
        Proyecto proyecto = proyectoDe(avance.getProyectoId());
        Actividad actual = actividadDe(avance.getActividadId());
        verificarEscritura(usuario, club, proyecto, actual);
        verificarModificable(avance, club, proyecto);

        validarSujeto(avance.getAlcance(), avance.getEstudianteId(), avance.getProyectoId(),
                request.porcentajeAvance(), request.competencias());
        Actividad actividad = Objects.equals(request.actividadId(), avance.getActividadId())
                ? actual : actividadDelClub(request.actividadId(), club);
        if (actividad != actual) {
            verificarEscritura(usuario, club, proyecto, actividad);
        }
        boolean cambiaFecha = !request.fecha().equals(avance.getFecha());
        if (cambiaFecha || actividad != actual) {
            validarFecha(request.fecha(), club, proyecto, actividad);
        }
        Estudiante estudiante = null;
        if (avance.getEstudianteId() != null) {
            estudiante = cambiaFecha ? estudianteDelClub(avance.getEstudianteId(), club, request.fecha())
                    : estudianteRepository.findById(avance.getEstudianteId()).orElse(null);
        }
        if (cambiaFecha) {
            verificarDuplicado(avance.getAlcance(), club, request.fecha(), estudiante, proyecto, avance.getId());
        }

        Map<Integer, NivelLogro> anteriores = avance.getCompetencias().stream()
                .collect(Collectors.toMap(CompetenciaEvaluada::getContenidoId, CompetenciaEvaluada::getNivel));
        Set<CompetenciaEvaluada> nuevas = evaluar(request.competencias(), avance.getCompetencias());
        Map<Integer, NivelLogro> posteriores = nuevas.stream()
                .collect(Collectors.toMap(CompetenciaEvaluada::getContenidoId, CompetenciaEvaluada::getNivel));

        String resultados = request.resultados().trim();
        String logros = limpiar(request.logros());
        String dificultades = limpiar(request.dificultades());
        String proximosPasos = limpiar(request.proximosPasos());
        Short porcentaje = request.porcentajeAvance() == null ? null : request.porcentajeAvance().shortValue();
        Long actividadId = actividad == null ? null : actividad.getId();

        List<String> cambios = new ArrayList<>();
        if (cambiaFecha) {
            cambios.add("fecha: '" + avance.getFecha() + "' -> '" + request.fecha() + "'");
        }
        if (!Objects.equals(actividadId, avance.getActividadId())) {
            cambios.add("actividadId: '" + avance.getActividadId() + "' -> '" + actividadId + "'");
        }
        if (!resultados.equals(avance.getResultados())) {
            cambios.add("resultados modificados");
        }
        if (!Objects.equals(logros, avance.getLogros())) {
            cambios.add("logros modificados");
        }
        if (!Objects.equals(dificultades, avance.getDificultades())) {
            cambios.add("dificultades modificadas");
        }
        if (!Objects.equals(proximosPasos, avance.getProximosPasos())) {
            cambios.add("proximosPasos modificados");
        }
        if (!Objects.equals(porcentaje, avance.getPorcentajeAvance())) {
            cambios.add("porcentaje: '" + avance.getPorcentajeAvance() + "' -> '" + porcentaje + "'");
        }
        if (!anteriores.equals(posteriores)) {
            cambios.add("competencias: " + textoCompetencias(anteriores) + " -> " + textoCompetencias(posteriores));
        }
        if (cambios.isEmpty()) {
            return armar(List.of(avance), false).get(0);
        }

        avance.setFecha(request.fecha());
        avance.setActividadId(actividadId);
        avance.setResultados(resultados);
        avance.setLogros(logros);
        avance.setDificultades(dificultades);
        avance.setProximosPasos(proximosPasos);
        avance.setPorcentajeAvance(porcentaje);
        avance.getCompetencias().retainAll(nuevas);
        avance.getCompetencias().addAll(nuevas);
        avance.setActualizadoEn(Instant.now());
        avance = guardar(avance);
        auditoria.registrar("AVANCE_ACTUALIZADO", ENTIDAD, avance.getId(), String.join("; ", cambios));
        return armar(List.of(avance), false).get(0);
    }

    @Transactional
    public AvanceResponse anular(Long id, AnulacionAvanceRequest request, UsuarioPrincipal usuario) {
        Avance avance = buscar(id);
        Club club = clubDe(avance.getClubId());
        Proyecto proyecto = proyectoDe(avance.getProyectoId());
        verificarEscritura(usuario, club, proyecto, actividadDe(avance.getActividadId()));
        verificarModificable(avance, club, proyecto);

        Instant ahora = Instant.now();
        String motivo = request.motivo().trim();
        avance.setEstado(EstadoAvance.ANULADO);
        avance.setMotivoAnulacion(motivo);
        avance.setAnuladoPor(usuario.getId());
        avance.setFechaAnulacion(ahora);
        avance.setActualizadoEn(ahora);
        avance = avanceRepository.saveAndFlush(avance);
        auditoria.registrar("AVANCE_ANULADO", ENTIDAD, avance.getId(), "alcance=" + avance.getAlcance()
                + "; fecha=" + avance.getFecha() + "; estado: 'ACTIVO' -> 'ANULADO'; motivo=" + motivo);
        return armar(List.of(avance), false).get(0);
    }

    @Transactional(readOnly = true)
    public ProgresoEstudianteResponse progreso(Long estudianteId, Integer periodoId, UsuarioPrincipal usuario) {
        Estudiante estudiante = estudianteRepository.findById(estudianteId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Estudiante no encontrado."));
        AlcanceHistorial vista;
        if (alcance.esGlobal(usuario)) {
            vista = alcance.soloDatosMinimos(usuario) ? AlcanceHistorial.VISTA_MINIMA : AlcanceHistorial.COMPLETO;
        } else if (esDocente(usuario)) {
            if (!avanceRepository.estudianteRelacionadoConDocente(estudianteId, docentePropio(usuario).getId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "No tiene permisos sobre este estudiante.");
            }
            vista = AlcanceHistorial.CLUBES_DEL_DOCENTE;
        } else {
            alcance.verificar(usuario, estudiante.getInstitucionId());
            vista = AlcanceHistorial.COMPLETO;
        }
        if (periodoId != null && !periodoRepository.existsById(periodoId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El período académico indicado no existe.");
        }

        Specification<Avance> spec = alcanceDelUsuario(usuario, null)
                .and((root, cq, cb) -> cb.equal(root.get("estudianteId"), estudianteId))
                .and((root, cq, cb) -> cb.equal(root.get("alcance"), AlcanceAvance.ESTUDIANTE))
                .and((root, cq, cb) -> cb.equal(root.get("estado"), EstadoAvance.ACTIVO));
        if (periodoId != null) {
            spec = spec.and((root, cq, cb) -> root.get("clubId").in(clubesDelPeriodo(cq, cb, periodoId)));
        }
        List<Avance> avances = avanceRepository.findAll(spec, Sort.by("fecha", "id"));

        Map<Long, String> clubes = clubRepository.findAllById(avances.stream().map(Avance::getClubId)
                        .collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(Club::getId, Club::getNombre));
        Map<Integer, String> nombres = nombresContenidos(avances.stream()
                .flatMap(a -> a.getCompetencias().stream()).map(CompetenciaEvaluada::getContenidoId));
        Map<Integer, List<EvaluacionCompetenciaResponse>> porCompetencia = new TreeMap<>();
        for (Avance a : avances) {
            for (CompetenciaEvaluada c : a.getCompetencias()) {
                porCompetencia.computeIfAbsent(c.getContenidoId(), k -> new ArrayList<>())
                        .add(new EvaluacionCompetenciaResponse(a.getId(), a.getFecha(), a.getClubId(),
                                clubes.get(a.getClubId()), c.getNivel()));
            }
        }
        List<ProgresoCompetenciaResponse> competencias = porCompetencia.entrySet().stream().map(e -> {
            List<EvaluacionCompetenciaResponse> historial = e.getValue();
            EvaluacionCompetenciaResponse primera = historial.get(0);
            EvaluacionCompetenciaResponse ultima = historial.get(historial.size() - 1);
            return new ProgresoCompetenciaResponse(e.getKey(), nombres.get(e.getKey()), primera.nivel(),
                    ultima.nivel(), ultima.nivel().ordinal() - primera.nivel().ordinal(), historial.size(),
                    primera.fecha(), ultima.fecha(), historial);
        }).sorted(Comparator.comparing(ProgresoCompetenciaResponse::nombre,
                Comparator.nullsLast(Comparator.naturalOrder()))).toList();
        long logradas = competencias.stream()
                .filter(c -> c.nivelActual() == NivelLogro.LOGRADO || c.nivelActual() == NivelLogro.DESTACADO)
                .count();

        List<ProyectoEstudianteResponse> proyectos = proyectosDelEstudiante(estudianteId, periodoId, usuario);
        LocalDate ultimo = avances.isEmpty() ? null : avances.get(avances.size() - 1).getFecha();
        return new ProgresoEstudianteResponse(vistaEstudiante(estudiante, vista == AlcanceHistorial.VISTA_MINIMA),
                estudiante.getInstitucionId(), periodoId, vista, avances.size(), ultimo, competencias.size(), logradas,
                competencias, proyectos);
    }

    private List<ProyectoEstudianteResponse> proyectosDelEstudiante(Long estudianteId, Integer periodoId,
                                                                    UsuarioPrincipal usuario) {
        Specification<Proyecto> spec = (root, cq, cb) ->
                cb.isMember(estudianteId, root.<Collection<Long>>get("estudianteIds"));
        if (esDocente(usuario)) {
            Long propio = docentePropio(usuario).getId();
            spec = spec.and((root, cq, cb) -> {
                Subquery<Long> susClubes = cq.subquery(Long.class);
                Root<Club> club = susClubes.from(Club.class);
                susClubes.select(club.get("id")).where(cb.equal(club.get("docenteId"), propio));
                return cb.or(root.get("clubId").in(susClubes), cb.equal(root.get("docenteId"), propio));
            });
        } else if (!alcance.esGlobal(usuario)) {
            Long propia = alcance.institucionPropia(usuario);
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), propia));
        }
        if (periodoId != null) {
            spec = spec.and((root, cq, cb) -> root.get("clubId").in(clubesDelPeriodo(cq, cb, periodoId)));
        }
        List<Proyecto> proyectos = proyectoRepository.findAll(spec,
                Sort.by(Sort.Order.desc("fechaInicio"), Sort.Order.desc("id")));
        Map<Long, String> clubes = clubRepository.findAllById(proyectos.stream().map(Proyecto::getClubId)
                        .collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(Club::getId, Club::getNombre));
        return proyectos.stream().map(p -> new ProyectoEstudianteResponse(p.getId(), p.getClubId(),
                clubes.get(p.getClubId()), p.getTipo(), p.getTitulo(), p.getEstado(), p.getFechaInicio(),
                p.getFechaFinalizacion())).toList();
    }

    private List<AvanceResponse> armar(List<Avance> avances, boolean minima) {
        if (avances.isEmpty()) {
            return List.of();
        }
        Map<Long, String> clubes = clubRepository.findAllById(ids(avances, Avance::getClubId)).stream()
                .collect(Collectors.toMap(Club::getId, Club::getNombre));
        Map<Long, String> instituciones = institucionRepository.findAllById(ids(avances, Avance::getInstitucionId))
                .stream().collect(Collectors.toMap(Institucion::getId, Institucion::getNombre));
        Set<Long> estudianteIds = ids(avances, Avance::getEstudianteId);
        Map<Long, Estudiante> estudiantes = estudianteIds.isEmpty() ? Map.of()
                : porId(estudianteRepository.findAllById(estudianteIds), Estudiante::getId);
        Set<Long> proyectoIds = ids(avances, Avance::getProyectoId);
        Map<Long, String> proyectos = proyectoIds.isEmpty() ? Map.of()
                : proyectoRepository.findAllById(proyectoIds).stream()
                .collect(Collectors.toMap(Proyecto::getId, Proyecto::getTitulo));
        Set<Long> actividadIds = ids(avances, Avance::getActividadId);
        Map<Long, Actividad> actividades = actividadIds.isEmpty() ? Map.of()
                : porId(actividadRepository.findAllById(actividadIds), Actividad::getId);
        Map<Integer, String> contenidos = nombresContenidos(avances.stream()
                .flatMap(a -> a.getCompetencias().stream()).map(CompetenciaEvaluada::getContenidoId));
        Map<Long, String> usuarios = nombresUsuarios(avances.stream()
                .flatMap(a -> Stream.of(a.getRegistradoPor(), a.getAnuladoPor())));

        return avances.stream().map(a -> {
            boolean reservado = minima && a.getAlcance() == AlcanceAvance.ESTUDIANTE;
            Estudiante est = a.getEstudianteId() == null ? null : estudiantes.get(a.getEstudianteId());
            Actividad act = a.getActividadId() == null ? null : actividades.get(a.getActividadId());
            List<CompetenciaEvaluadaResponse> evaluadas = a.getCompetencias().stream()
                    .map(c -> new CompetenciaEvaluadaResponse(c.getContenidoId(), contenidos.get(c.getContenidoId()),
                            c.getNivel()))
                    .sorted(Comparator.comparing(CompetenciaEvaluadaResponse::nombre,
                            Comparator.nullsLast(Comparator.naturalOrder())))
                    .toList();
            return new AvanceResponse(a.getId(), a.getClubId(), clubes.get(a.getClubId()), a.getInstitucionId(),
                    instituciones.get(a.getInstitucionId()), a.getAlcance(),
                    est == null ? null : vistaEstudiante(est, minima), a.getProyectoId(),
                    a.getProyectoId() == null ? null : proyectos.get(a.getProyectoId()), a.getActividadId(),
                    act == null ? null : act.getTema(), act == null ? null : act.getFecha(), a.getFecha(), reservado,
                    reservado ? null : a.getResultados(), reservado ? null : a.getLogros(),
                    reservado ? null : a.getDificultades(), reservado ? null : a.getProximosPasos(),
                    a.getPorcentajeAvance() == null ? null : a.getPorcentajeAvance().intValue(), evaluadas,
                    a.getEstado(), usuarios.get(a.getRegistradoPor()), a.getFechaRegistro(), a.getActualizadoEn(),
                    reservado ? null : a.getMotivoAnulacion(),
                    a.getAnuladoPor() == null ? null : usuarios.get(a.getAnuladoPor()), a.getFechaAnulacion());
        }).toList();
    }

    private EstudianteAvanceVista vistaEstudiante(Estudiante estudiante, boolean minima) {
        return minima
                ? new EstudianteAvanceMinimaResponse(estudiante.getId(), estudiante.getCodigoInterno())
                : new EstudianteAvanceResponse(estudiante.getId(), estudiante.getCodigoInterno(),
                estudiante.getNombres(), estudiante.getApellidos());
    }

    private void validarSujeto(AlcanceAvance tipo, Long estudianteId, Long proyectoId, Integer porcentaje,
                               List<CompetenciaEvaluadaRequest> competencias) {
        boolean conCompetencias = competencias != null && !competencias.isEmpty();
        switch (tipo) {
            case CLUB -> {
                if (estudianteId != null || proyectoId != null) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Un avance del club no indica estudiante ni proyecto; use el alcance ESTUDIANTE o PROYECTO.");
                }
            }
            case ESTUDIANTE -> {
                if (estudianteId == null) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Indique el estudiante del avance en «estudianteId».");
                }
                if (proyectoId != null) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Un avance individual no indica proyecto; registre el avance del proyecto por separado.");
                }
            }
            case PROYECTO -> {
                if (proyectoId == null) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Indique el proyecto del avance en «proyectoId».");
                }
                if (estudianteId != null) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Un avance de proyecto no indica estudiante; sus integrantes se gestionan en el proyecto.");
                }
                if (porcentaje == null) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Indique el porcentaje de avance del proyecto (0 a 100) en «porcentajeAvance».");
                }
            }
        }
        if (tipo != AlcanceAvance.PROYECTO && porcentaje != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "El porcentaje de avance solo se registra en los avances de un proyecto.");
        }
        if (tipo != AlcanceAvance.ESTUDIANTE && conCompetencias) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Las competencias se evalúan en avances individuales de un estudiante (alcance ESTUDIANTE).");
        }
    }

    private Set<CompetenciaEvaluada> evaluar(List<CompetenciaEvaluadaRequest> solicitadas,
                                             Set<CompetenciaEvaluada> vigentes) {
        if (solicitadas == null || solicitadas.isEmpty()) {
            return new HashSet<>();
        }
        Map<Integer, NivelLogro> niveles = new LinkedHashMap<>();
        for (CompetenciaEvaluadaRequest c : solicitadas) {
            if (niveles.put(c.contenidoId(), c.nivel()) != null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "La competencia con id " + c.contenidoId()
                        + " está repetida; evalúe cada competencia una sola vez por avance.");
            }
        }
        Set<CompetenciaEvaluada> resultado = niveles.entrySet().stream()
                .map(e -> new CompetenciaEvaluada(e.getKey(), e.getValue()))
                .collect(Collectors.toCollection(HashSet::new));
        Set<Integer> porValidar = resultado.stream().filter(c -> !vigentes.contains(c))
                .map(CompetenciaEvaluada::getContenidoId).collect(Collectors.toSet());
        if (porValidar.isEmpty()) {
            return resultado;
        }
        Map<Integer, ContenidoCatalogo> catalogo = porId(contenidoRepository.findAllById(porValidar),
                ContenidoCatalogo::getId);
        for (Integer id : new TreeSet<>(porValidar)) {
            ContenidoCatalogo contenido = catalogo.get(id);
            if (contenido == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "La competencia con id " + id + " no existe en el catálogo.");
            }
            if (contenido.getTipo() != TipoContenido.COMPETENCIA) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "«" + contenido.getNombre() + "» es un contenido de tipo "
                        + contenido.getTipo() + " del catálogo; solo se evalúan competencias.");
            }
            if (!contenido.isActivo()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "La competencia «" + contenido.getNombre()
                        + "» está inactiva en el catálogo y no se puede evaluar.");
            }
        }
        return resultado;
    }

    private Actividad actividadDelClub(Long actividadId, Club club) {
        if (actividadId == null) {
            return null;
        }
        Actividad actividad = actividadRepository.findById(actividadId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Actividad no encontrada."));
        if (!actividad.getClubId().equals(club.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La actividad no pertenece al club del avance.");
        }
        if (actividad.getEstado() != EstadoActividad.EJECUTADA) {
            throw new ApiException(HttpStatus.CONFLICT, "Los avances se vinculan con actividades ejecutadas; la actividad «"
                    + actividad.getTema() + "» está " + actividad.getEstado().name().toLowerCase() + ".");
        }
        return actividad;
    }

    private Estudiante estudianteDelClub(Long estudianteId, Club club, LocalDate fecha) {
        Estudiante estudiante = estudianteRepository.findById(estudianteId).orElse(null);
        if (estudiante == null || !estudiante.getInstitucionId().equals(club.getInstitucionId())
                || !avanceRepository.integranteEnFecha(club.getId(), estudianteId, fecha)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El estudiante con id " + estudianteId
                    + " no era integrante del club «" + club.getNombre() + "» el " + fecha.format(FECHA) + ".");
        }
        return estudiante;
    }

    private void validarFecha(LocalDate fecha, Club club, Proyecto proyecto, Actividad actividad) {
        PeriodoAcademico periodo = periodoRepository.findById(club.getPeriodoId()).orElseThrow(() ->
                new ApiException(HttpStatus.CONFLICT, "El período académico del club no existe."));
        LocalDate hoy = LocalDate.now(ZONA);
        LocalDate limite = periodo.getFechaFin().isBefore(hoy) ? periodo.getFechaFin() : hoy;
        if (fecha.isBefore(periodo.getFechaInicio()) || fecha.isAfter(limite)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha del avance debe estar dentro del período "
                    + "académico del club (" + periodo.getFechaInicio().format(FECHA) + " a "
                    + periodo.getFechaFin().format(FECHA) + ") y no puede ser posterior a hoy.");
        }
        if (proyecto != null && fecha.isBefore(proyecto.getFechaInicio())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha del avance no puede ser anterior al inicio del "
                    + "proyecto «" + proyecto.getTitulo() + "» (" + proyecto.getFechaInicio().format(FECHA) + ").");
        }
        if (actividad != null && fecha.isBefore(actividad.getFecha())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha del avance no puede ser anterior a la de la "
                    + "actividad «" + actividad.getTema() + "» (" + actividad.getFecha().format(FECHA) + ").");
        }
    }

    private void verificarDuplicado(AlcanceAvance tipo, Club club, LocalDate fecha, Estudiante estudiante,
                                    Proyecto proyecto, Long excluirId) {
        avanceRepository.duplicados(tipo, club.getId(), fecha, estudiante == null ? null : estudiante.getId(),
                proyecto == null ? null : proyecto.getId(), excluirId).stream().findFirst().ifPresent(a -> {
            String sujeto = switch (tipo) {
                case CLUB -> "del club";
                case ESTUDIANTE -> "del estudiante " + estudiante.getCodigoInterno();
                case PROYECTO -> "del proyecto «" + proyecto.getTitulo() + "»";
            };
            throw new ApiException(HttpStatus.CONFLICT, "Ya existe un avance " + sujeto + " para el "
                    + fecha.format(FECHA) + " (id " + a.getId() + "); edítelo en lugar de registrar otro.");
        });
    }

    private void verificarModificable(Avance avance, Club club, Proyecto proyecto) {
        if (avance.getEstado() == EstadoAvance.ANULADO) {
            throw new ApiException(HttpStatus.CONFLICT, "El avance ya fue anulado y no se modifica.");
        }
        String bloqueo = motivoBloqueo(club, proyecto);
        if (bloqueo != null) {
            throw new ApiException(HttpStatus.CONFLICT, bloqueo);
        }
    }

    private String motivoBloqueo(Club club, Proyecto proyecto) {
        if (club.getEstado() == EstadoClub.CERRADO) {
            return "El club está cerrado; sus avances forman parte del historial y ya no se modifican.";
        }
        if (proyecto != null && proyecto.getEstado() != EstadoProyecto.EN_DESARROLLO) {
            return "El proyecto «" + proyecto.getTitulo() + "» está "
                    + (proyecto.getEstado() == EstadoProyecto.FINALIZADO ? "finalizado" : "cancelado")
                    + "; sus avances ya no se registran ni se modifican.";
        }
        return null;
    }

    private Avance guardar(Avance avance) {
        try {
            return avanceRepository.saveAndFlush(avance);
        } catch (DataIntegrityViolationException ex) {
            String detalle = ex.getMostSpecificCause().getMessage();
            if (detalle != null && INDICES_UNICOS.stream().anyMatch(detalle::contains)) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Otra persona registró al mismo tiempo un avance para el mismo sujeto y la misma fecha.");
            }
            throw ex;
        }
    }

    private Specification<Avance> alcanceDelUsuario(UsuarioPrincipal usuario, Long institucionId) {
        Specification<Avance> spec = (root, cq, cb) -> cb.conjunction();
        if (alcance.esGlobal(usuario)) {
            if (institucionId != null) {
                spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), institucionId));
            }
            return spec;
        }
        if (esDocente(usuario)) {
            Long propio = docentePropio(usuario).getId();
            return spec.and((root, cq, cb) -> {
                Subquery<Long> susClubes = cq.subquery(Long.class);
                Root<Club> club = susClubes.from(Club.class);
                susClubes.select(club.get("id")).where(cb.equal(club.get("docenteId"), propio));
                Subquery<Long> tutorados = cq.subquery(Long.class);
                Root<Proyecto> proyecto = tutorados.from(Proyecto.class);
                tutorados.select(proyecto.get("id")).where(cb.equal(proyecto.get("docenteId"), propio));
                Subquery<Long> aCargo = cq.subquery(Long.class);
                Root<Actividad> actividad = aCargo.from(Actividad.class);
                aCargo.select(actividad.get("id")).where(cb.equal(actividad.get("responsableId"), propio));
                return cb.or(root.get("clubId").in(susClubes), root.get("proyectoId").in(tutorados),
                        root.get("actividadId").in(aCargo));
            });
        }
        Long propia = alcance.institucionPropia(usuario);
        return spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), propia));
    }

    private Subquery<Long> clubesDelPeriodo(CriteriaQuery<?> cq, CriteriaBuilder cb, Integer periodoId) {
        Subquery<Long> delPeriodo = cq.subquery(Long.class);
        Root<Club> club = delPeriodo.from(Club.class);
        delPeriodo.select(club.get("id")).where(cb.equal(club.get("periodoId"), periodoId));
        return delPeriodo;
    }

    private void verificarLectura(UsuarioPrincipal usuario, Club club, Proyecto proyecto, Actividad actividad) {
        if (alcance.esGlobal(usuario)) {
            return;
        }
        if (esDocente(usuario)) {
            if (!esDelDocente(docentePropio(usuario).getId(), club, proyecto, actividad)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "No tiene permisos sobre este avance.");
            }
            return;
        }
        alcance.verificar(usuario, club.getInstitucionId());
    }

    private void verificarEscritura(UsuarioPrincipal usuario, Club club, Proyecto proyecto, Actividad actividad) {
        if (esDocente(usuario)) {
            if (!esDelDocente(docentePropio(usuario).getId(), club, proyecto, actividad)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Solo puede gestionar los avances de los clubes que "
                        + "coordina, de los proyectos de los que es tutor o de las actividades de las que es responsable.");
            }
            return;
        }
        alcance.verificar(usuario, club.getInstitucionId());
    }

    private boolean esDelDocente(Long docenteId, Club club, Proyecto proyecto, Actividad actividad) {
        return docenteId.equals(club.getDocenteId())
                || (proyecto != null && docenteId.equals(proyecto.getDocenteId()))
                || (actividad != null && docenteId.equals(actividad.getResponsableId()));
    }

    private boolean esDocente(UsuarioPrincipal usuario) {
        return "DOCENTE".equals(usuario.getRolCodigo());
    }

    private Docente docentePropio(UsuarioPrincipal usuario) {
        return docenteRepository.findByUsuarioId(usuario.getId()).orElseThrow(() ->
                new ApiException(HttpStatus.FORBIDDEN, "Su usuario no está vinculado a un registro de docente."));
    }

    private Avance buscar(Long id) {
        return avanceRepository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Avance no encontrado."));
    }

    private Club clubDe(Long clubId) {
        return clubRepository.findById(clubId).orElseThrow(() ->
                new ApiException(HttpStatus.CONFLICT, "El club del avance no existe."));
    }

    private Proyecto proyectoDe(Long proyectoId) {
        return proyectoId == null ? null : proyectoRepository.findById(proyectoId).orElse(null);
    }

    private Actividad actividadDe(Long actividadId) {
        return actividadId == null ? null : actividadRepository.findById(actividadId).orElse(null);
    }

    private String textoCompetencias(Set<CompetenciaEvaluada> competencias) {
        return textoCompetencias(competencias.stream()
                .collect(Collectors.toMap(CompetenciaEvaluada::getContenidoId, CompetenciaEvaluada::getNivel)));
    }

    private String textoCompetencias(Map<Integer, NivelLogro> competencias) {
        return new TreeMap<>(competencias).entrySet().stream()
                .map(e -> e.getKey() + ":" + e.getValue())
                .collect(Collectors.joining(", ", "[", "]"));
    }

    private Map<Integer, String> nombresContenidos(Stream<Integer> ids) {
        Set<Integer> conjunto = ids.filter(Objects::nonNull).collect(Collectors.toSet());
        if (conjunto.isEmpty()) {
            return Map.of();
        }
        return contenidoRepository.findAllById(conjunto).stream()
                .collect(Collectors.toMap(ContenidoCatalogo::getId, ContenidoCatalogo::getNombre));
    }

    private Map<Long, String> nombresUsuarios(Stream<Long> ids) {
        Set<Long> conjunto = ids.filter(Objects::nonNull).collect(Collectors.toSet());
        if (conjunto.isEmpty()) {
            return Map.of();
        }
        return usuarioRepository.findAllById(conjunto).stream()
                .collect(Collectors.toMap(Usuario::getId, u -> u.getNombres() + " " + u.getApellidos()));
    }

    private <K> Set<K> ids(List<Avance> avances, Function<Avance, K> campo) {
        return avances.stream().map(campo).filter(Objects::nonNull).collect(Collectors.toCollection(HashSet::new));
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
