SELECT max(a.id) FILTER (WHERE a.tema = 'S10 Sesión general') AS act_general,
       max(a.id) FILTER (WHERE a.tema = 'S10 Sesión del curso') AS act_curso,
       max(a.id) FILTER (WHERE a.tema = 'S10 Sesión de refuerzo') AS act_refuerzo,
       max(a.id) FILTER (WHERE a.tema = 'S10 Sesión futura') AS act_futura,
       max(a.id) FILTER (WHERE a.tema = 'S10 Sesión cancelada') AS act_cancelada,
       max(a.club_id) FILTER (WHERE a.tema = 'S10 Sesión general') AS club_rob,
       max(a.curso_id) FILTER (WHERE a.tema = 'S10 Sesión del curso') AS curso_arduino
FROM actividades a
WHERE a.tema LIKE 'S10 %' \gset

SELECT max(e.id) FILTER (WHERE e.nombres = 'Ana') AS ana,
       max(i.id) FILTER (WHERE e.nombres = 'Ana') AS insc_ana,
       max(e.id) FILTER (WHERE e.nombres = 'Dani') AS dani,
       max(i.id) FILTER (WHERE e.nombres = 'Dani') AS insc_dani,
       max(e.id) FILTER (WHERE e.nombres = 'Eva') AS eva,
       max(i.id) FILTER (WHERE e.nombres = 'Eva') AS insc_eva,
       max(e.id) FILTER (WHERE e.nombres = 'Gabi') AS gabi,
       max(i.id) FILTER (WHERE e.nombres = 'Gabi') AS insc_gabi,
       max(e.id) FILTER (WHERE e.nombres = 'Fede') AS fede,
       max(i.id) FILTER (WHERE e.nombres = 'Fede') AS insc_fede
FROM estudiantes e
JOIN inscripciones i ON i.estudiante_id = e.id
WHERE e.apellidos = 'Prueba S10' \gset

SELECT id AS usuario_doc1 FROM usuarios WHERE username = 's10doc1' \gset

SELECT id AS asis_ana FROM asistencias WHERE actividad_id = :act_general AND estudiante_id = :ana \gset

INSERT INTO asistencias (actividad_id, club_id, estudiante_id, inscripcion_id, estado, registrado_por)
VALUES (:act_general, :club_rob, :ana, :insc_ana, 'AUSENTE', :usuario_doc1);

INSERT INTO asistencias (actividad_id, club_id, estudiante_id, inscripcion_id, estado, registrado_por)
VALUES (:act_futura, :club_rob, :ana, :insc_ana, 'PRESENTE', :usuario_doc1);

INSERT INTO asistencias (actividad_id, club_id, estudiante_id, inscripcion_id, estado, registrado_por)
VALUES (:act_cancelada, :club_rob, :ana, :insc_ana, 'PRESENTE', :usuario_doc1);

INSERT INTO asistencias (actividad_id, club_id, estudiante_id, inscripcion_id, estado, registrado_por)
VALUES (:act_general, :club_rob, :eva, :insc_eva, 'PRESENTE', :usuario_doc1);

INSERT INTO asistencias (actividad_id, club_id, estudiante_id, inscripcion_id, estado, registrado_por)
VALUES (:act_refuerzo, :club_rob, :dani, :insc_dani, 'PRESENTE', :usuario_doc1);

INSERT INTO asistencias (actividad_id, club_id, estudiante_id, inscripcion_id, estado, registrado_por)
VALUES (:act_curso, :club_rob, :gabi, :insc_gabi, 'PRESENTE', :usuario_doc1);

INSERT INTO asistencias (actividad_id, club_id, estudiante_id, inscripcion_id, estado, registrado_por)
VALUES (:act_general, :club_rob, :fede, :insc_fede, 'PRESENTE', :usuario_doc1);

INSERT INTO asistencias (actividad_id, club_id, estudiante_id, inscripcion_id, estado, registrado_por)
VALUES (:act_curso, :club_rob, :ana, :insc_ana, 'JUSTIFICADO', :usuario_doc1);

INSERT INTO asistencias (actividad_id, club_id, estudiante_id, inscripcion_id, estado, registrado_por,
                         corregido_por, fecha_correccion, motivo_correccion)
VALUES (:act_curso, :club_rob, :ana, :insc_ana, 'PRESENTE', :usuario_doc1, :usuario_doc1, now(), 'Ya corregida');

UPDATE asistencias SET estado = 'AUSENTE' WHERE id = :asis_ana;

UPDATE asistencias SET estudiante_id = :eva, inscripcion_id = :insc_eva WHERE id = :asis_ana;

UPDATE asistencias SET motivo_correccion = 'Solo cambia el motivo', corregido_por = :usuario_doc1, fecha_correccion = now()
WHERE id = :asis_ana;

DELETE FROM asistencias WHERE id = :asis_ana;

UPDATE asistencia_correcciones SET motivo = 'Motivo reescrito';

DELETE FROM asistencia_correcciones;

BEGIN;
UPDATE cursos SET estado = 'CANCELADO' WHERE id = :curso_arduino;
UPDATE asistencias SET estado = 'AUSENTE', corregido_por = :usuario_doc1, fecha_correccion = now(),
                       motivo_correccion = 'Prueba con el curso cancelado'
WHERE actividad_id = :act_curso AND estudiante_id = :ana;
ROLLBACK;

BEGIN;
UPDATE inscripciones_curso SET estado = 'FINALIZADA', fecha_fin = current_date WHERE curso_id = :curso_arduino;
UPDATE cursos SET estado = 'FINALIZADO' WHERE id = :curso_arduino;
UPDATE actividades SET estado = 'CANCELADA', motivo_cancelacion = 'Cierre de prueba', fecha_cancelacion = now()
WHERE club_id = :club_rob AND estado = 'PLANIFICADA';
UPDATE clubes SET estado = 'CERRADO' WHERE id = :club_rob;
UPDATE asistencias SET estado = 'AUSENTE', corregido_por = :usuario_doc1, fecha_correccion = now(),
                       motivo_correccion = 'Prueba con el club cerrado'
WHERE id = :asis_ana;
ROLLBACK;

BEGIN;
UPDATE asistencias SET estado = 'ATRASADO', observacion = 'Llegó tarde por lluvia', corregido_por = :usuario_doc1,
                       fecha_correccion = now(), motivo_correccion = 'Prueba de corrección válida'
WHERE id = :asis_ana;
SELECT c.estado_anterior, c.estado_nuevo, c.observacion_nueva, c.motivo
FROM asistencia_correcciones c
WHERE c.asistencia_id = :asis_ana
ORDER BY c.id DESC
LIMIT 1;
ROLLBACK;
