SELECT max(c.id) FILTER (WHERE c.nombre = 'S12 Robótica') AS club_rob,
       max(c.institucion_id) FILTER (WHERE c.nombre = 'S12 Robótica') AS inst_rob,
       max(c.periodo_id) FILTER (WHERE c.nombre = 'S12 Robótica') AS periodo,
       max(c.id) FILTER (WHERE c.nombre = 'S12 Programación') AS club_prog,
       max(c.id) FILTER (WHERE c.nombre = 'S12 Club a cerrar') AS club_cerrar,
       max(c.id) FILTER (WHERE c.nombre = 'S12 Robótica Institución 2') AS club_otra
FROM clubes c
WHERE c.nombre LIKE 'S12 %' \gset

SELECT max(d.id) FILTER (WHERE u.username = 's12doc1') AS doc1,
       max(d.id) FILTER (WHERE u.username = 's12doc3') AS doc3,
       max(u.id) FILTER (WHERE u.username = 's12doc1') AS usuario_doc1
FROM docentes d
JOIN usuarios u ON u.id = d.usuario_id
WHERE u.username LIKE 's12%' \gset

SELECT max(e.id) FILTER (WHERE e.nombres = 'Ana') AS ana,
       max(e.id) FILTER (WHERE e.nombres = 'Beto') AS beto,
       max(e.id) FILTER (WHERE e.nombres = 'Dani') AS dani,
       max(e.id) FILTER (WHERE e.nombres = 'Eva') AS eva,
       max(e.id) FILTER (WHERE e.nombres = 'Fede') AS fede
FROM estudiantes e
WHERE e.apellidos = 'Prueba S12' \gset

SELECT max(a.id) FILTER (WHERE a.tema = 'S12 Sesión de prototipos') AS act_prototipos,
       max(a.fecha) FILTER (WHERE a.tema = 'S12 Sesión de prototipos') AS fecha_prototipos,
       max(a.id) FILTER (WHERE a.tema = 'S12 Sesión futura') AS act_futura
FROM actividades a
WHERE a.tema LIKE 'S12 %' \gset

SELECT max(ev.id) FILTER (WHERE ev.titulo = 'Video LEGO de la otra institución') AS ev_otra,
       max(ev.id) FILTER (WHERE ev.titulo = 'Enlace retirado') AS ev_retirada
FROM evidencias ev \gset

SELECT max(p.id) FILTER (WHERE p.titulo = 'Robot seguidor de línea') AS proy_robot,
       max(p.id) FILTER (WHERE p.titulo = 'Juego de preguntas en Scratch' AND p.estado = 'EN_DESARROLLO') AS proy_juego
FROM proyectos p
WHERE p.club_id = :club_rob \gset

SELECT max(a.id) FILTER (WHERE a.alcance = 'CLUB' AND a.estado = 'ANULADO') AS av_anulado,
       max(a.id) FILTER (WHERE a.alcance = 'PROYECTO') AS av_proyecto,
       max(a.id) FILTER (WHERE a.alcance = 'ESTUDIANTE' AND a.estudiante_id = :ana AND a.fecha = fn_hoy_guayaquil()) AS av_ana_hoy,
       max(a.id) FILTER (WHERE a.alcance = 'ESTUDIANTE' AND a.estudiante_id = :beto) AS av_beto
FROM avances a
WHERE a.club_id = :club_rob \gset

SELECT id AS comp_pensamiento FROM catalogo_contenidos WHERE nombre = 'Pensamiento computacional' \gset
SELECT id AS cont_arduino FROM catalogo_contenidos WHERE nombre = 'Arduino IDE' \gset

INSERT INTO proyectos (club_id, institucion_id, docente_id, tipo, titulo, objetivo, fecha_inicio, creado_por)
VALUES (:club_prog, :inst_rob, :doc1, 'PROTOTIPO', 'En club planificado', 'Prueba', fn_hoy_guayaquil(), :usuario_doc1);

INSERT INTO proyectos (club_id, institucion_id, docente_id, tipo, titulo, objetivo, fecha_inicio, estado,
                       resultado_final, fecha_finalizacion, finalizado_por, creado_por)
VALUES (:club_rob, :inst_rob, :doc1, 'PROTOTIPO', 'Ya finalizado', 'Prueba', fn_hoy_guayaquil(), 'FINALIZADO',
        'Listo', fn_hoy_guayaquil(), :usuario_doc1, :usuario_doc1);

INSERT INTO proyectos (club_id, institucion_id, docente_id, tipo, titulo, objetivo, fecha_inicio, creado_por)
VALUES (:club_rob, :inst_rob, :doc3, 'PROTOTIPO', 'Tutor de otra institución', 'Prueba', fn_hoy_guayaquil(),
        :usuario_doc1);

INSERT INTO proyectos (club_id, institucion_id, docente_id, tipo, titulo, objetivo, fecha_inicio, creado_por)
VALUES (:club_rob, :inst_rob, :doc1, 'SOFTWARE', '  JUEGO DE PREGUNTAS EN SCRATCH ', 'Prueba', fn_hoy_guayaquil(),
        :usuario_doc1);

