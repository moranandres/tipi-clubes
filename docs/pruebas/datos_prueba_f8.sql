INSERT INTO usuarios (username, email, password_hash, nombres, apellidos, rol_id, institucion_id, debe_cambiar_password)
SELECT v.u, v.u || '@tipi.local', (SELECT password_hash FROM usuarios WHERE username = 'admin'), v.n, 'Prueba F8',
       (SELECT id FROM roles WHERE codigo = v.r), v.i, false
FROM (VALUES ('f8resp1', 'Rosa', 'RESP_INSTITUCIONAL', 1),
             ('f8doc1', 'Diego', 'DOCENTE', 1),
             ('f8doc2', 'Delia', 'DOCENTE', 1),
             ('f8resp2', 'Raúl', 'RESP_INSTITUCIONAL', 2),
             ('f8doc3', 'Darío', 'DOCENTE', 2),
             ('f8coord', 'Carmen', 'COORDINADOR', NULL),
             ('f8consulta', 'César', 'CONSULTA', NULL)) v(u, n, r, i);

INSERT INTO docentes (institucion_id, usuario_id, nombres, apellidos)
SELECT u.institucion_id, u.id, u.nombres, u.apellidos
FROM usuarios u
WHERE u.username IN ('f8doc1', 'f8doc2', 'f8doc3');

INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo)
SELECT '2026-2027', DATE '2026-09-01', DATE '2027-07-31', true
WHERE NOT EXISTS (SELECT 1 FROM periodos_academicos WHERE activo);

INSERT INTO clubes (institucion_id, periodo_id, docente_id, nombre, objetivo, fecha_creacion, dia_semana,
                    hora_inicio, hora_fin, lugar, cupo_maximo, estado)
SELECT v.i,
       (SELECT id FROM periodos_academicos WHERE activo ORDER BY id DESC LIMIT 1),
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.d),
       v.n, v.o, fn_hoy_guayaquil() - 45, 3, TIME '14:00', TIME '16:00', v.l, 20, v.e
FROM (VALUES (1, 'f8doc1', 'F8 Robótica', 'Robótica educativa con Arduino', 'Laboratorio de computación', 'ACTIVO'),
             (1, 'f8doc1', 'F8 Club planificado', 'Club que inicia el próximo mes', 'Aula 5', 'PLANIFICADO'),
             (2, 'f8doc3', 'F8 Robótica Institución 2', 'Robótica con kits LEGO', 'Biblioteca', 'ACTIVO')
     ) v(i, d, n, o, l, e);

INSERT INTO estudiantes (nombres, apellidos, institucion_id, curso) VALUES
    ('Ana', 'Prueba F8', 1, 'EGB_8'),
    ('Beto', 'Prueba F8', 1, 'EGB_8'),
    ('Caro', 'Prueba F8', 1, 'EGB_9'),
    ('Dani', 'Prueba F8', 1, 'EGB_9'),
    ('Eva', 'Prueba F8', 1, 'EGB_10'),
    ('Gabi', 'Prueba F8', 1, 'EGB_10'),
    ('Fede', 'Prueba F8', 2, 'EGB_8');

INSERT INTO autorizaciones_estudiante (estudiante_id, tipo)
SELECT e.id, t.tipo
FROM estudiantes e CROSS JOIN (VALUES ('PARTICIPACION'), ('USO_IMAGEN')) t(tipo)
WHERE e.apellidos = 'Prueba F8';

UPDATE autorizaciones_estudiante a
SET estado = 'OTORGADA', fecha_registro = fn_hoy_guayaquil(), documento_ruta = 'pruebas/f8.pdf',
    documento_hash = repeat('a', 64), documento_tipo = 'application/pdf', documento_tamano = 10,
    documento_subido_en = now()
FROM estudiantes e
WHERE e.id = a.estudiante_id AND e.apellidos = 'Prueba F8' AND a.tipo = 'PARTICIPACION';

