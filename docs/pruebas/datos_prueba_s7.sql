INSERT INTO usuarios (username, email, password_hash, nombres, apellidos, rol_id, institucion_id, debe_cambiar_password)
SELECT v.u, v.u || '@tipi.local', (SELECT password_hash FROM usuarios WHERE username = 'admin'), v.n, 'Prueba S7',
       (SELECT id FROM roles WHERE codigo = v.r), v.i, false
FROM (VALUES ('s7resp1', 'Raquel', 'RESP_INSTITUCIONAL', 1),
             ('s7doc1', 'Diego', 'DOCENTE', 1),
             ('s7doc2', 'Dora', 'DOCENTE', 1),
             ('s7doc3', 'Dante', 'DOCENTE', 2),
             ('s7resp2', 'Rubén', 'RESP_INSTITUCIONAL', 2),
             ('s7coord', 'Carla', 'COORDINADOR', NULL),
             ('s7cons', 'Cristian', 'CONSULTA', NULL)) v(u, n, r, i);

INSERT INTO docentes (institucion_id, usuario_id, nombres, apellidos)
SELECT u.institucion_id, u.id, u.nombres, u.apellidos
FROM usuarios u
WHERE u.username IN ('s7doc1', 's7doc2', 's7doc3');

INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo)
SELECT '2026-2027', DATE '2026-09-01', DATE '2027-07-31', true
WHERE NOT EXISTS (SELECT 1 FROM periodos_academicos WHERE activo);

INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo)
VALUES ('Prueba S7 2025-2026', DATE '2025-09-01', DATE '2026-07-31', false);

INSERT INTO clubes (institucion_id, periodo_id, docente_id, nombre, objetivo, fecha_creacion, dia_semana,
                    hora_inicio, hora_fin, lugar, cupo_maximo, estado)
SELECT v.i,
       CASE WHEN v.anterior THEN (SELECT id FROM periodos_academicos WHERE nombre = 'Prueba S7 2025-2026')
            ELSE (SELECT id FROM periodos_academicos WHERE activo ORDER BY id DESC LIMIT 1) END,
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.d),
       v.n, v.o, v.f, 3, TIME '14:00', TIME '16:00', v.l, v.cupo, v.e
FROM (VALUES (1, 's7doc1', 'S7 Robótica 2025', 'Robótica educativa del año anterior', DATE '2025-09-01',
              'Laboratorio de robótica', 10, 'ACTIVO', true),
             (1, 's7doc1', 'S7 Robótica', 'Robótica competitiva para Killtronic', current_date,
              'Laboratorio de robótica', 10, 'ACTIVO', false),
             (1, 's7doc2', 'S7 Programación', 'Programación en Python', current_date,
              'Sala de cómputo', 2, 'ACTIVO', false),
             (2, 's7doc3', 'S7 Arduino Trujillo', 'Electrónica con Arduino', current_date,
              'Aula taller', 8, 'PLANIFICADO', false))
     v(i, d, n, o, f, l, cupo, e, anterior);

INSERT INTO estudiantes (nombres, apellidos, institucion_id, curso) VALUES
    ('Lia', 'Prueba S7', 1, 'EGB_10'),
    ('Mateo', 'Prueba S7', 1, 'EGB_9'),
    ('Noa', 'Prueba S7', 1, 'BGU_1'),
    ('Teo', 'Prueba S7', 2, 'EGB_8');

INSERT INTO autorizaciones_estudiante (estudiante_id, tipo)
SELECT e.id, t.tipo
FROM estudiantes e CROSS JOIN (VALUES ('PARTICIPACION'), ('USO_IMAGEN')) t(tipo)
WHERE e.apellidos = 'Prueba S7';

UPDATE autorizaciones_estudiante a
SET estado = 'OTORGADA', fecha_registro = DATE '2025-09-10', documento_ruta = 'pruebas/s7.pdf',
    documento_hash = repeat('e', 64), documento_tipo = 'application/pdf', documento_tamano = 10,
    documento_subido_en = now()
FROM estudiantes e
WHERE e.id = a.estudiante_id AND e.apellidos = 'Prueba S7' AND a.tipo = 'PARTICIPACION';

INSERT INTO inscripciones (estudiante_id, club_id, institucion_id, periodo_id, fecha_ingreso)
SELECT e.id, c.id, c.institucion_id, c.periodo_id, DATE '2025-09-15'
FROM estudiantes e
JOIN clubes c ON c.nombre = 'S7 Robótica 2025'
WHERE e.apellidos = 'Prueba S7' AND e.nombres = 'Lia';

