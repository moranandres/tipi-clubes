package ec.edu.ups.tipi.clubes;

import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.clubes.dto.ClubActualizarRequest;
import ec.edu.ups.tipi.clubes.dto.ClubCrearRequest;
import ec.edu.ups.tipi.clubes.dto.ClubResponse;
import ec.edu.ups.tipi.clubes.dto.CambioEstadoClubRequest;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.docentes.Docente;
import ec.edu.ups.tipi.docentes.DocenteRepository;
import ec.edu.ups.tipi.instituciones.Institucion;
import ec.edu.ups.tipi.instituciones.InstitucionRepository;
import ec.edu.ups.tipi.periodos.PeriodoAcademico;
import ec.edu.ups.tipi.periodos.PeriodoRepository;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
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

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static ec.edu.ups.tipi.common.CambiosAuditoria.diferencias;
import static ec.edu.ups.tipi.common.CambiosAuditoria.texto;

@Service
@RequiredArgsConstructor
public class ClubService {

    private static final ZoneId ZONA = ZoneId.of("America/Guayaquil");

    private static final Map<EstadoClub, Set<EstadoClub>> TRANSICIONES = Map.of(
            EstadoClub.PLANIFICADO, Set.of(EstadoClub.ACTIVO, EstadoClub.CERRADO),
            EstadoClub.ACTIVO, Set.of(EstadoClub.SUSPENDIDO, EstadoClub.CERRADO),
            EstadoClub.SUSPENDIDO, Set.of(EstadoClub.ACTIVO, EstadoClub.CERRADO),
            EstadoClub.CERRADO, Set.of(EstadoClub.ACTIVO));

