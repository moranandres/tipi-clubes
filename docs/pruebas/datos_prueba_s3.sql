INSERT INTO usuarios (username, email, password_hash, nombres, apellidos, rol_id, institucion_id, debe_cambiar_password)
SELECT v.u, v.u || '@tipi.local', (SELECT password_hash FROM usuarios WHERE username = 'admin'), v.n, 'Prueba S3',
       (SELECT id FROM roles WHERE codigo = v.r), v.i, false
FROM (VALUES ('s3resp1', 'Rosa', 'RESP_INSTITUCIONAL', 1),
             ('s3resp1b', 'Raúl', 'RESP_INSTITUCIONAL', 1),
             ('s3doc1', 'Diego', 'DOCENTE', 1),
             ('s3doc2', 'Dora', 'DOCENTE', 2),
             ('s3resp2', 'Rita', 'RESP_INSTITUCIONAL', 2),
             ('s3coord', 'Carla', 'COORDINADOR', NULL)) v(u, n, r, i);

INSERT INTO docentes (institucion_id, usuario_id, nombres, apellidos)
SELECT u.institucion_id, u.id, u.nombres, u.apellidos FROM usuarios u WHERE u.username IN ('s3doc1', 's3doc2');

INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo)
SELECT '2026-2027', DATE '2026-09-01', DATE '2027-07-31', true
WHERE NOT EXISTS (SELECT 1 FROM periodos_academicos WHERE activo);

INSERT INTO clubes (institucion_id, periodo_id, docente_id, nombre, objetivo, cupo_maximo, estado)
SELECT v.i, (SELECT id FROM periodos_academicos WHERE activo ORDER BY id DESC LIMIT 1),
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.d),
       v.n, v.o, v.c, 'ACTIVO'
FROM (VALUES (1, 's3doc1', 'S3 Robótica', 'Robótica educativa', 2),
             (1, 's3doc1', 'S3 Programación', 'Programación', 10),
             (2, 's3doc2', 'S3 Robótica Trujillo', 'Robótica', 10)) v(i, d, n, o, c);

INSERT INTO cursos (club_id, institucion_id, nombre, nivel, modalidad, lugar, fecha_inicio, fecha_fin, cupo_maximo)
SELECT c.id, c.institucion_id, v.n, v.nv, 'PRESENCIAL', v.l, v.fi::date, v.ff::date, v.cupo
FROM (VALUES ('S3 Robótica', 'LEGO básico', 'PRINCIPIANTE', 'Lab 1', '2026-11-01', '2026-12-20', 2),
             ('S3 Robótica', 'Arduino intermedio', 'INTERMEDIO', 'Lab 1', '2026-11-01', '2026-12-20', 2),
             ('S3 Robótica', 'LEGO 2', 'PRINCIPIANTE', 'Lab 1', '2027-01-10', '2027-02-20', 2),
             ('S3 Programación', 'Scratch', 'PRINCIPIANTE', 'Lab 2', '2026-11-01', '2026-12-20', 5)) v(club, n, nv, l, fi, ff, cupo)
JOIN clubes c ON c.nombre = v.club;

INSERT INTO horarios (curso_id, dia_semana, hora_inicio, hora_fin, tipo_sesion)
SELECT cu.id, v.d, v.hi::time, v.hf::time, 'PRESENCIAL'
FROM (VALUES ('S3 Robótica', 'LEGO básico', 1, '14:00', '16:00'),
             ('S3 Robótica', 'Arduino intermedio', 3, '14:00', '16:00'),
             ('S3 Robótica', 'LEGO 2', 1, '14:00', '16:00'),
             ('S3 Programación', 'Scratch', 1, '15:00', '17:00')) v(club, curso, d, hi, hf)
JOIN clubes c ON c.nombre = v.club
JOIN cursos cu ON cu.club_id = c.id AND cu.nombre = v.curso;

INSERT INTO estudiantes (nombres, apellidos, institucion_id, curso) VALUES
    ('Ana', 'Prueba S3', 1, 'EGB_8'),
    ('Beto', 'Prueba S3', 1, 'EGB_9'),
    ('Caro', 'Prueba S3', 1, 'EGB_10'),
    ('Dani', 'Prueba S3', 1, 'EGB_8'),
    ('Eva', 'Prueba S3', 2, 'EGB_8');

INSERT INTO autorizaciones_estudiante (estudiante_id, tipo)
SELECT e.id, t.tipo
FROM estudiantes e CROSS JOIN (VALUES ('PARTICIPACION'), ('USO_IMAGEN')) t(tipo)
WHERE e.apellidos = 'Prueba S3';

UPDATE autorizaciones_estudiante a
SET estado = 'OTORGADA', fecha_registro = current_date, documento_ruta = 'pruebas/s3.pdf',
    documento_hash = repeat('a', 64), documento_tipo = 'application/pdf', documento_tamano = 10,
    documento_subido_en = now()
FROM estudiantes e
WHERE e.id = a.estudiante_id AND e.apellidos = 'Prueba S3' AND e.nombres <> 'Dani' AND a.tipo = 'PARTICIPACION';

SELECT 'estudiante' AS tipo, nombres || ' (' || codigo_interno || ')' AS nombre, id FROM estudiantes WHERE apellidos = 'Prueba S3'
UNION ALL
SELECT 'club', nombre, id FROM clubes WHERE nombre LIKE 'S3 %'
UNION ALL
SELECT 'curso', cu.nombre, cu.id FROM cursos cu JOIN clubes c ON c.id = cu.club_id WHERE c.nombre LIKE 'S3 %'
UNION ALL
SELECT 'horario', cu.nombre || ', día ' || h.dia_semana, h.id
FROM horarios h JOIN cursos cu ON cu.id = h.curso_id JOIN clubes c ON c.id = cu.club_id WHERE c.nombre LIKE 'S3 %'
ORDER BY 1, 3;