INSERT INTO proyectos (club_id, institucion_id, docente_id, tipo, titulo, objetivo, fecha_inicio, creado_por)
VALUES (:club_rob, :inst_rob, :doc1, 'PROTOTIPO', 'Inicio en el futuro', 'Prueba', fn_hoy_guayaquil() + 3,
        :usuario_doc1);

UPDATE proyectos SET titulo = 'Cambio tardío' WHERE id = :proy_robot;

UPDATE proyectos SET club_id = :club_cerrar WHERE id = :proy_juego;

UPDATE proyectos SET estado = 'FINALIZADO', finalizado_por = :usuario_doc1, fecha_finalizacion = fn_hoy_guayaquil()
WHERE id = :proy_juego;

INSERT INTO proyecto_integrantes (proyecto_id, estudiante_id) VALUES (:proy_juego, :eva);

INSERT INTO proyecto_integrantes (proyecto_id, estudiante_id) VALUES (:proy_robot, :dani);

UPDATE proyecto_integrantes SET estudiante_id = :dani WHERE proyecto_id = :proy_juego AND estudiante_id = :beto;

INSERT INTO proyecto_evidencias (proyecto_id, evidencia_id) VALUES (:proy_juego, :ev_otra);

INSERT INTO proyecto_evidencias (proyecto_id, evidencia_id) VALUES (:proy_juego, :ev_retirada);

DELETE FROM proyectos WHERE id = :proy_robot;

UPDATE clubes SET estado = 'CERRADO' WHERE id = :club_otra;

INSERT INTO avances (club_id, institucion_id, alcance, estudiante_id, fecha, resultados, registrado_por)
VALUES (:club_rob, :inst_rob, 'CLUB', :ana, fn_hoy_guayaquil(), 'Prueba', :usuario_doc1);

INSERT INTO avances (club_id, institucion_id, alcance, proyecto_id, fecha, resultados, registrado_por)
VALUES (:club_rob, :inst_rob, 'PROYECTO', :proy_juego, fn_hoy_guayaquil(), 'Sin porcentaje', :usuario_doc1);

INSERT INTO avances (club_id, institucion_id, alcance, estudiante_id, actividad_id, fecha, resultados, registrado_por)
VALUES (:club_rob, :inst_rob, 'ESTUDIANTE', :dani, :act_prototipos, :'fecha_prototipos', 'Antes de su ingreso',
        :usuario_doc1);

INSERT INTO avances (club_id, institucion_id, alcance, estudiante_id, fecha, resultados, registrado_por)
VALUES (:club_rob, :inst_rob, 'ESTUDIANTE', :fede, fn_hoy_guayaquil(), 'Otra institución', :usuario_doc1);

INSERT INTO avances (club_id, institucion_id, alcance, estudiante_id, fecha, resultados, registrado_por)
VALUES (:club_rob, :inst_rob, 'ESTUDIANTE', :ana, fn_hoy_guayaquil(), 'Segundo del día', :usuario_doc1);

INSERT INTO avances (club_id, institucion_id, alcance, actividad_id, fecha, resultados, registrado_por)
VALUES (:club_rob, :inst_rob, 'CLUB', :act_futura, fn_hoy_guayaquil(), 'Sesión planificada', :usuario_doc1);

INSERT INTO avances (club_id, institucion_id, alcance, fecha, resultados, registrado_por)
VALUES (:club_cerrar, :inst_rob, 'CLUB', fn_hoy_guayaquil(), 'Club cerrado', :usuario_doc1);

INSERT INTO avances (club_id, institucion_id, alcance, proyecto_id, fecha, resultados, porcentaje_avance,
                     registrado_por)
VALUES (:club_rob, :inst_rob, 'PROYECTO', :proy_robot, fn_hoy_guayaquil(), 'Proyecto finalizado', 90, :usuario_doc1);

INSERT INTO avances (club_id, institucion_id, alcance, fecha, resultados, registrado_por)
VALUES (:club_rob, :inst_rob, 'CLUB', fn_hoy_guayaquil() + 1, 'Mañana', :usuario_doc1);

UPDATE avances SET resultados = 'Corrección tardía' WHERE id = :av_anulado;

UPDATE avances SET estudiante_id = :beto WHERE id = :av_ana_hoy;

DELETE FROM avances WHERE id = :av_ana_hoy;

INSERT INTO avance_competencias (avance_id, contenido_id, nivel) VALUES (:av_proyecto, :comp_pensamiento, 'LOGRADO');

INSERT INTO avance_competencias (avance_id, contenido_id, nivel) VALUES (:av_beto, :cont_arduino, 'LOGRADO');

INSERT INTO avance_competencias (avance_id, contenido_id, nivel) VALUES (:av_beto, :comp_pensamiento, 'EXCELENTE');

UPDATE avance_competencias SET nivel = 'DESTACADO' WHERE avance_id = :av_ana_hoy;
