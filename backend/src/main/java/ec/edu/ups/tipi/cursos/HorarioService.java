package ec.edu.ups.tipi.cursos;

import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.cursos.dto.CruceHorario;
import ec.edu.ups.tipi.cursos.dto.HorarioRequest;
import ec.edu.ups.tipi.cursos.dto.HorarioResponse;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HorarioService {

    private static final long MINUTOS_MINIMOS = 15;
    private static final long MINUTOS_MAXIMOS = 360;

    private final CursoRepository cursoRepository;
    private final HorarioRepository horarioRepository;
    private final AlcanceInstitucional alcance;
    private final AuditoriaService auditoria;

    @Transactional
    public HorarioResponse crear(Long cursoId, HorarioRequest request, UsuarioPrincipal usuario) {
        Curso curso = cursoGestionable(cursoId, usuario);
        validar(request);

        Horario horario = new Horario();
        horario.setCursoId(cursoId);
        aplicar(horario, request);
        horario = horarioRepository.saveAndFlush(horario);

        auditoria.registrar("HORARIO_CREADO", "CURSO", cursoId, describir(horario));
        return HorarioResponse.de(horario, advertencias(curso, horario));
    }

    @Transactional
    public HorarioResponse actualizar(Long cursoId, Long horarioId, HorarioRequest request, UsuarioPrincipal usuario) {
        Curso curso = cursoGestionable(cursoId, usuario);
        Horario horario = buscar(cursoId, horarioId);
        validar(request);

        String antes = describir(horario);
        aplicar(horario, request);
        horario = horarioRepository.saveAndFlush(horario);

        auditoria.registrar("HORARIO_ACTUALIZADO", "CURSO", cursoId,
                "horario: '" + antes + "' -> '" + describir(horario) + "'");
        return HorarioResponse.de(horario, advertencias(curso, horario));
    }

    @Transactional
    public void eliminar(Long cursoId, Long horarioId, UsuarioPrincipal usuario) {
        cursoGestionable(cursoId, usuario);
        Horario horario = buscar(cursoId, horarioId);
        String descripcion = describir(horario);
        horarioRepository.delete(horario);
        horarioRepository.flush();

        auditoria.registrar("HORARIO_ELIMINADO", "CURSO", cursoId, descripcion);
    }

    private Curso cursoGestionable(Long cursoId, UsuarioPrincipal usuario) {
        Curso curso = cursoRepository.findById(cursoId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Curso no encontrado."));
        alcance.verificar(usuario, curso.getInstitucionId());
        if (!CursoService.ESTADOS_EDITABLES.contains(curso.getEstado())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Los horarios de un curso finalizado o cancelado no se pueden modificar.");
        }
        return curso;
    }

    private Horario buscar(Long cursoId, Long horarioId) {
        return horarioRepository.findById(horarioId)
                .filter(h -> h.getCursoId().equals(cursoId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Horario no encontrado en este curso."));
    }

    private void validar(HorarioRequest request) {
        if (!request.horaFin().isAfter(request.horaInicio())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La hora de fin debe ser posterior a la hora de inicio.");
        }
        long minutos = Duration.between(request.horaInicio(), request.horaFin()).toMinutes();
        if (minutos < MINUTOS_MINIMOS || minutos > MINUTOS_MAXIMOS) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Cada sesión debe durar entre 15 minutos y 6 horas.");
        }
    }

    private void aplicar(Horario horario, HorarioRequest request) {
        horario.setDiaSemana(request.diaSemana());
        horario.setHoraInicio(request.horaInicio().withSecond(0).withNano(0));
        horario.setHoraFin(request.horaFin().withSecond(0).withNano(0));
        horario.setTipoSesion(request.tipoSesion());
    }

    private List<String> advertencias(Curso curso, Horario horario) {
        List<CruceHorario> cruces = horarioRepository.crucesEnClub(curso.getClubId(), curso.getId(),
                CursoService.ESTADOS_EDITABLES, horario.getDiaSemana(), horario.getHoraInicio(), horario.getHoraFin());
        return cruces.stream()
                .map(c -> "Se cruza con el curso «" + c.cursoNombre() + "» del mismo club ("
                        + HorarioResponse.DIAS[c.diaSemana()] + " " + hhmm(c.horaInicio()) + "–" + hhmm(c.horaFin()) + ").")
                .toList();
    }

    private String describir(Horario h) {
        return HorarioResponse.DIAS[h.getDiaSemana()] + " " + hhmm(h.getHoraInicio()) + "-" + hhmm(h.getHoraFin())
                + " " + h.getTipoSesion();
    }

    private String hhmm(LocalTime hora) {
        return hora.toString().substring(0, 5);
    }
}