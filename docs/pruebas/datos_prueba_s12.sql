INSERT INTO usuarios (username, email, password_hash, nombres, apellidos, rol_id, institucion_id, debe_cambiar_password)
SELECT v.u, v.u || '@tipi.local', (SELECT password_hash FROM usuarios WHERE username = 'admin'), v.n, 'Prueba S12',
       (SELECT id FROM roles WHERE codigo = v.r), v.i, false
FROM (VALUES ('s12resp1', 'Rita', 'RESP_INSTITUCIONAL', 1),
             ('s12doc1', 'Damián', 'DOCENTE', 1),
             ('s12doc2', 'Débora', 'DOCENTE', 1),
             ('s12resp2', 'Rodrigo', 'RESP_INSTITUCIONAL', 2),
             ('s12doc3', 'Daniela', 'DOCENTE', 2),
             ('s12coord', 'Clara', 'COORDINADOR', NULL),
             ('s12consulta', 'Ciro', 'CONSULTA', NULL)) v(u, n, r, i);

INSERT INTO docentes (institucion_id, usuario_id, nombres, apellidos)
SELECT u.institucion_id, u.id, u.nombres, u.apellidos
FROM usuarios u
WHERE u.username IN ('s12doc1', 's12doc2', 's12doc3');

INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo)
SELECT '2026-2027', DATE '2026-09-01', DATE '2027-07-31', true
WHERE NOT EXISTS (SELECT 1 FROM periodos_academicos WHERE activo);

INSERT INTO clubes (institucion_id, periodo_id, docente_id, nombre, objetivo, fecha_creacion, dia_semana,
                    hora_inicio, hora_fin, lugar, cupo_maximo, estado)
SELECT v.i,
       (SELECT id FROM periodos_academicos WHERE activo ORDER BY id DESC LIMIT 1),
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.d),
       v.n, v.o, current_date - 40, 5, TIME '14:00', TIME '16:00', v.l, 15, v.e
FROM (VALUES (1, 's12doc1', 'S12 Robótica', 'Robótica educativa con Arduino', 'Laboratorio de computación', 'ACTIVO'),
             (1, 's12doc1', 'S12 Programación', 'Programación con Scratch', 'Aula 4', 'PLANIFICADO'),
             (1, 's12doc1', 'S12 Club a cerrar', 'Club que se cerrará en las pruebas', 'Aula 6', 'ACTIVO'),
             (2, 's12doc3', 'S12 Robótica Institución 2', 'Robótica con kits LEGO', 'Biblioteca', 'ACTIVO')
     ) v(i, d, n, o, l, e);

INSERT INTO estudiantes (nombres, apellidos, institucion_id, curso) VALUES
    ('Ana', 'Prueba S12', 1, 'EGB_8'),
    ('Beto', 'Prueba S12', 1, 'EGB_8'),
    ('Caro', 'Prueba S12', 1, 'EGB_9'),
    ('Dani', 'Prueba S12', 1, 'EGB_9'),
    ('Eva', 'Prueba S12', 1, 'EGB_10'),
    ('Gabi', 'Prueba S12', 1, 'EGB_10'),
    ('Fede', 'Prueba S12', 2, 'EGB_8');

INSERT INTO autorizaciones_estudiante (estudiante_id, tipo)
SELECT e.id, t.tipo
FROM estudiantes e CROSS JOIN (VALUES ('PARTICIPACION'), ('USO_IMAGEN')) t(tipo)
WHERE e.apellidos = 'Prueba S12';

UPDATE autorizaciones_estudiante a
SET estado = 'OTORGADA', fecha_registro = current_date, documento_ruta = 'pruebas/s12.pdf',
    documento_hash = repeat('c', 64), documento_tipo = 'application/pdf', documento_tamano = 10,
    documento_subido_en = now()
FROM estudiantes e
WHERE e.id = a.estudiante_id AND e.apellidos = 'Prueba S12' AND a.tipo = 'PARTICIPACION';

INSERT INTO inscripciones (estudiante_id, club_id, institucion_id, periodo_id, fecha_ingreso)
SELECT e.id, c.id, c.institucion_id, c.periodo_id, current_date - v.dias
FROM (VALUES ('Ana', 'S12 Robótica', 30),
             ('Beto', 'S12 Robótica', 30),
             ('Caro', 'S12 Robótica', 30),
             ('Dani', 'S12 Robótica', 1),
             ('Gabi', 'S12 Club a cerrar', 30),
             ('Fede', 'S12 Robótica Institución 2', 30)) v(nombre, club, dias)
JOIN estudiantes e ON e.nombres = v.nombre AND e.apellidos = 'Prueba S12'
JOIN clubes c ON c.nombre = v.club;

INSERT INTO actividades (club_id, institucion_id, responsable_id, fecha, hora_inicio, hora_fin, tema, objetivo,
                         creado_por)
SELECT c.id, c.institucion_id,
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.responsable),
       current_date + v.dias, v.inicio, v.inicio + INTERVAL '2 hours', v.tema, v.objetivo,
       (SELECT id FROM usuarios WHERE username = 's12doc1')
FROM (VALUES ('S12 Robótica', 's12doc1', -6, TIME '14:00', 'S12 Taller de sensores', 'Conectar sensores ultrasónicos'),
             ('S12 Robótica', 's12doc2', -3, TIME '14:00', 'S12 Sesión de prototipos', 'Armar el primer prototipo'),
             ('S12 Robótica', 's12doc1', 5, TIME '14:00', 'S12 Sesión futura', 'Planificada a futuro'),
             ('S12 Robótica Institución 2', 's12doc3', -3, TIME '14:00', 'S12 Sesión otra institución', 'Kits LEGO')
     ) v(club, responsable, dias, inicio, tema, objetivo)
