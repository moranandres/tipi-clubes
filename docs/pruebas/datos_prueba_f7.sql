INSERT INTO usuarios (username, email, password_hash, nombres, apellidos, rol_id, institucion_id, debe_cambiar_password)
SELECT v.u, v.u || '@tipi.local', (SELECT password_hash FROM usuarios WHERE username = 'admin'), v.n, 'Prueba F7',
       (SELECT id FROM roles WHERE codigo = v.r), v.i, false
FROM (VALUES ('f7resp1', 'Rosa', 'RESP_INSTITUCIONAL', 1),
             ('f7doc1', 'Daniel', 'DOCENTE', 1),
             ('f7doc2', 'Delia', 'DOCENTE', 1),
             ('f7doc3', 'Darío', 'DOCENTE', 2),
             ('f7resp2', 'Ramiro', 'RESP_INSTITUCIONAL', 2),
             ('f7coord', 'Clara', 'COORDINADOR', NULL),
             ('f7consulta', 'César', 'CONSULTA', NULL)) v(u, n, r, i);

INSERT INTO docentes (institucion_id, usuario_id, nombres, apellidos)
SELECT u.institucion_id, u.id, u.nombres, u.apellidos
FROM usuarios u
WHERE u.username IN ('f7doc1', 'f7doc2', 'f7doc3');

INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo)
SELECT '2026-2027', DATE '2026-09-01', DATE '2027-07-31', true
WHERE NOT EXISTS (SELECT 1 FROM periodos_academicos WHERE activo);

INSERT INTO clubes (institucion_id, periodo_id, docente_id, nombre, objetivo, fecha_creacion, dia_semana,
                    hora_inicio, hora_fin, lugar, cupo_maximo, estado)
SELECT v.i, (SELECT id FROM periodos_academicos WHERE activo ORDER BY id DESC LIMIT 1),
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.d),
       v.n, v.o, current_date, v.dia, TIME '14:00', TIME '16:00', v.l, 10, 'ACTIVO'
FROM (VALUES (1, 'f7doc1', 'F7 Robótica', 'Robótica educativa con LEGO para competir en Killtronic', 2, 'Laboratorio de robótica'),
             (1, 'f7doc2', 'F7 Programación', 'Programación en Python y pensamiento computacional', 4, 'Laboratorio de cómputo'),
             (1, 'f7doc1', 'F7 Cierre listo', 'Introducción a Scratch para estudiantes de básica', 1, 'Aula 12'),
             (1, 'f7doc2', 'F7 Cierre bloqueado', 'Electrónica básica con Arduino', 5, 'Taller de electrónica'),
             (2, 'f7doc3', 'F7 Robótica Trujillo', 'Robótica con Arduino', 2, 'Laboratorio')) v(i, d, n, o, dia, l);

INSERT INTO estudiantes (nombres, apellidos, institucion_id, curso) VALUES
    ('Ana', 'Prueba F7', 1, 'EGB_9'),
    ('Beto', 'Prueba F7', 1, 'EGB_10'),
    ('Caro', 'Prueba F7', 1, 'EGB_8'),
    ('Dani', 'Prueba F7', 1, 'BGU_1'),
    ('Eva', 'Prueba F7', 1, 'EGB_9'),
    ('Gabi', 'Prueba F7', 1, 'EGB_10'),
    ('Hugo', 'Prueba F7', 1, 'EGB_8'),
    ('Iris', 'Prueba F7', 1, 'BGU_1'),
    ('Fede', 'Prueba F7', 2, 'EGB_10');

INSERT INTO autorizaciones_estudiante (estudiante_id, tipo)
SELECT e.id, t.tipo
FROM estudiantes e CROSS JOIN (VALUES ('PARTICIPACION'), ('USO_IMAGEN')) t(tipo)
WHERE e.apellidos = 'Prueba F7';

UPDATE autorizaciones_estudiante a
SET estado = 'OTORGADA', fecha_registro = current_date, documento_ruta = 'pruebas/f7.pdf',
    documento_hash = repeat('7', 64), documento_tipo = 'application/pdf', documento_tamano = 10,
    documento_subido_en = now()
FROM estudiantes e
WHERE e.id = a.estudiante_id AND e.apellidos = 'Prueba F7' AND a.tipo = 'PARTICIPACION';

