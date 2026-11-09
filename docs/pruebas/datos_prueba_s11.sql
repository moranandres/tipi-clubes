INSERT INTO usuarios (username, email, password_hash, nombres, apellidos, rol_id, institucion_id, debe_cambiar_password)
SELECT v.u, v.u || '@tipi.local', (SELECT password_hash FROM usuarios WHERE username = 'admin'), v.n, 'Prueba S11',
       (SELECT id FROM roles WHERE codigo = v.r), v.i, false
FROM (VALUES ('s11resp1', 'Rosa', 'RESP_INSTITUCIONAL', 1),
             ('s11doc1', 'Diego', 'DOCENTE', 1),
             ('s11doc2', 'Dalia', 'DOCENTE', 1),
             ('s11resp2', 'Raúl', 'RESP_INSTITUCIONAL', 2),
             ('s11doc3', 'Dora', 'DOCENTE', 2),
             ('s11coord', 'Carmen', 'COORDINADOR', NULL),
             ('s11consulta', 'César', 'CONSULTA', NULL)) v(u, n, r, i);

INSERT INTO docentes (institucion_id, usuario_id, nombres, apellidos)
SELECT u.institucion_id, u.id, u.nombres, u.apellidos
FROM usuarios u
WHERE u.username IN ('s11doc1', 's11doc2', 's11doc3');

INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo)
SELECT '2026-2027', DATE '2026-09-01', DATE '2027-07-31', true
WHERE NOT EXISTS (SELECT 1 FROM periodos_academicos WHERE activo);

INSERT INTO clubes (institucion_id, periodo_id, docente_id, nombre, objetivo, fecha_creacion, dia_semana,
                    hora_inicio, hora_fin, lugar, cupo_maximo, estado)
SELECT v.i,
       (SELECT id FROM periodos_academicos WHERE activo ORDER BY id DESC LIMIT 1),
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.d),
       v.n, v.o, current_date - 40, 4, TIME '14:00', TIME '16:00', v.l, 15, v.e
FROM (VALUES (1, 's11doc1', 'S11 Robótica', 'Robótica educativa con Arduino', 'Laboratorio de computación', 'ACTIVO'),
             (1, 's11doc1', 'S11 Programación', 'Programación con Scratch', 'Aula 3', 'ACTIVO'),
             (2, 's11doc3', 'S11 Robótica Institución 2', 'Robótica con kits LEGO', 'Biblioteca', 'ACTIVO')
     ) v(i, d, n, o, l, e);

INSERT INTO estudiantes (nombres, apellidos, institucion_id, curso) VALUES
    ('Ana', 'Prueba S11', 1, 'EGB_8'),
    ('Beto', 'Prueba S11', 1, 'EGB_8'),
    ('Caro', 'Prueba S11', 1, 'EGB_9'),
    ('Eva', 'Prueba S11', 1, 'EGB_10'),
    ('Fede', 'Prueba S11', 2, 'EGB_8');

INSERT INTO autorizaciones_estudiante (estudiante_id, tipo)
SELECT e.id, t.tipo
FROM estudiantes e CROSS JOIN (VALUES ('PARTICIPACION'), ('USO_IMAGEN')) t(tipo)
WHERE e.apellidos = 'Prueba S11';

UPDATE autorizaciones_estudiante a
SET estado = 'OTORGADA', fecha_registro = current_date, documento_ruta = 'pruebas/s11.pdf',
    documento_hash = repeat('b', 64), documento_tipo = 'application/pdf', documento_tamano = 10,
    documento_subido_en = now()
FROM estudiantes e
WHERE e.id = a.estudiante_id AND e.apellidos = 'Prueba S11'
  AND (a.tipo = 'PARTICIPACION' OR e.nombres IN ('Ana', 'Beto', 'Eva', 'Fede'));

INSERT INTO inscripciones (estudiante_id, club_id, institucion_id, periodo_id, fecha_ingreso)
SELECT e.id, c.id, c.institucion_id, c.periodo_id, current_date - v.dias
FROM (VALUES ('Ana', 'S11 Robótica', 20),
             ('Beto', 'S11 Robótica', 20),
             ('Caro', 'S11 Robótica', 20),
             ('Eva', 'S11 Robótica', 1),
             ('Fede', 'S11 Robótica Institución 2', 20)) v(nombre, club, dias)
