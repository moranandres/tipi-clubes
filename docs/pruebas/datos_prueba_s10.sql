INSERT INTO usuarios (username, email, password_hash, nombres, apellidos, rol_id, institucion_id, debe_cambiar_password)
SELECT v.u, v.u || '@tipi.local', (SELECT password_hash FROM usuarios WHERE username = 'admin'), v.n, 'Prueba S10',
       (SELECT id FROM roles WHERE codigo = v.r), v.i, false
FROM (VALUES ('s10resp1', 'Rebeca', 'RESP_INSTITUCIONAL', 1),
             ('s10doc1', 'Darío', 'DOCENTE', 1),
             ('s10doc2', 'Delia', 'DOCENTE', 1),
             ('s10resp2', 'Ramiro', 'RESP_INSTITUCIONAL', 2),
             ('s10doc3', 'Doris', 'DOCENTE', 2),
             ('s10coord', 'Camilo', 'COORDINADOR', NULL),
             ('s10consulta', 'Celia', 'CONSULTA', NULL)) v(u, n, r, i);

INSERT INTO docentes (institucion_id, usuario_id, nombres, apellidos)
SELECT u.institucion_id, u.id, u.nombres, u.apellidos
FROM usuarios u
WHERE u.username IN ('s10doc1', 's10doc2', 's10doc3');

INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo)
SELECT '2026-2027', DATE '2026-09-01', DATE '2027-07-31', true
WHERE NOT EXISTS (SELECT 1 FROM periodos_academicos WHERE activo);

INSERT INTO clubes (institucion_id, periodo_id, docente_id, nombre, objetivo, fecha_creacion, dia_semana,
                    hora_inicio, hora_fin, lugar, cupo_maximo, estado)
SELECT v.i,
       (SELECT id FROM periodos_academicos WHERE activo ORDER BY id DESC LIMIT 1),
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.d),
       v.n, v.o, current_date - 40, 3, TIME '14:00', TIME '16:00', v.l, 15, 'ACTIVO'
FROM (VALUES (1, 's10doc1', 'S10 Robótica', 'Robótica educativa con Arduino', 'Laboratorio de computación'),
             (2, 's10doc3', 'S10 Robótica Institución 2', 'Robótica con kits LEGO', 'Biblioteca')
     ) v(i, d, n, o, l);

INSERT INTO estudiantes (nombres, apellidos, institucion_id, curso) VALUES
    ('Ana', 'Prueba S10', 1, 'EGB_8'),
    ('Beto', 'Prueba S10', 1, 'EGB_8'),
    ('Caro', 'Prueba S10', 1, 'EGB_9'),
    ('Dani', 'Prueba S10', 1, 'EGB_9'),
    ('Eva', 'Prueba S10', 1, 'EGB_10'),
    ('Gabi', 'Prueba S10', 1, 'EGB_10'),
    ('Fede', 'Prueba S10', 2, 'EGB_8');

INSERT INTO autorizaciones_estudiante (estudiante_id, tipo)
SELECT e.id, t.tipo
FROM estudiantes e CROSS JOIN (VALUES ('PARTICIPACION'), ('USO_IMAGEN')) t(tipo)
WHERE e.apellidos = 'Prueba S10';

UPDATE autorizaciones_estudiante a
SET estado = 'OTORGADA', fecha_registro = current_date, documento_ruta = 'pruebas/s10.pdf',
    documento_hash = repeat('a', 64), documento_tipo = 'application/pdf', documento_tamano = 10,
    documento_subido_en = now()
FROM estudiantes e
WHERE e.id = a.estudiante_id AND e.apellidos = 'Prueba S10' AND a.tipo = 'PARTICIPACION';

INSERT INTO inscripciones (estudiante_id, club_id, institucion_id, periodo_id, fecha_ingreso)
SELECT e.id, c.id, c.institucion_id, c.periodo_id, current_date - v.dias
FROM (VALUES ('Ana', 'S10 Robótica', 20),
             ('Beto', 'S10 Robótica', 20),
             ('Caro', 'S10 Robótica', 20),
             ('Dani', 'S10 Robótica', 20),
             ('Eva', 'S10 Robótica', 2),
             ('Gabi', 'S10 Robótica', 20),
             ('Fede', 'S10 Robótica Institución 2', 20)) v(nombre, club, dias)
JOIN estudiantes e ON e.nombres = v.nombre AND e.apellidos = 'Prueba S10'
JOIN clubes c ON c.nombre = v.club;

INSERT INTO cursos (club_id, institucion_id, nombre, nivel, modalidad, lugar, fecha_inicio, fecha_fin,
                    duracion_horas, cupo_maximo)
SELECT c.id, c.institucion_id, 'S10 Arduino inicial', 'PRINCIPIANTE', 'PRESENCIAL', c.lugar,
       greatest(current_date - 30, p.fecha_inicio), least(current_date + 30, p.fecha_fin), 20, 15
FROM clubes c
JOIN periodos_academicos p ON p.id = c.periodo_id
WHERE c.nombre = 'S10 Robótica';

INSERT INTO horarios (curso_id, dia_semana, hora_inicio, hora_fin, tipo_sesion)
SELECT cu.id, 3, TIME '14:00', TIME '16:00', 'PRESENCIAL'
FROM cursos cu WHERE cu.nombre = 'S10 Arduino inicial';

UPDATE cursos SET estado = 'EN_CURSO' WHERE nombre = 'S10 Arduino inicial';

