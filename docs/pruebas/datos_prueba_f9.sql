INSERT INTO usuarios (username, email, password_hash, nombres, apellidos, rol_id, institucion_id, debe_cambiar_password)
SELECT v.u, v.u || '@tipi.local', (SELECT password_hash FROM usuarios WHERE username = 'admin'), v.n, 'Prueba F9',
       (SELECT id FROM roles WHERE codigo = v.r), v.i, false
FROM (VALUES ('f9resp1', 'Rocío', 'RESP_INSTITUCIONAL', 1),
             ('f9doc1', 'Daniel', 'DOCENTE', 1),
             ('f9doc2', 'Débora', 'DOCENTE', 1),
             ('f9resp2', 'Rubén', 'RESP_INSTITUCIONAL', 2),
             ('f9doc3', 'Dante', 'DOCENTE', 2),
             ('f9coord', 'Cecilia', 'COORDINADOR', NULL),
             ('f9consulta', 'Cristian', 'CONSULTA', NULL)) v(u, n, r, i);

INSERT INTO docentes (institucion_id, usuario_id, nombres, apellidos)
SELECT u.institucion_id, u.id, u.nombres, u.apellidos
FROM usuarios u
WHERE u.username IN ('f9doc1', 'f9doc2', 'f9doc3');

INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo)
SELECT '2026-2027', DATE '2026-09-01', DATE '2027-07-31', true
WHERE NOT EXISTS (SELECT 1 FROM periodos_academicos WHERE activo);

INSERT INTO clubes (institucion_id, periodo_id, docente_id, nombre, objetivo, fecha_creacion, dia_semana,
                    hora_inicio, hora_fin, lugar, cupo_maximo, estado)
SELECT v.i,
       (SELECT id FROM periodos_academicos WHERE activo ORDER BY id DESC LIMIT 1),
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.d),
       v.n, v.o, fn_hoy_guayaquil() - 45, 2, TIME '14:00', TIME '16:00', v.l, 20, 'ACTIVO'
FROM (VALUES (1, 'f9doc1', 'F9 Robótica', 'Robótica educativa con Arduino', 'Laboratorio de computación'),
             (1, 'f9doc1', 'F9 Club sin evidencias', 'Programación con Scratch', 'Aula 7'),
             (2, 'f9doc3', 'F9 Robótica Institución 2', 'Robótica con kits LEGO', 'Biblioteca')
     ) v(i, d, n, o, l);

INSERT INTO estudiantes (nombres, apellidos, institucion_id, curso) VALUES
    ('Ana', 'Prueba F9', 1, 'EGB_8'),
    ('Beto', 'Prueba F9', 1, 'EGB_8'),
    ('Caro', 'Prueba F9', 1, 'EGB_9'),
    ('Dani', 'Prueba F9', 1, 'EGB_9'),
    ('Eva', 'Prueba F9', 1, 'EGB_10'),
    ('Gabi', 'Prueba F9', 1, 'EGB_10'),
    ('Fede', 'Prueba F9', 2, 'EGB_8');

INSERT INTO autorizaciones_estudiante (estudiante_id, tipo)
SELECT e.id, t.tipo
FROM estudiantes e CROSS JOIN (VALUES ('PARTICIPACION'), ('USO_IMAGEN')) t(tipo)
WHERE e.apellidos = 'Prueba F9';

UPDATE autorizaciones_estudiante a
SET estado = 'OTORGADA', fecha_registro = fn_hoy_guayaquil(), documento_ruta = 'pruebas/f9.pdf',
    documento_nombre = 'autorizacion-f9.pdf', documento_hash = repeat('b', 64), documento_tipo = 'application/pdf',
    documento_tamano = 10, documento_subido_en = now()
FROM estudiantes e
WHERE e.id = a.estudiante_id AND e.apellidos = 'Prueba F9'
  AND (a.tipo = 'PARTICIPACION' OR e.nombres IN ('Ana', 'Beto', 'Dani', 'Eva', 'Fede'));

UPDATE autorizaciones_estudiante a
SET estado = 'NO_OTORGADA', fecha_registro = fn_hoy_guayaquil(), observacion = 'La familia no autoriza fotografías'
FROM estudiantes e
WHERE e.id = a.estudiante_id AND e.apellidos = 'Prueba F9' AND e.nombres = 'Gabi' AND a.tipo = 'USO_IMAGEN';

INSERT INTO inscripciones (estudiante_id, club_id, institucion_id, periodo_id, fecha_ingreso)
SELECT e.id, c.id, c.institucion_id, c.periodo_id, fn_hoy_guayaquil() - v.dias
FROM (VALUES ('Ana', 'F9 Robótica', 30),
             ('Beto', 'F9 Robótica', 30),
             ('Caro', 'F9 Robótica', 30),
             ('Dani', 'F9 Robótica', 30),
             ('Eva', 'F9 Robótica', 5),
             ('Gabi', 'F9 Robótica', 30),
             ('Fede', 'F9 Robótica Institución 2', 30)) v(nombre, club, dias)
JOIN estudiantes e ON e.nombres = v.nombre AND e.apellidos = 'Prueba F9'
JOIN clubes c ON c.nombre = v.club;

