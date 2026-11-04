DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM certificados) THEN
        RAISE EXCEPTION 'La tabla certificados tiene filas cargadas a mano antes de V12; elimínelas y vuelva a ejecutar la migración';
    END IF;
END;
$$;

ALTER TABLE certificados
    ADD COLUMN club_id        BIGINT NOT NULL,
    ADD COLUMN archivo_tamano BIGINT NOT NULL,
    ALTER COLUMN archivo_ruta SET NOT NULL,
    ALTER COLUMN archivo_hash SET NOT NULL;

ALTER TABLE certificados
    ADD CONSTRAINT fk_cert_club FOREIGN KEY (club_id, institucion_id)
        REFERENCES clubes (id, institucion_id),
    ADD CONSTRAINT ck_cert_codigo CHECK (
        codigo_verificacion ~ '^TIPI-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$'
    ),
    ADD CONSTRAINT ck_cert_titulo CHECK (btrim(titulo) <> ''),
    ADD CONSTRAINT ck_cert_archivo CHECK (
        btrim(archivo_ruta) <> '' AND archivo_hash ~ '^[0-9a-f]{64}$' AND archivo_tamano > 0
    ),
    ADD CONSTRAINT ck_cert_emitido CHECK (
        estado <> 'EMITIDO' OR (anulado_por IS NULL AND fecha_anulacion IS NULL AND motivo_anulacion IS NULL)
    ),
    ADD CONSTRAINT ck_cert_motivo CHECK (
        motivo_anulacion IS NULL OR char_length(btrim(motivo_anulacion)) >= 10
    );

CREATE UNIQUE INDEX ux_cert_archivo_ruta ON certificados (archivo_ruta);

CREATE FUNCTION fn_verificar_emisor_certificado(p_usuario_id BIGINT, p_institucion_id BIGINT, p_accion TEXT)
    RETURNS VOID AS $$
DECLARE
    v_rol         VARCHAR(30);
    v_institucion BIGINT;
