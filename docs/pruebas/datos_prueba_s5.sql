INSERT INTO usuarios (username, email, password_hash, nombres, apellidos, rol_id, institucion_id, debe_cambiar_password)
SELECT v.u, v.u || '@tipi.local', (SELECT password_hash FROM usuarios WHERE username = 'admin'), v.n, 'Prueba S5',
       (SELECT id FROM roles WHERE codigo = v.r), v.i, false
FROM (VALUES ('s5resp1', 'Rocío', 'RESP_INSTITUCIONAL', 1),
             ('s5doc1', 'Diego', 'DOCENTE', 1),
             ('s5doc2', 'Dora', 'DOCENTE', 1),
             ('s5doc3', 'Damián', 'DOCENTE', 2),
             ('s5resp2', 'Raúl', 'RESP_INSTITUCIONAL', 2),
             ('s5coord', 'Carla', 'COORDINADOR', NULL),
             ('s5cons', 'Cecilia', 'CONSULTA', NULL)) v(u, n, r, i);

INSERT INTO docentes (institucion_id, usuario_id, nombres, apellidos)
SELECT u.institucion_id, u.id, u.nombres, u.apellidos
FROM usuarios u
WHERE u.username IN ('s5doc1', 's5doc2', 's5doc3');

INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo)
SELECT '2026-2027', DATE '2026-09-01', DATE '2027-07-31', true
WHERE NOT EXISTS (SELECT 1 FROM periodos_academicos WHERE activo);

INSERT INTO clubes (institucion_id, periodo_id, docente_id, nombre, objetivo, cupo_maximo, estado)
SELECT v.i, (SELECT id FROM periodos_academicos WHERE activo ORDER BY id DESC LIMIT 1),
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.d),
       v.n, v.o, v.c, 'ACTIVO'
FROM (VALUES (1, 's5doc1', 'S5 Robótica', 'Robótica competitiva', 6),
             (1, 's5doc2', 'S5 Programación', 'Programación de microcontroladores', 5),
             (2, 's5doc3', 'S5 Robótica Trujillo', 'Robótica educativa', 5)) v(i, d, n, o, c);

INSERT INTO estudiantes (nombres, apellidos, institucion_id, curso) VALUES
    ('Ana', 'Prueba S5', 1, 'EGB_9'),
    ('Beto', 'Prueba S5', 1, 'EGB_10'),
    ('Caro', 'Prueba S5', 1, 'EGB_8'),
    ('Dani', 'Prueba S5', 1, 'BGU_1'),
    ('Eva', 'Prueba S5', 1, 'EGB_9'),
    ('Fede', 'Prueba S5', 2, 'EGB_10');

INSERT INTO autorizaciones_estudiante (estudiante_id, tipo)
SELECT e.id, t.tipo
FROM estudiantes e CROSS JOIN (VALUES ('PARTICIPACION'), ('USO_IMAGEN')) t(tipo)
WHERE e.apellidos = 'Prueba S5';

UPDATE autorizaciones_estudiante a
SET estado = 'OTORGADA', fecha_registro = current_date, documento_ruta = 'pruebas/s5.pdf',
    documento_hash = repeat('c', 64), documento_tipo = 'application/pdf', documento_tamano = 10,
    documento_subido_en = now()
FROM estudiantes e
WHERE e.id = a.estudiante_id AND e.apellidos = 'Prueba S5' AND a.tipo = 'PARTICIPACION';

INSERT INTO inscripciones (estudiante_id, club_id, institucion_id, periodo_id)
SELECT e.id, c.id, c.institucion_id, c.periodo_id
FROM estudiantes e
JOIN clubes c ON c.nombre = CASE
        WHEN e.nombres = 'Dani' THEN 'S5 Programación'
        WHEN e.nombres = 'Fede' THEN 'S5 Robótica Trujillo'
        ELSE 'S5 Robótica' END
WHERE e.apellidos = 'Prueba S5';

UPDATE autorizaciones_estudiante a
SET estado = 'REVOCADA', revocado_en = now(), observacion = 'El representante retiró el permiso'
FROM estudiantes e
WHERE e.id = a.estudiante_id AND e.apellidos = 'Prueba S5' AND e.nombres = 'Caro' AND a.tipo = 'PARTICIPACION';

INSERT INTO solicitudes_retiro (inscripcion_id, institucion_id, motivo, solicitado_por)
SELECT i.id, i.institucion_id, 'Cambio de jornada escolar', (SELECT id FROM usuarios WHERE username = 's5doc1')
FROM inscripciones i JOIN estudiantes e ON e.id = i.estudiante_id
WHERE e.apellidos = 'Prueba S5' AND e.nombres = 'Eva';

UPDATE inscripciones i
SET estado = 'RETIRADA', fecha_retiro = current_date
FROM estudiantes e
WHERE e.id = i.estudiante_id AND e.apellidos = 'Prueba S5' AND e.nombres = 'Eva';

UPDATE solicitudes_retiro r
SET estado = 'APROBADA', resuelto_por = (SELECT id FROM usuarios WHERE username = 's5resp1'),
    fecha_resolucion = now(), fecha_retiro = current_date
FROM inscripciones i JOIN estudiantes e ON e.id = i.estudiante_id
WHERE r.inscripcion_id = i.id AND e.apellidos = 'Prueba S5' AND e.nombres = 'Eva';

SELECT 'insc_' || lower(e.nombres) AS variable, i.id::text AS valor,
       e.codigo_interno || ' en ' || c.nombre || ' (' || i.estado || ')' AS detalle
FROM inscripciones i
JOIN estudiantes e ON e.id = i.estudiante_id
JOIN clubes c ON c.id = i.club_id
WHERE e.apellidos = 'Prueba S5'
UNION ALL
SELECT 'comp', c.id::text, c.nombre FROM competencias c WHERE c.nombre = 'Killtronic'
UNION ALL
SELECT v.variable, c.id::text, c.nivel || ' · ' || c.nombre
FROM categorias_competencia c
JOIN (VALUES ('cat_sumo', 'Sumo LEGO'),
             ('cat_seguidor', 'Seguidor de línea LEGO'),
             ('cat_laberinto', 'Laberinto')) v(variable, nombre) ON v.nombre = c.nombre
ORDER BY 1;
