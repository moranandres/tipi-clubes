package ec.edu.ups.tipi.asistencias;

import ec.edu.ups.tipi.actividades.Actividad;
import ec.edu.ups.tipi.actividades.ActividadRepository;
import ec.edu.ups.tipi.actividades.EstadoActividad;
import ec.edu.ups.tipi.asistencias.dto.AsistenciaMinimaResponse;
import ec.edu.ups.tipi.asistencias.dto.AsistenciaResponse;
import ec.edu.ups.tipi.asistencias.dto.AsistenciaVista;
import ec.edu.ups.tipi.asistencias.dto.ConteoAsistencia;
import ec.edu.ups.tipi.asistencias.dto.CorreccionAsistenciaMinimaResponse;
import ec.edu.ups.tipi.asistencias.dto.CorreccionAsistenciaResponse;
import ec.edu.ups.tipi.asistencias.dto.CorreccionAsistenciaVista;
import ec.edu.ups.tipi.asistencias.dto.EstudianteAsistenciaMinimaResponse;
import ec.edu.ups.tipi.asistencias.dto.EstudianteAsistenciaResponse;
import ec.edu.ups.tipi.asistencias.dto.EstudianteAsistenciaVista;
import ec.edu.ups.tipi.asistencias.dto.FilaPlanillaMinimaResponse;
import ec.edu.ups.tipi.asistencias.dto.FilaPlanillaResponse;
import ec.edu.ups.tipi.asistencias.dto.FilaPlanillaVista;
import ec.edu.ups.tipi.asistencias.dto.PlanillaAsistenciaResponse;
import ec.edu.ups.tipi.asistencias.dto.RegistroAsistenciaRequest;
import ec.edu.ups.tipi.asistencias.dto.RegistroEstudianteRequest;
import ec.edu.ups.tipi.asistencias.dto.ResumenAsistenciaResponse;
import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.clubes.Club;
import ec.edu.ups.tipi.clubes.ClubRepository;
import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.cursos.Curso;
import ec.edu.ups.tipi.cursos.CursoRepository;
import ec.edu.ups.tipi.cursos.EstadoCurso;
import ec.edu.ups.tipi.docentes.Docente;
import ec.edu.ups.tipi.docentes.DocenteRepository;
import ec.edu.ups.tipi.estudiantes.Estudiante;
import ec.edu.ups.tipi.estudiantes.EstudianteRepository;
import ec.edu.ups.tipi.instituciones.Institucion;
import ec.edu.ups.tipi.instituciones.InstitucionRepository;
import ec.edu.ups.tipi.periodos.PeriodoAcademico;
import ec.edu.ups.tipi.periodos.PeriodoRepository;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.usuarios.Usuario;
import ec.edu.ups.tipi.usuarios.UsuarioRepository;
import jakarta.persistence.criteria.Path;
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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class AsistenciaService {

    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Set<String> ROLES_GESTION = Set.of("ADMIN", "RESP_INSTITUCIONAL", "DOCENTE");
    private static final Set<EstadoCurso> CURSO_CERRADO = Set.of(EstadoCurso.FINALIZADO, EstadoCurso.CANCELADO);
    private static final String RESTRICCION_UNICA = "uq_asistencias_actividad_estudiante";

    private final AsistenciaRepository asistenciaRepository;
    private final CorreccionAsistenciaRepository correccionRepository;
    private final ActividadRepository actividadRepository;
    private final ClubRepository clubRepository;
    private final CursoRepository cursoRepository;
    private final DocenteRepository docenteRepository;
    private final EstudianteRepository estudianteRepository;
    private final InstitucionRepository institucionRepository;
    private final PeriodoRepository periodoRepository;
    private final UsuarioRepository usuarioRepository;
    private final AlcanceInstitucional alcance;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public PlanillaAsistenciaResponse planilla(Long actividadId, UsuarioPrincipal usuario) {
        Actividad actividad = buscarActividad(actividadId);
        Club club = clubDe(actividad);
        verificarLectura(usuario, actividad, club);
        return armarPlanilla(actividad, club, usuario);
    }

    @Transactional
    public PlanillaAsistenciaResponse registrar(Long actividadId, RegistroAsistenciaRequest request,
                                                UsuarioPrincipal usuario) {
        asistenciaRepository.bloquearActividad(actividadId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Actividad no encontrada."));
        Actividad actividad = buscarActividad(actividadId);
        Club club = clubDe(actividad);
        verificarEscritura(usuario, actividad, club);
        Curso curso = cursoDe(actividad);
        String bloqueo = motivoBloqueo(actividad, club, curso);
        if (bloqueo != null) {
            throw new ApiException(HttpStatus.CONFLICT, bloqueo);
        }

        Map<Long, RegistroEstudianteRequest> solicitados = new LinkedHashMap<>();
        for (RegistroEstudianteRequest registro : request.registros()) {
            if (solicitados.putIfAbsent(registro.estudianteId(), registro) != null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "El estudiante con id " + registro.estudianteId()
                        + " aparece más de una vez en el registro.");
            }
            if (registro.estado() == EstadoAsistencia.JUSTIFICADO && limpiar(registro.observacion()) == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Indique en la observación la justificación del estudiante con id "
                        + registro.estudianteId() + ".");
            }
        }

        Map<Long, Asistencia> existentes = asistenciaRepository.findByActividadId(actividadId).stream()
                .collect(Collectors.toMap(Asistencia::getEstudianteId, Function.identity()));
        Map<Long, Long> elegibles = elegibles(actividad);

        List<Long> fuera = solicitados.keySet().stream()
                .filter(id -> !existentes.containsKey(id) && !elegibles.containsKey(id))
                .sorted()
                .toList();
        if (!fuera.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, (fuera.size() == 1
                    ? "El estudiante con id " + fuera.get(0) + " no forma parte de esta sesión"
                    : "Los estudiantes con id " + fuera + " no forman parte de esta sesión")
                    + ": solo se registra la asistencia de los integrantes del club"
                    + (curso != null ? " inscritos en el curso «" + curso.getNombre() + "»" : "")
                    + " a la fecha de la actividad (" + actividad.getFecha().format(FECHA) + ").");
        }

        List<Asistencia> nuevas = new ArrayList<>();
        List<Asistencia> corregidas = new ArrayList<>();
        Map<Long, EstadoAsistencia> estadosAnteriores = new HashMap<>();
        Map<Long, String> observacionesAnteriores = new HashMap<>();
        for (RegistroEstudianteRequest registro : solicitados.values()) {
            String observacion = limpiar(registro.observacion());
            Asistencia existente = existentes.get(registro.estudianteId());
            if (existente == null) {
                Asistencia asistencia = new Asistencia();
                asistencia.setActividadId(actividad.getId());
                asistencia.setClubId(actividad.getClubId());
                asistencia.setEstudianteId(registro.estudianteId());
                asistencia.setInscripcionId(elegibles.get(registro.estudianteId()));
                asistencia.setEstado(registro.estado());
                asistencia.setObservacion(observacion);
                asistencia.setRegistradoPor(usuario.getId());
                nuevas.add(asistencia);
            } else if (existente.getEstado() != registro.estado()
                    || !Objects.equals(existente.getObservacion(), observacion)) {
                estadosAnteriores.put(existente.getId(), existente.getEstado());
                observacionesAnteriores.put(existente.getId(), existente.getObservacion());
                existente.setEstado(registro.estado());
                existente.setObservacion(observacion);
                corregidas.add(existente);
            }
        }

        String motivo = limpiar(request.motivoCorreccion());
        if (!corregidas.isEmpty()) {
            if (motivo == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Indique el motivo de la corrección: la asistencia de "
                        + (corregidas.size() == 1 ? "1 estudiante ya estaba registrada" : corregidas.size()
                        + " estudiantes ya estaba registrada") + " y cambia.");
            }
            Instant ahora = Instant.now();
            for (Asistencia asistencia : corregidas) {
                asistencia.setCorregidoPor(usuario.getId());
                asistencia.setFechaCorreccion(ahora);
                asistencia.setMotivoCorreccion(motivo);
            }
        }

        if (nuevas.isEmpty() && corregidas.isEmpty()) {
            return armarPlanilla(actividad, club, usuario);
        }
        try {
            asistenciaRepository.saveAll(nuevas);
            asistenciaRepository.saveAll(corregidas);
            asistenciaRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            String detalle = ex.getMostSpecificCause().getMessage();
            if (detalle != null && detalle.contains(RESTRICCION_UNICA)) {
                throw new ApiException(HttpStatus.CONFLICT, "Otra persona registró al mismo tiempo la asistencia de "
                        + "algún estudiante de esta sesión. Recargue la planilla e intente de nuevo.");
            }
            throw ex;
        }

        if (!nuevas.isEmpty()) {
            auditoria.registrar("ASISTENCIA_REGISTRADA", "ACTIVIDAD", actividad.getId(),
                    "fecha=" + actividad.getFecha() + "; nuevos=" + nuevas.size() + "; " + resumenEstados(nuevas));
        }
        for (Asistencia asistencia : corregidas) {
            String detalle = "actividadId=" + actividad.getId() + ", estudianteId=" + asistencia.getEstudianteId();
            EstadoAsistencia anterior = estadosAnteriores.get(asistencia.getId());
            if (anterior != asistencia.getEstado()) {
                detalle += "; estado: '" + anterior + "' -> '" + asistencia.getEstado() + "'";
            }
            if (!Objects.equals(observacionesAnteriores.get(asistencia.getId()), asistencia.getObservacion())) {
                detalle += "; observacion modificada";
            }
            auditoria.registrar("ASISTENCIA_CORREGIDA", "ASISTENCIA", asistencia.getId(), detalle + "; motivo=" + motivo);
        }
        return armarPlanilla(actividad, club, usuario);
    }

    @Transactional(readOnly = true)
    public List<CorreccionAsistenciaVista> correcciones(Long actividadId, UsuarioPrincipal usuario) {
        Actividad actividad = buscarActividad(actividadId);
        Club club = clubDe(actividad);
        verificarLectura(usuario, actividad, club);
        Map<Long, Asistencia> asistencias = asistenciaRepository.findByActividadId(actividadId).stream()
                .collect(Collectors.toMap(Asistencia::getId, Function.identity()));
        if (asistencias.isEmpty()) {
            return List.of();
        }
        List<CorreccionAsistencia> lista = correccionRepository.findByAsistenciaIdInOrderByFechaDescIdDesc(
                asistencias.keySet());
        Map<Long, Estudiante> estudiantes = porId(estudianteRepository.findAllById(asistencias.values().stream()
                .map(Asistencia::getEstudianteId).collect(Collectors.toSet())), Estudiante::getId);
        Map<Long, String> usuarios = nombresUsuarios(lista.stream().map(CorreccionAsistencia::getCorregidoPor));
        boolean minima = alcance.soloDatosMinimos(usuario);
        return lista.stream().map(c -> {
            Estudiante e = estudiantes.get(asistencias.get(c.getAsistenciaId()).getEstudianteId());
            if (minima) {
                return (CorreccionAsistenciaVista) new CorreccionAsistenciaMinimaResponse(c.getId(), c.getAsistenciaId(),
                        e.getId(), e.getCodigoInterno(), c.getEstadoAnterior(), c.getEstadoNuevo(), c.getMotivo(),
                        usuarios.get(c.getCorregidoPor()), c.getFecha());
            }
            return new CorreccionAsistenciaResponse(c.getId(), c.getAsistenciaId(), e.getId(), e.getCodigoInterno(),
                    e.getNombres(), e.getApellidos(), c.getEstadoAnterior(), c.getEstadoNuevo(),
                    c.getObservacionAnterior(), c.getObservacionNueva(), c.getMotivo(),
                    usuarios.get(c.getCorregidoPor()), c.getFecha());
        }).toList();
    }

    @Transactional(readOnly = true)
    public PaginaResponse<AsistenciaVista> listar(Long institucionId, Long clubId, Long cursoId, Long actividadId,
                                                  Long estudianteId, EstadoAsistencia estado, LocalDate desde,
                                                  LocalDate hasta, int pagina, int tamano, UsuarioPrincipal usuario) {
        if (desde != null && hasta != null && hasta.isBefore(desde)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha «hasta» no puede ser anterior a «desde».");
        }
        Specification<Asistencia> spec = (root, cq, cb) -> cb.conjunction();
        if (alcance.esGlobal(usuario)) {
            if (institucionId != null) {
                spec = spec.and((root, cq, cb) -> cb.equal(actividad(root).get("institucionId"), institucionId));
            }
        } else if (esDocente(usuario)) {
            Long docenteId = docentePropio(usuario).getId();
            spec = spec.and((root, cq, cb) -> {
                Subquery<Long> susClubes = cq.subquery(Long.class);
                Root<Club> club = susClubes.from(Club.class);
                susClubes.select(club.get("id")).where(cb.equal(club.get("docenteId"), docenteId));
                return cb.or(root.get("clubId").in(susClubes),
                        cb.equal(actividad(root).get("responsableId"), docenteId));
            });
        } else {
            Long propia = alcance.institucionPropia(usuario);
            spec = spec.and((root, cq, cb) -> cb.equal(actividad(root).get("institucionId"), propia));
        }
        if (clubId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("clubId"), clubId));
        }
        if (cursoId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(actividad(root).get("cursoId"), cursoId));
        }
        if (actividadId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("actividadId"), actividadId));
        }
        if (estudianteId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("estudianteId"), estudianteId));
        }
        if (estado != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("estado"), estado));
        }
        if (desde != null) {
            spec = spec.and((root, cq, cb) -> cb.greaterThanOrEqualTo(actividad(root).get("fecha"), desde));
        }
        if (hasta != null) {
            spec = spec.and((root, cq, cb) -> cb.lessThanOrEqualTo(actividad(root).get("fecha"), hasta));
        }

        Pageable pageable = PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamano, 1), 100),
                Sort.by(Sort.Order.desc("actividad.fecha"), Sort.Order.desc("actividad.horaInicio"),
                        Sort.Order.asc("id")));
        Page<Asistencia> resultado = asistenciaRepository.findAll(spec, pageable);
        return PaginaResponse.de(new PageImpl<>(armarLista(resultado.getContent(), alcance.soloDatosMinimos(usuario)),
                pageable, resultado.getTotalElements()));
    }

    @Transactional(readOnly = true)
    public ResumenAsistenciaResponse resumen(Long clubId, Long cursoId, LocalDate desde, LocalDate hasta,
                                             UsuarioPrincipal usuario) {
        Club club = clubRepository.findById(clubId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Club no encontrado."));
        if (esDocente(usuario)) {
            if (!docentePropio(usuario).getId().equals(club.getDocenteId())) {
                throw new ApiException(HttpStatus.FORBIDDEN,
                        "Solo puede consultar el resumen de asistencia de los clubes que coordina.");
            }
        } else {
            alcance.verificar(usuario, club.getInstitucionId());
        }
        Curso curso = null;
        if (cursoId != null) {
            curso = cursoRepository.findById(cursoId).orElseThrow(() ->
                    new ApiException(HttpStatus.BAD_REQUEST, "El curso indicado no existe."));
            if (!curso.getClubId().equals(club.getId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "El curso indicado no pertenece al club.");
            }
        }
        PeriodoAcademico periodo = periodoRepository.findById(club.getPeriodoId()).orElseThrow(() ->
                new ApiException(HttpStatus.CONFLICT, "El período académico del club no existe."));
        LocalDate inicio = desde != null ? desde : periodo.getFechaInicio();
        LocalDate fin = hasta != null ? hasta : periodo.getFechaFin();
        if (fin.isBefore(inicio)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha «hasta» no puede ser anterior a «desde».");
        }

        long filtroCurso = cursoId == null ? 0L : cursoId;
        long sesiones = asistenciaRepository.contarSesionesEjecutadas(clubId, filtroCurso, inicio, fin);
        List<Object[]> filas = asistenciaRepository.resumenPorEstudiante(clubId, filtroCurso, inicio, fin);
        Map<Long, Estudiante> estudiantes = porId(estudianteRepository.findAllById(filas.stream()
                .map(f -> numero(f[0])).collect(Collectors.toSet())), Estudiante::getId);
        boolean minima = alcance.soloDatosMinimos(usuario);

        long esperados = 0;
        long tomados = 0;
        long presentes = 0;
        long atrasados = 0;
        long ausentes = 0;
        long justificados = 0;
        List<EstudianteAsistenciaVista> lista = new ArrayList<>();
        List<Object[]> ordenadas = filas.stream()
                .sorted(Comparator.comparing((Object[] f) -> claveOrden(estudiantes.get(numero(f[0])), minima)))
                .toList();
        for (Object[] f : ordenadas) {
            Estudiante e = estudiantes.get(numero(f[0]));
            long esperadas = numero(f[1]);
            long registradas = numero(f[2]);
            ConteoAsistencia conteo = new ConteoAsistencia(numero(f[3]), numero(f[4]), numero(f[5]), numero(f[6]));
            Double porcentaje = porcentajeAsistencia(conteo);
            esperados += esperadas;
            tomados += registradas;
            presentes += conteo.presentes();
            atrasados += conteo.atrasados();
            ausentes += conteo.ausentes();
            justificados += conteo.justificados();
            if (minima) {
                lista.add(new EstudianteAsistenciaMinimaResponse(e.getId(), e.getCodigoInterno(), esperadas,
                        registradas, esperadas - registradas, conteo, porcentaje));
            } else {
                lista.add(new EstudianteAsistenciaResponse(e.getId(), e.getCodigoInterno(), e.getNombres(),
                        e.getApellidos(), esperadas, registradas, esperadas - registradas, conteo, porcentaje));
            }
        }
        ConteoAsistencia total = new ConteoAsistencia(presentes, atrasados, ausentes, justificados);
        return new ResumenAsistenciaResponse(club.getId(), club.getNombre(), curso == null ? null : curso.getId(),
                curso == null ? null : curso.getNombre(), inicio, fin, sesiones, esperados, tomados,
                esperados - tomados, porcentaje(tomados, esperados), total, porcentajeAsistencia(total), lista);
    }

    private PlanillaAsistenciaResponse armarPlanilla(Actividad actividad, Club club, UsuarioPrincipal usuario) {
        boolean minima = alcance.soloDatosMinimos(usuario);
        Curso curso = cursoDe(actividad);
        Map<Long, Asistencia> registros = asistenciaRepository.findByActividadId(actividad.getId()).stream()
                .collect(Collectors.toMap(Asistencia::getEstudianteId, Function.identity()));
        Map<Long, Long> elegibles = actividad.getEstado() == EstadoActividad.CANCELADA ? Map.of() : elegibles(actividad);
        Set<Long> estudianteIds = new LinkedHashSet<>(elegibles.keySet());
        estudianteIds.addAll(registros.keySet());
        Map<Long, Estudiante> estudiantes = porId(estudianteRepository.findAllById(estudianteIds), Estudiante::getId);
        Map<Long, String> usuarios = nombresUsuarios(registros.values().stream()
                .flatMap(a -> Stream.of(a.getRegistradoPor(), a.getCorregidoPor())));

        List<FilaPlanillaVista> filas = new ArrayList<>();
        Map<EstadoAsistencia, Long> conteo = new EnumMap<>(EstadoAsistencia.class);
        List<Estudiante> ordenados = estudiantes.values().stream()
                .sorted(Comparator.comparing(e -> claveOrden(e, minima)))
                .toList();
        for (Estudiante e : ordenados) {
            Asistencia a = registros.get(e.getId());
            if (a != null) {
                conteo.merge(a.getEstado(), 1L, Long::sum);
            }
            Long inscripcionId = a != null ? a.getInscripcionId() : elegibles.get(e.getId());
            if (minima) {
                filas.add(new FilaPlanillaMinimaResponse(e.getId(), e.getCodigoInterno(),
                        a == null ? null : a.getId(), a == null ? null : a.getEstado(),
                        a == null ? null : a.getFechaRegistro(), a != null && a.getFechaCorreccion() != null));
            } else {
                filas.add(new FilaPlanillaResponse(e.getId(), e.getCodigoInterno(), e.getNombres(), e.getApellidos(),
                        inscripcionId, a == null ? null : a.getId(), a == null ? null : a.getEstado(),
                        a == null ? null : a.getObservacion(),
                        a == null ? null : usuarios.get(a.getRegistradoPor()),
                        a == null ? null : a.getFechaRegistro(), a != null && a.getFechaCorreccion() != null,
                        a == null || a.getCorregidoPor() == null ? null : usuarios.get(a.getCorregidoPor()),
                        a == null ? null : a.getFechaCorreccion(), a == null ? null : a.getMotivoCorreccion()));
            }
        }
        ConteoAsistencia totales = new ConteoAsistencia(conteo.getOrDefault(EstadoAsistencia.PRESENTE, 0L),
                conteo.getOrDefault(EstadoAsistencia.ATRASADO, 0L), conteo.getOrDefault(EstadoAsistencia.AUSENTE, 0L),
                conteo.getOrDefault(EstadoAsistencia.JUSTIFICADO, 0L));
        String motivoNoEditable = puedeGestionar(usuario, actividad, club)
                ? motivoBloqueo(actividad, club, curso)
                : "Su rol solo permite consultar la asistencia de esta sesión.";
        String institucion = institucionRepository.findById(actividad.getInstitucionId())
                .map(Institucion::getNombre).orElse(null);
        String responsable = docenteRepository.findById(actividad.getResponsableId())
                .map(d -> d.getApellidos() + " " + d.getNombres()).orElse(null);
        return new PlanillaAsistenciaResponse(actividad.getId(), actividad.getTema(), actividad.getFecha(),
                actividad.getHoraInicio(), actividad.getHoraFin(), actividad.getEstado(), club.getId(),
                club.getNombre(), actividad.getInstitucionId(), institucion, curso == null ? null : curso.getId(),
                curso == null ? null : curso.getNombre(), responsable, motivoNoEditable == null, motivoNoEditable,
                filas.size(), totales.registrados(), filas.size() - totales.registrados(), totales,
                porcentajeAsistencia(totales), filas);
    }

    private List<AsistenciaVista> armarLista(List<Asistencia> asistencias, boolean minima) {
        if (asistencias.isEmpty()) {
            return List.of();
        }
        Map<Long, Actividad> actividades = porId(actividadRepository.findAllById(
                ids(asistencias, Asistencia::getActividadId)), Actividad::getId);
        Map<Long, String> clubes = clubRepository.findAllById(ids(asistencias, Asistencia::getClubId)).stream()
                .collect(Collectors.toMap(Club::getId, Club::getNombre));
        Map<Long, String> cursos = cursoRepository.findAllById(actividades.values().stream()
                        .map(Actividad::getCursoId).filter(Objects::nonNull).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(Curso::getId, Curso::getNombre));
        Map<Long, Estudiante> estudiantes = porId(estudianteRepository.findAllById(
                ids(asistencias, Asistencia::getEstudianteId)), Estudiante::getId);
        Map<Long, String> usuarios = minima ? Map.of() : nombresUsuarios(asistencias.stream()
                .flatMap(a -> Stream.of(a.getRegistradoPor(), a.getCorregidoPor())));

        return asistencias.stream().map(a -> {
            Actividad act = actividades.get(a.getActividadId());
            Estudiante e = estudiantes.get(a.getEstudianteId());
            String cursoNombre = act.getCursoId() == null ? null : cursos.get(act.getCursoId());
            if (minima) {
                return (AsistenciaVista) new AsistenciaMinimaResponse(a.getId(), act.getId(), act.getTema(),
                        act.getFecha(), act.getHoraInicio(), a.getClubId(), clubes.get(a.getClubId()),
                        act.getCursoId(), cursoNombre, e.getId(), e.getCodigoInterno(), a.getEstado(),
                        a.getFechaRegistro(), a.getFechaCorreccion() != null);
            }
            return new AsistenciaResponse(a.getId(), act.getId(), act.getTema(), act.getFecha(), act.getHoraInicio(),
                    a.getClubId(), clubes.get(a.getClubId()), act.getCursoId(), cursoNombre, e.getId(),
                    e.getCodigoInterno(), e.getNombres(), e.getApellidos(), a.getEstado(), a.getObservacion(),
                    usuarios.get(a.getRegistradoPor()), a.getFechaRegistro(), a.getFechaCorreccion() != null,
                    a.getCorregidoPor() == null ? null : usuarios.get(a.getCorregidoPor()), a.getFechaCorreccion(),
                    a.getMotivoCorreccion());
        }).toList();
    }

    private Map<Long, Long> elegibles(Actividad actividad) {
        List<Object[]> filas = actividad.getCursoId() == null
                ? asistenciaRepository.elegiblesDelClub(actividad.getClubId(), actividad.getFecha())
                : asistenciaRepository.elegiblesDelCurso(actividad.getClubId(), actividad.getCursoId(),
                actividad.getFecha());
        Map<Long, Long> resultado = new LinkedHashMap<>();
        for (Object[] fila : filas) {
            resultado.put(numero(fila[1]), numero(fila[0]));
        }
        return resultado;
    }

    private String motivoBloqueo(Actividad actividad, Club club, Curso curso) {
        if (actividad.getEstado() == EstadoActividad.PLANIFICADA) {
            return "La actividad aún no tiene registrada su ejecución; regístrela primero para tomar la asistencia.";
        }
        if (actividad.getEstado() == EstadoActividad.CANCELADA) {
            return "La actividad fue cancelada y no lleva asistencia.";
        }
        if (club.getEstado() == EstadoClub.CERRADO) {
            return "El club está cerrado; su asistencia forma parte del historial y ya no se modifica.";
        }
        if (curso != null && CURSO_CERRADO.contains(curso.getEstado())) {
            return "El curso «" + curso.getNombre() + "» está "
                    + (curso.getEstado() == EstadoCurso.FINALIZADO ? "finalizado" : "cancelado")
                    + " y su asistencia ya no se modifica.";
        }
        return null;
    }

    private Actividad buscarActividad(Long id) {
        return actividadRepository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Actividad no encontrada."));
    }

    private Club clubDe(Actividad actividad) {
        return clubRepository.findById(actividad.getClubId()).orElseThrow(() ->
                new ApiException(HttpStatus.CONFLICT, "El club de la actividad no existe."));
    }

    private Curso cursoDe(Actividad actividad) {
        return actividad.getCursoId() == null ? null : cursoRepository.findById(actividad.getCursoId()).orElse(null);
    }

    private void verificarLectura(UsuarioPrincipal usuario, Actividad actividad, Club club) {
        if (alcance.esGlobal(usuario)) {
            return;
        }
        if (esDocente(usuario)) {
            if (!esDelDocente(docentePropio(usuario).getId(), actividad, club)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "No tiene permisos sobre la asistencia de esta actividad.");
            }
            return;
        }
        alcance.verificar(usuario, actividad.getInstitucionId());
    }

    private void verificarEscritura(UsuarioPrincipal usuario, Actividad actividad, Club club) {
        if (esDocente(usuario)) {
            if (!esDelDocente(docentePropio(usuario).getId(), actividad, club)) {
                throw new ApiException(HttpStatus.FORBIDDEN,
                        "Solo puede registrar la asistencia de los clubes que coordina o de las actividades de las que es responsable.");
            }
            return;
        }
        alcance.verificar(usuario, actividad.getInstitucionId());
    }

    private boolean puedeGestionar(UsuarioPrincipal usuario, Actividad actividad, Club club) {
        if (!ROLES_GESTION.contains(usuario.getRolCodigo())) {
            return false;
        }
        if (esDocente(usuario)) {
            return docenteRepository.findByUsuarioId(usuario.getId())
                    .map(d -> esDelDocente(d.getId(), actividad, club))
                    .orElse(false);
        }
        return alcance.esGlobal(usuario) || actividad.getInstitucionId().equals(usuario.getInstitucionId());
    }

    private boolean esDelDocente(Long docenteId, Actividad actividad, Club club) {
        return docenteId.equals(club.getDocenteId()) || docenteId.equals(actividad.getResponsableId());
    }

    private boolean esDocente(UsuarioPrincipal usuario) {
        return "DOCENTE".equals(usuario.getRolCodigo());
    }

    private Docente docentePropio(UsuarioPrincipal usuario) {
        return docenteRepository.findByUsuarioId(usuario.getId()).orElseThrow(() ->
                new ApiException(HttpStatus.FORBIDDEN, "Su usuario no está vinculado a un registro de docente."));
    }

    private Path<Actividad> actividad(Root<Asistencia> root) {
        return root.get("actividad");
    }

    private String resumenEstados(List<Asistencia> asistencias) {
        Map<EstadoAsistencia, Long> conteo = asistencias.stream()
                .collect(Collectors.groupingBy(Asistencia::getEstado, () -> new EnumMap<>(EstadoAsistencia.class),
                        Collectors.counting()));
        return conteo.entrySet().stream()
                .map(e -> e.getKey() + "=" + e.getValue())
                .collect(Collectors.joining(", "));
    }

    private String claveOrden(Estudiante e, boolean minima) {
        if (e == null) {
            return "";
        }
        return minima ? e.getCodigoInterno()
                : (e.getApellidos() + " " + e.getNombres()).toLowerCase() + " " + e.getCodigoInterno();
    }

    private Double porcentajeAsistencia(ConteoAsistencia conteo) {
        return porcentaje(conteo.presentes() + conteo.atrasados(), conteo.registrados() - conteo.justificados());
    }

    private Double porcentaje(long numerador, long denominador) {
        if (denominador <= 0) {
            return null;
        }
        return BigDecimal.valueOf(numerador).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(denominador), 1, RoundingMode.HALF_UP).doubleValue();
    }

    private Map<Long, String> nombresUsuarios(Stream<Long> ids) {
        Set<Long> conjunto = ids.filter(Objects::nonNull).collect(Collectors.toSet());
        if (conjunto.isEmpty()) {
            return Map.of();
        }
        return usuarioRepository.findAllById(conjunto).stream()
                .collect(Collectors.toMap(Usuario::getId, u -> u.getNombres() + " " + u.getApellidos()));
    }

    private <K> Set<K> ids(List<Asistencia> asistencias, Function<Asistencia, K> campo) {
        return asistencias.stream().map(campo).filter(Objects::nonNull).collect(Collectors.toCollection(HashSet::new));
    }

    private <K, V> Map<K, V> porId(Collection<V> valores, Function<V, K> clave) {
        return valores.stream().collect(Collectors.toMap(clave, Function.identity()));
    }

    private long numero(Object valor) {
        return ((Number) valor).longValue();
    }

    private String limpiar(String valor) {
        if (valor == null) {
            return null;
        }
        String recortado = valor.trim();
        return recortado.isEmpty() ? null : recortado;
    }
}