JOIN estudiantes e ON e.nombres = v.nombre AND e.apellidos = 'Prueba S11'
JOIN clubes c ON c.nombre = v.club;

INSERT INTO actividades (club_id, institucion_id, responsable_id, fecha, hora_inicio, hora_fin, tema, objetivo,
                         creado_por)
SELECT c.id, c.institucion_id,
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.responsable),
       current_date + v.dias, v.inicio, v.inicio + INTERVAL '2 hours', v.tema, v.objetivo,
       (SELECT id FROM usuarios WHERE username = 's11doc1')
FROM (VALUES ('S11 Robótica', 's11doc1', -5, TIME '14:00', 'S11 Taller de sensores', 'Conectar sensores ultrasónicos'),
             ('S11 Robótica', 's11doc2', -2, TIME '14:00', 'S11 Feria de proyectos', 'Presentar los prototipos'),
             ('S11 Robótica', 's11doc1', 5, TIME '14:00', 'S11 Sesión futura', 'Planificada a futuro'),
             ('S11 Robótica', 's11doc1', 6, TIME '14:00', 'S11 Sesión cancelada', 'Será cancelada'),
             ('S11 Programación', 's11doc1', -4, TIME '08:00', 'S11 Introducción a Scratch', 'Primer programa'),
             ('S11 Robótica Institución 2', 's11doc3', -3, TIME '14:00', 'S11 Sesión otra institución', 'Kits LEGO')
     ) v(club, responsable, dias, inicio, tema, objetivo)
JOIN clubes c ON c.nombre = v.club;

UPDATE actividades a
SET estado = 'EJECUTADA', resumen_ejecucion = 'Sesión desarrollada según lo planificado',
    ejecutada_por = a.creado_por, fecha_registro_ejecucion = now(), actualizado_en = now()
WHERE a.tema IN ('S11 Taller de sensores', 'S11 Feria de proyectos', 'S11 Introducción a Scratch',
                 'S11 Sesión otra institución');

UPDATE actividades a
SET estado = 'CANCELADA', motivo_cancelacion = 'Feriado local', cancelada_por = a.creado_por,
    fecha_cancelacion = now(), actualizado_en = now()
WHERE a.tema = 'S11 Sesión cancelada';

SELECT v.variable, x.id::text AS valor, x.referencia
FROM (VALUES ('act_taller', 'S11 Taller de sensores'), ('act_feria', 'S11 Feria de proyectos'),
             ('act_futura', 'S11 Sesión futura'), ('act_cancelada', 'S11 Sesión cancelada'),
             ('act_scratch', 'S11 Introducción a Scratch'), ('act_otra', 'S11 Sesión otra institución')) v(variable, tema)
JOIN LATERAL (
    SELECT a.id, a.tema || ' (' || a.estado || ', ' || to_char(a.fecha, 'DD/MM') || ')' AS referencia
    FROM actividades a WHERE a.tema = v.tema
) x ON true
UNION ALL
SELECT 'est_' || lower(e.nombres), e.id::text,
       e.codigo_interno || ' · ingreso ' || to_char(i.fecha_ingreso, 'DD/MM') || ' · imagen '
           || (SELECT au.estado FROM autorizaciones_estudiante au WHERE au.estudiante_id = e.id AND au.tipo = 'USO_IMAGEN')
FROM estudiantes e
JOIN inscripciones i ON i.estudiante_id = e.id
WHERE e.apellidos = 'Prueba S11'
UNION ALL
SELECT 'club_rob', c.id::text, c.nombre || ' (' || c.estado || ')' FROM clubes c WHERE c.nombre = 'S11 Robótica'
UNION ALL
SELECT 'club_prog', c.id::text, c.nombre || ' (' || c.estado || ')' FROM clubes c WHERE c.nombre = 'S11 Programación'
UNION ALL
SELECT 'club_otra', c.id::text, c.nombre || ' (' || c.estado || ')' FROM clubes c WHERE c.nombre = 'S11 Robótica Institución 2'
UNION ALL
SELECT 'periodo', p.id::text, p.nombre FROM periodos_academicos p WHERE p.activo
ORDER BY 1;
