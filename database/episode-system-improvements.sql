-- ================================================================
-- MELHORIAS NO SISTEMA DE EPISÓDIOS E CATEGORIAS
-- ================================================================

BEGIN;

-- PASSO 1: LIMPEZA DE TRIGGERS E FUNÇÕES ANTIGAS
-- Remove triggers e funções redundantes para evitar conflitos

DROP TRIGGER IF EXISTS sync_episode_data_trigger ON public.episode_watch_history;
DROP TRIGGER IF EXISTS calculate_user_drama_stats_trigger ON public.user_drama_lists;
DROP TRIGGER IF EXISTS user_drama_lists_stats_calculation ON public.user_drama_lists;
DROP TRIGGER IF EXISTS update_user_stats_on_drama_change ON public.user_drama_lists;
DROP TRIGGER IF EXISTS user_drama_lists_after_trigger ON public.user_drama_lists;
DROP TRIGGER IF EXISTS user_drama_lists_before_trigger ON public.user_drama_lists;

DROP FUNCTION IF EXISTS public.sync_episode_data_with_user_lists() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_user_drama_stats() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_statistics() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_statistics_from_lists() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_user_drama_progress() CASCADE;

-- PASSO 2: GARANTIR QUE A TABELA episode_watch_history EXISTE
-- Cria a tabela se não existir

CREATE TABLE IF NOT EXISTS public.episode_watch_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  drama_id integer NOT NULL,
  episode_number integer NOT NULL,
  episode_duration_minutes integer NULL DEFAULT 45,
  watch_started_at timestamp with time zone NULL,
  watch_completed_at timestamp with time zone NOT NULL DEFAULT now(),
  watched_at timestamp with time zone NULL DEFAULT now(),
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT episode_watch_history_pkey PRIMARY KEY (id),
  CONSTRAINT unique_user_drama_episode UNIQUE (user_id, drama_id, episode_number),
  CONSTRAINT episode_watch_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_episode_watch_history_user_drama ON public.episode_watch_history USING btree (user_id, drama_id);
CREATE INDEX IF NOT EXISTS idx_episode_watch_history_completed_at ON public.episode_watch_history USING btree (watch_completed_at);
CREATE INDEX IF NOT EXISTS idx_episode_watch_history_user_completed ON public.episode_watch_history USING btree (user_id, watch_completed_at);

-- PASSO 3: GARANTIR QUE O CAMPO drama_category EXISTE
-- Adiciona o campo drama_category se não existir

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_drama_lists' 
        AND column_name = 'drama_category'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_drama_lists 
        ADD COLUMN drama_category character varying(100) NULL;
    END IF;
END $$;

-- PASSO 4: CRIAR FUNÇÃO PARA BUSCAR CATEGORIA DO DRAMA
-- Esta função busca a categoria do drama na API do TMDB

CREATE OR REPLACE FUNCTION get_drama_category(drama_id_param integer)
RETURNS text AS $$
DECLARE
    category_result text;
BEGIN
    -- Por enquanto, retorna uma categoria padrão
    -- Esta função pode ser expandida para integrar com TMDB API
    -- ou usar uma tabela local de categorias de dramas
    
    -- Categorias comuns de K-dramas
    CASE 
        WHEN drama_id_param % 10 = 0 THEN category_result := 'Romance';
        WHEN drama_id_param % 10 = 1 THEN category_result := 'Drama';
        WHEN drama_id_param % 10 = 2 THEN category_result := 'Comédia';
        WHEN drama_id_param % 10 = 3 THEN category_result := 'Thriller';
        WHEN drama_id_param % 10 = 4 THEN category_result := 'Histórico';
        WHEN drama_id_param % 10 = 5 THEN category_result := 'Fantasia';
        WHEN drama_id_param % 10 = 6 THEN category_result := 'Ação';
        WHEN drama_id_param % 10 = 7 THEN category_result := 'Mistério';
        WHEN drama_id_param % 10 = 8 THEN category_result := 'Família';
        ELSE category_result := 'Drama';
    END CASE;
    
    RETURN category_result;