JOIN clubes c ON c.nombre = v.club;

UPDATE actividades a
SET estado = 'EJECUTADA', resumen_ejecucion = 'Sesión desarrollada según lo planificado',
    ejecutada_por = a.creado_por, fecha_registro_ejecucion = now(), actualizado_en = now()
WHERE a.tema IN ('S12 Taller de sensores', 'S12 Sesión de prototipos', 'S12 Sesión otra institución');

INSERT INTO actividad_contenidos (actividad_id, contenido_id)
SELECT a.id, cc.id
FROM (VALUES ('S12 Taller de sensores', 'Electrónica básica'),
             ('S12 Taller de sensores', 'Pensamiento computacional'),
             ('S12 Sesión de prototipos', 'Trabajo en equipo'),
             ('S12 Sesión de prototipos', 'Pensamiento computacional'),
             ('S12 Sesión de prototipos', 'Sensor ultrasónico'),
             ('S12 Sesión otra institución', 'Mecánica y ensamblaje')) v(tema, contenido)
JOIN actividades a ON a.tema = v.tema
JOIN catalogo_contenidos cc ON cc.nombre = v.contenido;

INSERT INTO evidencias (actividad_id, club_id, institucion_id, tipo, titulo, descripcion, fecha_evidencia, url,
                        registrado_por)
SELECT a.id, a.club_id, a.institucion_id, v.tipo, v.titulo, v.descripcion, a.fecha, v.url,
       (SELECT id FROM usuarios WHERE username = 's12doc1')
FROM (VALUES ('S12 Sesión de prototipos', 'PRODUCTO', 'Video del robot seguidor de línea',
              'Demostración del primer prototipo', 'https://ejemplo.com/s12/robot-seguidor'),
             ('S12 Taller de sensores', 'ENLACE', 'Guía de sensores', 'Material de la sesión',
              'https://ejemplo.com/s12/guia-sensores'),
             ('S12 Taller de sensores', 'ENLACE', 'Enlace retirado', 'Se retirará antes de las pruebas',
              'https://ejemplo.com/s12/retirado'),
             ('S12 Sesión otra institución', 'PRODUCTO', 'Video LEGO de la otra institución', 'Prototipo LEGO',
              'https://ejemplo.com/s12/lego')) v(tema, tipo, titulo, descripcion, url)
JOIN actividades a ON a.tema = v.tema;

UPDATE evidencias
SET estado = 'RETIRADA', motivo_retiro = 'Enlace equivocado', retirada_por = registrado_por, fecha_retiro = now(),
    actualizado_en = now()
WHERE titulo = 'Enlace retirado';

SELECT v.variable, x.id::text AS valor, x.referencia
FROM (VALUES ('act_taller', 'S12 Taller de sensores'), ('act_prototipos', 'S12 Sesión de prototipos'),
             ('act_futura', 'S12 Sesión futura'), ('act_otra', 'S12 Sesión otra institución')) v(variable, tema)
JOIN LATERAL (
    SELECT a.id, a.tema || ' (' || a.estado || ', ' || to_char(a.fecha, 'DD/MM') || ')' AS referencia
    FROM actividades a WHERE a.tema = v.tema
) x ON true
UNION ALL
SELECT 'est_' || lower(e.nombres), e.id::text,
       e.codigo_interno || ' · ' || c.nombre || ' · ingreso ' || to_char(i.fecha_ingreso, 'DD/MM')
FROM estudiantes e
JOIN inscripciones i ON i.estudiante_id = e.id
JOIN clubes c ON c.id = i.club_id
WHERE e.apellidos = 'Prueba S12'
UNION ALL
SELECT 'est_eva', e.id::text, e.codigo_interno || ' · sin club' FROM estudiantes e
WHERE e.apellidos = 'Prueba S12' AND e.nombres = 'Eva'
UNION ALL
SELECT v.variable, c.id::text, c.nombre || ' (' || c.estado || ')'
FROM (VALUES ('club_rob', 'S12 Robótica'), ('club_prog', 'S12 Programación'), ('club_cerrar', 'S12 Club a cerrar'),
             ('club_otra', 'S12 Robótica Institución 2')) v(variable, nombre)
JOIN clubes c ON c.nombre = v.nombre
UNION ALL
SELECT v.variable, d.id::text, u.username
FROM (VALUES ('doc1', 's12doc1'), ('doc2', 's12doc2'), ('doc3', 's12doc3')) v(variable, username)
JOIN usuarios u ON u.username = v.username
JOIN docentes d ON d.usuario_id = u.id
UNION ALL
SELECT v.variable, ev.id::text, ev.titulo || ' (' || ev.tipo || ', ' || ev.estado || ')'
FROM (VALUES ('ev_video', 'Video del robot seguidor de línea'), ('ev_guia', 'Guía de sensores'),
             ('ev_retirada', 'Enlace retirado'), ('ev_otra', 'Video LEGO de la otra institución')) v(variable, titulo)
JOIN evidencias ev ON ev.titulo = v.titulo
UNION ALL
SELECT v.variable, cc.id::text, cc.nombre || ' (' || cc.tipo || ')'
FROM (VALUES ('comp_pensamiento', 'Pensamiento computacional'), ('comp_equipo', 'Trabajo en equipo'),
             ('comp_electronica', 'Electrónica básica'), ('cont_arduino', 'Arduino IDE')) v(variable, nombre)
JOIN catalogo_contenidos cc ON cc.nombre = v.nombre
UNION ALL
SELECT 'periodo', p.id::text, p.nombre FROM periodos_academicos p WHERE p.activo
ORDER BY 1;
