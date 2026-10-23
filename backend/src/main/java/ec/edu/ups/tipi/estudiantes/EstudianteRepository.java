package ec.edu.ups.tipi.estudiantes;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EstudianteRepository
        extends JpaRepository<Estudiante, Long>, JpaSpecificationExecutor<Estudiante> {

    boolean existsByInstitucionIdAndNombresIgnoreCaseAndApellidosIgnoreCase(
            Long institucionId, String nombres, String apellidos);

    boolean existsByInstitucionIdAndNombresIgnoreCaseAndApellidosIgnoreCaseAndIdNot(
            Long institucionId, String nombres, String apellidos, Long id);

    @Query(value = "select count(*) from inscripciones where estudiante_id = :id and estado = 'ACTIVA'",
            nativeQuery = true)
    long contarInscripcionesActivas(@Param("id") Long id);

    @Query(value = """
            select (select count(*) from inscripciones where estudiante_id = :id)
                 + (select count(*) from solicitudes_inscripcion where estudiante_id = :id)
                 + (select count(*) from participaciones_competencia where estudiante_id = :id)
                 + (select count(*) from certificados where estudiante_id = :id)
            """, nativeQuery = true)
    long contarRegistrosVinculados(@Param("id") Long id);
}