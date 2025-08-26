-- ================================================================
-- SISTEMA COMPLETO DE RASTREAMENTO DE EPISÓDIOS E CATEGORIAS
-- ================================================================

BEGIN;

-- PASSO 1: ADICIONAR CAMPO DE CATEGORIA NA TABELA user_drama_lists
-- Adiciona campo para armazenar a categoria do drama (romance, comédia, etc.)
ALTER TABLE public.user_drama_lists 
ADD COLUMN IF NOT EXISTS drama_category TEXT;

-- PASSO 2: CRIAR TABELA DE HISTÓRICO DE EPISÓDIOS ASSISTIDOS
-- Esta tabela vai registrar cada episódio assistido individualmente
CREATE TABLE IF NOT EXISTS public.episode_watch_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    drama_id INTEGER NOT NULL,
    episode_number INTEGER NOT NULL,
    episode_duration_minutes INTEGER DEFAULT 60, -- Duração padrão de 60 minutos
    watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_drama_episode UNIQUE (user_id, drama_id, episode_number),
    CONSTRAINT positive_episode_number CHECK (episode_number > 0),
    CONSTRAINT positive_duration CHECK (episode_duration_minutes > 0)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_episode_watch_history_user_drama 
ON public.episode_watch_history(user_id, drama_id);

CREATE INDEX IF NOT EXISTS idx_episode_watch_history_watched_at 
ON public.episode_watch_history(watched_at);

-- PASSO 3: FUNÇÃO PARA SINCRONIZAR HISTÓRICO COM LISTA DE DRAMAS
-- Esta função atualiza user_drama_lists baseado no histórico de episódios
CREATE OR REPLACE FUNCTION sync_history_to_drama_list()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_drama_id INTEGER;
    v_episodes_watched INTEGER;
    v_total_watch_time INTEGER;
BEGIN
    -- Determina qual registro foi afetado
    IF TG_OP = 'DELETE' THEN
        v_user_id := OLD.user_id;
        v_drama_id := OLD.drama_id;
    ELSE
        v_user_id := NEW.user_id;
        v_drama_id := NEW.drama_id;
    END IF;

    -- Recalcula os totais para este drama específico
    SELECT
        COUNT(*),
        COALESCE(SUM(episode_duration_minutes), 0)
    INTO v_episodes_watched, v_total_watch_time
    FROM public.episode_watch_history
    WHERE user_id = v_user_id AND drama_id = v_drama_id;

    -- Atualiza a tabela de resumo 'user_drama_lists'
    UPDATE public.user_drama_lists
    SET
        episodes_watched = v_episodes_watched,
        current_episode = v_episodes_watched,
        watched_minutes = v_total_watch_time,
        updated_at = NOW()
    WHERE user_id = v_user_id AND drama_id = v_drama_id;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- PASSO 4: FUNÇÃO PARA SINCRONIZAR LISTA COM ESTATÍSTICAS DO USUÁRIO
-- Esta função atualiza user_stats baseado em user_drama_lists
CREATE OR REPLACE FUNCTION sync_list_to_user_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_user_id := OLD.user_id;
    ELSE
        v_user_id := NEW.user_id;
    END IF;

    -- Recalcula as estatísticas TOTAIS do usuário
    INSERT INTO public.user_stats (
        user_id, 
        total_watch_time_minutes, 
        dramas_completed, 
        dramas_watching, 
        dramas_in_watchlist,
        favorite_genres
    )
    SELECT
        v_user_id,
        COALESCE(SUM(watched_minutes), 0),
        COUNT(*) FILTER (WHERE list_type = 'completed'),
        COUNT(*) FILTER (WHERE list_type = 'watching'),
        COUNT(*) FILTER (WHERE list_type = 'watchlist'),
        -- Calcula gêneros favoritos baseado na categoria dos dramas
        COALESCE(
            jsonb_object_agg(
                drama_category, 
                category_count
            ) FILTER (WHERE drama_category IS NOT NULL),
            '{}'::jsonb
        )
    FROM (
        SELECT 
            watched_minutes,
            list_type,
            drama_category,
            COUNT(*) OVER (PARTITION BY drama_category) as category_count
        FROM public.user_drama_lists
        WHERE user_id = v_user_id
    ) subquery
    GROUP BY v_user_id
    ON CONFLICT (user_id) DO UPDATE SET
        total_watch_time_minutes = EXCLUDED.total_watch_time_minutes,
        dramas_completed = EXCLUDED.dramas_completed,
        dramas_watching = EXCLUDED.dramas_watching,
        dramas_in_watchlist = EXCLUDED.dramas_in_watchlist,
        favorite_genres = EXCLUDED.favorite_genres,
        updated_at = NOW();

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- PASSO 5: CRIAR OS TRIGGERS
-- Trigger para sincronizar histórico -> lista
CREATE TRIGGER on_history_change_update_list
    AFTER INSERT OR UPDATE OR DELETE ON public.episode_watch_history
    FOR EACH ROW
    EXECUTE FUNCTION sync_history_to_drama_list();

