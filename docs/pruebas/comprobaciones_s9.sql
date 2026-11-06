SELECT max(a.id) FILTER (WHERE a.tema = 'Introducción a Arduino') AS act_intro,
       max(a.id) FILTER (WHERE a.tema = 'Repaso general') AS act_repaso,
       max(a.club_id) FILTER (WHERE a.tema = 'Introducción a Arduino') AS club_rob
FROM actividades a
JOIN clubes c ON c.id = a.club_id
WHERE c.nombre = 'S9 Robótica' \gset

SELECT c.id AS club_prog, c.institucion_id AS inst_prog, c.docente_id AS doc_prog, u.id AS usuario_doc1
FROM clubes c
JOIN docentes d ON d.id = c.docente_id
JOIN usuarios u ON u.id = d.usuario_id
WHERE c.nombre = 'S9 Programación' \gset

SELECT id AS cont_wokwi FROM catalogo_contenidos WHERE nombre = 'Wokwi' \gset

INSERT INTO actividades (club_id, institucion_id, responsable_id, fecha, hora_inicio, hora_fin, tema, objetivo,
                         estado, resumen_ejecucion, ejecutada_por, fecha_registro_ejecucion, creado_por)
VALUES (:club_prog, :inst_prog, :doc_prog, fn_hoy_guayaquil(), TIME '10:00', TIME '11:00', 'Directo ejecutada',
        'Saltarse la planificación', 'EJECUTADA', 'Sin planificar', :usuario_doc1, now(), :usuario_doc1);

UPDATE actividades SET tema = 'Tema cambiado a mano' WHERE id = :act_intro;

DELETE FROM actividades WHERE id = :act_intro;

INSERT INTO actividad_contenidos (actividad_id, contenido_id)
SELECT :act_repaso, id FROM catalogo_contenidos WHERE nombre = 'Scratch';

UPDATE actividades SET estado = 'PLANIFICADA', motivo_cancelacion = NULL, cancelada_por = NULL, fecha_cancelacion = NULL
WHERE id = :act_repaso;

BEGIN;
INSERT INTO cursos (club_id, institucion_id, nombre, nivel, modalidad, lugar, fecha_inicio, fecha_fin, cupo_maximo)
VALUES (:club_prog, :inst_prog, 'S9 Curso de paso', 'PRINCIPIANTE', 'PRESENCIAL', 'Aula 5',
        fn_hoy_guayaquil(), fn_hoy_guayaquil() + 30, 10);
INSERT INTO actividades (club_id, institucion_id, curso_id, responsable_id, fecha, hora_inicio, hora_fin, tema, objetivo, creado_por)
VALUES (:club_prog, :inst_prog, currval(pg_get_serial_sequence('cursos', 'id')), :doc_prog, fn_hoy_guayaquil() + 2,
        TIME '08:00', TIME '09:00', 'Sesión del curso de paso', 'Prueba', :usuario_doc1);
DELETE FROM cursos WHERE nombre = 'S9 Curso de paso';
ROLLBACK;

BEGIN;
INSERT INTO actividades (club_id, institucion_id, responsable_id, fecha, hora_inicio, hora_fin, tema, objetivo, creado_por)
VALUES (:club_prog, :inst_prog, :doc_prog, fn_hoy_guayaquil() + 20, TIME '14:00', TIME '15:30', 'Taller A', 'Prueba', :usuario_doc1);
INSERT INTO actividades (club_id, institucion_id, responsable_id, fecha, hora_inicio, hora_fin, tema, objetivo, creado_por)
VALUES (:club_prog, :inst_prog, :doc_prog, fn_hoy_guayaquil() + 20, TIME '15:00', TIME '16:00', 'Taller B', 'Prueba', :usuario_doc1);
ROLLBACK;

BEGIN;
INSERT INTO actividades (club_id, institucion_id, responsable_id, fecha, hora_inicio, hora_fin, tema, objetivo, creado_por)
VALUES (:club_prog, :inst_prog, :doc_prog, fn_hoy_guayaquil() + 20, TIME '14:00', TIME '15:30', 'Taller A', 'Prueba', :usuario_doc1);
INSERT INTO actividad_contenidos (actividad_id, contenido_id)
SELECT currval(pg_get_serial_sequence('actividades', 'id')), :cont_wokwi;
ROLLBACK;

BEGIN;
INSERT INTO actividades (club_id, institucion_id, responsable_id, fecha, hora_inicio, hora_fin, tema, objetivo, creado_por)
VALUES (:club_prog, :inst_prog, :doc_prog, fn_hoy_guayaquil() + 20, TIME '14:00', TIME '15:30', 'Taller A', 'Prueba', :usuario_doc1);
UPDATE clubes SET estado = 'ACTIVO' WHERE id = :club_prog;
UPDATE actividades SET estado = 'EJECUTADA', resumen_ejecucion = 'Adelantada', ejecutada_por = :usuario_doc1,
                       fecha_registro_ejecucion = now()
WHERE tema = 'Taller A' AND club_id = :club_prog;
ROLLBACK;

BEGIN;
INSERT INTO actividades (club_id, institucion_id, responsable_id, fecha, hora_inicio, hora_fin, tema, objetivo, creado_por)
VALUES (:club_prog, :inst_prog, :doc_prog, fn_hoy_guayaquil() + 20, TIME '14:00', TIME '15:30', 'Taller A', 'Prueba', :usuario_doc1);
UPDATE clubes SET estado = 'CERRADO' WHERE id = :club_prog;
ROLLBACK;

SELECT c.nombre AS club,
       count(*) FILTER (WHERE a.estado = 'PLANIFICADA') AS planificadas,
       count(*) FILTER (WHERE a.estado = 'EJECUTADA') AS ejecutadas,
       count(*) FILTER (WHERE a.estado = 'CANCELADA') AS canceladas
FROM clubes c
JOIN actividades a ON a.club_id = c.id
WHERE c.nombre LIKE 'S9 %'
GROUP BY c.nombre
ORDER BY c.nombre;

SELECT a.tema, a.estado, a.motivo_cancelacion, u.username AS cancelada_por
FROM actividades a
LEFT JOIN usuarios u ON u.id = a.cancelada_por
JOIN clubes c ON c.id = a.club_id
WHERE c.nombre LIKE 'S9 %' AND a.estado = 'CANCELADA'
ORDER BY a.fecha;

SELECT count(*) AS clubes_o_cursos_cerrados_con_actividades_planificadas
FROM actividades a
LEFT JOIN cursos cu ON cu.id = a.curso_id
JOIN clubes c ON c.id = a.club_id
WHERE a.estado = 'PLANIFICADA'
  AND (c.estado = 'CERRADO' OR cu.estado IN ('FINALIZADO', 'CANCELADO'));

SELECT cc.tipo, cc.nombre, count(ac.actividad_id) AS actividades_ejecutadas
FROM catalogo_contenidos cc
JOIN actividad_contenidos ac ON ac.contenido_id = cc.id
JOIN actividades a ON a.id = ac.actividad_id AND a.estado = 'EJECUTADA'
GROUP BY cc.tipo, cc.nombre
ORDER BY actividades_ejecutadas DESC, cc.tipo, cc.nombre;
