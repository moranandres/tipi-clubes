INSERT INTO usuarios (username, email, password_hash, nombres, apellidos, rol_id, institucion_id, debe_cambiar_password)
SELECT v.u, v.u || '@tipi.local', (SELECT password_hash FROM usuarios WHERE username = 'admin'), v.n, 'Prueba S6',
       (SELECT id FROM roles WHERE codigo = v.r), v.i, false
FROM (VALUES ('s6resp1', 'Rosa', 'RESP_INSTITUCIONAL', 1),
             ('s6doc1', 'Daniel', 'DOCENTE', 1),
             ('s6doc2', 'Delia', 'DOCENTE', 1),
             ('s6doc3', 'Darío', 'DOCENTE', 2),
             ('s6resp2', 'Ramiro', 'RESP_INSTITUCIONAL', 2),
             ('s6coord', 'Clara', 'COORDINADOR', NULL),
             ('s6cons', 'César', 'CONSULTA', NULL)) v(u, n, r, i);

INSERT INTO docentes (institucion_id, usuario_id, nombres, apellidos)
SELECT u.institucion_id, u.id, u.nombres, u.apellidos
FROM usuarios u
WHERE u.username IN ('s6doc1', 's6doc2', 's6doc3');

INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo)
SELECT '2026-2027', DATE '2026-09-01', DATE '2027-07-31', true
WHERE NOT EXISTS (SELECT 1 FROM periodos_academicos WHERE activo);

INSERT INTO clubes (institucion_id, periodo_id, docente_id, nombre, objetivo, cupo_maximo, estado)
SELECT v.i, (SELECT id FROM periodos_academicos WHERE activo ORDER BY id DESC LIMIT 1),
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.d),
       v.n, v.o, 10, 'ACTIVO'
FROM (VALUES (1, 's6doc1', 'S6 Robótica', 'Robótica competitiva'),
             (1, 's6doc2', 'S6 Programación', 'Programación en Python'),
             (2, 's6doc3', 'S6 Robótica Trujillo', 'Robótica con Arduino')) v(i, d, n, o);

INSERT INTO estudiantes (nombres, apellidos, institucion_id, curso) VALUES
    ('Ana', 'Prueba S6', 1, 'EGB_9'),
    ('Beto', 'Prueba S6', 1, 'EGB_10'),
    ('Caro', 'Prueba S6', 1, 'EGB_8'),
    ('Dani', 'Prueba S6', 1, 'BGU_1'),
    ('Fede', 'Prueba S6', 2, 'EGB_10');

INSERT INTO autorizaciones_estudiante (estudiante_id, tipo)
SELECT e.id, t.tipo
FROM estudiantes e CROSS JOIN (VALUES ('PARTICIPACION'), ('USO_IMAGEN')) t(tipo)
WHERE e.apellidos = 'Prueba S6';

UPDATE autorizaciones_estudiante a
SET estado = 'OTORGADA', fecha_registro = current_date, documento_ruta = 'pruebas/s6.pdf',
    documento_hash = repeat('d', 64), documento_tipo = 'application/pdf', documento_tamano = 10,
    documento_subido_en = now()
FROM estudiantes e
WHERE e.id = a.estudiante_id AND e.apellidos = 'Prueba S6' AND a.tipo = 'PARTICIPACION';

INSERT INTO inscripciones (estudiante_id, club_id, institucion_id, periodo_id)
SELECT e.id, c.id, c.institucion_id, c.periodo_id
FROM estudiantes e
JOIN clubes c ON c.nombre = CASE
        WHEN e.nombres = 'Dani' THEN 'S6 Programación'
        WHEN e.nombres = 'Fede' THEN 'S6 Robótica Trujillo'
        ELSE 'S6 Robótica' END
WHERE e.apellidos = 'Prueba S6';

INSERT INTO cursos (club_id, institucion_id, nombre, nivel, modalidad, lugar, fecha_inicio, fecha_fin,
                    duracion_horas, cupo_maximo)
SELECT c.id, c.institucion_id, v.n, v.nv, 'PRESENCIAL', 'Laboratorio de robótica', p.fecha_inicio,
       least(p.fecha_fin, p.fecha_inicio + 45), 40, 10
FROM (VALUES ('S6 Robótica', 'S6 Robótica básica', 'PRINCIPIANTE'),
             ('S6 Programación', 'S6 Python inicial', 'PRINCIPIANTE'),
             ('S6 Robótica Trujillo', 'S6 Arduino intermedio', 'INTERMEDIO')) v(club, n, nv)
JOIN clubes c ON c.nombre = v.club
JOIN periodos_academicos p ON p.id = c.periodo_id;

