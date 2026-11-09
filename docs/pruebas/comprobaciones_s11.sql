SELECT max(a.id) FILTER (WHERE a.tema = 'S11 Taller de sensores') AS act_taller,
       max(a.id) FILTER (WHERE a.tema = 'S11 Feria de proyectos') AS act_feria,
       max(a.id) FILTER (WHERE a.tema = 'S11 Sesión futura') AS act_futura,
       max(a.id) FILTER (WHERE a.tema = 'S11 Sesión cancelada') AS act_cancelada,
       max(a.club_id) FILTER (WHERE a.tema = 'S11 Taller de sensores') AS club_rob,
       max(a.institucion_id) FILTER (WHERE a.tema = 'S11 Taller de sensores') AS inst_rob
FROM actividades a
WHERE a.tema LIKE 'S11 %' \gset

SELECT max(e.id) FILTER (WHERE e.nombres = 'Ana') AS ana,
       max(e.id) FILTER (WHERE e.nombres = 'Caro') AS caro,
       max(e.id) FILTER (WHERE e.nombres = 'Eva') AS eva
FROM estudiantes e
WHERE e.apellidos = 'Prueba S11' \gset

SELECT id AS usuario_doc1 FROM usuarios WHERE username = 's11doc1' \gset

SELECT max(ev.id) FILTER (WHERE ev.titulo = 'Armado del sensor ultrasónico') AS foto_taller,
       max(ev.archivo_hash) FILTER (WHERE ev.titulo = 'Armado del sensor ultrasónico') AS hash_foto,
       max(ev.id) FILTER (WHERE ev.titulo = 'Equipo en la feria') AS foto_feria,
       max(ev.id) FILTER (WHERE ev.titulo = 'Prototipo terminado') AS foto_sin_estudiantes,
       max(ev.id) FILTER (WHERE ev.titulo = 'Robot seguidor de línea') AS producto,
       max(ev.id) FILTER (WHERE ev.titulo = 'Informe de la sesión' AND ev.estado = 'ACTIVA') AS informe,
       max(ev.id) FILTER (WHERE ev.titulo = 'Informe de la sesión' AND ev.estado = 'RETIRADA') AS informe_retirado
FROM evidencias ev
WHERE ev.club_id = :club_rob \gset

INSERT INTO evidencias (actividad_id, club_id, institucion_id, tipo, titulo, descripcion, fecha_evidencia, url,
                        registrado_por)
VALUES (:act_futura, :club_rob, :inst_rob, 'ENLACE', 'En una planificada', 'Prueba', current_date,
        'https://ejemplo.com/planificada', :usuario_doc1);

INSERT INTO evidencias (actividad_id, club_id, institucion_id, tipo, titulo, descripcion, fecha_evidencia, url,
                        registrado_por)
VALUES (:act_cancelada, :club_rob, :inst_rob, 'ENLACE', 'En una cancelada', 'Prueba', current_date,
        'https://ejemplo.com/cancelada', :usuario_doc1);

INSERT INTO evidencias (actividad_id, club_id, institucion_id, tipo, titulo, descripcion, fecha_evidencia, url,
                        registrado_por)
VALUES (:act_taller, :club_rob, :inst_rob, 'FOTOGRAFIA', 'Foto como enlace', 'Prueba', current_date,
        'https://ejemplo.com/foto.jpg', :usuario_doc1);

INSERT INTO evidencias (actividad_id, club_id, institucion_id, tipo, titulo, descripcion, fecha_evidencia, url,
                        registrado_por)
VALUES (:act_taller, :club_rob, :inst_rob, 'ENLACE', 'Enlace peligroso', 'Prueba', current_date,
        'javascript:alert(1)', :usuario_doc1);

INSERT INTO evidencias (actividad_id, club_id, institucion_id, tipo, titulo, descripcion, fecha_evidencia,
                        archivo_ruta, archivo_nombre, archivo_tipo, archivo_tamano, archivo_hash,
                        sin_estudiantes_identificables, registrado_por)
VALUES (:act_taller, :club_rob, :inst_rob, 'FOTOGRAFIA', 'Foto repetida', 'Prueba', current_date,
        'evidencias/copia.jpg', 'copia.jpg', 'image/jpeg', 100, :'hash_foto', true, :usuario_doc1);

