package ec.edu.ups.tipi.certificados;

import ec.edu.ups.tipi.inscripciones.InscripcionCurso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CertificadoRepository extends JpaRepository<Certificado, Long>, JpaSpecificationExecutor<Certificado> {

    Optional<Certificado> findByCodigoVerificacion(String codigoVerificacion);

    boolean existsByCodigoVerificacion(String codigoVerificacion);

    Optional<Certificado> findFirstByTipoAndInscripcionCursoIdAndEstado(TipoCertificado tipo, Long inscripcionCursoId,
                                                                         EstadoCertificado estado);

    Optional<Certificado> findFirstByTipoAndParticipacionIdAndEstado(TipoCertificado tipo, Long participacionId,
                                                                      EstadoCertificado estado);

    List<Certificado> findByInscripcionCursoIdInAndEstadoOrderByIdAsc(Collection<Long> inscripcionCursoIds,
                                                                      EstadoCertificado estado);

    @Query("select ic from InscripcionCurso ic where ic.cursoId = :cursoId order by ic.id")
    List<InscripcionCurso> inscripcionesDelCurso(@Param("cursoId") Long cursoId);
}