INSERT INTO cursos (club_id, institucion_id, nombre, nivel, modalidad, lugar, fecha_inicio, fecha_fin,
                    duracion_horas, cupo_maximo)
SELECT c.id, c.institucion_id, 'S7 Robótica inicial 2025', 'PRINCIPIANTE', 'PRESENCIAL', 'Laboratorio de robótica',
       DATE '2025-10-01', DATE '2025-12-15', 30, 10
FROM clubes c WHERE c.nombre = 'S7 Robótica 2025';

INSERT INTO horarios (curso_id, dia_semana, hora_inicio, hora_fin, tipo_sesion)
SELECT cu.id, 3, TIME '14:00', TIME '16:00', 'PRESENCIAL'
FROM cursos cu WHERE cu.nombre = 'S7 Robótica inicial 2025';

UPDATE cursos SET estado = 'EN_CURSO' WHERE nombre = 'S7 Robótica inicial 2025';

INSERT INTO inscripciones_curso (estudiante_id, curso_id, club_id, fecha_ingreso)
SELECT i.estudiante_id, cu.id, cu.club_id, DATE '2025-10-01'
FROM inscripciones i
JOIN cursos cu ON cu.club_id = i.club_id AND cu.nombre = 'S7 Robótica inicial 2025';

UPDATE cursos SET estado = 'FINALIZADO' WHERE nombre = 'S7 Robótica inicial 2025';

UPDATE inscripciones_curso ic
SET estado = 'FINALIZADA', fecha_fin = DATE '2025-12-15', resultado = 'APROBADO'
FROM cursos cu
WHERE cu.id = ic.curso_id AND cu.nombre = 'S7 Robótica inicial 2025';

INSERT INTO ediciones_competencia (competencia_id, nombre, anio, fecha_inicio, fecha_fin, sede)
SELECT c.id, 'Prueba S7 Killtronic 2025', 2025, DATE '2025-11-20', DATE '2025-11-22',
       'UPS Sede Guayaquil, campus Centenario'
FROM competencias c WHERE c.nombre = 'Killtronic';

INSERT INTO participaciones_competencia (estudiante_id, institucion_id, club_id, inscripcion_id, competencia_id,
                                         edicion_id, categoria_id, equipo_nombre, puesto, reconocimiento,
                                         registrado_por)
SELECT i.estudiante_id, i.institucion_id, i.club_id, i.id, ed.competencia_id, ed.id, cat.id,
       'Las Chispas', 3, NULL, (SELECT id FROM usuarios WHERE username = 's7doc1')
FROM inscripciones i
JOIN clubes c ON c.id = i.club_id AND c.nombre = 'S7 Robótica 2025'
JOIN ediciones_competencia ed ON ed.nombre = 'Prueba S7 Killtronic 2025'
JOIN categorias_competencia cat ON cat.competencia_id = ed.competencia_id AND cat.nombre = 'Seguidor de línea LEGO';

UPDATE inscripciones i
SET estado = 'TRASLADADA', fecha_retiro = DATE '2026-07-31'
FROM clubes c
WHERE c.id = i.club_id AND c.nombre = 'S7 Robótica 2025';

UPDATE clubes SET estado = 'CERRADO' WHERE nombre = 'S7 Robótica 2025';

INSERT INTO inscripciones (estudiante_id, club_id, institucion_id, periodo_id)
SELECT e.id, c.id, c.institucion_id, c.periodo_id
FROM (VALUES ('Lia', 'S7 Robótica'),
             ('Mateo', 'S7 Robótica'),
             ('Mateo', 'S7 Programación'),
             ('Noa', 'S7 Programación'),
             ('Teo', 'S7 Arduino Trujillo')) v(nombre, club)
JOIN estudiantes e ON e.nombres = v.nombre AND e.apellidos = 'Prueba S7'
JOIN clubes c ON c.nombre = v.club;

INSERT INTO cursos (club_id, institucion_id, nombre, nivel, modalidad, lugar, enlace_virtual, fecha_inicio,
                    fecha_fin, duracion_horas, cupo_maximo)
SELECT c.id, c.institucion_id, v.n, v.nv, v.m, v.l, v.ev, greatest(p.fecha_inicio, current_date - 30),
       least(p.fecha_fin, current_date + 60), 40, v.cupo
