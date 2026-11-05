CREATE FUNCTION fn_impedir_borrado_historial() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION '%', TG_ARGV[0]
        USING ERRCODE = '23TP1';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inscripciones_sin_borrado
    BEFORE DELETE ON inscripciones
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_borrado_historial(
        'Las inscripciones en clubes forman parte del historial del estudiante y no se eliminan; tramite su retiro en su lugar');

CREATE TRIGGER trg_inscripciones_curso_sin_borrado
    BEFORE DELETE ON inscripciones_curso
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_borrado_historial(
        'Las inscripciones en cursos forman parte del historial del estudiante y no se eliminan; registre su retiro o cancele el curso en su lugar');

CREATE TRIGGER trg_solicitudes_inscripcion_sin_borrado
    BEFORE DELETE ON solicitudes_inscripcion
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_borrado_historial(
        'Las solicitudes de inscripción forman parte del historial y no se eliminan; cancélela en su lugar');

CREATE TRIGGER trg_clubes_sin_borrado
    BEFORE DELETE ON clubes
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_borrado_historial(
        'Los clubes forman parte del historial de la institución y no se eliminan; ciérrelo en su lugar');

CREATE FUNCTION fn_validar_borrado_curso() RETURNS trigger AS $$
BEGIN
    IF OLD.estado <> 'PLANIFICADO' THEN
        RAISE EXCEPTION 'El curso «%» está en estado % y forma parte del historial; solo se eliminan cursos planificados, cancélelo en su lugar',
            OLD.nombre, OLD.estado
            USING ERRCODE = '23TP1';
    END IF;
    IF EXISTS (SELECT 1 FROM inscripciones_curso ic WHERE ic.curso_id = OLD.id)
       OR EXISTS (
           SELECT 1 FROM solicitudes_inscripcion s
           WHERE s.curso_id = OLD.id OR s.curso_asignado_id = OLD.id
       ) THEN
        RAISE EXCEPTION 'El curso «%» tiene inscripciones o solicitudes registradas y forma parte del historial; cancélelo en su lugar',
            OLD.nombre
            USING ERRCODE = '23TP1';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cursos_borrado
    BEFORE DELETE ON cursos
    FOR EACH ROW EXECUTE FUNCTION fn_validar_borrado_curso();

CREATE VIEW vw_catalogo_cursos AS
SELECT cu.id,
       cu.club_id,
       cu.institucion_id,
       cu.nombre,
       cu.descripcion,
       cu.nivel,
       cu.modalidad,
       cu.lugar,
       cu.fecha_inicio,
       cu.fecha_fin,
       cu.duracion_horas,
       cu.cupo_maximo,
       cu.estado,
       coalesce(ic.activos, 0) AS inscritos_activos,
       coalesce(ic.finalizados, 0) AS finalizados,
       coalesce(ic.aprobados, 0) AS aprobados,
       CASE WHEN cu.estado IN ('PLANIFICADO', 'EN_CURSO') AND cl.estado IN ('PLANIFICADO', 'ACTIVO')
            THEN greatest(cu.cupo_maximo - coalesce(ic.activos, 0), 0) ELSE 0 END AS cupos_disponibles,
       (cu.estado IN ('PLANIFICADO', 'EN_CURSO') AND cl.estado IN ('PLANIFICADO', 'ACTIVO')) AS admite_inscripciones
FROM cursos cu
JOIN clubes cl ON cl.id = cu.club_id
LEFT JOIN (
    SELECT curso_id,
           count(*) FILTER (WHERE estado = 'ACTIVA') AS activos,
           count(*) FILTER (WHERE estado = 'FINALIZADA') AS finalizados,
           count(*) FILTER (WHERE resultado = 'APROBADO') AS aprobados
    FROM inscripciones_curso
    GROUP BY curso_id
) ic ON ic.curso_id = cu.id;

CREATE VIEW vw_catalogo_clubes AS
SELECT c.id,
       c.institucion_id,
       i.codigo_amie,
       i.nombre AS institucion_nombre,
       i.canton,
       i.estado_adhesion,
       c.periodo_id,
       p.nombre AS periodo_nombre,
       p.activo AS periodo_activo,
       c.docente_id,
       (d.apellidos || ' ' || d.nombres)::varchar(201) AS docente_nombre,
       c.nombre,
       c.objetivo,
       c.fecha_creacion,
       c.dia_semana,
       c.hora_inicio,
       c.hora_fin,
       c.lugar,
       c.cupo_maximo,
       c.estado,
       m.activos AS integrantes_activos,
       CASE WHEN c.estado IN ('PLANIFICADO', 'ACTIVO') THEN greatest(c.cupo_maximo - m.activos, 0) ELSE 0 END
           AS cupos_disponibles,
       m.nuevos AS integrantes_nuevos,
       m.activos - m.nuevos AS integrantes_antiguos,
       m.historicos AS integrantes_historicos,
       m.retirados AS retiros,
       k.abiertos AS cursos_abiertos,
       k.total AS cursos_total,
       r.participaciones,
       r.certificados_vigentes,
       c.estado IN ('PLANIFICADO', 'ACTIVO') AS admite_inscripciones
