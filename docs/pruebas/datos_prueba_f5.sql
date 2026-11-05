INSERT INTO usuarios (username, email, password_hash, nombres, apellidos, rol_id, institucion_id, debe_cambiar_password)
SELECT v.u, v.u || '@tipi.local', (SELECT password_hash FROM usuarios WHERE username = 'admin'), v.n, 'Prueba F5',
       (SELECT id FROM roles WHERE codigo = v.r), v.i, false
FROM (VALUES ('f5resp1', 'Regina', 'RESP_INSTITUCIONAL', 1),
             ('f5doc1', 'Daniel', 'DOCENTE', 1),
             ('f5doc2', 'Doris', 'DOCENTE', 1),
             ('f5doc3', 'Dante', 'DOCENTE', 2),
             ('f5resp2', 'Rubén', 'RESP_INSTITUCIONAL', 2),
             ('f5coord', 'Cintia', 'COORDINADOR', NULL),
             ('f5consulta', 'Claudio', 'CONSULTA', NULL)) v(u, n, r, i);

INSERT INTO docentes (institucion_id, usuario_id, nombres, apellidos)
SELECT u.institucion_id, u.id, u.nombres, u.apellidos
FROM usuarios u
WHERE u.username IN ('f5doc1', 'f5doc2', 'f5doc3');

INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo)
SELECT '2026-2027', DATE '2026-09-01', DATE '2027-07-31', true
WHERE NOT EXISTS (SELECT 1 FROM periodos_academicos WHERE activo);

INSERT INTO clubes (institucion_id, periodo_id, docente_id, nombre, objetivo, cupo_maximo, estado)
SELECT v.i, (SELECT id FROM periodos_academicos WHERE activo ORDER BY id DESC LIMIT 1),
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.d),
       v.n, v.o, v.c, 'ACTIVO'
FROM (VALUES (1, 'f5doc1', 'F5 Robótica', 'Robótica competitiva', 6),
             (1, 'f5doc2', 'F5 Programación', 'Programación de microcontroladores', 5),
             (2, 'f5doc3', 'F5 Robótica Trujillo', 'Robótica educativa', 5)) v(i, d, n, o, c);

INSERT INTO estudiantes (nombres, apellidos, institucion_id, curso) VALUES
    ('Alma', 'Prueba F5', 1, 'EGB_9'),
    ('Bruno', 'Prueba F5', 1, 'EGB_10'),
    ('Celia', 'Prueba F5', 1, 'EGB_8'),
    ('Dario', 'Prueba F5', 1, 'BGU_1'),
    ('Elena', 'Prueba F5', 1, 'EGB_9'),
    ('Fabio', 'Prueba F5', 2, 'EGB_10');

INSERT INTO autorizaciones_estudiante (estudiante_id, tipo)
SELECT e.id, t.tipo
FROM estudiantes e CROSS JOIN (VALUES ('PARTICIPACION'), ('USO_IMAGEN')) t(tipo)
WHERE e.apellidos = 'Prueba F5';

UPDATE autorizaciones_estudiante a
SET estado = 'OTORGADA', fecha_registro = current_date, documento_ruta = 'pruebas/f5.pdf',
    documento_hash = repeat('d', 64), documento_tipo = 'application/pdf', documento_tamano = 10,
    documento_subido_en = now()
FROM estudiantes e
WHERE e.id = a.estudiante_id AND e.apellidos = 'Prueba F5' AND a.tipo = 'PARTICIPACION';

INSERT INTO inscripciones (estudiante_id, club_id, institucion_id, periodo_id)
SELECT e.id, c.id, c.institucion_id, c.periodo_id
FROM estudiantes e
JOIN clubes c ON c.nombre = CASE
        WHEN e.nombres = 'Dario' THEN 'F5 Programación'
        WHEN e.nombres = 'Fabio' THEN 'F5 Robótica Trujillo'
        ELSE 'F5 Robótica' END
WHERE e.apellidos = 'Prueba F5';

UPDATE autorizaciones_estudiante a
SET estado = 'REVOCADA', revocado_en = now(), observacion = 'El representante retiró el permiso'
FROM estudiantes e
WHERE e.id = a.estudiante_id AND e.apellidos = 'Prueba F5' AND e.nombres = 'Celia' AND a.tipo = 'PARTICIPACION';

INSERT INTO ediciones_competencia (competencia_id, nombre, anio, fecha_inicio, fecha_fin, sede)
SELECT c.id, 'Killtronic 2026', 2026, DATE '2026-10-16', DATE '2026-10-17', 'UPS Sede Guayaquil'
FROM competencias c
WHERE c.nombre = 'Killtronic'
  AND NOT EXISTS (SELECT 1 FROM ediciones_competencia e WHERE e.competencia_id = c.id AND e.nombre = 'Killtronic 2026');

INSERT INTO participaciones_competencia (estudiante_id, institucion_id, club_id, inscripcion_id, competencia_id,
                                         edicion_id, categoria_id, equipo_nombre, registrado_por)
SELECT i.estudiante_id, i.institucion_id, i.club_id, i.id, ed.competencia_id, ed.id, ca.id, 'Los Truenos',
       (SELECT id FROM usuarios WHERE username = 'f5doc3')
FROM inscripciones i
JOIN estudiantes e ON e.id = i.estudiante_id
JOIN ediciones_competencia ed ON ed.nombre = 'Killtronic 2026'
JOIN categorias_competencia ca ON ca.competencia_id = ed.competencia_id AND ca.nombre = 'Sumo LEGO'
WHERE e.apellidos = 'Prueba F5' AND e.nombres = 'Fabio';

SELECT 'inscripcion' AS tipo, e.nombres || ' (' || e.codigo_interno || ') en ' || c.nombre AS detalle, i.id
FROM inscripciones i
JOIN estudiantes e ON e.id = i.estudiante_id
JOIN clubes c ON c.id = i.club_id
WHERE e.apellidos = 'Prueba F5'
UNION ALL
SELECT 'club', c.nombre, c.id FROM clubes c WHERE c.nombre LIKE 'F5 %'
UNION ALL
SELECT 'edicion', e.nombre, e.id FROM ediciones_competencia e WHERE e.nombre = 'Killtronic 2026'
UNION ALL
SELECT 'participacion', e.nombres || ' en ' || ca.nombre || ' (' || p.equipo_nombre || ')', p.id
FROM participaciones_competencia p
JOIN estudiantes e ON e.id = p.estudiante_id
JOIN categorias_competencia ca ON ca.id = p.categoria_id
WHERE e.apellidos = 'Prueba F5'
ORDER BY 1, 3;
