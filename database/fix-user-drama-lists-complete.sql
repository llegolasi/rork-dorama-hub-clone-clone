-- =====================================================
-- LIMPEZA COMPLETA DOS TRIGGERS DA TABELA user_drama_lists
-- =====================================================

-- 1. Remover todos os triggers existentes da tabela user_drama_lists
DROP TRIGGER IF EXISTS auto_calculate_watched_minutes_trigger ON public.user_drama_lists;
DROP TRIGGER IF EXISTS ensure_drama_list_consistency_trigger ON public.user_drama_lists;
DROP TRIGGER IF EXISTS trigger_calculate_watched_minutes ON public.user_drama_lists;
DROP TRIGGER IF EXISTS trigger_user_drama_lists_stats ON public.user_drama_lists;
DROP TRIGGER IF EXISTS update_user_stats_trigger ON public.user_drama_lists;
DROP TRIGGER IF EXISTS update_watched_minutes_trigger ON public.user_drama_lists;
DROP TRIGGER IF EXISTS user_drama_lists_comprehensive_trigger ON public.user_drama_lists;
DROP TRIGGER IF EXISTS user_drama_lists_episode_progress_trigger ON public.user_drama_lists;
DROP TRIGGER IF EXISTS user_drama_lists_stats_trigger ON public.user_drama_lists;
DROP TRIGGER IF EXISTS user_drama_lists_watched_time_trigger ON public.user_drama_lists;

-- 2. Remover funções antigas que não são mais necessárias
DROP FUNCTION IF EXISTS auto_calculate_watched_minutes();
DROP FUNCTION IF EXISTS ensure_drama_list_consistency();
DROP FUNCTION IF EXISTS calculate_watched_minutes();
DROP FUNCTION IF EXISTS update_watched_minutes();
DROP FUNCTION IF EXISTS update_episode_progress_and_stats();
DROP FUNCTION IF EXISTS update_user_stats_comprehensive();
DROP FUNCTION IF EXISTS update_user_stats_with_watched_time();

-- 3. Adicionar campos necessários na tabela user_drama_lists se não existirem
ALTER TABLE public.user_drama_lists 
ADD COLUMN IF NOT EXISTS watched_episodes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS watched_minutes INTEGER DEFAULT 0;

-- 4. Atualizar a estrutura da tabela para garantir que current_episode nunca seja NULL
ALTER TABLE public.user_drama_lists 
ALTER COLUMN current_episode SET DEFAULT 0;

-- Atualizar registros existentes onde current_episode é NULL
UPDATE public.user_drama_lists 
SET current_episode = 0 
WHERE current_episode IS NULL;

-- 5. Criar função simples para calcular watched_minutes baseado no current_episode
CREATE OR REPLACE FUNCTION calculate_user_drama_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Garantir que current_episode nunca seja NULL
    IF NEW.current_episode IS NULL THEN
        NEW.current_episode := 0;
    END IF;

    -- Calcular watched_episodes (mesmo valor que current_episode)
    NEW.watched_episodes := NEW.current_episode;

    -- Calcular watched_minutes baseado no progresso
    IF NEW.total_episodes > 0 AND NEW.total_runtime_minutes > 0 THEN
        NEW.watched_minutes := ROUND((NEW.current_episode::DECIMAL / NEW.total_episodes::DECIMAL) * NEW.total_runtime_minutes);
    ELSE
        NEW.watched_minutes := 0;
    END IF;

    -- Se o drama foi marcado como completed, garantir que assistiu todos os episódios
    IF NEW.list_type = 'completed' THEN
        NEW.current_episode := NEW.total_episodes;
        NEW.watched_episodes := NEW.total_episodes;
        NEW.watched_minutes := NEW.total_runtime_minutes;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar trigger simples para a função
CREATE TRIGGER user_drama_lists_stats_calculation
    BEFORE INSERT OR UPDATE ON public.user_drama_lists
    FOR EACH ROW EXECUTE FUNCTION calculate_user_drama_stats();

-- 7. Função para atualizar estatísticas do usuário
CREATE OR REPLACE FUNCTION update_user_statistics()
RETURNS TRIGGER AS $$
DECLARE
    user_uuid UUID;
    total_watched_minutes INTEGER;
    completed_count INTEGER;
    watching_count INTEGER;
    watchlist_count INTEGER;
