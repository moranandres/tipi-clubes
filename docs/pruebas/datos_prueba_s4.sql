INSERT INTO usuarios (username, email, password_hash, nombres, apellidos, rol_id, institucion_id, debe_cambiar_password)
SELECT v.u, v.u || '@tipi.local', (SELECT password_hash FROM usuarios WHERE username = 'admin'), v.n, 'Prueba S4',
       (SELECT id FROM roles WHERE codigo = v.r), v.i, false
FROM (VALUES ('s4resp1', 'Renata', 'RESP_INSTITUCIONAL', 1),
             ('s4doc1', 'Darío', 'DOCENTE', 1),
             ('s4doc2', 'Delia', 'DOCENTE', 2),
             ('s4resp2', 'Ramiro', 'RESP_INSTITUCIONAL', 2),
             ('s4coord', 'Celia', 'COORDINADOR', NULL)) v(u, n, r, i);

INSERT INTO docentes (institucion_id, usuario_id, nombres, apellidos)
SELECT u.institucion_id, u.id, u.nombres, u.apellidos FROM usuarios u WHERE u.username IN ('s4doc1', 's4doc2');

INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo)
SELECT '2026-2027', DATE '2026-09-01', DATE '2027-07-31', true
WHERE NOT EXISTS (SELECT 1 FROM periodos_academicos WHERE activo);

INSERT INTO clubes (institucion_id, periodo_id, docente_id, nombre, objetivo, cupo_maximo, estado)
SELECT v.i, (SELECT id FROM periodos_academicos WHERE activo ORDER BY id DESC LIMIT 1),
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.d),
       v.n, v.o, v.c, 'ACTIVO'
FROM (VALUES (1, 's4doc1', 'S4 Robótica', 'Robótica educativa', 4),
             (2, 's4doc2', 'S4 Robótica Trujillo', 'Robótica', 5)) v(i, d, n, o, c);

INSERT INTO cursos (club_id, institucion_id, nombre, nivel, modalidad, lugar, fecha_inicio, fecha_fin, cupo_maximo)
SELECT c.id, c.institucion_id, v.n, v.nv, 'PRESENCIAL', 'Lab 4',
       greatest(p.fecha_inicio, current_date), p.fecha_fin, v.cupo
FROM (VALUES ('S4 LEGO', 'PRINCIPIANTE', 1),
             ('S4 Arduino', 'INTERMEDIO', 2)) v(n, nv, cupo)
JOIN clubes c ON c.nombre = 'S4 Robótica'
JOIN periodos_academicos p ON p.id = c.periodo_id;

INSERT INTO estudiantes (nombres, apellidos, institucion_id, curso) VALUES
    ('Fito', 'Prueba S4', 1, 'EGB_8'),
    ('Gaby', 'Prueba S4', 1, 'EGB_9'),
    ('Hugo', 'Prueba S4', 1, 'EGB_10'),
    ('Inés', 'Prueba S4', 1, 'EGB_8'),
    ('Juan', 'Prueba S4', 2, 'EGB_9');

INSERT INTO autorizaciones_estudiante (estudiante_id, tipo)
SELECT e.id, t.tipo
FROM estudiantes e CROSS JOIN (VALUES ('PARTICIPACION'), ('USO_IMAGEN')) t(tipo)
WHERE e.apellidos = 'Prueba S4';

UPDATE autorizaciones_estudiante a
SET estado = 'OTORGADA', fecha_registro = current_date, documento_ruta = 'pruebas/s4.pdf',
    documento_hash = repeat('b', 64), documento_tipo = 'application/pdf', documento_tamano = 10,
    documento_subido_en = now()
FROM estudiantes e
WHERE e.id = a.estudiante_id AND e.apellidos = 'Prueba S4' AND a.tipo = 'PARTICIPACION';

INSERT INTO inscripciones (estudiante_id, club_id, institucion_id, periodo_id)
SELECT e.id, c.id, c.institucion_id, c.periodo_id
FROM estudiantes e
JOIN clubes c ON c.institucion_id = e.institucion_id AND c.nombre IN ('S4 Robótica', 'S4 Robótica Trujillo')
WHERE e.apellidos = 'Prueba S4';

INSERT INTO inscripciones_curso (estudiante_id, curso_id, club_id)
SELECT e.id, cu.id, cu.club_id
FROM estudiantes e
JOIN cursos cu ON cu.nombre IN ('S4 LEGO', 'S4 Arduino')
WHERE e.apellidos = 'Prueba S4' AND e.nombres = 'Fito';

INSERT INTO solicitudes_inscripcion (estudiante_id, institucion_id, club_id, curso_id, nivel, conocimientos,
                                     motivacion, solicitado_por)
SELECT e.id, e.institucion_id, cu.club_id, cu.id, 'INTERMEDIO', 'Bloques, sensores y motores',
       'Quiere aprender a programar placas Arduino', (SELECT id FROM usuarios WHERE username = 's4doc1')
FROM estudiantes e
JOIN cursos cu ON cu.nombre = 'S4 Arduino'
WHERE e.apellidos = 'Prueba S4' AND e.nombres = 'Gaby';

SELECT 'inscripcion' AS tipo, e.nombres || ' (' || e.codigo_interno || ') en ' || c.nombre AS detalle, i.id
FROM inscripciones i
JOIN estudiantes e ON e.id = i.estudiante_id
JOIN clubes c ON c.id = i.club_id
WHERE e.apellidos = 'Prueba S4'
UNION ALL
SELECT 'curso', cu.nombre, cu.id FROM cursos cu WHERE cu.nombre LIKE 'S4 %'
UNION ALL
SELECT 'club', c.nombre, c.id FROM clubes c WHERE c.nombre LIKE 'S4 %'
UNION ALL
SELECT 'solicitud de inscripción', e.nombres || ' a ' || cu.nombre, s.id
FROM solicitudes_inscripcion s
JOIN estudiantes e ON e.id = s.estudiante_id
JOIN cursos cu ON cu.id = s.curso_id
WHERE e.apellidos = 'Prueba S4'
ORDER BY 1, 3;
