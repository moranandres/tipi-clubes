package ec.edu.ups.tipi.publico;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

@Repository
public class EstadisticasPublicasRepository {

    private static final String CONSULTA = """
            select
              (select p.nombre from periodos_academicos p where p.activo order by p.fecha_inicio desc limit 1),
              (select count(*) from instituciones),
              (select count(distinct c.institucion_id) from clubes c where c.estado in ('PLANIFICADO', 'ACTIVO')),
              (select count(*) from clubes),
              (select count(*) from clubes c where c.estado = 'ACTIVO'),
              (select count(*) from docentes d where d.activo),
              (select count(distinct i.estudiante_id) from inscripciones i where i.estado = 'ACTIVA'),
              (select count(*) from actividades a where a.estado = 'EJECUTADA'),
              (select coalesce(sum(extract(epoch from (a.hora_fin - a.hora_inicio))), 0) / 3600
                 from actividades a where a.estado = 'EJECUTADA'),
              (select count(*) from evidencias e where e.estado = 'ACTIVA'),
              (select count(*) from proyectos pr where pr.estado <> 'CANCELADO'),
              (select count(*) from certificados ce where ce.estado = 'EMITIDO')
            """;

    @PersistenceContext
    private EntityManager entityManager;

    public Object[] agregados() {
        return (Object[]) entityManager.createNativeQuery(CONSULTA).getSingleResult();
    }
}
