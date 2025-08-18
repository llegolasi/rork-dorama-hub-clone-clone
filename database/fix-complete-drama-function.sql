-- ================================================================
-- CORREÇÃO DA FUNÇÃO complete_drama_with_date_range
-- ================================================================

BEGIN;

-- Remove a função antiga
DROP FUNCTION IF EXISTS public.complete_drama_with_date_range CASCADE;

-- Cria a função corrigida com os novos parâmetros
CREATE OR REPLACE FUNCTION complete_drama_with_date_range(
    p_user_id UUID,
    p_drama_id INTEGER,
    p_total_episodes INTEGER,
    p_start_date DATE,
    p_end_date DATE,
    p_episode_duration_minutes INTEGER DEFAULT 60,
    p_drama_category TEXT DEFAULT NULL,
    p_drama_name TEXT DEFAULT NULL,
    p_poster_path TEXT DEFAULT NULL,
    p_poster_image TEXT DEFAULT NULL,
    p_drama_year INTEGER DEFAULT NULL,
    p_total_runtime_minutes INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_days_interval INTEGER;
    v_episodes_per_day NUMERIC;
    v_episode_counter INTEGER := 1;
    v_current_date DATE;
    v_episodes_today INTEGER;
    v_watch_time TIMESTAMP;
    v_start_time TIMESTAMP;
    v_category TEXT;
    v_drama_info RECORD;
BEGIN
    -- Calcula o intervalo de dias
    v_days_interval := (p_end_date - p_start_date) + 1;
    
    -- Calcula episódios por dia
    v_episodes_per_day := p_total_episodes::NUMERIC / v_days_interval::NUMERIC;
    
    -- Define categoria
    v_category := COALESCE(p_drama_category, get_drama_category(p_drama_id));
    
    -- Busca informações do drama se não foram fornecidas
    IF p_drama_name IS NULL OR p_poster_path IS NULL OR p_drama_year IS NULL THEN
        -- Tenta buscar da tabela dramas se existir
        BEGIN
            SELECT 
                COALESCE(p_drama_name, name) as drama_name,
                COALESCE(p_poster_path, poster_path) as poster_path,
                COALESCE(p_poster_image, poster_path) as poster_image,
                COALESCE(p_drama_year, EXTRACT(YEAR FROM first_air_date::date)::integer) as drama_year,
                COALESCE(p_total_runtime_minutes, number_of_episodes * episode_run_time[1]) as total_runtime
            INTO v_drama_info
            FROM dramas 
            WHERE id = p_drama_id;
        EXCEPTION WHEN OTHERS THEN
            -- Se a tabela dramas não existir ou houver erro, usa valores padrão
            v_drama_info.drama_name := p_drama_name;
            v_drama_info.poster_path := p_poster_path;
            v_drama_info.poster_image := p_poster_image;
            v_drama_info.drama_year := p_drama_year;
            v_drama_info.total_runtime := COALESCE(p_total_runtime_minutes, p_total_episodes * p_episode_duration_minutes);
        END;
    ELSE
        v_drama_info.drama_name := p_drama_name;
        v_drama_info.poster_path := p_poster_path;
        v_drama_info.poster_image := p_poster_image;
        v_drama_info.drama_year := p_drama_year;
        v_drama_info.total_runtime := COALESCE(p_total_runtime_minutes, p_total_episodes * p_episode_duration_minutes);
    END IF;
    
    -- Distribui episódios ao longo do período
    v_current_date := p_start_date;
    
    WHILE v_episode_counter <= p_total_episodes AND v_current_date <= p_end_date LOOP
        -- Calcula quantos episódios assistir hoje
        IF v_days_interval < p_total_episodes THEN
            v_episodes_today := CEIL(v_episodes_per_day);
            -- Adiciona aleatoriedade
            IF RANDOM() > 0.7 THEN
                v_episodes_today := v_episodes_today + 1;
            END IF;
        ELSE
            -- Se temos mais dias que episódios, nem todo dia terá episódio
            v_episodes_today := CASE WHEN RANDOM() > 0.3 THEN 1 ELSE 0 END;
        END IF;
        
        -- Cria episódios para este dia
        FOR i IN 1..v_episodes_today LOOP
            EXIT WHEN v_episode_counter > p_total_episodes;
            
            -- Hora aleatória entre 8h e 24h
            v_watch_time := v_current_date + (INTERVAL '8 hours') + (RANDOM() * INTERVAL '16 hours');
            v_start_time := v_watch_time - INTERVAL '1 hour';
            
            -- Insere no histórico de episódios
            INSERT INTO public.episode_watch_history (
                user_id,
                drama_id,
                episode_number,
                episode_duration_minutes,
                watch_started_at,
                watch_completed_at,
                created_at,
                updated_at
            ) VALUES (
                p_user_id,
                p_drama_id,
                v_episode_counter,
                p_episode_duration_minutes,
                v_start_time,
                v_watch_time,
                NOW(),
                NOW()
            ) ON CONFLICT (user_id, drama_id, episode_number) DO UPDATE SET
                episode_duration_minutes = EXCLUDED.episode_duration_minutes,
                watch_started_at = EXCLUDED.watch_started_at,
                watch_completed_at = EXCLUDED.watch_completed_at,
                updated_at = NOW();
            
            v_episode_counter := v_episode_counter + 1;
        END LOOP;
        
        v_current_date := v_current_date + 1;
    END LOOP;
    
    -- Atualiza a lista de dramas para 'completed'
    UPDATE public.user_drama_lists
    SET
        list_type = 'completed',
        episodes_watched = p_total_episodes,
        current_episode = p_total_episodes,
        total_episodes = p_total_episodes,
        watched_minutes = p_total_episodes * p_episode_duration_minutes,
        total_runtime_minutes = COALESCE(v_drama_info.total_runtime, p_total_episodes * p_episode_duration_minutes),
        episode_runtime_minutes = p_episode_duration_minutes,
        drama_category = v_category,
        drama_name = COALESCE(v_drama_info.drama_name, drama_name),
        poster_path = COALESCE(v_drama_info.poster_path, poster_path),
        poster_image = COALESCE(v_drama_info.poster_image, poster_image),
        drama_year = COALESCE(v_drama_info.drama_year, drama_year),
        updated_at = NOW()
    WHERE user_id = p_user_id AND drama_id = p_drama_id;
    
    -- Se o drama não existe na lista, cria
    IF NOT FOUND THEN
        INSERT INTO public.user_drama_lists (
            user_id,
            drama_id,
            list_type,
            episodes_watched,
            current_episode,
            total_episodes,
            watched_minutes,
            total_runtime_minutes,
            episode_runtime_minutes,
            drama_category,
            drama_name,
            poster_path,
            poster_image,
            drama_year,
            added_at,
            updated_at
        ) VALUES (
            p_user_id,
            p_drama_id,
            'completed',
            p_total_episodes,
            p_total_episodes,
            p_total_episodes,
            p_total_episodes * p_episode_duration_minutes,
            COALESCE(v_drama_info.total_runtime, p_total_episodes * p_episode_duration_minutes),
            p_episode_duration_minutes,
            v_category,
            v_drama_info.drama_name,
            v_drama_info.poster_path,
            v_drama_info.poster_image,
            v_drama_info.drama_year,
            NOW(),
            NOW()
        );
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Mensagem de sucesso
SELECT 'Função complete_drama_with_date_range corrigida com sucesso!' as status;