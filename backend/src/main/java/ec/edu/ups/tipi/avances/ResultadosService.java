package ec.edu.ups.tipi.avances;

import ec.edu.ups.tipi.avances.dto.ClubResultadosResponse;
import ec.edu.ups.tipi.avances.dto.CompetenciaResultadoResponse;
import ec.edu.ups.tipi.avances.dto.ConteoAvances;
import ec.edu.ups.tipi.avances.dto.ConteoNiveles;
import ec.edu.ups.tipi.avances.dto.ConteoProyectos;
import ec.edu.ups.tipi.avances.dto.ResumenResultadosResponse;
import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.docentes.DocenteRepository;
import ec.edu.ups.tipi.periodos.PeriodoAcademico;
import ec.edu.ups.tipi.periodos.PeriodoRepository;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ResultadosService {

    private final AvanceRepository avanceRepository;
    private final PeriodoRepository periodoRepository;
    private final DocenteRepository docenteRepository;
    private final AlcanceInstitucional alcance;

    @Transactional(readOnly = true)
    public ResumenResultadosResponse resumen(Integer periodoId, Long institucionId, UsuarioPrincipal usuario) {
        PeriodoAcademico periodo = periodoId != null
                ? periodoRepository.findById(periodoId).orElseThrow(() ->
                        new ApiException(HttpStatus.BAD_REQUEST, "El período académico indicado no existe."))
                : periodoRepository.findByActivoTrue().orElseThrow(() ->
                        new ApiException(HttpStatus.BAD_REQUEST,
                                "No hay un período académico activo; indique el período en «periodoId»."));
        long filtroInstitucion = 0L;
        long filtroDocente = 0L;
        if (alcance.esGlobal(usuario)) {
            filtroInstitucion = institucionId == null ? 0L : institucionId;
        } else if ("DOCENTE".equals(usuario.getRolCodigo())) {
            filtroDocente = docenteRepository.findByUsuarioId(usuario.getId()).orElseThrow(() ->
                    new ApiException(HttpStatus.FORBIDDEN, "Su usuario no está vinculado a un registro de docente."))
                    .getId();
        } else {
            if (institucionId != null) {
                alcance.verificar(usuario, institucionId);
            }
            filtroInstitucion = alcance.institucionPropia(usuario);
        }

        List<ClubResultadosResponse> clubes = new ArrayList<>();
        long enDesarrollo = 0;
        long finalizados = 0;
        long prototipos = 0;
        long cancelados = 0;
        long deClub = 0;
        long deEstudiantes = 0;
        long deProyectos = 0;
        for (Object[] f : avanceRepository.resultadosPorClub(periodo.getId(), filtroInstitucion, filtroDocente)) {
            ConteoProyectos proyectos = new ConteoProyectos(numero(f[6]), numero(f[7]), numero(f[8]), numero(f[9]));
            ConteoAvances avances = new ConteoAvances(numero(f[11]), numero(f[12]), numero(f[13]));
            long participantes = numero(f[5]);
            long conAvance = numero(f[14]);
            clubes.add(new ClubResultadosResponse(numero(f[0]), (String) f[1], EstadoClub.valueOf((String) f[2]),
                    numero(f[3]), (String) f[4], participantes, proyectos,
                    porcentaje(proyectos.finalizados(), proyectos.validos()), numero(f[10]), avances, conAvance,
                    porcentaje(conAvance, participantes), numero(f[15])));
            enDesarrollo += proyectos.enDesarrollo();
            finalizados += proyectos.finalizados();
            prototipos += proyectos.prototiposFinalizados();
            cancelados += proyectos.cancelados();
            deClub += avances.deClub();
            deEstudiantes += avances.deEstudiantes();
            deProyectos += avances.deProyectos();
        }

        Object[] unicos = avanceRepository.estudiantesUnicos(periodo.getId(), filtroInstitucion, filtroDocente).get(0);
        long participantesUnicos = numero(unicos[0]);
        long enProyectos = numero(unicos[1]);
        long conAvance = numero(unicos[2]);

        List<CompetenciaResultadoResponse> competencias = avanceRepository
                .resultadosPorCompetencia(periodo.getId(), filtroInstitucion, filtroDocente).stream()
                .map(f -> {
                    long evaluados = numero(f[4]);
                    ConteoNiveles niveles = new ConteoNiveles(numero(f[5]), numero(f[6]), numero(f[7]), numero(f[8]));
                    return new CompetenciaResultadoResponse(((Number) f[0]).intValue(), (String) f[1], numero(f[2]),
                            numero(f[3]), evaluados, niveles,
                            porcentaje(niveles.logrado() + niveles.destacado(), evaluados));
                })
                .toList();

        ConteoProyectos proyectos = new ConteoProyectos(enDesarrollo, finalizados, prototipos, cancelados);
        return new ResumenResultadosResponse(periodo.getId(), periodo.getNombre(),
                filtroInstitucion == 0L ? null : filtroInstitucion, clubes.size(), participantesUnicos, proyectos,
                finalizados, porcentaje(finalizados, proyectos.validos()), enProyectos,
                porcentaje(enProyectos, participantesUnicos), new ConteoAvances(deClub, deEstudiantes, deProyectos),
                conAvance, porcentaje(conAvance, participantesUnicos), competencias, clubes);
    }

    private Double porcentaje(long numerador, long denominador) {
        if (denominador <= 0) {
            return null;
        }
        return BigDecimal.valueOf(numerador).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(denominador), 1, RoundingMode.HALF_UP).doubleValue();
    }

    private long numero(Object valor) {
        return ((Number) valor).longValue();
    }
}