BEGIN
    SELECT r.codigo, u.institucion_id INTO v_rol, v_institucion
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    WHERE u.id = p_usuario_id;
    IF v_rol IS DISTINCT FROM 'ADMIN'
       AND NOT (v_rol = 'RESP_INSTITUCIONAL' AND v_institucion = p_institucion_id) THEN
        RAISE EXCEPTION 'Solo el Administrador o el Responsable institucional de la institución del estudiante pueden % certificados', p_accion
            USING ERRCODE = '23TP1';
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION fn_validar_certificado() RETURNS trigger AS $$
DECLARE
    v_hoy              DATE := (now() AT TIME ZONE 'America/Guayaquil')::date;
    v_estado_curso_ins VARCHAR(15);
    v_resultado        VARCHAR(15);
    v_club             BIGINT;
    v_institucion      BIGINT;
    v_nombre           VARCHAR(150);
    v_inicio_edicion   DATE;
    v_puesto           SMALLINT;
    v_reconocimiento   VARCHAR(100);
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Los certificados forman parte del historial y no se eliminan; anúlelo en su lugar'
            USING ERRCODE = '23TP1';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.estado = 'ANULADO' THEN
            RAISE EXCEPTION 'El certificado % ya está anulado y no se puede modificar', OLD.codigo_verificacion
                USING ERRCODE = '23TP1';
        END IF;
        IF (NEW.codigo_verificacion, NEW.estudiante_id, NEW.institucion_id, NEW.club_id, NEW.tipo,
            NEW.inscripcion_curso_id, NEW.participacion_id, NEW.titulo, NEW.fecha_emision, NEW.emitido_por,
            NEW.archivo_ruta, NEW.archivo_hash, NEW.archivo_tamano, NEW.created_at)
           IS DISTINCT FROM
           (OLD.codigo_verificacion, OLD.estudiante_id, OLD.institucion_id, OLD.club_id, OLD.tipo,
            OLD.inscripcion_curso_id, OLD.participacion_id, OLD.titulo, OLD.fecha_emision, OLD.emitido_por,
            OLD.archivo_ruta, OLD.archivo_hash, OLD.archivo_tamano, OLD.created_at) THEN
            RAISE EXCEPTION 'El contenido de un certificado emitido no se modifica; anúlelo y emita uno nuevo'
                USING ERRCODE = '23TP1';
        END IF;
        IF NEW.estado = 'ANULADO' THEN
            PERFORM fn_verificar_emisor_certificado(NEW.anulado_por, NEW.institucion_id, 'anular');
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.estado <> 'EMITIDO' THEN
        RAISE EXCEPTION 'Todo certificado se registra en estado EMITIDO'
            USING ERRCODE = '23TP1';
    END IF;
    IF NEW.fecha_emision <> v_hoy THEN
        RAISE EXCEPTION 'La fecha de emisión de un certificado debe ser la fecha actual (%)', to_char(v_hoy, 'DD/MM/YYYY')
            USING ERRCODE = '23TP1';
    END IF;

    PERFORM fn_verificar_emisor_certificado(NEW.emitido_por, NEW.institucion_id, 'emitir');

    IF NEW.tipo IN ('PARTICIPACION_CURSO', 'APROBACION_CURSO') THEN
        SELECT ic.estado, ic.resultado, ic.club_id, c.institucion_id, c.nombre
        INTO v_estado_curso_ins, v_resultado, v_club, v_institucion, v_nombre
        FROM inscripciones_curso ic
        JOIN cursos c ON c.id = ic.curso_id
        WHERE ic.id = NEW.inscripcion_curso_id;
        IF (v_club, v_institucion) IS DISTINCT FROM (NEW.club_id, NEW.institucion_id) THEN
            RAISE EXCEPTION 'El club y la institución del certificado deben ser los del curso certificado'
                USING ERRCODE = '23TP1';
        END IF;
        IF v_estado_curso_ins <> 'FINALIZADA' THEN
            RAISE EXCEPTION 'Solo se certifican cursos finalizados; la inscripción del estudiante en el curso «%» está en estado %',
                v_nombre, v_estado_curso_ins
                USING ERRCODE = '23TP1';
        END IF;
        IF NEW.tipo = 'APROBACION_CURSO' AND v_resultado IS DISTINCT FROM 'APROBADO' THEN
            RAISE EXCEPTION 'El certificado de aprobación exige que el estudiante haya aprobado el curso «%»', v_nombre
                USING ERRCODE = '23TP1';
        END IF;
    ELSE
        SELECT p.club_id, p.institucion_id, p.puesto, p.reconocimiento, e.fecha_inicio, e.nombre
        INTO v_club, v_institucion, v_puesto, v_reconocimiento, v_inicio_edicion, v_nombre
        FROM participaciones_competencia p
        JOIN ediciones_competencia e ON e.id = p.edicion_id
        WHERE p.id = NEW.participacion_id;
        IF (v_club, v_institucion) IS DISTINCT FROM (NEW.club_id, NEW.institucion_id) THEN
            RAISE EXCEPTION 'El club y la institución del certificado deben ser los de la participación certificada'
                USING ERRCODE = '23TP1';
        END IF;
        IF v_inicio_edicion IS NULL OR v_inicio_edicion > v_hoy THEN
            RAISE EXCEPTION 'Solo se certifica la participación en una edición que ya empezó; «%» %', v_nombre,
                CASE WHEN v_inicio_edicion IS NULL THEN 'no tiene fecha de inicio registrada'
                     ELSE 'empieza el ' || to_char(v_inicio_edicion, 'DD/MM/YYYY') END
                USING ERRCODE = '23TP1';
        END IF;
        IF NEW.tipo = 'RECONOCIMIENTO_COMPETENCIA' AND v_puesto IS NULL AND v_reconocimiento IS NULL THEN
            RAISE EXCEPTION 'El certificado de reconocimiento exige que la participación tenga un puesto o un reconocimiento registrado'
                USING ERRCODE = '23TP1';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_certificados_validar
    BEFORE INSERT OR UPDATE OR DELETE ON certificados
    FOR EACH ROW EXECUTE FUNCTION fn_validar_certificado();

