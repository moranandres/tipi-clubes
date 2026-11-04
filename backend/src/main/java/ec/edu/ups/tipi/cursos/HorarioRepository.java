package ec.edu.ups.tipi.cursos;

import ec.edu.ups.tipi.cursos.dto.CruceHorario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalTime;
import java.util.Collection;
import java.util.List;

public interface HorarioRepository extends JpaRepository<Horario, Long> {

    List<Horario> findByCursoIdOrderByDiaSemanaAscHoraInicioAsc(Long cursoId);

    List<Horario> findByCursoIdInOrderByDiaSemanaAscHoraInicioAsc(Collection<Long> cursoIds);

    @Query("""
           select new ec.edu.ups.tipi.cursos.dto.CruceHorario(c.nombre, h.diaSemana, h.horaInicio, h.horaFin)
           from Horario h, Curso c
           where c.id = h.cursoId
             and c.clubId = :clubId
             and c.id <> :cursoId
             and c.estado in :estados
             and h.diaSemana = :dia
             and h.horaInicio < :fin
             and :inicio < h.horaFin
           order by h.horaInicio
           """)
    List<CruceHorario> crucesEnClub(@Param("clubId") Long clubId,
                                    @Param("cursoId") Long cursoId,
                                    @Param("estados") Collection<EstadoCurso> estados,
                                    @Param("dia") Short dia,
                                    @Param("inicio") LocalTime inicio,
                                    @Param("fin") LocalTime fin);
}