INSERT INTO inscripciones (estudiante_id, club_id, institucion_id, periodo_id, fecha_ingreso)
SELECT e.id, c.id, c.institucion_id, c.periodo_id, fn_hoy_guayaquil() - v.dias
FROM (VALUES ('Ana', 'F8 Robótica', 30),
             ('Beto', 'F8 Robótica', 30),
             ('Caro', 'F8 Robótica', 30),
             ('Dani', 'F8 Robótica', 30),
             ('Eva', 'F8 Robótica', 5),
             ('Gabi', 'F8 Robótica', 30),
             ('Fede', 'F8 Robótica Institución 2', 30)) v(nombre, club, dias)
JOIN estudiantes e ON e.nombres = v.nombre AND e.apellidos = 'Prueba F8'
JOIN clubes c ON c.nombre = v.club;

INSERT INTO cursos (club_id, institucion_id, nombre, nivel, modalidad, lugar, fecha_inicio, fecha_fin,
                    duracion_horas, cupo_maximo)
SELECT c.id, c.institucion_id, 'F8 Arduino inicial', 'PRINCIPIANTE', 'PRESENCIAL', c.lugar,
       greatest(fn_hoy_guayaquil() - 30, p.fecha_inicio), least(fn_hoy_guayaquil() + 30, p.fecha_fin), 20, 15
FROM clubes c
JOIN periodos_academicos p ON p.id = c.periodo_id
WHERE c.nombre = 'F8 Robótica';

INSERT INTO horarios (curso_id, dia_semana, hora_inicio, hora_fin, tipo_sesion)
SELECT cu.id, 3, TIME '14:00', TIME '16:00', 'PRESENCIAL'
FROM cursos cu WHERE cu.nombre = 'F8 Arduino inicial';

UPDATE cursos SET estado = 'EN_CURSO' WHERE nombre = 'F8 Arduino inicial';

INSERT INTO inscripciones_curso (estudiante_id, curso_id, club_id, fecha_ingreso)
SELECT e.id, cu.id, cu.club_id, fn_hoy_guayaquil() - 20
FROM estudiantes e
JOIN cursos cu ON cu.nombre = 'F8 Arduino inicial'
WHERE e.apellidos = 'Prueba F8' AND e.nombres IN ('Ana', 'Beto', 'Caro');

INSERT INTO actividades (club_id, institucion_id, curso_id, responsable_id, fecha, hora_inicio, hora_fin, tema,
                         objetivo, lugar, creado_por)
SELECT c.id, c.institucion_id,
       CASE WHEN v.con_curso THEN (SELECT id FROM cursos WHERE nombre = 'F8 Arduino inicial') END,
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.responsable),
       fn_hoy_guayaquil() + v.dias, v.inicio, v.fin, v.tema, v.objetivo, c.lugar,
       (SELECT id FROM usuarios WHERE username = v.responsable)
FROM (VALUES ('F8 Robótica', 'f8doc1', -14, false, TIME '14:00', TIME '16:00', 'F8 Presentación del club', 'Presentar el club y sus normas'),
             ('F8 Robótica', 'f8doc1', -7, true, TIME '14:00', TIME '16:00', 'F8 Primer circuito', 'Encender un LED con Arduino'),
             ('F8 Robótica', 'f8doc2', -5, false, TIME '10:00', TIME '11:30', 'F8 Refuerzo con Delia', 'Repasar conexiones en protoboard'),
             ('F8 Robótica', 'f8doc1', -3, false, TIME '14:00', TIME '16:00', 'F8 Sensores', 'Leer un sensor de distancia'),
             ('F8 Robótica', 'f8doc1', -2, false, TIME '14:00', TIME '16:00', 'F8 Sesión sin registro', 'Sesión pasada sin ejecución registrada'),
             ('F8 Robótica', 'f8doc1', 0, false, TIME '07:00', TIME '08:00', 'F8 Sesión de hoy', 'Sesión programada para hoy'),
             ('F8 Robótica', 'f8doc1', 2, false, TIME '14:00', TIME '16:00', 'F8 Servomotores', 'Controlar un servomotor'),
             ('F8 Robótica', 'f8doc1', 7, false, TIME '14:00', TIME '16:00', 'F8 Proyecto final', 'Planificar el proyecto del club'),
             ('F8 Robótica', 'f8doc1', 10, false, TIME '14:00', TIME '16:00', 'F8 Sesión cancelada', 'Será cancelada'),
             ('F8 Robótica Institución 2', 'f8doc3', -2, false, TIME '14:00', TIME '16:00', 'F8 Kits LEGO', 'Armar el primer robot LEGO')
     ) v(club, responsable, dias, con_curso, inicio, fin, tema, objetivo)