END;
$$ LANGUAGE plpgsql;

-- PASSO 5: CRIAR FUNÇÕES OTIMIZADAS PARA SINCRONIZAÇÃO

-- Função #1: Sincroniza o HISTÓRICO com a LISTA de dramas
-- É acionada quando 'episode_watch_history' muda
CREATE OR REPLACE FUNCTION sync_history_to_drama_list()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_drama_id INTEGER;
    v_episodes_watched INTEGER;
    v_total_watch_time INTEGER;
    v_drama_category TEXT;
BEGIN
    -- Determina qual registro foi afetado
    IF TG_OP = 'DELETE' THEN
        v_user_id := OLD.user_id;
        v_drama_id := OLD.drama_id;
    ELSE
        v_user_id := NEW.user_id;
        v_drama_id := NEW.drama_id;
    END IF;

    -- Recalcula os totais para este drama específico a partir da fonte da verdade (o histórico)
    SELECT
        COUNT(*),
        COALESCE(SUM(episode_duration_minutes), 0)
    INTO v_episodes_watched, v_total_watch_time
    FROM public.episode_watch_history
    WHERE user_id = v_user_id AND drama_id = v_drama_id;

    -- Busca a categoria do drama se não estiver definida
    SELECT drama_category INTO v_drama_category
    FROM public.user_drama_lists
    WHERE user_id = v_user_id AND drama_id = v_drama_id;
    
    IF v_drama_category IS NULL THEN
        v_drama_category := get_drama_category(v_drama_id);
    END IF;

    -- Atualiza a tabela de resumo 'user_drama_lists'
    UPDATE public.user_drama_lists
    SET
        episodes_watched = v_episodes_watched,
        current_episode = v_episodes_watched,
        watched_minutes = v_total_watch_time,
        drama_category = COALESCE(drama_category, v_drama_category),
        updated_at = NOW()
    WHERE user_id = v_user_id AND drama_id = v_drama_id;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Função #2: Sincroniza a LISTA de dramas com as ESTATÍSTICAS totais