-- Trigger para sincronizar lista -> estatísticas
CREATE TRIGGER on_list_change_update_stats
    AFTER INSERT OR UPDATE OR DELETE ON public.user_drama_lists
    FOR EACH ROW
    EXECUTE FUNCTION sync_list_to_user_stats();

-- PASSO 6: FUNÇÃO PARA MARCAR EPISÓDIO COMO ASSISTIDO
-- Esta função facilita o registro de episódios assistidos
CREATE OR REPLACE FUNCTION mark_episode_watched(
    p_user_id UUID,
    p_drama_id INTEGER,
    p_episode_number INTEGER,
    p_episode_duration_minutes INTEGER DEFAULT 60,
    p_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.episode_watch_history (
        user_id,
        drama_id,
        episode_number,
        episode_duration_minutes,
        started_at,
        completed_at,
        watched_at
    )
    VALUES (
        p_user_id,
        p_drama_id,
        p_episode_number,
        p_episode_duration_minutes,
        COALESCE(p_started_at, p_completed_at - INTERVAL '1 hour'),
        p_completed_at,
        p_completed_at
    )
    ON CONFLICT (user_id, drama_id, episode_number) 
    DO UPDATE SET
        episode_duration_minutes = EXCLUDED.episode_duration_minutes,
        started_at = EXCLUDED.started_at,
        completed_at = EXCLUDED.completed_at,
        watched_at = EXCLUDED.watched_at,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- PASSO 7: FUNÇÃO PARA COMPLETAR DRAMA COM INTERVALO DE DATAS
-- Esta função distribui episódios ao longo de um período quando o usuário marca como completo
CREATE OR REPLACE FUNCTION complete_drama_with_date_range(
    p_user_id UUID,
    p_drama_id INTEGER,
    p_total_episodes INTEGER,
    p_start_date DATE,
    p_end_date DATE,
    p_episode_duration_minutes INTEGER DEFAULT 60,
    p_drama_category TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_days_interval INTEGER;
    v_episodes_per_day DECIMAL;
    v_current_date DATE;
    v_episode_counter INTEGER := 1;
    v_episodes_today INTEGER;
    v_random_offset INTEGER;
BEGIN
    -- Calcula o intervalo de dias
    v_days_interval := p_end_date - p_start_date + 1;
    
    -- Se o intervalo for menor que o número de episódios, distribui aleatoriamente
    IF v_days_interval < p_total_episodes THEN
        v_episodes_per_day := p_total_episodes::DECIMAL / v_days_interval::DECIMAL;
    ELSE
        v_episodes_per_day := 1;
    END IF;
    
    -- Distribui os episódios ao longo do período
    v_current_date := p_start_date;
    
    WHILE v_episode_counter <= p_total_episodes AND v_current_date <= p_end_date LOOP
        -- Calcula quantos episódios assistir neste dia
        IF v_days_interval < p_total_episodes THEN
            v_episodes_today := CEIL(v_episodes_per_day);
            -- Adiciona um pouco de aleatoriedade
            IF RANDOM() > 0.7 THEN
                v_episodes_today := v_episodes_today + 1;
            END IF;
        ELSE
            -- Se temos mais dias que episódios, nem todo dia terá episódio
            IF RANDOM() > 0.3 THEN
                v_episodes_today := 1;
            ELSE
                v_episodes_today := 0;
            END IF;
        END IF;
        
        -- Registra os episódios para este dia
        FOR i IN 1..v_episodes_today LOOP
            EXIT WHEN v_episode_counter > p_total_episodes;
            
            -- Adiciona um offset aleatório de horas no dia
            v_random_offset := FLOOR(RANDOM() * 16 + 8); -- Entre 8h e 24h
            
            PERFORM mark_episode_watched(
                p_user_id,
                p_drama_id,
                v_episode_counter,
                p_episode_duration_minutes,
                v_current_date + (v_random_offset || ' hours')::INTERVAL - INTERVAL '1 hour',
                v_current_date + (v_random_offset || ' hours')::INTERVAL
            );
            
            v_episode_counter := v_episode_counter + 1;
        END LOOP;
        
        v_current_date := v_current_date + 1;
    END LOOP;
    
    -- Atualiza a categoria do drama se fornecida
    IF p_drama_category IS NOT NULL THEN
        UPDATE public.user_drama_lists
        SET drama_category = p_drama_category
        WHERE user_id = p_user_id AND drama_id = p_drama_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- PASSO 8: FUNÇÃO PARA OBTER ESTATÍSTICAS DETALHADAS
-- Esta função retorna estatísticas completas do usuário
CREATE OR REPLACE FUNCTION get_user_detailed_stats(p_user_id UUID)
RETURNS TABLE (
    total_watch_time_minutes INTEGER,
    dramas_completed INTEGER,
    dramas_watching INTEGER,
    dramas_in_watchlist INTEGER,
    favorite_genres JSONB,
    weekly_watch_time JSONB,
    monthly_watch_time JSONB,
    yearly_watch_time JSONB,
    average_episodes_per_day DECIMAL,
    most_active_hour INTEGER,
    completion_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH user_stats_base AS (
        SELECT 
            us.total_watch_time_minutes,
            us.dramas_completed,
            us.dramas_watching,
            us.dramas_in_watchlist,
            us.favorite_genres
        FROM public.user_stats us
        WHERE us.user_id = p_user_id
    ),
    time_stats AS (
        SELECT
            -- Estatísticas semanais (últimas 4 semanas)
            jsonb_object_agg(
                'week_' || EXTRACT(week FROM watched_at)::TEXT,
                weekly_minutes
            ) FILTER (WHERE watched_at >= NOW() - INTERVAL '4 weeks') as weekly_watch_time,
            
            -- Estatísticas mensais (últimos 12 meses)
            jsonb_object_agg(
                TO_CHAR(watched_at, 'YYYY-MM'),
                monthly_minutes
            ) FILTER (WHERE watched_at >= NOW() - INTERVAL '12 months') as monthly_watch_time,
            
            -- Estatísticas anuais
            jsonb_object_agg(
                EXTRACT(year FROM watched_at)::TEXT,
                yearly_minutes
            ) as yearly_watch_time,
            
            -- Média de episódios por dia
            COUNT(*)::DECIMAL / GREATEST(EXTRACT(days FROM (MAX(watched_at) - MIN(watched_at))), 1) as avg_episodes_per_day,
            
            -- Hora mais ativa
            MODE() WITHIN GROUP (ORDER BY EXTRACT(hour FROM watched_at)) as most_active_hour
        FROM (
            SELECT 
                watched_at,
                SUM(episode_duration_minutes) OVER (
                    PARTITION BY DATE_TRUNC('week', watched_at)
                ) as weekly_minutes,
                SUM(episode_duration_minutes) OVER (
                    PARTITION BY DATE_TRUNC('month', watched_at)
                ) as monthly_minutes,
                SUM(episode_duration_minutes) OVER (
                    PARTITION BY DATE_TRUNC('year', watched_at)
                ) as yearly_minutes
            FROM public.episode_watch_history
            WHERE user_id = p_user_id
        ) time_data
    ),
    completion_stats AS (
        SELECT
            CASE 
                WHEN (dramas_completed + dramas_watching + dramas_in_watchlist) > 0 
                THEN dramas_completed::DECIMAL / (dramas_completed + dramas_watching + dramas_in_watchlist) * 100
                ELSE 0
            END as completion_rate
        FROM user_stats_base
    )
    SELECT 
        ubs.total_watch_time_minutes,
        ubs.dramas_completed,
        ubs.dramas_watching,
        ubs.dramas_in_watchlist,
        ubs.favorite_genres,
        COALESCE(ts.weekly_watch_time, '{}'::jsonb),
        COALESCE(ts.monthly_watch_time, '{}'::jsonb),
        COALESCE(ts.yearly_watch_time, '{}'::jsonb),
        COALESCE(ts.avg_episodes_per_day, 0),
        COALESCE(ts.most_active_hour::INTEGER, 20),
        cs.completion_rate
    FROM user_stats_base ubs
    CROSS JOIN time_stats ts
    CROSS JOIN completion_stats cs;
END;
$$ LANGUAGE plpgsql;

-- PASSO 9: MIGRAR DADOS EXISTENTES (se houver)
-- Cria registros no histórico baseado nos dados atuais de user_drama_lists
DO $$
DECLARE
    drama_record RECORD;
    episode_num INTEGER;
BEGIN
    -- Para cada drama que já tem episódios assistidos
    FOR drama_record IN 
        SELECT user_id, drama_id, episodes_watched, 
               COALESCE(watched_minutes / NULLIF(episodes_watched, 0), 60) as avg_duration
        FROM public.user_drama_lists 
        WHERE episodes_watched > 0
    LOOP
        -- Cria registros de histórico para cada episódio
        FOR episode_num IN 1..drama_record.episodes_watched LOOP
            INSERT INTO public.episode_watch_history (
                user_id,
                drama_id,
                episode_number,
                episode_duration_minutes,
                watched_at,
                started_at,
                completed_at
            )
            VALUES (
                drama_record.user_id,
                drama_record.drama_id,
                episode_num,
                drama_record.avg_duration,
                NOW() - (drama_record.episodes_watched - episode_num) * INTERVAL '1 day',
                NOW() - (drama_record.episodes_watched - episode_num) * INTERVAL '1 day' - INTERVAL '1 hour',
                NOW() - (drama_record.episodes_watched - episode_num) * INTERVAL '1 day'
            )
            ON CONFLICT (user_id, drama_id, episode_number) DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$;

COMMIT;

-- Mensagem de sucesso
SELECT 'Sistema completo de rastreamento de episódios e categorias implementado com sucesso!' as status;