INSERT INTO inscripciones_curso (estudiante_id, curso_id, club_id, fecha_ingreso)
SELECT e.id, cu.id, cu.club_id, current_date - 20
FROM estudiantes e
JOIN cursos cu ON cu.nombre = 'S10 Arduino inicial'
WHERE e.apellidos = 'Prueba S10' AND e.nombres IN ('Ana', 'Beto', 'Caro');

INSERT INTO solicitudes_retiro (inscripcion_id, institucion_id, motivo, solicitado_por)
SELECT i.id, i.institucion_id, 'Cambio de jornada escolar', (SELECT id FROM usuarios WHERE username = 's10doc1')
FROM inscripciones i
JOIN estudiantes e ON e.id = i.estudiante_id
WHERE e.nombres = 'Dani' AND e.apellidos = 'Prueba S10';

UPDATE inscripciones i
SET estado = 'RETIRADA', fecha_retiro = current_date - 5
FROM estudiantes e
WHERE e.id = i.estudiante_id AND e.nombres = 'Dani' AND e.apellidos = 'Prueba S10';

UPDATE solicitudes_retiro r
SET estado = 'APROBADA', resuelto_por = (SELECT id FROM usuarios WHERE username = 's10resp1'),
    fecha_resolucion = now(), fecha_retiro = current_date - 5
FROM inscripciones i
JOIN estudiantes e ON e.id = i.estudiante_id
WHERE r.inscripcion_id = i.id AND e.nombres = 'Dani' AND e.apellidos = 'Prueba S10';

INSERT INTO actividades (club_id, institucion_id, curso_id, responsable_id, fecha, hora_inicio, hora_fin, tema,
                         objetivo, creado_por)
SELECT c.id, c.institucion_id,
       CASE WHEN v.con_curso THEN (SELECT id FROM cursos WHERE nombre = 'S10 Arduino inicial') END,
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.responsable),
       current_date + v.dias, TIME '14:00', TIME '16:00', v.tema, v.objetivo,
       (SELECT id FROM usuarios WHERE username = 's10doc1')
FROM (VALUES ('S10 Robótica', 's10doc1', -7, false, 'S10 Sesión general', 'Presentar el club y sus normas'),
             ('S10 Robótica', 's10doc1', -3, true, 'S10 Sesión del curso', 'Primer circuito con Arduino'),
             ('S10 Robótica', 's10doc2', -1, false, 'S10 Sesión de refuerzo', 'Repasar sensores'),
             ('S10 Robótica', 's10doc1', 5, false, 'S10 Sesión futura', 'Planificada a futuro'),
             ('S10 Robótica', 's10doc1', 6, false, 'S10 Sesión cancelada', 'Será cancelada'),
             ('S10 Robótica Institución 2', 's10doc3', -2, false, 'S10 Sesión otra institución', 'Kits LEGO')
     ) v(club, responsable, dias, con_curso, tema, objetivo)
JOIN clubes c ON c.nombre = v.club;

UPDATE actividades a
SET estado = 'EJECUTADA', resumen_ejecucion = 'Sesión desarrollada según lo planificado',
    ejecutada_por = a.creado_por, fecha_registro_ejecucion = now(), actualizado_en = now()
WHERE a.tema IN ('S10 Sesión general', 'S10 Sesión del curso', 'S10 Sesión de refuerzo',
                 'S10 Sesión otra institución');

UPDATE actividades a
SET estado = 'CANCELADA', motivo_cancelacion = 'Feriado local', cancelada_por = a.creado_por,
    fecha_cancelacion = now(), actualizado_en = now()
WHERE a.tema = 'S10 Sesión cancelada';

SELECT v.variable, x.id::text AS valor, x.referencia
FROM (VALUES ('act_general', 'S10 Sesión general'), ('act_curso', 'S10 Sesión del curso'),
             ('act_refuerzo', 'S10 Sesión de refuerzo'), ('act_futura', 'S10 Sesión futura'),
             ('act_cancelada', 'S10 Sesión cancelada'), ('act_otra', 'S10 Sesión otra institución')) v(variable, tema)
JOIN LATERAL (
    SELECT a.id, a.tema || ' (' || a.estado || ', ' || to_char(a.fecha, 'DD/MM') || ')' AS referencia
    FROM actividades a WHERE a.tema = v.tema
) x ON true
UNION ALL
SELECT 'est_' || lower(e.nombres), e.id::text,
       e.codigo_interno || ' · ingreso ' || to_char(i.fecha_ingreso, 'DD/MM') || ' · ' || i.estado
           || coalesce(' el ' || to_char(i.fecha_retiro, 'DD/MM'), '')
FROM estudiantes e
JOIN inscripciones i ON i.estudiante_id = e.id
WHERE e.apellidos = 'Prueba S10'
UNION ALL
SELECT 'club_rob', c.id::text, c.nombre || ' (' || c.estado || ')' FROM clubes c WHERE c.nombre = 'S10 Robótica'
UNION ALL
SELECT 'club_otra', c.id::text, c.nombre || ' (' || c.estado || ')' FROM clubes c WHERE c.nombre = 'S10 Robótica Institución 2'
UNION ALL
SELECT 'curso_arduino', cu.id::text, cu.nombre || ' (' || cu.estado || ')' FROM cursos cu WHERE cu.nombre = 'S10 Arduino inicial'
ORDER BY 1;