    private final ClubRepository clubRepository;
    private final InstitucionRepository institucionRepository;
    private final PeriodoRepository periodoRepository;
    private final DocenteRepository docenteRepository;
    private final AlcanceInstitucional alcance;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public PaginaResponse<ClubResponse> listar(String q, Long institucionId, Integer periodoId,
                                               EstadoClub estado, int pagina, int tamano,
                                               UsuarioPrincipal usuario) {
        Specification<Club> spec = (root, cq, cb) -> cb.conjunction();

        if (alcance.esGlobal(usuario)) {
            if (institucionId != null) {
                spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), institucionId));
            }
        } else if (esDocente(usuario)) {
            Long docenteId = docentePropio(usuario).getId();
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("docenteId"), docenteId));
        } else {
            Long propia = alcance.institucionPropia(usuario);
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), propia));
        }
        if (StringUtils.hasText(q)) {
            String patron = "%" + q.trim().toLowerCase() + "%";
            spec = spec.and((root, cq, cb) -> cb.like(cb.lower(root.get("nombre")), patron));
        }
        if (periodoId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("periodoId"), periodoId));
        }
        if (estado != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("estado"), estado));
        }

        Pageable pageable = PageRequest.of(Math.max(pagina, 0),
                Math.min(Math.max(tamano, 1), 100), Sort.by("nombre"));
        Page<Club> resultado = clubRepository.findAll(spec, pageable);
        return PaginaResponse.de(new PageImpl<>(armar(resultado.getContent()), pageable,
                resultado.getTotalElements()));
    }

    @Transactional(readOnly = true)
    public ClubResponse obtener(Long id, UsuarioPrincipal usuario) {
        Club club = buscar(id);
        verificarLectura(usuario, club);
        return armar(List.of(club)).get(0);
    }

    @Transactional
    public ClubResponse crear(ClubCrearRequest request, UsuarioPrincipal usuario) {
        alcance.verificar(usuario, request.institucionId());
        if (!institucionRepository.existsById(request.institucionId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La institución indicada no existe.");
        }
        if (!periodoRepository.existsById(request.periodoId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El período indicado no existe.");
        }
        validarDocente(request.docenteId(), request.institucionId());
        validarHorario(request.diaSemana(), request.horaInicio(), request.horaFin());

        String nombre = request.nombre().trim();
        if (clubRepository.existsByInstitucionIdAndPeriodoIdAndNombreIgnoreCase(
                request.institucionId(), request.periodoId(), nombre)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Ya existe un club con ese nombre en la institución y el período indicados.");
        }

        Club club = new Club();
        club.setInstitucionId(request.institucionId());
        club.setPeriodoId(request.periodoId());
        club.setDocenteId(request.docenteId());
        club.setNombre(nombre);
        club.setObjetivo(request.objetivo().trim());
        club.setFechaCreacion(request.fechaCreacion() != null ? request.fechaCreacion() : LocalDate.now(ZONA));
        club.setDiaSemana(request.diaSemana());
        club.setHoraInicio(request.horaInicio());
        club.setHoraFin(request.horaFin());
        club.setLugar(limpiar(request.lugar()));
        club.setCupoMaximo(request.cupoMaximo());
        club.setEstado(EstadoClub.PLANIFICADO);
        club = clubRepository.saveAndFlush(club);

        auditoria.registrar("CLUB_CREADO", "CLUB", club.getId(),
                "nombre=" + club.getNombre() + ", institucionId=" + club.getInstitucionId()
                        + ", periodoId=" + club.getPeriodoId() + ", docenteId=" + club.getDocenteId()
                        + ", cupoMaximo=" + club.getCupoMaximo());
        return armar(List.of(club)).get(0);
    }

    @Transactional
    public ClubResponse actualizar(Long id, ClubActualizarRequest request, UsuarioPrincipal usuario) {
        Club club = buscar(id);
        alcance.verificar(usuario, club.getInstitucionId());
        if (club.getEstado() == EstadoClub.CERRADO) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El club está cerrado; un administrador debe reabrirlo para modificarlo.");
        }
        validarDocente(request.docenteId(), club.getInstitucionId());
        validarHorario(request.diaSemana(), request.horaInicio(), request.horaFin());

        String nombre = request.nombre().trim();
        if (clubRepository.existsByInstitucionIdAndPeriodoIdAndNombreIgnoreCaseAndIdNot(
                club.getInstitucionId(), club.getPeriodoId(), nombre, id)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Ya existe otro club con ese nombre en la institución y el período del club.");
        }
        long integrantes = contarIntegrantes(List.of(id)).getOrDefault(id, 0L);
        if (request.cupoMaximo() < integrantes) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El cupo máximo no puede ser menor que los integrantes activos actuales (" + integrantes + ").");
        }

        Map<String, String> antes = instantanea(club);
        club.setDocenteId(request.docenteId());
        club.setNombre(nombre);
        club.setObjetivo(request.objetivo().trim());
        club.setDiaSemana(request.diaSemana());
        club.setHoraInicio(request.horaInicio());
        club.setHoraFin(request.horaFin());
        club.setLugar(limpiar(request.lugar()));
        club.setCupoMaximo(request.cupoMaximo());
        club = clubRepository.saveAndFlush(club);

        auditoria.registrar("CLUB_ACTUALIZADO", "CLUB", id, diferencias(antes, instantanea(club)));
        return armar(List.of(club)).get(0);
    }

    @Transactional
    public ClubResponse cambiarEstado(Long id, CambioEstadoClubRequest request, UsuarioPrincipal usuario) {
        Club club = buscar(id);
        alcance.verificar(usuario, club.getInstitucionId());

        EstadoClub actual = club.getEstado();
        EstadoClub nuevo = request.estado();

        if (actual == nuevo) {
            throw new ApiException(HttpStatus.CONFLICT, "El club ya se encuentra en el estado indicado.");
        }
        if (actual == EstadoClub.CERRADO && !"ADMIN".equals(usuario.getRolCodigo())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Solo un administrador puede reabrir un club cerrado.");
        }
        if (!TRANSICIONES.get(actual).contains(nuevo)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Transición de estado no permitida: " + actual + " -> " + nuevo + ".");
        }

        String motivo = limpiar(request.motivo());
        boolean exigeMotivo = nuevo == EstadoClub.SUSPENDIDO || nuevo == EstadoClub.CERRADO
                || actual == EstadoClub.CERRADO;
        if (exigeMotivo && motivo == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Debe indicar el motivo del cambio de estado.");
        }
        if (nuevo == EstadoClub.ACTIVO) {
            Docente docente = docenteRepository.findById(club.getDocenteId()).orElseThrow(() ->
                    new ApiException(HttpStatus.CONFLICT, "El docente responsable del club no existe."));
            if (!docente.isActivo()) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "No se puede activar un club cuyo docente responsable está inactivo.");
            }
        }

        club.setEstado(nuevo);
        club = clubRepository.saveAndFlush(club);

        auditoria.registrar("CLUB_ESTADO_CAMBIADO", "CLUB", id,
                "estado: '" + actual + "' -> '" + nuevo + "'" + (motivo != null ? ", motivo=" + motivo : ""));
        return armar(List.of(club)).get(0);
    }

    private Club buscar(Long id) {
        return clubRepository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Club no encontrado."));
    }

    private boolean esDocente(UsuarioPrincipal usuario) {
        return "DOCENTE".equals(usuario.getRolCodigo());
    }

    private Docente docentePropio(UsuarioPrincipal usuario) {
        return docenteRepository.findByUsuarioId(usuario.getId()).orElseThrow(() ->
                new ApiException(HttpStatus.FORBIDDEN, "Su usuario no está vinculado a un registro de docente."));
    }

    private void verificarLectura(UsuarioPrincipal usuario, Club club) {
        if (alcance.esGlobal(usuario)) {
            return;
        }
        if (esDocente(usuario)) {
            if (!docentePropio(usuario).getId().equals(club.getDocenteId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "No tiene permisos sobre este club.");
            }
            return;
        }
        alcance.verificar(usuario, club.getInstitucionId());
    }

    private void validarDocente(Long docenteId, Long institucionId) {
        Docente docente = docenteRepository.findById(docenteId).orElseThrow(() ->
                new ApiException(HttpStatus.BAD_REQUEST, "El docente indicado no existe."));
        if (!docente.getInstitucionId().equals(institucionId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "El docente debe pertenecer a la misma institución del club.");
        }
        if (!docente.isActivo()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El docente indicado está inactivo.");
        }
    }

    private void validarHorario(Short dia, LocalTime inicio, LocalTime fin) {
        boolean algunoPresente = dia != null || inicio != null || fin != null;
        boolean algunoFaltante = dia == null || inicio == null || fin == null;
        if (algunoPresente && algunoFaltante) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "El horario requiere día de la semana, hora de inicio y hora de fin.");
        }
        if (inicio != null && fin != null && !fin.isAfter(inicio)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "La hora de fin debe ser posterior a la hora de inicio.");
        }
    }

    private Map<Long, Long> contarIntegrantes(Collection<Long> clubIds) {
        Map<Long, Long> conteo = new HashMap<>();
        if (clubIds.isEmpty()) {
            return conteo;
        }
        for (Object[] fila : clubRepository.contarIntegrantesActivos(clubIds)) {
            conteo.put(((Number) fila[0]).longValue(), ((Number) fila[1]).longValue());
        }
        return conteo;
    }

    private List<ClubResponse> armar(List<Club> clubes) {
        if (clubes.isEmpty()) {
            return List.of();
        }
        Set<Long> institucionIds = clubes.stream().map(Club::getInstitucionId).collect(Collectors.toSet());
        Set<Integer> periodoIds = clubes.stream().map(Club::getPeriodoId).collect(Collectors.toSet());
        Set<Long> docenteIds = clubes.stream().map(Club::getDocenteId).collect(Collectors.toSet());
        List<Long> clubIds = clubes.stream().map(Club::getId).toList();

        Map<Long, String> instituciones = institucionRepository.findAllById(institucionIds).stream()
                .collect(Collectors.toMap(Institucion::getId, Institucion::getNombre));
        Map<Integer, String> periodos = periodoRepository.findAllById(periodoIds).stream()
                .collect(Collectors.toMap(PeriodoAcademico::getId, PeriodoAcademico::getNombre));
        Map<Long, String> docentes = docenteRepository.findAllById(docenteIds).stream()
                .collect(Collectors.toMap(Docente::getId, d -> d.getApellidos() + " " + d.getNombres()));
        Map<Long, Long> integrantes = contarIntegrantes(clubIds);

        return clubes.stream()
                .map(c -> ClubResponse.de(c, instituciones.get(c.getInstitucionId()),
                        periodos.get(c.getPeriodoId()), docentes.get(c.getDocenteId()),
                        integrantes.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    private Map<String, String> instantanea(Club c) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("docenteId", texto(c.getDocenteId()));
        m.put("nombre", texto(c.getNombre()));
        m.put("objetivo", texto(c.getObjetivo()));
        m.put("diaSemana", texto(c.getDiaSemana()));
        m.put("horaInicio", texto(c.getHoraInicio()));
        m.put("horaFin", texto(c.getHoraFin()));
        m.put("lugar", texto(c.getLugar()));
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