FROM clubes c
JOIN instituciones i ON i.id = c.institucion_id
JOIN periodos_academicos p ON p.id = c.periodo_id
JOIN docentes d ON d.id = c.docente_id
CROSS JOIN LATERAL (
    SELECT count(*) FILTER (WHERE ins.estado = 'ACTIVA') AS activos,
           count(*) AS historicos,
           count(*) FILTER (WHERE ins.estado = 'RETIRADA') AS retirados,
           count(*) FILTER (WHERE ins.estado = 'ACTIVA' AND NOT EXISTS (
               SELECT 1
               FROM inscripciones previa
               JOIN periodos_academicos pp ON pp.id = previa.periodo_id
               WHERE previa.estudiante_id = ins.estudiante_id
                 AND pp.fecha_inicio < p.fecha_inicio
           )) AS nuevos
    FROM inscripciones ins
    WHERE ins.club_id = c.id
) m
CROSS JOIN LATERAL (
    SELECT count(*) AS total,
           count(*) FILTER (WHERE cu.estado IN ('PLANIFICADO', 'EN_CURSO')) AS abiertos
    FROM cursos cu
    WHERE cu.club_id = c.id
) k
CROSS JOIN LATERAL (
    SELECT (SELECT count(*) FROM participaciones_competencia pc WHERE pc.club_id = c.id) AS participaciones,
           (SELECT count(*) FROM certificados ce WHERE ce.club_id = c.id AND ce.estado = 'EMITIDO') AS certificados_vigentes
) r;

CREATE VIEW vw_catalogo_instituciones AS
SELECT (i.id || '-' || p.id)::varchar(40) AS id,
       i.id AS institucion_id,
       i.codigo_amie,
       i.nombre,
       i.provincia,
       i.canton,
       i.estado_adhesion,
       p.id AS periodo_id,
       p.nombre AS periodo_nombre,
       p.activo AS periodo_activo,
       x.clubes_total,
       x.planificados AS clubes_planificados,
       x.activos AS clubes_activos,
       x.suspendidos AS clubes_suspendidos,
       x.cerrados AS clubes_cerrados,
       x.abiertos AS clubes_abiertos,
       x.cupos_disponibles,
       x.cursos_abiertos,
       e.estudiantes_activos
FROM instituciones i
CROSS JOIN periodos_academicos p
CROSS JOIN LATERAL (
    SELECT count(*) AS clubes_total,
           count(*) FILTER (WHERE v.estado = 'PLANIFICADO') AS planificados,
           count(*) FILTER (WHERE v.estado = 'ACTIVO') AS activos,
           count(*) FILTER (WHERE v.estado = 'SUSPENDIDO') AS suspendidos,
           count(*) FILTER (WHERE v.estado = 'CERRADO') AS cerrados,
           count(*) FILTER (WHERE v.admite_inscripciones) AS abiertos,
           coalesce(sum(v.cupos_disponibles) FILTER (WHERE v.admite_inscripciones), 0)::bigint AS cupos_disponibles,
           coalesce(sum(v.cursos_abiertos) FILTER (WHERE v.admite_inscripciones), 0)::bigint AS cursos_abiertos
    FROM vw_catalogo_clubes v
    WHERE v.institucion_id = i.id
      AND v.periodo_id = p.id
) x
CROSS JOIN LATERAL (
    SELECT count(DISTINCT ins.estudiante_id) AS estudiantes_activos
    FROM inscripciones ins
    WHERE ins.institucion_id = i.id
      AND ins.periodo_id = p.id
      AND ins.estado = 'ACTIVA'
) e;

CREATE VIEW vw_historial_estudiante AS
SELECT ('IC-' || i.id)::varchar(30) AS id,
       i.estudiante_id,
       i.institucion_id,
       i.club_id,
       NULL::bigint AS registrado_por,
       i.fecha_ingreso AS fecha,
       1 AS orden,
       'INGRESO_CLUB'::varchar(30) AS tipo,
       i.id AS referencia_id,
       format('Ingresó al club «%s» en el período %s', c.nombre, p.nombre) AS descripcion