INSERT INTO horarios (curso_id, dia_semana, hora_inicio, hora_fin, tipo_sesion)
SELECT cu.id, 2, TIME '14:00', TIME '16:00', 'PRESENCIAL'
FROM cursos cu
WHERE cu.nombre IN ('S6 Robótica básica', 'S6 Python inicial', 'S6 Arduino intermedio');

INSERT INTO inscripciones_curso (estudiante_id, curso_id, club_id)
SELECT i.estudiante_id, cu.id, cu.club_id
FROM inscripciones i
JOIN estudiantes e ON e.id = i.estudiante_id
JOIN cursos cu ON cu.club_id = i.club_id
WHERE e.apellidos = 'Prueba S6'
  AND cu.nombre IN ('S6 Robótica básica', 'S6 Python inicial', 'S6 Arduino intermedio');

UPDATE cursos SET estado = 'EN_CURSO'
WHERE nombre IN ('S6 Robótica básica', 'S6 Python inicial', 'S6 Arduino intermedio');

UPDATE inscripciones_curso ic
SET estado = 'RETIRADA', fecha_fin = current_date
FROM estudiantes e
WHERE e.id = ic.estudiante_id AND e.apellidos = 'Prueba S6' AND e.nombres = 'Caro';

UPDATE cursos SET estado = 'FINALIZADO' WHERE nombre = 'S6 Arduino intermedio';

UPDATE inscripciones_curso ic
SET estado = 'FINALIZADA', fecha_fin = current_date, resultado = 'APROBADO'
FROM cursos cu
WHERE cu.id = ic.curso_id AND cu.nombre = 'S6 Arduino intermedio';

INSERT INTO ediciones_competencia (competencia_id, nombre, anio, fecha_inicio, fecha_fin, sede)
SELECT c.id, v.n, EXTRACT(YEAR FROM v.fi)::smallint, v.fi, v.fi + 2, 'UPS Sede Guayaquil, campus Centenario'
FROM competencias c
CROSS JOIN (VALUES ('Prueba S6 Killtronic pasada', current_date - 10),
                   ('Prueba S6 Killtronic futura', current_date + 30)) v(n, fi)
WHERE c.nombre = 'Killtronic';

INSERT INTO participaciones_competencia (estudiante_id, institucion_id, club_id, inscripcion_id, competencia_id,
                                         edicion_id, categoria_id, equipo_nombre, puesto, reconocimiento,
                                         registrado_por)
SELECT i.estudiante_id, i.institucion_id, i.club_id, i.id, ed.competencia_id, ed.id, cat.id,
       v.equipo, v.puesto, v.reconocimiento, (SELECT id FROM usuarios WHERE username = v.registra)
FROM (VALUES ('Ana', 'Prueba S6 Killtronic pasada', 'Sumo LEGO', 'Los Rayos', 1::smallint, 'Primer lugar', 's6doc1'),
             ('Beto', 'Prueba S6 Killtronic pasada', 'Sumo LEGO', 'Los Rayos', NULL, NULL, 's6doc1'),
             ('Dani', 'Prueba S6 Killtronic futura', 'Laberinto', NULL, NULL, NULL, 's6doc2'),
             ('Fede', 'Prueba S6 Killtronic pasada', 'Seguidor de línea LEGO', NULL, 2::smallint, NULL, 's6doc3'))
     v(nombre, edicion, categoria, equipo, puesto, reconocimiento, registra)
JOIN estudiantes e ON e.nombres = v.nombre AND e.apellidos = 'Prueba S6'
JOIN inscripciones i ON i.estudiante_id = e.id
JOIN ediciones_competencia ed ON ed.nombre = v.edicion
JOIN categorias_competencia cat ON cat.nombre = v.categoria AND cat.competencia_id = ed.competencia_id;

SELECT 'ic_' || lower(e.nombres) AS variable, ic.id::text AS valor,
       e.codigo_interno || ' en ' || cu.nombre || ' (' || ic.estado || coalesce(', ' || ic.resultado, '') || ')' AS detalle
FROM inscripciones_curso ic
JOIN estudiantes e ON e.id = ic.estudiante_id
JOIN cursos cu ON cu.id = ic.curso_id
WHERE e.apellidos = 'Prueba S6'
UNION ALL
SELECT 'p_' || lower(e.nombres), p.id::text,
       e.codigo_interno || ' en ' || ed.nombre || coalesce(', puesto ' || p.puesto, '')
FROM participaciones_competencia p
JOIN estudiantes e ON e.id = p.estudiante_id
JOIN ediciones_competencia ed ON ed.id = p.edicion_id
WHERE e.apellidos = 'Prueba S6'
UNION ALL
SELECT 'curso_rob', cu.id::text, cu.nombre || ' (' || cu.estado || ')'
FROM cursos cu WHERE cu.nombre = 'S6 Robótica básica'
ORDER BY 1;