JOIN clubes c ON c.nombre = v.club;

INSERT INTO actividad_contenidos (actividad_id, contenido_id)
SELECT a.id, cc.id
FROM actividades a
JOIN catalogo_contenidos cc ON cc.id IN (
    SELECT id FROM catalogo_contenidos WHERE activo ORDER BY tipo, id LIMIT 2
)
WHERE a.tema LIKE 'F8 %';

UPDATE actividades a
SET estado = 'EJECUTADA', resumen_ejecucion = 'Sesión desarrollada según lo planificado',
    ejecutada_por = a.creado_por, fecha_registro_ejecucion = now(), actualizado_en = now()
WHERE a.tema IN ('F8 Presentación del club', 'F8 Primer circuito', 'F8 Refuerzo con Delia', 'F8 Sensores',
                 'F8 Kits LEGO');

UPDATE actividades a
SET estado = 'CANCELADA', motivo_cancelacion = 'Feriado local', cancelada_por = a.creado_por,
    fecha_cancelacion = now(), actualizado_en = now()
WHERE a.tema = 'F8 Sesión cancelada';

DO $$
BEGIN
    PERFORM set_config('tipi.motivo_reprogramacion', 'El laboratorio estará ocupado por la feria de ciencias', true);
    PERFORM set_config('tipi.usuario_id', (SELECT id FROM usuarios WHERE username = 'f8doc1')::text, true);
    UPDATE actividades
    SET fecha = fecha + 2, actualizado_en = now()
    WHERE tema = 'F8 Servomotores';
END;
$$;

INSERT INTO asistencias (actividad_id, club_id, estudiante_id, inscripcion_id, estado, observacion, registrado_por)
SELECT a.id, a.club_id, e.id, i.id, v.estado, v.observacion, a.creado_por
FROM (VALUES ('F8 Presentación del club', 'Ana', 'PRESENTE', NULL),
             ('F8 Presentación del club', 'Beto', 'ATRASADO', NULL),
             ('F8 Presentación del club', 'Caro', 'AUSENTE', NULL),
             ('F8 Presentación del club', 'Dani', 'PRESENTE', NULL),
             ('F8 Presentación del club', 'Gabi', 'JUSTIFICADO', 'Cita médica con certificado'),
             ('F8 Primer circuito', 'Ana', 'PRESENTE', NULL),
             ('F8 Primer circuito', 'Beto', 'PRESENTE', NULL),
             ('F8 Kits LEGO', 'Fede', 'PRESENTE', NULL)) v(tema, nombre, estado, observacion)
JOIN actividades a ON a.tema = v.tema
JOIN estudiantes e ON e.nombres = v.nombre AND e.apellidos = 'Prueba F8'
JOIN inscripciones i ON i.estudiante_id = e.id AND i.club_id = a.club_id;

UPDATE asistencias s
SET estado = 'PRESENTE', corregido_por = (SELECT id FROM usuarios WHERE username = 'f8doc1'),
    fecha_correccion = now(), motivo_correccion = 'Se registró por error como ausente'
FROM actividades a, estudiantes e
WHERE a.id = s.actividad_id AND e.id = s.estudiante_id
  AND a.tema = 'F8 Presentación del club' AND e.nombres = 'Caro' AND e.apellidos = 'Prueba F8';

SELECT a.tema, a.estado, to_char(a.fecha, 'DD/MM/YYYY') AS fecha, c.nombre AS club,
       (SELECT count(*) FROM asistencias s WHERE s.actividad_id = a.id) AS asistencias,
       (SELECT count(*) FROM actividad_reprogramaciones r WHERE r.actividad_id = a.id) AS reprogramaciones
FROM actividades a
JOIN clubes c ON c.id = a.club_id
WHERE a.tema LIKE 'F8 %'
ORDER BY a.fecha, a.hora_inicio;