INSERT INTO inscripciones (estudiante_id, club_id, institucion_id, periodo_id, fecha_ingreso)
SELECT e.id, c.id, c.institucion_id, c.periodo_id, current_date - 40
FROM (VALUES ('Ana', 'F7 Robótica'),
             ('Beto', 'F7 Robótica'),
             ('Caro', 'F7 Robótica'),
             ('Ana', 'F7 Programación'),
             ('Dani', 'F7 Programación'),
             ('Eva', 'F7 Cierre listo'),
             ('Gabi', 'F7 Cierre listo'),
             ('Iris', 'F7 Cierre bloqueado'),
             ('Fede', 'F7 Robótica Trujillo')) v(nombre, club)
JOIN estudiantes e ON e.nombres = v.nombre AND e.apellidos = 'Prueba F7'
JOIN clubes c ON c.nombre = v.club;

INSERT INTO cursos (club_id, institucion_id, nombre, nivel, modalidad, lugar, enlace_virtual, fecha_inicio,
                    fecha_fin, duracion_horas, cupo_maximo)
SELECT c.id, c.institucion_id, v.n, v.nv, v.m, c.lugar,
       CASE WHEN v.m = 'HIBRIDO' THEN 'https://aula.tipi.local/f7-python' END,
       p.fecha_inicio, least(p.fecha_fin, p.fecha_inicio + 60), 40, 10
FROM (VALUES ('F7 Robótica', 'F7 LEGO inicial', 'PRINCIPIANTE', 'PRESENCIAL'),
             ('F7 Robótica', 'F7 LEGO intermedio', 'INTERMEDIO', 'PRESENCIAL'),
             ('F7 Programación', 'F7 Python inicial', 'PRINCIPIANTE', 'HIBRIDO'),
             ('F7 Cierre listo', 'F7 Scratch', 'PRINCIPIANTE', 'PRESENCIAL'),
             ('F7 Cierre bloqueado', 'F7 Arduino', 'PRINCIPIANTE', 'PRESENCIAL'),
             ('F7 Robótica Trujillo', 'F7 Arduino Trujillo', 'INTERMEDIO', 'PRESENCIAL')) v(club, n, nv, m)
JOIN clubes c ON c.nombre = v.club
JOIN periodos_academicos p ON p.id = c.periodo_id;

INSERT INTO horarios (curso_id, dia_semana, hora_inicio, hora_fin, tipo_sesion)
SELECT cu.id, v.dia, TIME '14:00', TIME '16:00', v.t
FROM (VALUES ('F7 LEGO inicial', 2, 'PRESENCIAL'),
             ('F7 LEGO intermedio', 3, 'PRESENCIAL'),
             ('F7 Python inicial', 4, 'PRESENCIAL'),
             ('F7 Python inicial', 6, 'VIRTUAL'),
             ('F7 Scratch', 1, 'PRESENCIAL'),
             ('F7 Arduino', 5, 'PRESENCIAL'),
             ('F7 Arduino Trujillo', 2, 'PRESENCIAL')) v(curso, dia, t)
JOIN cursos cu ON cu.nombre = v.curso;

INSERT INTO inscripciones_curso (estudiante_id, curso_id, club_id, fecha_ingreso)
SELECT e.id, cu.id, cu.club_id, current_date - 35
FROM (VALUES ('Ana', 'F7 LEGO inicial'),
             ('Beto', 'F7 LEGO inicial'),
             ('Caro', 'F7 LEGO inicial'),
             ('Ana', 'F7 Python inicial'),
             ('Dani', 'F7 Python inicial'),
             ('Eva', 'F7 Scratch'),
             ('Gabi', 'F7 Scratch'),
             ('Iris', 'F7 Arduino'),
             ('Fede', 'F7 Arduino Trujillo')) v(nombre, curso)
JOIN estudiantes e ON e.nombres = v.nombre AND e.apellidos = 'Prueba F7'
JOIN cursos cu ON cu.nombre = v.curso;

UPDATE cursos SET estado = 'EN_CURSO'
WHERE nombre IN ('F7 LEGO inicial', 'F7 Python inicial', 'F7 Scratch', 'F7 Arduino', 'F7 Arduino Trujillo');

UPDATE inscripciones_curso ic
SET estado = 'RETIRADA', fecha_fin = current_date - 20
FROM estudiantes e, cursos cu
WHERE e.id = ic.estudiante_id AND cu.id = ic.curso_id
  AND e.apellidos = 'Prueba F7' AND e.nombres = 'Caro' AND cu.nombre = 'F7 LEGO inicial';

UPDATE cursos SET estado = 'FINALIZADO' WHERE nombre IN ('F7 LEGO inicial', 'F7 Scratch');

