package ec.edu.ups.tipi.opciones;

import ec.edu.ups.tipi.clubes.Club;
import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.instituciones.Institucion;
import ec.edu.ups.tipi.opciones.dto.ClubOpcionResponse;
import ec.edu.ups.tipi.opciones.dto.OpcionResponse;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

@Repository
public class OpcionesRepository {

    private static final char ESCAPE = '\\';

    @PersistenceContext
    private EntityManager entityManager;

    public List<OpcionResponse> instituciones(String patron, Long institucionId, int maximo) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<OpcionResponse> consulta = cb.createQuery(OpcionResponse.class);
        Root<Institucion> institucion = consulta.from(Institucion.class);

        List<Predicate> filtros = new ArrayList<>();
        if (institucionId != null) {
            filtros.add(cb.equal(institucion.get("id"), institucionId));
        }
        if (patron != null) {
            filtros.add(cb.or(
                    cb.like(cb.lower(institucion.get("nombre")), patron, ESCAPE),
                    cb.like(cb.lower(institucion.get("codigoAmie")), patron, ESCAPE)));
        }

        consulta.select(cb.construct(OpcionResponse.class, institucion.get("id"), institucion.get("nombre")))
                .where(filtros.toArray(Predicate[]::new))
                .orderBy(cb.asc(institucion.get("nombre")), cb.asc(institucion.get("id")));
        return entityManager.createQuery(consulta).setMaxResults(maximo).getResultList();
    }

    public List<ClubOpcionResponse> clubes(String patron, Long institucionId, Long docenteId, Integer periodoId,
                                           EstadoClub estado, int maximo) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<ClubOpcionResponse> consulta = cb.createQuery(ClubOpcionResponse.class);
        Root<Club> club = consulta.from(Club.class);

        List<Predicate> filtros = new ArrayList<>();
        if (institucionId != null) {
            filtros.add(cb.equal(club.get("institucionId"), institucionId));
        }
        if (docenteId != null) {
            filtros.add(cb.equal(club.get("docenteId"), docenteId));
        }
        if (periodoId != null) {
            filtros.add(cb.equal(club.get("periodoId"), periodoId));
        }
        if (estado != null) {
            filtros.add(cb.equal(club.get("estado"), estado));
        }
        if (patron != null) {
            filtros.add(cb.like(cb.lower(club.get("nombre")), patron, ESCAPE));
        }

        consulta.select(cb.construct(ClubOpcionResponse.class, club.get("id"), club.get("nombre"),
                        club.get("institucionId")))
                .where(filtros.toArray(Predicate[]::new))
                .orderBy(cb.asc(club.get("nombre")), cb.asc(club.get("id")));
        return entityManager.createQuery(consulta).setMaxResults(maximo).getResultList();
    }
}
