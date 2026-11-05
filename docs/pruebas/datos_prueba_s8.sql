INSERT INTO usuarios (username, email, password_hash, nombres, apellidos, rol_id, institucion_id, debe_cambiar_password)
SELECT v.u, v.u || '@tipi.local', (SELECT password_hash FROM usuarios WHERE username = 'admin'), v.n, 'Prueba S8',
       (SELECT id FROM roles WHERE codigo = v.r), v.i, false
FROM (VALUES ('s8resp1', 'Rosa', 'RESP_INSTITUCIONAL', 1),
             ('s8doc1', 'Darío', 'DOCENTE', 1),
             ('s8resp2', 'Ramiro', 'RESP_INSTITUCIONAL', 2),
             ('s8coord', 'Camila', 'COORDINADOR', NULL)) v(u, n, r, i);

INSERT INTO docentes (institucion_id, usuario_id, nombres, apellidos)
SELECT u.institucion_id, u.id, u.nombres, u.apellidos
FROM usuarios u
WHERE u.username = 's8doc1';

INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo)
SELECT '2026-2027', DATE '2026-09-01', DATE '2027-07-31', true
WHERE NOT EXISTS (SELECT 1 FROM periodos_academicos WHERE activo);

INSERT INTO clubes (institucion_id, periodo_id, docente_id, nombre, objetivo, fecha_creacion, dia_semana,
                    hora_inicio, hora_fin, lugar, cupo_maximo, estado)
SELECT 1,
       (SELECT id FROM periodos_academicos WHERE activo ORDER BY id DESC LIMIT 1),
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = 's8doc1'),
       v.n, v.o, current_date, 2, TIME '14:00', TIME '16:00', 'Laboratorio de robótica', 10, v.e
FROM (VALUES ('S8 Robótica', 'Robótica educativa con LEGO', 'ACTIVO'),
             ('S8 Programación', 'Programación con Scratch', 'PLANIFICADO')) v(n, o, e);

INSERT INTO estudiantes (nombres, apellidos, institucion_id, curso) VALUES
    ('Ana', 'Prueba S8', 1, 'EGB_9'),
    ('Bruno', 'Prueba S8', 1, 'EGB_10'),
    ('Carla', 'Prueba S8', 1, 'BGU_1');

INSERT INTO autorizaciones_estudiante (estudiante_id, tipo)
SELECT e.id, t.tipo
FROM estudiantes e CROSS JOIN (VALUES ('PARTICIPACION'), ('USO_IMAGEN')) t(tipo)
WHERE e.apellidos = 'Prueba S8';

UPDATE autorizaciones_estudiante a
SET estado = 'OTORGADA', fecha_registro = current_date, documento_ruta = 'pruebas/s8.pdf',
    documento_hash = repeat('f', 64), documento_tipo = 'application/pdf', documento_tamano = 10,
    documento_subido_en = now()
FROM estudiantes e
WHERE e.id = a.estudiante_id AND e.apellidos = 'Prueba S8' AND a.tipo = 'PARTICIPACION';

INSERT INTO inscripciones (estudiante_id, club_id, institucion_id, periodo_id, fecha_ingreso)
SELECT e.id, c.id, c.institucion_id, c.periodo_id, current_date
FROM estudiantes e
JOIN clubes c ON c.nombre = 'S8 Robótica'
WHERE e.apellidos = 'Prueba S8' AND e.nombres IN ('Ana', 'Bruno');

INSERT INTO cursos (club_id, institucion_id, nombre, nivel, modalidad, lugar, fecha_inicio, fecha_fin,
                    duracion_horas, cupo_maximo)
SELECT c.id, c.institucion_id, 'S8 Robótica básica', 'PRINCIPIANTE', 'PRESENCIAL', 'Laboratorio de robótica',
       current_date, current_date + 30, 20, 10
FROM clubes c WHERE c.nombre = 'S8 Robótica';

INSERT INTO horarios (curso_id, dia_semana, hora_inicio, hora_fin, tipo_sesion)
SELECT cu.id, 2, TIME '14:00', TIME '16:00', 'PRESENCIAL'
FROM cursos cu WHERE cu.nombre = 'S8 Robótica básica';

UPDATE cursos SET estado = 'EN_CURSO' WHERE nombre = 'S8 Robótica básica';

INSERT INTO inscripciones_curso (estudiante_id, curso_id, club_id, fecha_ingreso)
SELECT e.id, cu.id, cu.club_id, current_date
FROM estudiantes e
JOIN cursos cu ON cu.nombre = 'S8 Robótica básica'
WHERE e.apellidos = 'Prueba S8' AND e.nombres = 'Ana';

INSERT INTO solicitudes_inscripcion (estudiante_id, institucion_id, club_id, nivel, motivacion, solicitado_por)
SELECT e.id, e.institucion_id, c.id, 'PRINCIPIANTE', 'Quiere aprender robótica con sus compañeros',
       (SELECT id FROM usuarios WHERE username = 's8doc1')
FROM estudiantes e
JOIN clubes c ON c.nombre = 'S8 Robótica'
WHERE e.apellidos = 'Prueba S8' AND e.nombres = 'Carla';

INSERT INTO solicitudes_retiro (inscripcion_id, institucion_id, motivo, solicitado_por)
SELECT i.id, i.institucion_id, 'Cambio de jornada escolar', (SELECT id FROM usuarios WHERE username = 's8doc1')
FROM inscripciones i
JOIN estudiantes e ON e.id = i.estudiante_id
JOIN clubes c ON c.id = i.club_id
WHERE c.nombre = 'S8 Robótica' AND e.apellidos = 'Prueba S8' AND e.nombres = 'Bruno';

SELECT 'club_rob' AS variable, c.id AS valor, c.nombre || ' (' || c.estado || ')' AS referencia
FROM clubes c WHERE c.nombre = 'S8 Robótica'
UNION ALL
SELECT 'club_prog', c.id, c.nombre || ' (' || c.estado || ')'
FROM clubes c WHERE c.nombre = 'S8 Programación'
UNION ALL
SELECT 'curso_basica', cu.id, cu.nombre || ' (' || cu.estado || ')'
FROM cursos cu WHERE cu.nombre = 'S8 Robótica básica'
UNION ALL
SELECT 'est_' || lower(e.nombres), e.id, e.codigo_interno
FROM estudiantes e WHERE e.apellidos = 'Prueba S8'
UNION ALL
SELECT 'sol_carla', s.id, 'Solicitud de inscripción (' || s.estado || ')'
FROM solicitudes_inscripcion s
JOIN estudiantes e ON e.id = s.estudiante_id
WHERE e.apellidos = 'Prueba S8' AND e.nombres = 'Carla'
UNION ALL
SELECT 'ret_bruno', r.id, 'Solicitud de retiro (' || r.estado || ')'
FROM solicitudes_retiro r
JOIN inscripciones i ON i.id = r.inscripcion_id
JOIN estudiantes e ON e.id = i.estudiante_id
WHERE e.apellidos = 'Prueba S8' AND e.nombres = 'Bruno'
ORDER BY 1;