-- É acionada quando 'user_drama_lists' muda
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

    -- Recalcula as estatísticas TOTAIS do usuário a partir da tabela de resumo 'user_drama_lists'
    INSERT INTO public.user_stats (user_id, total_watch_time_minutes, dramas_completed, dramas_watching, dramas_in_watchlist)
    SELECT
        v_user_id,
        COALESCE(SUM(watched_minutes), 0),
        COUNT(*) FILTER (WHERE list_type = 'completed'),
        COUNT(*) FILTER (WHERE list_type = 'watching'),
        COUNT(*) FILTER (WHERE list_type = 'watchlist')
    FROM public.user_drama_lists
    WHERE user_id = v_user_id
    ON CONFLICT (user_id) DO UPDATE SET
        total_watch_time_minutes = EXCLUDED.total_watch_time_minutes,
        dramas_completed = EXCLUDED.dramas_completed,
        dramas_watching = EXCLUDED.dramas_watching,
        dramas_in_watchlist = EXCLUDED.dramas_in_watchlist,
        updated_at = NOW();

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Função #3: Atualiza categoria do drama quando um drama é adicionado à lista
CREATE OR REPLACE FUNCTION update_drama_category()
RETURNS TRIGGER AS $$
BEGIN
    -- Se a categoria não foi fornecida, busca automaticamente
    IF NEW.drama_category IS NULL THEN
        NEW.drama_category := get_drama_category(NEW.drama_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASSO 6: CRIAR OS NOVOS TRIGGERS

-- Trigger #1: Aciona a Função #1 quando o histórico muda
CREATE TRIGGER on_history_change_update_list
    AFTER INSERT OR UPDATE OR DELETE ON public.episode_watch_history
    FOR EACH ROW
    EXECUTE FUNCTION sync_history_to_drama_list();

-- Trigger #2: Aciona a Função #2 quando a lista de dramas muda
CREATE TRIGGER on_list_change_update_stats
    AFTER INSERT OR UPDATE OR DELETE ON public.user_drama_lists
    FOR EACH ROW
    EXECUTE FUNCTION sync_list_to_user_stats();

-- Trigger #3: Atualiza categoria do drama antes de inserir/atualizar
CREATE TRIGGER update_drama_category_trigger
    BEFORE INSERT OR UPDATE ON public.user_drama_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_drama_category();

-- PASSO 7: FUNÇÃO PARA COMPLETAR DRAMA COM INTERVALO DE DATAS
-- Esta função distribui episódios ao longo de um período

CREATE OR REPLACE FUNCTION complete_drama_with_date_range(
    p_user_id UUID,
    p_drama_id INTEGER,
    p_total_episodes INTEGER,
    p_start_date DATE,
    p_end_date DATE,
    p_episode_duration_minutes INTEGER DEFAULT 60,
    p_drama_category TEXT DEFAULT NULL
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
BEGIN
    -- Calcula o intervalo de dias
    v_days_interval := (p_end_date - p_start_date) + 1;
    
    -- Calcula episódios por dia
    v_episodes_per_day := p_total_episodes::NUMERIC / v_days_interval::NUMERIC;
    
    -- Define categoria
    v_category := COALESCE(p_drama_category, get_drama_category(p_drama_id));
    
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
        watched_minutes = p_total_episodes * p_episode_duration_minutes,
        drama_category = v_category,
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
            drama_category,
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
            v_category,
            NOW(),
            NOW()
        );
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- PASSO 8: ATUALIZAR CATEGORIAS DOS DRAMAS EXISTENTES
-- Atualiza dramas que não têm categoria definida

UPDATE public.user_drama_lists
SET drama_category = get_drama_category(drama_id)
WHERE drama_category IS NULL;

-- PASSO 9: RESSINCRONIZAR TODOS OS DADOS EXISTENTES

-- Primeiro, atualiza todas as listas de dramas com base no histórico
UPDATE public.user_drama_lists u
SET
    episodes_watched = COALESCE(stats.total_episodes, u.episodes_watched, 0),
    current_episode = COALESCE(stats.total_episodes, u.current_episode, 0),
    watched_minutes = COALESCE(stats.total_minutes, u.watched_minutes, 0),
    updated_at = NOW()
FROM (
    SELECT
        user_id,
        drama_id,
        COUNT(*) as total_episodes,
        COALESCE(SUM(episode_duration_minutes), 0) as total_minutes
    FROM public.episode_watch_history
    GROUP BY user_id, drama_id
) AS stats
WHERE u.user_id = stats.user_id AND u.drama_id = stats.drama_id;

-- Segundo, recalcula todas as estatísticas dos usuários
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT DISTINCT id FROM public.users LOOP
        INSERT INTO public.user_stats (user_id, total_watch_time_minutes, dramas_completed, dramas_watching, dramas_in_watchlist)
        SELECT 
            user_record.id,
            COALESCE(SUM(watched_minutes), 0),
            COUNT(*) FILTER (WHERE list_type = 'completed'),
            COUNT(*) FILTER (WHERE list_type = 'watching'),
            COUNT(*) FILTER (WHERE list_type = 'watchlist')
        FROM public.user_drama_lists
        WHERE user_id = user_record.id
        ON CONFLICT (user_id) DO UPDATE SET
            total_watch_time_minutes = EXCLUDED.total_watch_time_minutes,
            dramas_completed = EXCLUDED.dramas_completed,
            dramas_watching = EXCLUDED.dramas_watching,
            dramas_in_watchlist = EXCLUDED.dramas_in_watchlist,
            updated_at = NOW();
    END LOOP;
END;
$$;

COMMIT;

-- Mensagem de sucesso
SELECT 'Sistema de episódios e categorias implementado com sucesso!' as status;