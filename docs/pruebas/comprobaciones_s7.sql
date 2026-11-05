SELECT max(e.id) FILTER (WHERE e.nombres = 'Lia') AS est_lia,
       max(e.id) FILTER (WHERE e.nombres = 'Noa') AS est_noa
FROM estudiantes e
WHERE e.apellidos = 'Prueba S7' \gset

SELECT max(c.id) FILTER (WHERE c.nombre = 'S7 Robótica 2025') AS club_2025,
       max(c.id) FILTER (WHERE c.nombre = 'S7 Robótica') AS club_rob,
       max(c.id) FILTER (WHERE c.nombre = 'S7 Programación') AS club_prog
FROM clubes c
WHERE c.nombre LIKE 'S7 %' \gset

SELECT max(cu.id) FILTER (WHERE cu.nombre = 'S7 Drones') AS curso_drones,
       max(cu.id) FILTER (WHERE cu.nombre = 'S7 Robótica en línea') AS curso_linea,
       max(cu.id) FILTER (WHERE cu.nombre = 'S7 Python básico') AS curso_python
FROM cursos cu
WHERE cu.nombre LIKE 'S7 %' \gset

SELECT max(ic.id) FILTER (WHERE cu.nombre = 'S7 Robótica inicial 2025') AS ic_lia_2025
FROM inscripciones_curso ic
JOIN cursos cu ON cu.id = ic.curso_id
WHERE ic.estudiante_id = :est_lia \gset

SELECT id AS usuario_doc2 FROM usuarios WHERE username = 's7doc2' \gset

BEGIN;
DELETE FROM inscripciones WHERE estudiante_id = :est_lia AND club_id = :club_2025;
ROLLBACK;

BEGIN;
DELETE FROM inscripciones_curso WHERE id = :ic_lia_2025;
ROLLBACK;

BEGIN;
INSERT INTO solicitudes_inscripcion (estudiante_id, institucion_id, club_id, nivel, motivacion, solicitado_por)
SELECT e.id, e.institucion_id, :club_rob, 'PRINCIPIANTE', 'Quiere aprender robótica', :usuario_doc2
FROM estudiantes e WHERE e.id = :est_noa;
DELETE FROM solicitudes_inscripcion WHERE estudiante_id = :est_noa AND club_id = :club_rob;
ROLLBACK;

BEGIN;
DELETE FROM clubes WHERE id = :club_2025;
ROLLBACK;

BEGIN;
DELETE FROM cursos WHERE id = :curso_drones;
ROLLBACK;

BEGIN;
INSERT INTO solicitudes_inscripcion (estudiante_id, institucion_id, club_id, curso_id, nivel, conocimientos, motivacion,
                                     solicitado_por)
SELECT e.id, e.institucion_id, :club_rob, :curso_linea, 'INTERMEDIO', 'Arma robots con LEGO', 'Quiere programar en línea',
       :usuario_doc2
FROM estudiantes e WHERE e.id = :est_noa;
DELETE FROM horarios WHERE curso_id = :curso_linea;
DELETE FROM cursos WHERE id = :curso_linea;
ROLLBACK;

BEGIN;
UPDATE vw_catalogo_clubes SET cupos_disponibles = 99 WHERE id = :club_rob;
ROLLBACK;

BEGIN;
DELETE FROM vw_historial_estudiante WHERE estudiante_id = :est_lia;
ROLLBACK;

BEGIN;
DELETE FROM horarios WHERE curso_id = :curso_linea;
DELETE FROM cursos WHERE id = :curso_linea;
SELECT 'curso planificado sin inscripciones eliminado dentro de la transacción' AS resultado;
ROLLBACK;

SELECT count(*) AS clubes_con_conteo_distinto
FROM vw_catalogo_clubes v
WHERE v.integrantes_activos <> (SELECT count(*) FROM inscripciones i WHERE i.club_id = v.id AND i.estado = 'ACTIVA')
   OR v.cupos_disponibles <> CASE WHEN v.admite_inscripciones
                                  THEN greatest(v.cupo_maximo - v.integrantes_activos, 0) ELSE 0 END
   OR v.integrantes_nuevos + v.integrantes_antiguos <> v.integrantes_activos;

SELECT v.nombre, v.estado, v.integrantes_activos, v.integrantes_nuevos, v.integrantes_antiguos, v.cupos_disponibles,
       v.cursos_abiertos, v.admite_inscripciones
FROM vw_catalogo_clubes v
WHERE v.nombre LIKE 'S7 %'
ORDER BY v.id;

SELECT i.periodo_nombre, i.clubes_total, i.clubes_abiertos, i.cupos_disponibles, i.estudiantes_activos,
       (SELECT sum(v.integrantes_activos) FROM vw_catalogo_clubes v
        WHERE v.institucion_id = i.institucion_id AND v.periodo_id = i.periodo_id) AS suma_integrantes_por_club
FROM vw_catalogo_instituciones i
WHERE i.institucion_id = (SELECT institucion_id FROM clubes WHERE id = :club_rob)
  AND i.periodo_id IN (SELECT periodo_id FROM clubes WHERE id IN (:club_rob, :club_2025))
ORDER BY i.periodo_activo, i.periodo_nombre;

SELECT h.fecha, h.tipo, h.descripcion
FROM vw_historial_estudiante h
WHERE h.estudiante_id = :est_lia
ORDER BY h.fecha, h.orden, h.referencia_id;
