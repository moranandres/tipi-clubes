SELECT max(a.id) FILTER (WHERE a.tema = 'S13 Sesión de ayer') AS act_ayer,
       max(a.id) FILTER (WHERE a.tema = 'S13 Sesión próxima') AS act_proxima,
       max(a.id) FILTER (WHERE a.tema = 'S13 Motores') AS act_motores,
       max(a.id) FILTER (WHERE a.tema = 'S13 Sesión a reprogramar') AS act_reprogramar
FROM actividades a
WHERE a.tema LIKE 'S13 %' \gset

SELECT id AS usuario_doc1 FROM usuarios WHERE username = 's13doc1' \gset

SELECT max(r.id) AS reprogramacion FROM actividad_reprogramaciones r WHERE r.actividad_id = :act_reprogramar \gset

UPDATE actividades SET fecha = fecha + 1 WHERE id = :act_ayer;

UPDATE actividades SET hora_inicio = TIME '14:30' WHERE id = :act_proxima;

UPDATE actividades
SET estado = 'EJECUTADA', fecha = fecha - 1, resumen_ejecucion = 'Sesión dictada', ejecutada_por = :usuario_doc1,
    fecha_registro_ejecucion = now()
WHERE id = :act_ayer;

SELECT set_config('tipi.motivo_reprogramacion', 'Prueba sin usuario', false);

UPDATE actividades SET fecha = fecha + 1 WHERE id = :act_ayer;

SELECT set_config('tipi.usuario_id', :'usuario_doc1', false),
       set_config('tipi.motivo_reprogramacion', repeat('x', 501), false);

UPDATE actividades SET fecha = fecha + 1 WHERE id = :act_ayer;

SELECT set_config('tipi.motivo_reprogramacion', 'Prueba con motivo y usuario', false);

UPDATE actividades SET fecha = DATE '2030-01-15' WHERE id = :act_ayer;

UPDATE actividades SET fecha = fecha + 1 WHERE id = :act_motores;

INSERT INTO actividad_reprogramaciones (actividad_id, fecha_anterior, hora_inicio_anterior, hora_fin_anterior,
                                        fecha_nueva, hora_inicio_nueva, hora_fin_nueva, motivo, registrado_por)
VALUES (:act_motores, fn_hoy_guayaquil(), TIME '14:00', TIME '16:00', fn_hoy_guayaquil() + 1, TIME '14:00',
        TIME '16:00', 'Reprogramación inventada', :usuario_doc1);

UPDATE actividad_reprogramaciones SET motivo = 'Otro motivo' WHERE id = :reprogramacion;

DELETE FROM actividad_reprogramaciones WHERE id = :reprogramacion;

DELETE FROM actividades WHERE id = :act_ayer;

DELETE FROM actividades WHERE id = :act_reprogramar;

UPDATE parametros_seguimiento SET dias_gracia_registro = 16;

UPDATE parametros_seguimiento SET umbral_minimo = 85.0;

UPDATE parametros_seguimiento SET umbral_adecuado = 120.0;

INSERT INTO parametros_seguimiento (id) VALUES (2);

INSERT INTO parametros_seguimiento (id) VALUES (1);

DELETE FROM parametros_seguimiento;
