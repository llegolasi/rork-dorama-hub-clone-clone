-- Corrigir problema da tabela dramas que não existe
-- Os dados dos dramas vêm da API externa, não de uma tabela local

-- 1. Remover todos os triggers existentes da tabela user_drama_lists
DROP TRIGGER IF EXISTS auto_calculate_watched_minutes_trigger ON user_drama_lists;
DROP TRIGGER IF EXISTS ensure_drama_list_consistency_trigger ON user_drama_lists;
DROP TRIGGER IF EXISTS set_timestamp_user_drama_lists ON user_drama_lists;
DROP TRIGGER IF EXISTS trigger_calculate_watched_minutes ON user_drama_lists;
DROP TRIGGER IF EXISTS trigger_user_drama_lists_stats ON user_drama_lists;
DROP TRIGGER IF EXISTS update_user_drama_lists_updated_at ON user_drama_lists;
DROP TRIGGER IF EXISTS update_user_stats_trigger ON user_drama_lists;
DROP TRIGGER IF EXISTS update_watched_minutes_trigger ON user_drama_lists;
DROP TRIGGER IF EXISTS user_drama_lists_comprehensive_trigger ON user_drama_lists;
DROP TRIGGER IF EXISTS user_drama_lists_episode_progress_trigger ON user_drama_lists;
DROP TRIGGER IF EXISTS user_drama_lists_stats_trigger ON user_drama_lists;
DROP TRIGGER IF EXISTS user_drama_lists_watched_time_trigger ON user_drama_lists;
DROP TRIGGER IF EXISTS user_drama_lists_calculate_trigger ON user_drama_lists;
DROP TRIGGER IF EXISTS user_drama_lists_update_stats_trigger ON user_drama_lists;

-- 2. Remover funções desnecessárias
DROP FUNCTION IF EXISTS auto_calculate_watched_minutes();
DROP FUNCTION IF EXISTS calculate_watched_minutes();
DROP FUNCTION IF EXISTS update_watched_minutes();
DROP FUNCTION IF EXISTS update_episode_progress_and_stats();
DROP FUNCTION IF EXISTS update_user_stats_comprehensive();
DROP FUNCTION IF EXISTS update_user_stats_with_watched_time();
DROP FUNCTION IF EXISTS calculate_user_drama_watched_minutes();
DROP FUNCTION IF EXISTS ensure_drama_list_consistency();

-- 3. Adicionar campos necessários à tabela user_drama_lists se não existirem
ALTER TABLE user_drama_lists 
ADD COLUMN IF NOT EXISTS watched_episodes JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS episodes_watched INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS watched_minutes INTEGER DEFAULT 0;

-- 4. Criar função simples para calcular watched_minutes
CREATE OR REPLACE FUNCTION calculate_drama_watched_minutes()
RETURNS TRIGGER AS $$
BEGIN
    -- Para INSERT ou UPDATE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Se current_episode é NULL, definir baseado no list_type
        IF NEW.current_episode IS NULL THEN
            IF NEW.list_type = 'watchlist' THEN
                NEW.current_episode := 0;
            ELSIF NEW.list_type = 'completed' THEN
                NEW.current_episode := COALESCE(NEW.total_episodes, 0);
            ELSE
                NEW.current_episode := 0;
            END IF;
        END IF;
        
        -- Se total_runtime_minutes é 0 ou NULL, estimar baseado nos episódios (60 min por episódio)
        IF NEW.total_runtime_minutes IS NULL OR NEW.total_runtime_minutes = 0 THEN
            NEW.total_runtime_minutes := COALESCE(NEW.total_episodes, 0) * 60;
        END IF;
        
        -- Calcular watched_minutes baseado no current_episode
        IF NEW.list_type = 'completed' THEN
            -- Se completado, watched_minutes = total_runtime_minutes
            NEW.current_episode := COALESCE(NEW.total_episodes, 0);
            NEW.watched_minutes := NEW.total_runtime_minutes;
            NEW.episodes_watched := COALESCE(NEW.total_episodes, 0);
        ELSIF NEW.total_episodes > 0 AND NEW.total_runtime_minutes > 0 THEN
            -- Calcular proporcionalmente
            NEW.watched_minutes := ROUND((NEW.current_episode::DECIMAL / NEW.total_episodes::DECIMAL) * NEW.total_runtime_minutes);
            NEW.episodes_watched := NEW.current_episode;
        ELSE
            NEW.watched_minutes := 0;
            NEW.episodes_watched := 0;
        END IF;
        
        -- Atualizar updated_at
        NEW.updated_at := NOW();
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar trigger para BEFORE INSERT/UPDATE
CREATE TRIGGER user_drama_lists_calculate_trigger
    BEFORE INSERT OR UPDATE ON user_drama_lists
    FOR EACH ROW
    EXECUTE FUNCTION calculate_drama_watched_minutes();

-- 6. Manter trigger de estatísticas (AFTER)
CREATE TRIGGER user_drama_lists_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_drama_lists
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_user_stats();

-- 7. Corrigir dados existentes
-- Primeiro, corrigir current_episode NULL
UPDATE user_drama_lists 
SET current_episode = CASE 
    WHEN current_episode IS NULL AND list_type = 'watchlist' THEN 0
    WHEN current_episode IS NULL AND list_type = 'completed' THEN COALESCE(total_episodes, 0)
    WHEN current_episode IS NULL THEN 0
    ELSE current_episode 
END
WHERE current_episode IS NULL;

-- Corrigir total_runtime_minutes = 0 (estimar 60 min por episódio)
UPDATE user_drama_lists 
SET total_runtime_minutes = COALESCE(total_episodes, 0) * 60
WHERE total_runtime_minutes IS NULL OR total_runtime_minutes = 0;

-- Recalcular watched_minutes para todos os registros
UPDATE user_drama_lists 
SET 
    watched_minutes = CASE 
        WHEN list_type = 'completed' THEN total_runtime_minutes
        WHEN total_episodes > 0 AND total_runtime_minutes > 0 THEN 
            ROUND((current_episode::DECIMAL / total_episodes::DECIMAL) * total_runtime_minutes)
        ELSE 0 
    END,
    episodes_watched = CASE 
        WHEN list_type = 'completed' THEN COALESCE(total_episodes, 0)
        ELSE COALESCE(current_episode, 0)
    END;

-- 8. Verificar resultados
SELECT 
    id,
    drama_name,
    list_type,
    current_episode,
    total_episodes,
    total_runtime_minutes,
    watched_minutes,
    episodes_watched
FROM user_drama_lists 
ORDER BY updated_at DESC
LIMIT 10;