FROM (VALUES ('S7 Robótica', 'S7 Robótica avanzada', 'AVANZADO', 'PRESENCIAL', 'Laboratorio de robótica', NULL, 8),
             ('S7 Robótica', 'S7 Robótica en línea', 'INTERMEDIO', 'ONLINE', NULL, 'https://meet.example.org/s7-robotica', 5),
             ('S7 Robótica', 'S7 Drones', 'INTERMEDIO', 'PRESENCIAL', 'Patio central', NULL, 6),
             ('S7 Programación', 'S7 Python básico', 'PRINCIPIANTE', 'HIBRIDO', 'Sala de cómputo', 'https://meet.example.org/s7-python', 2),
             ('S7 Arduino Trujillo', 'S7 Arduino inicial', 'PRINCIPIANTE', 'PRESENCIAL', 'Aula taller', NULL, 8))
     v(club, n, nv, m, l, ev, cupo)
JOIN clubes c ON c.nombre = v.club
JOIN periodos_academicos p ON p.id = c.periodo_id;

INSERT INTO horarios (curso_id, dia_semana, hora_inicio, hora_fin, tipo_sesion)
SELECT cu.id, v.dia, v.hi, v.hf, v.t
FROM (VALUES ('S7 Robótica avanzada', 2, TIME '15:00', TIME '17:00', 'PRESENCIAL'),
             ('S7 Robótica en línea', 4, TIME '15:00', TIME '16:00', 'VIRTUAL'),
             ('S7 Drones', 5, TIME '15:00', TIME '17:00', 'PRESENCIAL'),
             ('S7 Python básico', 1, TIME '14:00', TIME '15:30', 'PRESENCIAL'),
             ('S7 Python básico', 3, TIME '14:00', TIME '15:00', 'VIRTUAL'),
             ('S7 Arduino inicial', 4, TIME '14:00', TIME '16:00', 'PRESENCIAL')) v(curso, dia, hi, hf, t)
JOIN cursos cu ON cu.nombre = v.curso;

UPDATE cursos SET estado = 'EN_CURSO' WHERE nombre = 'S7 Robótica avanzada';
UPDATE cursos SET estado = 'CANCELADO' WHERE nombre = 'S7 Drones';

INSERT INTO inscripciones_curso (estudiante_id, curso_id, club_id)
SELECT i.estudiante_id, cu.id, cu.club_id
FROM inscripciones i
JOIN estudiantes e ON e.id = i.estudiante_id
JOIN cursos cu ON cu.club_id = i.club_id AND cu.nombre = 'S7 Robótica avanzada'
WHERE e.apellidos = 'Prueba S7' AND i.estado = 'ACTIVA';

SELECT 'est_' || lower(e.nombres) AS variable, e.id::text AS valor, e.codigo_interno AS detalle
FROM estudiantes e
WHERE e.apellidos = 'Prueba S7'
UNION ALL
SELECT CASE c.nombre
           WHEN 'S7 Robótica 2025' THEN 'club_2025'
           WHEN 'S7 Robótica' THEN 'club_rob'
           WHEN 'S7 Programación' THEN 'club_prog'
           ELSE 'club_trujillo' END,
       c.id::text, c.nombre || ' (' || c.estado || ')'
FROM clubes c
WHERE c.nombre LIKE 'S7 %'
UNION ALL
SELECT CASE cu.nombre WHEN 'S7 Robótica inicial 2025' THEN 'ic_lia_2025' ELSE 'ic_lia_avanzada' END,
       ic.id::text, cu.nombre || ' (' || ic.estado || coalesce(', ' || ic.resultado, '') || ')'
FROM inscripciones_curso ic
JOIN estudiantes e ON e.id = ic.estudiante_id
JOIN cursos cu ON cu.id = ic.curso_id
WHERE e.apellidos = 'Prueba S7' AND e.nombres = 'Lia'
UNION ALL
SELECT 'p_lia', p.id::text, ed.nombre || ', puesto ' || p.puesto
FROM participaciones_competencia p
JOIN estudiantes e ON e.id = p.estudiante_id
JOIN ediciones_competencia ed ON ed.id = p.edicion_id
WHERE e.apellidos = 'Prueba S7'
UNION ALL
SELECT 'periodo_2025', p.id::text, p.nombre
FROM periodos_academicos p
WHERE p.nombre = 'Prueba S7 2025-2026'
UNION ALL
SELECT 'curso_drones', cu.id::text, cu.nombre || ' (' || cu.estado || ')'
FROM cursos cu
WHERE cu.nombre = 'S7 Drones'
ORDER BY 1;