FROM inscripciones i
JOIN clubes c ON c.id = i.club_id
JOIN periodos_academicos p ON p.id = i.periodo_id
UNION ALL
SELECT ('SC-' || i.id)::varchar(30),
       i.estudiante_id,
       i.institucion_id,
       i.club_id,
       NULL::bigint,
       i.fecha_retiro,
       6,
       'SALIDA_CLUB'::varchar(30),
       i.id,
       CASE i.estado
           WHEN 'RETIRADA' THEN format('Se retiró del club «%s»', c.nombre)
           ELSE format('Salió del club «%s» por traslado', c.nombre)
       END
FROM inscripciones i
JOIN clubes c ON c.id = i.club_id
WHERE i.fecha_retiro IS NOT NULL
UNION ALL
SELECT ('ICU-' || ic.id)::varchar(30),
       ic.estudiante_id,
       cu.institucion_id,
       ic.club_id,
       NULL::bigint,
       ic.fecha_ingreso,
       2,
       'INGRESO_CURSO'::varchar(30),
       ic.id,
       format('Se inscribió en el curso «%s», nivel %s', cu.nombre, lower(cu.nivel))
FROM inscripciones_curso ic
JOIN cursos cu ON cu.id = ic.curso_id
UNION ALL
SELECT ('FCU-' || ic.id)::varchar(30),
       ic.estudiante_id,
       cu.institucion_id,
       ic.club_id,
       NULL::bigint,
       ic.fecha_fin,
       3,
       (CASE ic.estado WHEN 'RETIRADA' THEN 'RETIRO_CURSO' ELSE 'FIN_CURSO' END)::varchar(30),
       ic.id,
       CASE
           WHEN ic.estado = 'RETIRADA' THEN format('Se retiró del curso «%s»', cu.nombre)
           WHEN ic.resultado = 'APROBADO' THEN format('Aprobó el curso «%s»', cu.nombre)
           WHEN ic.resultado = 'NO_APROBADO' THEN format('Terminó el curso «%s» sin aprobarlo', cu.nombre)
           ELSE format('Terminó el curso «%s»; el resultado está pendiente', cu.nombre)
       END
FROM inscripciones_curso ic
JOIN cursos cu ON cu.id = ic.curso_id
WHERE ic.fecha_fin IS NOT NULL
UNION ALL
SELECT ('PC-' || pc.id)::varchar(30),
       pc.estudiante_id,
       pc.institucion_id,
       pc.club_id,
       pc.registrado_por,
       coalesce(ed.fecha_inicio, (pc.created_at AT TIME ZONE 'America/Guayaquil')::date),
       4,
       'COMPETENCIA'::varchar(30),
       pc.id,
       CASE
           WHEN ed.fecha_inicio IS NULL OR ed.fecha_inicio > (now() AT TIME ZONE 'America/Guayaquil')::date
               THEN format('Inscripción para competir en «%s» · %s', ed.nombre, cat.nombre)
           ELSE format('Compitió en «%s» · %s', ed.nombre, cat.nombre)
                || coalesce(', puesto ' || pc.puesto, '')
                || coalesce(', reconocimiento «' || pc.reconocimiento || '»', '')
       END
FROM participaciones_competencia pc
JOIN ediciones_competencia ed ON ed.id = pc.edicion_id
JOIN categorias_competencia cat ON cat.id = pc.categoria_id
UNION ALL
SELECT ('CE-' || ce.id)::varchar(30),
       ce.estudiante_id,
       ce.institucion_id,
       ce.club_id,
       NULL::bigint,
       ce.fecha_emision,
       5,
       'CERTIFICADO_EMITIDO'::varchar(30),
       ce.id,
       format('Recibió el certificado %s: %s', ce.codigo_verificacion, ce.titulo)
FROM certificados ce
UNION ALL
SELECT ('CA-' || ce.id)::varchar(30),
       ce.estudiante_id,
       ce.institucion_id,
       ce.club_id,
       NULL::bigint,
       (ce.fecha_anulacion AT TIME ZONE 'America/Guayaquil')::date,
       7,
       'CERTIFICADO_ANULADO'::varchar(30),
       ce.id,
       format('Se anuló el certificado %s', ce.codigo_verificacion)
FROM certificados ce
WHERE ce.estado = 'ANULADO';

CREATE INDEX ix_inscripciones_institucion_periodo ON inscripciones (institucion_id, periodo_id) WHERE estado = 'ACTIVA';
