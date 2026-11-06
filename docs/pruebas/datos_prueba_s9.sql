INSERT INTO usuarios (username, email, password_hash, nombres, apellidos, rol_id, institucion_id, debe_cambiar_password)
SELECT v.u, v.u || '@tipi.local', (SELECT password_hash FROM usuarios WHERE username = 'admin'), v.n, 'Prueba S9',
       (SELECT id FROM roles WHERE codigo = v.r), v.i, false
FROM (VALUES ('s9resp1', 'Rocío', 'RESP_INSTITUCIONAL', 1),
             ('s9doc1', 'Diego', 'DOCENTE', 1),
             ('s9doc2', 'Daniela', 'DOCENTE', 1),
             ('s9resp2', 'Raúl', 'RESP_INSTITUCIONAL', 2),
             ('s9doc3', 'Dora', 'DOCENTE', 2),
             ('s9coord', 'Carlos', 'COORDINADOR', NULL),
             ('s9consulta', 'Cecilia', 'CONSULTA', NULL)) v(u, n, r, i);

INSERT INTO docentes (institucion_id, usuario_id, nombres, apellidos)
SELECT u.institucion_id, u.id, u.nombres, u.apellidos
FROM usuarios u
WHERE u.username IN ('s9doc1', 's9doc2', 's9doc3');

INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo)
SELECT '2026-2027', DATE '2026-09-01', DATE '2027-07-31', true
WHERE NOT EXISTS (SELECT 1 FROM periodos_academicos WHERE activo);

INSERT INTO clubes (institucion_id, periodo_id, docente_id, nombre, objetivo, fecha_creacion, dia_semana,
                    hora_inicio, hora_fin, lugar, cupo_maximo, estado)
SELECT v.i,
       (SELECT id FROM periodos_academicos WHERE activo ORDER BY id DESC LIMIT 1),
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.d),
       v.n, v.o, current_date, 3, TIME '14:00', TIME '16:00', v.l, 15, v.e
FROM (VALUES (1, 's9doc1', 'S9 Robótica', 'Robótica educativa con Arduino', 'Laboratorio de computación', 'ACTIVO'),
             (1, 's9doc1', 'S9 Programación', 'Programación creativa con Scratch', 'Aula 5', 'PLANIFICADO'),
             (2, 's9doc3', 'S9 Robótica Institución 2', 'Robótica con kits LEGO', 'Biblioteca', 'ACTIVO')
     ) v(i, d, n, o, l, e);

INSERT INTO cursos (club_id, institucion_id, nombre, nivel, modalidad, lugar, fecha_inicio, fecha_fin,
                    duracion_horas, cupo_maximo)
SELECT c.id, c.institucion_id, v.n, 'PRINCIPIANTE', 'PRESENCIAL', c.lugar,
       greatest(current_date - 10, p.fecha_inicio), least(current_date + 30, p.fecha_fin), 20, 15
FROM (VALUES ('S9 Robótica', 'S9 Arduino inicial'),
             ('S9 Programación', 'S9 Scratch básico')) v(club, n)
JOIN clubes c ON c.nombre = v.club
JOIN periodos_academicos p ON p.id = c.periodo_id;

INSERT INTO horarios (curso_id, dia_semana, hora_inicio, hora_fin, tipo_sesion)
SELECT cu.id, 3, TIME '14:00', TIME '16:00', 'PRESENCIAL'
FROM cursos cu WHERE cu.nombre = 'S9 Arduino inicial';

UPDATE cursos SET estado = 'EN_CURSO' WHERE nombre = 'S9 Arduino inicial';

SELECT 'club_rob' AS variable, c.id::text AS valor, c.nombre || ' (' || c.estado || ')' AS referencia
FROM clubes c WHERE c.nombre = 'S9 Robótica'
UNION ALL
SELECT 'club_prog', c.id::text, c.nombre || ' (' || c.estado || ')'
FROM clubes c WHERE c.nombre = 'S9 Programación'
UNION ALL
SELECT 'club_otra', c.id::text, c.nombre || ' (' || c.estado || ')'
FROM clubes c WHERE c.nombre = 'S9 Robótica Institución 2'
UNION ALL
SELECT 'curso_arduino', cu.id::text, cu.nombre || ' (' || cu.estado || ', ' || to_char(cu.fecha_inicio, 'DD/MM') || ' a ' || to_char(cu.fecha_fin, 'DD/MM') || ')'
FROM cursos cu WHERE cu.nombre = 'S9 Arduino inicial'
UNION ALL
SELECT 'curso_scratch', cu.id::text, cu.nombre || ' (' || cu.estado || ')'
FROM cursos cu WHERE cu.nombre = 'S9 Scratch básico'
UNION ALL
SELECT 'doc2', d.id::text, d.nombres || ' ' || d.apellidos || ' (docente sin club)'
FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = 's9doc2'
UNION ALL
SELECT 'hoy', to_char(fn_hoy_guayaquil(), 'YYYY-MM-DD'), 'Fecha de hoy en Guayaquil'
ORDER BY 1;