BEGIN
    -- Determinar o user_id baseado na operação
    IF TG_OP = 'DELETE' THEN
        user_uuid := OLD.user_id;
    ELSE
        user_uuid := NEW.user_id;
    END IF;

    -- Calcular estatísticas atualizadas
    SELECT 
        COALESCE(SUM(watched_minutes), 0),
        COALESCE(SUM(CASE WHEN list_type = 'completed' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN list_type = 'watching' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN list_type = 'watchlist' THEN 1 ELSE 0 END), 0)
    INTO 
        total_watched_minutes,
        completed_count,
        watching_count,
        watchlist_count
    FROM public.user_drama_lists 
    WHERE user_id = user_uuid;

    -- Atualizar ou inserir estatísticas do usuário
    INSERT INTO public.user_stats (
        user_id, 
        total_watch_time_minutes, 
        dramas_completed, 
        dramas_watching, 
        dramas_in_watchlist
    ) VALUES (
        user_uuid, 
        total_watched_minutes, 
        completed_count, 
        watching_count, 
        watchlist_count
    )
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

-- 8. Criar trigger para atualizar estatísticas do usuário
CREATE TRIGGER update_user_stats_on_drama_change
    AFTER INSERT OR UPDATE OR DELETE ON public.user_drama_lists
    FOR EACH ROW EXECUTE FUNCTION update_user_statistics();

-- 9. Atualizar todos os registros existentes para calcular os valores corretos
UPDATE public.user_drama_lists 
SET 
    watched_episodes = current_episode,
    watched_minutes = CASE 
        WHEN total_episodes > 0 AND total_runtime_minutes > 0 THEN 
            ROUND((current_episode::DECIMAL / total_episodes::DECIMAL) * total_runtime_minutes)
        ELSE 0 
    END
WHERE total_runtime_minutes > 0;

-- Para dramas completed, garantir que watched_minutes = total_runtime_minutes
UPDATE public.user_drama_lists 
SET 
    current_episode = total_episodes,
    watched_episodes = total_episodes,
    watched_minutes = total_runtime_minutes
WHERE list_type = 'completed' AND total_runtime_minutes > 0;

-- 10. Recalcular todas as estatísticas dos usuários
INSERT INTO public.user_stats (user_id, total_watch_time_minutes, dramas_completed, dramas_watching, dramas_in_watchlist)
SELECT 
    user_id,
    COALESCE(SUM(watched_minutes), 0) as total_watch_time_minutes,
    COALESCE(SUM(CASE WHEN list_type = 'completed' THEN 1 ELSE 0 END), 0) as dramas_completed,
    COALESCE(SUM(CASE WHEN list_type = 'watching' THEN 1 ELSE 0 END), 0) as dramas_watching,
    COALESCE(SUM(CASE WHEN list_type = 'watchlist' THEN 1 ELSE 0 END), 0) as dramas_in_watchlist
FROM public.user_drama_lists
GROUP BY user_id
ON CONFLICT (user_id) DO UPDATE SET
    total_watch_time_minutes = EXCLUDED.total_watch_time_minutes,
    dramas_completed = EXCLUDED.dramas_completed,
    dramas_watching = EXCLUDED.dramas_watching,
    dramas_in_watchlist = EXCLUDED.dramas_in_watchlist,
    updated_at = NOW();

-- =====================================================
-- COMENTÁRIOS SOBRE AS MUDANÇAS
-- =====================================================

-- Este script:
-- 1. Remove todos os triggers conflitantes da tabela user_drama_lists
-- 2. Cria uma função simples que calcula watched_minutes baseado no current_episode
-- 3. Garante que current_episode nunca seja NULL (sempre 0 por padrão)
-- 4. Para dramas completed, força current_episode = total_episodes e watched_minutes = total_runtime_minutes
-- 5. Atualiza as estatísticas do usuário automaticamente
-- 6. Recalcula todos os dados existentes para ficarem corretos

-- Agora o sistema funciona assim:
-- - Quando adicionar um drama em qualquer lista: current_episode = 0, watched_minutes = 0
-- - Quando marcar episódios assistidos: watched_minutes é calculado proporcionalmente
-- - Quando marcar como completed: current_episode = total_episodes, watched_minutes = total_runtime_minutes
-- - As estatísticas do usuário são atualizadas automaticamente