INSERT INTO actividades (club_id, institucion_id, responsable_id, fecha, hora_inicio, hora_fin, tema, objetivo,
                         lugar, creado_por)
SELECT c.id, c.institucion_id,
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.responsable),
       fn_hoy_guayaquil() + v.dias, v.inicio, v.fin, v.tema, v.objetivo, c.lugar,
       (SELECT id FROM usuarios WHERE username = v.responsable)
FROM (VALUES ('F9 Robótica', 'f9doc1', -10, TIME '14:00', TIME '16:00', 'F9 Feria de robótica', 'Presentar los prototipos a la comunidad'),
             ('F9 Robótica', 'f9doc1', -3, TIME '14:00', TIME '16:00', 'F9 Taller de sensores', 'Leer un sensor ultrasónico'),
             ('F9 Robótica', 'f9doc2', -4, TIME '10:00', TIME '11:30', 'F9 Refuerzo con Débora', 'Repasar conexiones en protoboard'),
             ('F9 Robótica', 'f9doc1', 3, TIME '14:00', TIME '16:00', 'F9 Sesión planificada', 'Sesión futura sin ejecutar'),
             ('F9 Club sin evidencias', 'f9doc1', -6, TIME '09:00', TIME '10:00', 'F9 Primera sesión de Scratch', 'Conocer el entorno de Scratch'),
             ('F9 Robótica Institución 2', 'f9doc3', -2, TIME '14:00', TIME '16:00', 'F9 Kits LEGO', 'Armar el primer robot LEGO')
     ) v(club, responsable, dias, inicio, fin, tema, objetivo)
JOIN clubes c ON c.nombre = v.club;

UPDATE actividades a
SET estado = 'EJECUTADA', resumen_ejecucion = 'Sesión desarrollada según lo planificado',
    ejecutada_por = a.creado_por, fecha_registro_ejecucion = now(), actualizado_en = now()
WHERE a.tema LIKE 'F9 %' AND a.tema <> 'F9 Sesión planificada';

INSERT INTO asistencias (actividad_id, club_id, estudiante_id, inscripcion_id, estado, observacion, registrado_por)
SELECT a.id, a.club_id, e.id, i.id, v.estado, v.observacion, a.creado_por
FROM (VALUES ('F9 Feria de robótica', 'Ana', 'PRESENTE', NULL),
             ('F9 Feria de robótica', 'Beto', 'PRESENTE', NULL),
             ('F9 Feria de robótica', 'Caro', 'PRESENTE', NULL),
             ('F9 Feria de robótica', 'Dani', 'ATRASADO', NULL),
             ('F9 Feria de robótica', 'Gabi', 'AUSENTE', NULL)) v(tema, nombre, estado, observacion)
JOIN actividades a ON a.tema = v.tema
JOIN estudiantes e ON e.nombres = v.nombre AND e.apellidos = 'Prueba F9'
JOIN inscripciones i ON i.estudiante_id = e.id AND i.club_id = a.club_id;

INSERT INTO evidencias (actividad_id, club_id, institucion_id, tipo, titulo, descripcion, fecha_evidencia, url,
                        registrado_por)
SELECT a.id, a.club_id, a.institucion_id, 'ENLACE', v.titulo, v.descripcion, a.fecha, v.url, a.creado_por
FROM (VALUES ('F9 Feria de robótica', 'F9 Video de la feria', 'Video publicado por la institución con las demostraciones de los prototipos', 'https://www.youtube.com/watch?v=f9feria'),
             ('F9 Feria de robótica', 'F9 Enlace equivocado', 'Se registró por error el enlace de otra actividad', 'https://example.org/f9-equivocado'),
             ('F9 Kits LEGO', 'F9 Repositorio LEGO', 'Instrucciones de armado compartidas por el club', 'https://example.org/f9-lego')
     ) v(tema, titulo, descripcion, url)
JOIN actividades a ON a.tema = v.tema;

UPDATE evidencias ev
SET estado = 'RETIRADA', motivo_retiro = 'El enlace correspondía a otra actividad',
    retirada_por = ev.registrado_por, fecha_retiro = now(), actualizado_en = now()
WHERE ev.titulo = 'F9 Enlace equivocado';

SELECT a.tema, a.estado, to_char(a.fecha, 'DD/MM/YYYY') AS fecha, c.nombre AS club,
       (SELECT count(*) FROM evidencias ev WHERE ev.actividad_id = a.id AND ev.estado = 'ACTIVA') AS evidencias_activas,
       (SELECT count(*) FROM evidencias ev WHERE ev.actividad_id = a.id AND ev.estado = 'RETIRADA') AS retiradas
FROM actividades a
JOIN clubes c ON c.id = a.club_id
WHERE a.tema LIKE 'F9 %'
ORDER BY c.nombre, a.fecha;

SELECT e.nombres, a.estado AS uso_de_imagen
FROM estudiantes e
JOIN autorizaciones_estudiante a ON a.estudiante_id = e.id AND a.tipo = 'USO_IMAGEN'
WHERE e.apellidos = 'Prueba F9'
ORDER BY e.nombres;
