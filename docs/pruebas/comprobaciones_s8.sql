SELECT max(e.id) FILTER (WHERE e.nombres = 'Ana') AS est_ana,
       max(e.id) FILTER (WHERE e.nombres = 'Bruno') AS est_bruno,
       max(e.id) FILTER (WHERE e.nombres = 'Carla') AS est_carla
FROM estudiantes e
WHERE e.apellidos = 'Prueba S8' \gset

SELECT max(c.id) FILTER (WHERE c.nombre = 'S8 Robótica') AS club_rob
FROM clubes c
WHERE c.nombre LIKE 'S8 %' \gset

SELECT id AS usuario_doc1 FROM usuarios WHERE username = 's8doc1' \gset

UPDATE inscripciones SET estado = 'FINALIZADA', fecha_retiro = current_date
WHERE estudiante_id = :est_bruno AND club_id = :club_rob;

UPDATE inscripciones SET estado = 'RETIRADA'
WHERE estudiante_id = :est_ana AND club_id = :club_rob;

BEGIN;
INSERT INTO solicitudes_inscripcion (estudiante_id, institucion_id, club_id, nivel, motivacion, solicitado_por)
SELECT e.id, e.institucion_id, :club_rob, 'PRINCIPIANTE', 'Quiere aprender robótica este año', :usuario_doc1
FROM estudiantes e WHERE e.id = :est_carla;
UPDATE clubes SET estado = 'CERRADO' WHERE id = :club_rob;
ROLLBACK;

BEGIN;
INSERT INTO cursos (club_id, institucion_id, nombre, nivel, modalidad, lugar, fecha_inicio, fecha_fin, cupo_maximo)
SELECT c.id, c.institucion_id, 'S8 Robótica intermedia', 'INTERMEDIO', 'PRESENCIAL', 'Laboratorio de robótica',
       current_date, current_date + 10, 5
FROM clubes c WHERE c.id = :club_rob;
UPDATE clubes SET estado = 'CERRADO' WHERE id = :club_rob;
ROLLBACK;

BEGIN;
UPDATE clubes SET estado = 'CERRADO' WHERE id = :club_rob;
SELECT e.codigo_interno, i.estado, i.fecha_retiro
FROM inscripciones i
JOIN estudiantes e ON e.id = i.estudiante_id
WHERE i.club_id = :club_rob
ORDER BY e.codigo_interno;
ROLLBACK;

SELECT count(*) AS clubes_cerrados_con_integrantes_activos
FROM clubes c
WHERE c.estado = 'CERRADO'
  AND EXISTS (SELECT 1 FROM inscripciones i WHERE i.club_id = c.id AND i.estado = 'ACTIVA');

SELECT count(*) AS solicitudes_abiertas_en_clubes_cerrados
FROM clubes c
WHERE c.estado = 'CERRADO'
  AND (EXISTS (SELECT 1 FROM solicitudes_inscripcion s
               WHERE s.club_id = c.id AND s.estado IN ('PENDIENTE', 'EN_REVISION'))
       OR EXISTS (SELECT 1 FROM solicitudes_retiro r
                  JOIN inscripciones i ON i.id = r.inscripcion_id
                  WHERE i.club_id = c.id AND r.estado = 'PENDIENTE'));

SELECT v.nombre, v.estado, v.integrantes_activos, v.integrantes_historicos, v.cupos_disponibles
FROM vw_catalogo_clubes v
WHERE v.nombre LIKE 'S8 %'
ORDER BY v.id;

SELECT h.estudiante_id, h.tipo, h.descripcion
FROM vw_historial_estudiante h
WHERE h.estudiante_id IN (:est_ana, :est_bruno)
  AND h.tipo IN ('INGRESO_CLUB', 'SALIDA_CLUB')
ORDER BY h.estudiante_id, h.fecha, h.orden;
