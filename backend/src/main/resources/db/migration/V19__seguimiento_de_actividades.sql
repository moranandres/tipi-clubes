CREATE TABLE parametros_seguimiento (
    id                   SMALLINT     NOT NULL DEFAULT 1 PRIMARY KEY,
    dias_gracia_registro SMALLINT     NOT NULL DEFAULT 2,
    umbral_adecuado      NUMERIC(4,1) NOT NULL DEFAULT 80.0,
    umbral_minimo        NUMERIC(4,1) NOT NULL DEFAULT 60.0,
    actualizado_por      BIGINT       REFERENCES usuarios (id),
    actualizado_en       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_parametros_seguimiento_unico CHECK (id = 1),
    CONSTRAINT ck_parametros_seguimiento_gracia CHECK (dias_gracia_registro BETWEEN 0 AND 15),
    CONSTRAINT ck_parametros_seguimiento_umbrales CHECK (
        umbral_minimo > 0 AND umbral_adecuado <= 100 AND umbral_minimo < umbral_adecuado
    )
);

INSERT INTO parametros_seguimiento (id) VALUES (1);

CREATE TRIGGER trg_parametros_seguimiento_sin_borrado
    BEFORE DELETE ON parametros_seguimiento
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_borrado_historial(
        'Los parámetros de seguimiento no se eliminan; actualice sus valores');

CREATE TABLE actividad_reprogramaciones (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actividad_id         BIGINT       NOT NULL REFERENCES actividades (id),
    fecha_anterior       DATE         NOT NULL,
    hora_inicio_anterior TIME         NOT NULL,
    hora_fin_anterior    TIME         NOT NULL,
    fecha_nueva          DATE         NOT NULL,
    hora_inicio_nueva    TIME         NOT NULL,
    hora_fin_nueva       TIME         NOT NULL,
    motivo               VARCHAR(500) NOT NULL,
    registrado_por       BIGINT       NOT NULL REFERENCES usuarios (id),
    fecha_registro       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_reprogramaciones_motivo CHECK (btrim(motivo) <> ''),
    CONSTRAINT ck_reprogramaciones_cambio CHECK (
        (fecha_anterior, hora_inicio_anterior, hora_fin_anterior)
        IS DISTINCT FROM (fecha_nueva, hora_inicio_nueva, hora_fin_nueva)
    )
);

CREATE INDEX ix_reprogramaciones_actividad ON actividad_reprogramaciones (actividad_id, id);
CREATE INDEX ix_reprogramaciones_usuario ON actividad_reprogramaciones (registrado_por);

CREATE FUNCTION fn_registrar_reprogramacion() RETURNS trigger AS $$
DECLARE
    v_motivo TEXT := nullif(btrim(current_setting('tipi.motivo_reprogramacion', true)), '');
    v_usuario TEXT := nullif(btrim(current_setting('tipi.usuario_id', true)), '');
BEGIN
    IF v_motivo IS NULL THEN
        RAISE EXCEPTION 'La actividad «%» pasa del % (% a %) al % (% a %); toda reprogramación necesita un motivo',
            OLD.tema, to_char(OLD.fecha, 'DD/MM/YYYY'), to_char(OLD.hora_inicio, 'HH24:MI'),
            to_char(OLD.hora_fin, 'HH24:MI'), to_char(NEW.fecha, 'DD/MM/YYYY'), to_char(NEW.hora_inicio, 'HH24:MI'),
            to_char(NEW.hora_fin, 'HH24:MI')
            USING ERRCODE = '23TP1';
    END IF;
    IF length(v_motivo) > 500 THEN
        RAISE EXCEPTION 'El motivo de la reprogramación admite como máximo 500 caracteres'
            USING ERRCODE = '23TP1';
    END IF;
    IF v_usuario IS NULL OR v_usuario !~ '^[0-9]+$' THEN
        RAISE EXCEPTION 'La reprogramación de la actividad «%» debe identificar al usuario que la registra', OLD.tema
            USING ERRCODE = '23TP1';
    END IF;

    INSERT INTO actividad_reprogramaciones (actividad_id, fecha_anterior, hora_inicio_anterior, hora_fin_anterior,
                                            fecha_nueva, hora_inicio_nueva, hora_fin_nueva, motivo, registrado_por)
    VALUES (NEW.id, OLD.fecha, OLD.hora_inicio, OLD.hora_fin, NEW.fecha, NEW.hora_inicio, NEW.hora_fin, v_motivo,
            v_usuario::BIGINT);

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actividades_reprogramacion
    AFTER UPDATE OF fecha, hora_inicio, hora_fin ON actividades
    FOR EACH ROW
    WHEN ((OLD.fecha, OLD.hora_inicio, OLD.hora_fin) IS DISTINCT FROM (NEW.fecha, NEW.hora_inicio, NEW.hora_fin))
    EXECUTE FUNCTION fn_registrar_reprogramacion();

CREATE FUNCTION fn_proteger_reprogramacion() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF pg_trigger_depth() < 2 THEN
            RAISE EXCEPTION 'Las reprogramaciones se registran solas al cambiar la fecha o el horario de una actividad planificada; no se insertan a mano'
                USING ERRCODE = '23TP1';
        END IF;
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Las reprogramaciones forman parte del historial de la actividad y no se %',
        CASE TG_OP WHEN 'UPDATE' THEN 'modifican' ELSE 'eliminan' END
        USING ERRCODE = '23TP1';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reprogramaciones_proteger
    BEFORE INSERT OR UPDATE OR DELETE ON actividad_reprogramaciones
    FOR EACH ROW EXECUTE FUNCTION fn_proteger_reprogramacion();

CREATE OR REPLACE FUNCTION fn_validar_borrado_actividad() RETURNS trigger AS $$
BEGIN
    IF OLD.estado <> 'PLANIFICADA' THEN
        RAISE EXCEPTION 'La actividad «%» está % y forma parte del historial del club; no se elimina',
            OLD.tema, CASE OLD.estado WHEN 'EJECUTADA' THEN 'ejecutada' ELSE 'cancelada' END
            USING ERRCODE = '23TP1';
    END IF;
    IF OLD.fecha < fn_hoy_guayaquil() THEN
        RAISE EXCEPTION 'La actividad «%» del % ya pasó y forma parte del seguimiento del club; cancélela con un motivo en lugar de eliminarla',
            OLD.tema, to_char(OLD.fecha, 'DD/MM/YYYY')
            USING ERRCODE = '23TP1';
    END IF;
    IF EXISTS (SELECT 1 FROM actividad_reprogramaciones r WHERE r.actividad_id = OLD.id) THEN
        RAISE EXCEPTION 'La actividad «%» fue reprogramada y su historial forma parte del seguimiento del club; cancélela con un motivo en lugar de eliminarla',
            OLD.tema
            USING ERRCODE = '23TP1';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;
