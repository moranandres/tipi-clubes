package ec.edu.ups.tipi.seguimiento;

import ec.edu.ups.tipi.clubes.Club;
import ec.edu.ups.tipi.clubes.ClubRepository;
import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.docentes.Docente;
import ec.edu.ups.tipi.docentes.DocenteRepository;
import ec.edu.ups.tipi.instituciones.InstitucionRepository;
import ec.edu.ups.tipi.periodos.PeriodoAcademico;
import ec.edu.ups.tipi.periodos.PeriodoRepository;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.seguimiento.dto.ActividadSeguimientoResponse;
import ec.edu.ups.tipi.seguimiento.dto.ClubSeguimientoResponse;
import ec.edu.ups.tipi.seguimiento.dto.IndicadoresSeguimiento;
import ec.edu.ups.tipi.seguimiento.dto.InstitucionSeguimientoResponse;
import ec.edu.ups.tipi.seguimiento.dto.MesSeguimientoResponse;
import ec.edu.ups.tipi.seguimiento.dto.ResumenSeguimientoResponse;
import ec.edu.ups.tipi.seguimiento.dto.SeguimientoClubResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SeguimientoService {

    private static final ZoneId ZONA = ZoneId.of("America/Guayaquil");
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final SeguimientoRepository repository;
    private final ParametrosSeguimientoService parametrosService;
    private final PeriodoRepository periodoRepository;
    private final ClubRepository clubRepository;
    private final DocenteRepository docenteRepository;
    private final InstitucionRepository institucionRepository;
    private final AlcanceInstitucional alcance;

    @Transactional(readOnly = true)
    public ResumenSeguimientoResponse resumen(Integer periodoId, Long institucionId, LocalDate desde, LocalDate hasta,
                                              UsuarioPrincipal usuario) {
        PeriodoAcademico periodo = periodoId != null
                ? periodoRepository.findById(periodoId).orElseThrow(() ->
                        new ApiException(HttpStatus.BAD_REQUEST, "El período académico indicado no existe."))
                : periodoRepository.findByActivoTrue().orElseThrow(() ->
                        new ApiException(HttpStatus.BAD_REQUEST,
                                "No hay un período académico activo; indique el período en «periodoId»."));
        LocalDate[] rango = rango(periodo, desde, hasta);

        long filtroInstitucion = 0L;
        long filtroDocente = 0L;
        if (alcance.esGlobal(usuario)) {
            filtroInstitucion = institucionId == null ? 0L : institucionId;
        } else {
            if (institucionId != null) {
                alcance.verificar(usuario, institucionId);
            }
            if (esDocente(usuario)) {
                filtroDocente = docentePropio(usuario).getId();
            } else {
                filtroInstitucion = alcance.institucionPropia(usuario);
            }
        }

        ParametrosSeguimiento parametros = parametrosService.vigentes();
        int gracia = parametros.getDiasGraciaRegistro();
        LocalDate hoy = LocalDate.now(ZONA);
        BigDecimal adecuado = parametros.getUmbralAdecuado();
        BigDecimal minimo = parametros.getUmbralMinimo();

        List<FilaActividad> filas = repository.actividadesDelAlcance(periodo.getId(), filtroInstitucion,
                filtroDocente, 0L, rango[0], rango[1]).stream().map(FilaActividad::de).toList();
        Map<Long, AcumuladorSeguimiento> porClub = new LinkedHashMap<>();
        AcumuladorSeguimiento total = new AcumuladorSeguimiento(hoy, gracia);
        for (FilaActividad fila : filas) {
            porClub.computeIfAbsent(fila.clubId(), k -> new AcumuladorSeguimiento(hoy, gracia)).agregar(fila);
            total.agregar(fila);
        }

        List<ClubSeguimientoResponse> clubes = new ArrayList<>();
        Map<Long, AcumuladorSeguimiento> porInstitucion = new LinkedHashMap<>();
        Map<Long, String> nombresInstitucion = new LinkedHashMap<>();
        Map<Long, Long> clubesPorInstitucion = new LinkedHashMap<>();
        Map<Long, Long> institucionDeClub = new LinkedHashMap<>();
        long adecuados = 0;
        long enRiesgo = 0;
        long criticos = 0;
        long sinDatos = 0;
        for (Object[] c : repository.clubesDelAlcance(periodo.getId(), filtroInstitucion, filtroDocente, rango[0],
                rango[1])) {
            Long clubId = ((Number) c[0]).longValue();
            Long instId = ((Number) c[3]).longValue();
            AcumuladorSeguimiento acumulador = porClub.getOrDefault(clubId, new AcumuladorSeguimiento(hoy, gracia));
            IndicadoresSeguimiento indicadores = acumulador.indicadores(adecuado, minimo);
            switch (indicadores.estado()) {
                case ADECUADO -> adecuados++;
                case EN_RIESGO -> enRiesgo++;
                case CRITICO -> criticos++;
                case SIN_DATOS -> sinDatos++;
            }
            clubes.add(new ClubSeguimientoResponse(clubId, (String) c[1], EstadoClub.valueOf((String) c[2]), instId,
                    (String) c[4], (String) c[5], acumulador.ultimaEjecucion(), acumulador.proximaActividad(),
                    indicadores));
            nombresInstitucion.putIfAbsent(instId, (String) c[4]);
            clubesPorInstitucion.merge(instId, 1L, Long::sum);
            porInstitucion.computeIfAbsent(instId, k -> new AcumuladorSeguimiento(hoy, gracia));
            institucionDeClub.put(clubId, instId);
        }
        for (FilaActividad fila : filas) {
            Long instId = institucionDeClub.get(fila.clubId());
            if (instId != null) {
                porInstitucion.get(instId).agregar(fila);
            }
        }
        List<InstitucionSeguimientoResponse> instituciones = porInstitucion.entrySet().stream()
                .map(e -> new InstitucionSeguimientoResponse(e.getKey(), nombresInstitucion.get(e.getKey()),
                        clubesPorInstitucion.get(e.getKey()), e.getValue().indicadores(adecuado, minimo)))
                .toList();

        return new ResumenSeguimientoResponse(periodo.getId(), periodo.getNombre(),
                filtroInstitucion == 0L ? null : filtroInstitucion, rango[0], rango[1], hoy,
                hoy.minusDays(gracia + 1L), parametrosService.respuesta(parametros), clubes.size(), adecuados,
                enRiesgo, criticos, sinDatos, total.indicadores(adecuado, minimo), instituciones, clubes,
                meses(filas, rango, hoy, gracia, adecuado, minimo));
    }

    @Transactional(readOnly = true)
    public SeguimientoClubResponse club(Long clubId, LocalDate desde, LocalDate hasta, UsuarioPrincipal usuario) {
        Club club = clubRepository.findById(clubId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Club no encontrado."));
        if (esDocente(usuario)) {
            if (!docentePropio(usuario).getId().equals(club.getDocenteId())) {
                throw new ApiException(HttpStatus.FORBIDDEN,
                        "Solo puede consultar el seguimiento de los clubes que coordina.");
            }
        } else {
            alcance.verificar(usuario, club.getInstitucionId());
        }
        PeriodoAcademico periodo = periodoRepository.findById(club.getPeriodoId()).orElseThrow(() ->
                new ApiException(HttpStatus.CONFLICT, "El período académico del club no existe."));
        LocalDate[] rango = rango(periodo, desde, hasta);

        ParametrosSeguimiento parametros = parametrosService.vigentes();
        int gracia = parametros.getDiasGraciaRegistro();
        LocalDate hoy = LocalDate.now(ZONA);
        BigDecimal adecuado = parametros.getUmbralAdecuado();
        BigDecimal minimo = parametros.getUmbralMinimo();

        List<FilaActividad> filas = repository.actividadesDelAlcance(periodo.getId(), 0L, 0L, club.getId(), rango[0],
                rango[1]).stream().map(FilaActividad::de).toList();
        AcumuladorSeguimiento total = new AcumuladorSeguimiento(hoy, gracia);
        List<ActividadSeguimientoResponse> actividades = new ArrayList<>();
        for (FilaActividad f : filas) {
            total.agregar(f);
            SituacionActividad situacion = f.situacion(hoy, gracia);
            Long atraso = situacion == SituacionActividad.VENCIDA || situacion == SituacionActividad.POR_REGISTRAR
                    ? ChronoUnit.DAYS.between(f.fecha(), hoy) : null;
            actividades.add(new ActividadSeguimientoResponse(f.id(), f.fecha(), f.horaInicio(), f.horaFin(),
                    f.minutos(), f.tema(), f.cursoId(), f.cursoNombre(), f.responsableNombre(), f.estado(),
                    situacion, f.fechaOriginal(), f.horaInicioOriginal(), f.horaFinOriginal(), f.reprogramaciones(),
                    atraso, f.fechaRegistroEjecucion(), f.diasHastaRegistro(), f.registroOportuno(gracia),
                    f.motivoCancelacion()));
        }

        String institucion = institucionRepository.findById(club.getInstitucionId())
                .map(i -> i.getNombre()).orElse(null);
        String docente = docenteRepository.findById(club.getDocenteId())
                .map(d -> d.getApellidos() + " " + d.getNombres()).orElse(null);
        return new SeguimientoClubResponse(club.getId(), club.getNombre(), club.getEstado(), club.getInstitucionId(),
                institucion, docente, periodo.getId(), periodo.getNombre(), rango[0], rango[1], hoy,
                hoy.minusDays(gracia + 1L), parametrosService.respuesta(parametros),
                total.indicadores(adecuado, minimo), meses(filas, rango, hoy, gracia, adecuado, minimo), actividades);
    }

    private List<MesSeguimientoResponse> meses(List<FilaActividad> filas, LocalDate[] rango, LocalDate hoy,
                                               int gracia, BigDecimal adecuado, BigDecimal minimo) {
        Map<YearMonth, AcumuladorSeguimiento> porMes = new LinkedHashMap<>();
        for (YearMonth mes = YearMonth.from(rango[0]); !mes.isAfter(YearMonth.from(rango[1])); mes = mes.plusMonths(1)) {
            porMes.put(mes, new AcumuladorSeguimiento(hoy, gracia));
        }
        for (FilaActividad fila : filas) {
            porMes.get(YearMonth.from(fila.fecha())).agregar(fila);
        }
        return porMes.entrySet().stream().map(e -> {
            LocalDate inicio = e.getKey().atDay(1);
            LocalDate fin = e.getKey().atEndOfMonth();
            return new MesSeguimientoResponse(e.getKey().toString(),
                    inicio.isBefore(rango[0]) ? rango[0] : inicio, fin.isAfter(rango[1]) ? rango[1] : fin,
                    e.getValue().indicadores(adecuado, minimo));
        }).toList();
    }

    private LocalDate[] rango(PeriodoAcademico periodo, LocalDate desde, LocalDate hasta) {
        LocalDate inicio = desde != null ? desde : periodo.getFechaInicio();
        LocalDate fin = hasta != null ? hasta : periodo.getFechaFin();
        if (fin.isBefore(inicio)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha «hasta» no puede ser anterior a «desde».");
        }
        if (inicio.isBefore(periodo.getFechaInicio()) || fin.isAfter(periodo.getFechaFin())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El rango debe estar dentro del período académico «"
                    + periodo.getNombre() + "» (" + periodo.getFechaInicio().format(FECHA) + " a "
                    + periodo.getFechaFin().format(FECHA) + ").");
        }
        return new LocalDate[]{inicio, fin};
    }

    private boolean esDocente(UsuarioPrincipal usuario) {
        return "DOCENTE".equals(usuario.getRolCodigo());
    }

    private Docente docentePropio(UsuarioPrincipal usuario) {
        return docenteRepository.findByUsuarioId(usuario.getId()).orElseThrow(() ->
                new ApiException(HttpStatus.FORBIDDEN, "Su usuario no está vinculado a un registro de docente."));
    }
}