INSERT INTO evidencias (actividad_id, club_id, institucion_id, tipo, titulo, descripcion, fecha_evidencia, url,
                        registrado_por)
VALUES (:act_taller, :club_rob, :inst_rob, 'ENLACE', 'Enlace repetido', 'Prueba', current_date,
        'https://scratch.mit.edu/projects/123456', :usuario_doc1);

INSERT INTO evidencias (actividad_id, club_id, institucion_id, tipo, titulo, descripcion, fecha_evidencia, url,
                        registrado_por)
VALUES (:act_taller, :club_rob, :inst_rob, 'ENLACE', 'Fecha anterior', 'Prueba', DATE '2026-09-01',
        'https://ejemplo.com/anterior', :usuario_doc1);

INSERT INTO evidencias (actividad_id, club_id, institucion_id, tipo, titulo, descripcion, fecha_evidencia,
                        archivo_ruta, archivo_nombre, archivo_tipo, archivo_tamano, archivo_hash, registrado_por)
VALUES (:act_taller, :club_rob, :inst_rob, 'FOTOGRAFIA', 'Foto sin declarar', 'Prueba', current_date,
        'evidencias/sin-declarar.jpg', 'sin-declarar.jpg', 'image/jpeg', 100, repeat('d', 64), :usuario_doc1);

INSERT INTO evidencia_estudiantes (evidencia_id, estudiante_id) VALUES (:foto_feria, :caro);

INSERT INTO evidencia_estudiantes (evidencia_id, estudiante_id) VALUES (:producto, :eva);

INSERT INTO evidencia_estudiantes (evidencia_id, estudiante_id) VALUES (:informe, :ana);

INSERT INTO evidencia_estudiantes (evidencia_id, estudiante_id) VALUES (:foto_sin_estudiantes, :ana);

DELETE FROM evidencia_estudiantes WHERE evidencia_id = :foto_taller;

UPDATE evidencia_estudiantes SET estudiante_id = :caro WHERE evidencia_id = :foto_taller AND estudiante_id = :ana;

UPDATE evidencias SET archivo_hash = repeat('e', 64) WHERE id = :foto_taller;

UPDATE evidencias SET archivo_ruta = NULL WHERE id = :foto_taller;

UPDATE evidencias SET estado = 'RETIRADA', retirada_por = :usuario_doc1, fecha_retiro = now(), archivo_ruta = NULL
WHERE id = :informe;

UPDATE evidencias SET titulo = 'Título nuevo' WHERE id = :informe_retirado;

DELETE FROM evidencias WHERE id = :foto_taller;

BEGIN;
UPDATE actividades SET estado = 'CANCELADA', motivo_cancelacion = 'Cierre de prueba', fecha_cancelacion = now()
WHERE club_id = :club_rob AND estado = 'PLANIFICADA';
UPDATE clubes SET estado = 'CERRADO' WHERE id = :club_rob;
UPDATE evidencias SET titulo = 'Cambio con el club cerrado' WHERE id = :foto_taller;
ROLLBACK;

BEGIN;
INSERT INTO evidencias (actividad_id, club_id, institucion_id, tipo, titulo, descripcion, fecha_evidencia,
                        archivo_ruta, archivo_nombre, archivo_tipo, archivo_tamano, archivo_hash, registrado_por)
VALUES (:act_taller, :club_rob, :inst_rob, 'FOTOGRAFIA', 'Foto válida', 'Ana en el taller', current_date,
        'evidencias/valida.jpg', 'valida.jpg', 'image/jpeg', 100, repeat('f', 64), :usuario_doc1)
RETURNING id AS foto_valida \gset
INSERT INTO evidencia_estudiantes (evidencia_id, estudiante_id) VALUES (:foto_valida, :ana);
SET CONSTRAINTS ALL IMMEDIATE;
SELECT ev.titulo, ev.tipo, ev.estado, count(ee.estudiante_id) AS estudiantes
FROM evidencias ev
JOIN evidencia_estudiantes ee ON ee.evidencia_id = ev.id
WHERE ev.id = :foto_valida
GROUP BY ev.titulo, ev.tipo, ev.estado;
ROLLBACK;