CREATE FUNCTION fn_proteger_curso_certificado() RETURNS trigger AS $$
BEGIN
    IF NEW.estado IS DISTINCT FROM OLD.estado AND EXISTS (
        SELECT 1 FROM certificados c
        WHERE c.inscripcion_curso_id = OLD.id AND c.estado = 'EMITIDO'
    ) THEN
        RAISE EXCEPTION 'La inscripción en el curso tiene certificados vigentes; anúlelos antes de cambiar su estado'
            USING ERRCODE = '23TP1';
    END IF;
    IF OLD.resultado = 'APROBADO' AND NEW.resultado IS DISTINCT FROM OLD.resultado AND EXISTS (
        SELECT 1 FROM certificados c
        WHERE c.inscripcion_curso_id = OLD.id AND c.tipo = 'APROBACION_CURSO' AND c.estado = 'EMITIDO'
    ) THEN
        RAISE EXCEPTION 'El estudiante tiene un certificado de aprobación vigente de este curso; anúlelo antes de cambiar el resultado'
            USING ERRCODE = '23TP1';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inscripciones_curso_certificados
    BEFORE UPDATE OF estado, resultado ON inscripciones_curso
    FOR EACH ROW EXECUTE FUNCTION fn_proteger_curso_certificado();

CREATE FUNCTION fn_proteger_participacion_certificada() RETURNS trigger AS $$
BEGIN
    IF (NEW.puesto, NEW.reconocimiento) IS DISTINCT FROM (OLD.puesto, OLD.reconocimiento) AND EXISTS (
        SELECT 1 FROM certificados c
        WHERE c.participacion_id = OLD.id AND c.tipo = 'RECONOCIMIENTO_COMPETENCIA' AND c.estado = 'EMITIDO'
    ) THEN
        RAISE EXCEPTION 'La participación tiene un certificado de reconocimiento vigente; anúlelo antes de corregir el puesto o el reconocimiento'
            USING ERRCODE = '23TP1';
    END IF;
    IF NEW.equipo_nombre IS DISTINCT FROM OLD.equipo_nombre AND EXISTS (
        SELECT 1 FROM certificados c
        WHERE c.participacion_id = OLD.id AND c.estado = 'EMITIDO'
    ) THEN
        RAISE EXCEPTION 'La participación tiene certificados vigentes que mencionan su equipo; anúlelos antes de cambiar el nombre del equipo'
            USING ERRCODE = '23TP1';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_participaciones_certificados
    BEFORE UPDATE ON participaciones_competencia
    FOR EACH ROW EXECUTE FUNCTION fn_proteger_participacion_certificada();

CREATE FUNCTION fn_proteger_edicion_certificada() RETURNS trigger AS $$
BEGIN
    IF NEW.fecha_inicio IS DISTINCT FROM OLD.fecha_inicio
       AND (NEW.fecha_inicio IS NULL OR NEW.fecha_inicio > (now() AT TIME ZONE 'America/Guayaquil')::date)
       AND EXISTS (
           SELECT 1 FROM certificados c
           JOIN participaciones_competencia p ON p.id = c.participacion_id
           WHERE p.edicion_id = OLD.id AND c.estado = 'EMITIDO'
       ) THEN
        RAISE EXCEPTION 'La edición «%» tiene certificados vigentes; su fecha de inicio no puede quedar vacía ni en el futuro', OLD.nombre
            USING ERRCODE = '23TP1';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ediciones_certificados
    BEFORE UPDATE OF fecha_inicio ON ediciones_competencia
    FOR EACH ROW EXECUTE FUNCTION fn_proteger_edicion_certificada();

CREATE INDEX ix_cert_institucion ON certificados (institucion_id);
CREATE INDEX ix_cert_club ON certificados (club_id);
CREATE INDEX ix_cert_estado ON certificados (estado);
CREATE INDEX ix_cert_fecha_emision ON certificados (fecha_emision);
CREATE INDEX ix_cert_inscripcion_curso ON certificados (inscripcion_curso_id) WHERE inscripcion_curso_id IS NOT NULL;
CREATE INDEX ix_cert_participacion ON certificados (participacion_id) WHERE participacion_id IS NOT NULL;
