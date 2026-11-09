INSERT INTO usuarios (username, email, password_hash, nombres, apellidos, rol_id, institucion_id, debe_cambiar_password)
SELECT v.u, v.u || '@tipi.local', (SELECT password_hash FROM usuarios WHERE username = 'admin'), v.n, 'Prueba S13',
       (SELECT id FROM roles WHERE codigo = v.r), v.i, false
FROM (VALUES ('s13resp1', 'Rosa', 'RESP_INSTITUCIONAL', 1),
             ('s13doc1', 'Diego', 'DOCENTE', 1),
             ('s13doc2', 'Dora', 'DOCENTE', 1),
             ('s13resp2', 'Raúl', 'RESP_INSTITUCIONAL', 2),
             ('s13doc3', 'Darío', 'DOCENTE', 2),
             ('s13coord', 'Carmen', 'COORDINADOR', NULL),
             ('s13consulta', 'César', 'CONSULTA', NULL)) v(u, n, r, i);

INSERT INTO docentes (institucion_id, usuario_id, nombres, apellidos)
SELECT u.institucion_id, u.id, u.nombres, u.apellidos
FROM usuarios u
WHERE u.username IN ('s13doc1', 's13doc2', 's13doc3');

INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo)
SELECT '2026-2027', DATE '2026-09-01', DATE '2027-07-31', true
WHERE NOT EXISTS (SELECT 1 FROM periodos_academicos WHERE activo);

INSERT INTO clubes (institucion_id, periodo_id, docente_id, nombre, objetivo, fecha_creacion, dia_semana,
                    hora_inicio, hora_fin, lugar, cupo_maximo, estado)
SELECT v.i,
       (SELECT id FROM periodos_academicos WHERE activo ORDER BY id DESC LIMIT 1),
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.d),
       v.n, v.o, fn_hoy_guayaquil() - 45, 3, TIME '14:00', TIME '16:00', v.l, 20, v.e
FROM (VALUES (1, 's13doc1', 'S13 Robótica', 'Robótica educativa con Arduino', 'Laboratorio de computación', 'ACTIVO'),
             (1, 's13doc1', 'S13 Programación', 'Programación con Scratch', 'Aula 3', 'ACTIVO'),
             (1, 's13doc1', 'S13 Club planificado', 'Club que inicia el próximo mes', 'Aula 5', 'PLANIFICADO'),
             (1, 's13doc2', 'S13 Club suspendido', 'Club suspendido por mantenimiento del aula', 'Aula 7', 'ACTIVO'),
             (2, 's13doc3', 'S13 Robótica Institución 2', 'Robótica con kits LEGO', 'Biblioteca', 'ACTIVO')
     ) v(i, d, n, o, l, e);

INSERT INTO actividades (club_id, institucion_id, responsable_id, fecha, hora_inicio, hora_fin, tema, objetivo,
                         creado_por)
SELECT c.id, c.institucion_id,
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.responsable),
       fn_hoy_guayaquil() + v.dias, TIME '14:00', TIME '16:00', v.tema, v.objetivo,
       (SELECT id FROM usuarios WHERE username = v.responsable)
FROM (VALUES ('S13 Robótica', 's13doc1', -20, 'S13 Motores', 'Controlar motores DC'),
             ('S13 Robótica', 's13doc2', -13, 'S13 Sensores', 'Leer un sensor ultrasónico'),
             ('S13 Robótica', 's13doc1', -10, 'S13 Sesión cancelada', 'Ensamblar el chasis'),
             ('S13 Robótica', 's13doc1', -6, 'S13 Sesión sin registrar', 'Programar el seguidor de línea'),
             ('S13 Robótica', 's13doc1', -1, 'S13 Sesión de ayer', 'Calibrar sensores infrarrojos'),
             ('S13 Robótica', 's13doc1', 2, 'S13 Sesión próxima', 'Probar el robot en pista'),
             ('S13 Robótica', 's13doc1', 10, 'S13 Sesión a reprogramar', 'Preparar la presentación'),
             ('S13 Programación', 's13doc1', -14, 'S13 Bloques y eventos', 'Usar eventos en Scratch'),
             ('S13 Programación', 's13doc1', -7, 'S13 Variables', 'Crear un marcador de puntos'),
             ('S13 Club planificado', 's13doc1', 5, 'S13 Sesión inaugural', 'Presentar el club'),
             ('S13 Club suspendido', 's13doc2', -8, 'S13 Sesión suspendida', 'Revisar los kits'),
             ('S13 Robótica Institución 2', 's13doc3', -9, 'S13 Engranajes LEGO', 'Construir un tren de engranajes'),
             ('S13 Robótica Institución 2', 's13doc3', -5, 'S13 Brazo LEGO', 'Armar un brazo robótico')
     ) v(club, responsable, dias, tema, objetivo)
JOIN clubes c ON c.nombre = v.club;

UPDATE actividades a
SET estado = 'EJECUTADA', resumen_ejecucion = 'Sesión desarrollada según lo planificado',
    ejecutada_por = a.creado_por,
    fecha_registro_ejecucion = ((a.fecha + v.dias_registro) + TIME '18:00') AT TIME ZONE 'America/Guayaquil',
    actualizado_en = now()
FROM (VALUES ('S13 Motores', 0),
             ('S13 Sensores', 6),
             ('S13 Bloques y eventos', 0),
             ('S13 Variables', 1),
             ('S13 Engranajes LEGO', 0)) v(tema, dias_registro)
WHERE a.tema = v.tema;

UPDATE actividades
SET estado = 'CANCELADA', motivo_cancelacion = 'Feriado local', cancelada_por = creado_por,
    fecha_cancelacion = now(), actualizado_en = now()
WHERE tema = 'S13 Sesión cancelada';

DO $$
BEGIN
    PERFORM set_config('tipi.motivo_reprogramacion', 'El laboratorio estará ocupado ese día', true);
    PERFORM set_config('tipi.usuario_id', (SELECT id::text FROM usuarios WHERE username = 's13doc1'), true);
    UPDATE actividades SET fecha = fecha + 1, actualizado_en = now() WHERE tema = 'S13 Sesión próxima';
END $$;

UPDATE clubes SET estado = 'SUSPENDIDO' WHERE nombre = 'S13 Club suspendido';

SELECT v.variable, x.id::text AS valor, x.referencia
FROM (VALUES ('act_motores', 'S13 Motores'), ('act_sensores', 'S13 Sensores'),
             ('act_sin_registrar', 'S13 Sesión sin registrar'), ('act_ayer', 'S13 Sesión de ayer'),
             ('act_proxima', 'S13 Sesión próxima'), ('act_reprogramar', 'S13 Sesión a reprogramar')) v(variable, tema)
JOIN LATERAL (
    SELECT a.id, a.tema || ' (' || a.estado || ', ' || to_char(a.fecha, 'DD/MM') || ')' AS referencia
    FROM actividades a WHERE a.tema = v.tema
) x ON true
UNION ALL
SELECT 'club_rob', c.id::text, c.nombre || ' (' || c.estado || ')'
FROM clubes c WHERE c.nombre = 'S13 Robótica'
UNION ALL
SELECT 'cont_arduino', cc.id::text, cc.nombre || ' (' || cc.tipo || ')'
FROM catalogo_contenidos cc WHERE cc.nombre = 'Arduino IDE'
UNION ALL
SELECT 'periodo', p.id::text, p.nombre || ' (' || to_char(p.fecha_inicio, 'DD/MM/YYYY') || ' a '
       || to_char(p.fecha_fin, 'DD/MM/YYYY') || ')'
FROM periodos_academicos p WHERE p.activo
ORDER BY 1;