UPDATE inscripciones_curso ic
SET estado = 'FINALIZADA', fecha_fin = current_date - 10,
    resultado = CASE e.nombres WHEN 'Beto' THEN 'NO_APROBADO' ELSE 'APROBADO' END
FROM cursos cu, estudiantes e
WHERE cu.id = ic.curso_id AND e.id = ic.estudiante_id AND ic.estado = 'ACTIVA'
  AND cu.nombre IN ('F7 LEGO inicial', 'F7 Scratch');

INSERT INTO inscripciones_curso (estudiante_id, curso_id, club_id, fecha_ingreso)
SELECT e.id, cu.id, cu.club_id, current_date - 5
FROM estudiantes e
JOIN cursos cu ON cu.nombre = 'F7 LEGO intermedio'
WHERE e.apellidos = 'Prueba F7' AND e.nombres = 'Ana';

INSERT INTO ediciones_competencia (competencia_id, nombre, anio, fecha_inicio, fecha_fin, sede)
SELECT c.id, 'Prueba F7 Killtronic', EXTRACT(YEAR FROM current_date - 12)::smallint, current_date - 12,
       current_date - 10, 'UPS Sede Guayaquil, campus Centenario'
FROM competencias c
WHERE c.nombre = 'Killtronic';

INSERT INTO participaciones_competencia (estudiante_id, institucion_id, club_id, inscripcion_id, competencia_id,
                                         edicion_id, categoria_id, equipo_nombre, puesto, reconocimiento,
                                         registrado_por)
SELECT i.estudiante_id, i.institucion_id, i.club_id, i.id, ed.competencia_id, ed.id, cat.id,
       v.equipo, v.puesto, v.reconocimiento, (SELECT id FROM usuarios WHERE username = v.registra)
FROM (VALUES ('Ana', 'F7 Robótica', 'Sumo LEGO', 'Los Rayos', 1::smallint, 'Primer lugar', 'f7doc1'),
             ('Beto', 'F7 Robótica', 'Sumo LEGO', 'Los Rayos', 1::smallint, 'Primer lugar', 'f7doc1'),
             ('Dani', 'F7 Programación', 'Laberinto', NULL, NULL, NULL, 'f7doc2'),
             ('Fede', 'F7 Robótica Trujillo', 'Seguidor de línea LEGO', NULL, 2::smallint, NULL, 'f7doc3'))
     v(nombre, club, categoria, equipo, puesto, reconocimiento, registra)
JOIN estudiantes e ON e.nombres = v.nombre AND e.apellidos = 'Prueba F7'
JOIN clubes c ON c.nombre = v.club
JOIN inscripciones i ON i.estudiante_id = e.id AND i.club_id = c.id
JOIN ediciones_competencia ed ON ed.nombre = 'Prueba F7 Killtronic'
JOIN categorias_competencia cat ON cat.nombre = v.categoria AND cat.competencia_id = ed.competencia_id;

INSERT INTO solicitudes_inscripcion (estudiante_id, institucion_id, club_id, nivel, motivacion, solicitado_por)
SELECT e.id, e.institucion_id, c.id, 'PRINCIPIANTE', 'Quiere aprender a programar con Scratch',
       (SELECT id FROM usuarios WHERE username = 'f7doc1')
FROM estudiantes e
JOIN clubes c ON c.nombre = 'F7 Cierre listo'
WHERE e.apellidos = 'Prueba F7' AND e.nombres = 'Hugo';

INSERT INTO solicitudes_retiro (inscripcion_id, institucion_id, motivo, solicitado_por)
SELECT i.id, i.institucion_id, 'Cambio de jornada escolar', (SELECT id FROM usuarios WHERE username = 'f7doc1')
FROM inscripciones i
JOIN estudiantes e ON e.id = i.estudiante_id
JOIN clubes c ON c.id = i.club_id
WHERE c.nombre = 'F7 Cierre listo' AND e.apellidos = 'Prueba F7' AND e.nombres = 'Gabi';

SELECT 'estudiante ' || e.nombres AS dato, e.id::text AS id,
       e.codigo_interno || ' · institución ' || e.institucion_id AS detalle
FROM estudiantes e
WHERE e.apellidos = 'Prueba F7'
UNION ALL
SELECT 'club ' || c.nombre, c.id::text, c.estado || ' · institución ' || c.institucion_id
FROM clubes c
WHERE c.nombre LIKE 'F7 %'
ORDER BY 1;
