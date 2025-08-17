-- =====================================================
-- MELHORIAS NO SISTEMA DE RASTREAMENTO DE EPISÓDIOS
-- =====================================================

-- 1. Adicionar campo de categoria na tabela user_drama_lists
ALTER TABLE user_drama_lists 
ADD COLUMN IF NOT EXISTS drama_category VARCHAR(100);

-- 2. Criar tabela para registros detalhados de episódios assistidos
CREATE TABLE IF NOT EXISTS episode_watch_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    drama_id INTEGER NOT NULL,
    episode_number INTEGER NOT NULL,
    episode_duration_minutes INTEGER DEFAULT 45, -- Duração padrão de 45 minutos
    watch_started_at TIMESTAMP WITH TIME ZONE,
    watch_completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices para performance
    CONSTRAINT unique_user_drama_episode UNIQUE(user_id, drama_id, episode_number)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_episode_watch_history_user_drama 
ON episode_watch_history(user_id, drama_id);

CREATE INDEX IF NOT EXISTS idx_episode_watch_history_completed_at 
ON episode_watch_history(watch_completed_at);

CREATE INDEX IF NOT EXISTS idx_episode_watch_history_user_completed 
ON episode_watch_history(user_id, watch_completed_at);

-- 3. Função para criar registros de episódios quando completar diretamente
CREATE OR REPLACE FUNCTION create_episode_history_for_completed_drama(
    p_user_id UUID,
    p_drama_id INTEGER,
    p_total_episodes INTEGER,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_episode_duration INTEGER DEFAULT 45
)
RETURNS VOID AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_days_interval INTEGER;
    v_episodes_per_day DECIMAL;
    v_current_date DATE;
    v_episode_counter INTEGER := 1;
    v_episodes_today INTEGER;
    v_remaining_episodes INTEGER := p_total_episodes;
    v_watch_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Definir datas padrão se não fornecidas
    v_end_date := COALESCE(p_end_date, CURRENT_DATE);
    v_start_date := COALESCE(p_start_date, v_end_date - INTERVAL '30 days');
    
    -- Calcular intervalo de dias
    v_days_interval := v_end_date - v_start_date + 1;
    
    -- Se o intervalo for menor que o número de episódios, ajustar
    IF v_days_interval < p_total_episodes THEN
        v_start_date := v_end_date - (p_total_episodes - 1);
        v_days_interval := p_total_episodes;
    END IF;
    
    -- Calcular episódios por dia (média)
    v_episodes_per_day := p_total_episodes::DECIMAL / v_days_interval::DECIMAL;
    
    -- Limpar registros existentes para este drama/usuário
    DELETE FROM episode_watch_history 
    WHERE user_id = p_user_id AND drama_id = p_drama_id;
    
    -- Distribuir episódios ao longo dos dias
    v_current_date := v_start_date;
    
    WHILE v_episode_counter <= p_total_episodes LOOP
        -- Calcular quantos episódios assistir neste dia
        IF v_remaining_episodes <= (v_end_date - v_current_date + 1) THEN
            v_episodes_today := 1;
        ELSE
            v_episodes_today := LEAST(
                CEIL(v_episodes_per_day)::INTEGER,
                v_remaining_episodes
            );
        END IF;
        
        -- Criar registros para os episódios do dia
        FOR i IN 1..v_episodes_today LOOP
            EXIT WHEN v_episode_counter > p_total_episodes;
            
            -- Horário aleatório durante o dia (entre 18h e 23h)
            v_watch_time := v_current_date + 
                INTERVAL '18 hours' + 
                (RANDOM() * INTERVAL '5 hours');
            
            INSERT INTO episode_watch_history (
                user_id,
                drama_id,
                episode_number,
                episode_duration_minutes,
                watch_started_at,
                watch_completed_at
            ) VALUES (
                p_user_id,
                p_drama_id,
                v_episode_counter,
                p_episode_duration,
                v_watch_time - (p_episode_duration || ' minutes')::INTERVAL,
                v_watch_time
            );
            
            v_episode_counter := v_episode_counter + 1;
        END LOOP;
        
        v_remaining_episodes := v_remaining_episodes - v_episodes_today;
        v_current_date := v_current_date + 1;
        
        -- Evitar loop infinito
        IF v_current_date > v_end_date + 10 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Criados % registros de episódios para o drama %', p_total_episodes, p_drama_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Função para registrar episódio individual assistido
CREATE OR REPLACE FUNCTION register_episode_watched(
    p_user_id UUID,
    p_drama_id INTEGER,
    p_episode_number INTEGER,
    p_episode_duration INTEGER DEFAULT 45
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO episode_watch_history (
        user_id,
        drama_id,
        episode_number,
        episode_duration_minutes,
        watch_started_at,
        watch_completed_at
    ) VALUES (
        p_user_id,
        p_drama_id,
        p_episode_number,
        p_episode_duration,
        NOW() - (p_episode_duration || ' minutes')::INTERVAL,
        NOW()
    )
    ON CONFLICT (user_id, drama_id, episode_number) 
    DO UPDATE SET
        watch_completed_at = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 5. Função para sincronizar dados com a tabela user_drama_lists
CREATE OR REPLACE FUNCTION sync_episode_data_with_user_lists()
RETURNS TRIGGER AS $$
DECLARE
    v_episodes_watched INTEGER;
    v_total_watch_time INTEGER;
BEGIN
    -- Contar episódios assistidos
    SELECT 
        COUNT(*),
        COALESCE(SUM(episode_duration_minutes), 0)
    INTO v_episodes_watched, v_total_watch_time
    FROM episode_watch_history 
    WHERE user_id = NEW.user_id AND drama_id = NEW.drama_id;
    
    -- Atualizar user_drama_lists
    UPDATE user_drama_lists 
    SET 
        episodes_watched = v_episodes_watched,
        current_episode = v_episodes_watched,
        watched_minutes = v_total_watch_time,
        updated_at = NOW()
    WHERE user_id = NEW.user_id AND drama_id = NEW.drama_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para sincronizar automaticamente
DROP TRIGGER IF EXISTS sync_episode_data_trigger ON episode_watch_history;
CREATE TRIGGER sync_episode_data_trigger
    AFTER INSERT OR UPDATE OR DELETE ON episode_watch_history
    FOR EACH ROW
    EXECUTE FUNCTION sync_episode_data_with_user_lists();

-- 7. Atualizar a função principal de cálculo para considerar os novos dados
CREATE OR REPLACE FUNCTION calculate_user_drama_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_episodes_from_history INTEGER := 0;
    v_minutes_from_history INTEGER := 0;
BEGIN
    -- Garantir que episodes_watched nunca seja NULL
    IF NEW.episodes_watched IS NULL THEN
        NEW.episodes_watched := 0;
    END IF;

    -- Buscar dados do histórico de episódios se existir
    SELECT 
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(episode_duration_minutes), 0)
    INTO v_episodes_from_history, v_minutes_from_history
    FROM episode_watch_history 
    WHERE user_id = NEW.user_id AND drama_id = NEW.drama_id;
    
    -- Se temos dados do histórico, usar eles
    IF v_episodes_from_history > 0 THEN
        NEW.episodes_watched := v_episodes_from_history;
        NEW.watched_minutes := v_minutes_from_history;
    ELSE
        -- Calcular baseado no progresso tradicional
        IF NEW.total_episodes > 0 AND NEW.total_runtime_minutes > 0 THEN
            NEW.watched_minutes := ROUND((NEW.episodes_watched::DECIMAL / NEW.total_episodes::DECIMAL) * NEW.total_runtime_minutes);
        ELSE
            NEW.watched_minutes := 0;
        END IF;
    END IF;
    
    -- current_episode é sempre igual a episodes_watched
    NEW.current_episode := NEW.episodes_watched;

    -- Se o drama foi marcado como completed, garantir que assistiu todos os episódios
    IF NEW.list_type = 'completed' THEN
        NEW.current_episode := NEW.total_episodes;
        NEW.episodes_watched := NEW.total_episodes;
        
        -- Se não temos histórico detalhado, usar o tempo total
        IF v_episodes_from_history = 0 THEN
            NEW.watched_minutes := NEW.total_runtime_minutes;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Função para obter estatísticas detalhadas do usuário
CREATE OR REPLACE FUNCTION get_user_detailed_stats(p_user_id UUID)
RETURNS TABLE (
    total_dramas_completed INTEGER,
    total_episodes_watched INTEGER,
    total_minutes_watched INTEGER,
    total_hours_watched DECIMAL,
    total_days_watched DECIMAL,
    episodes_this_week INTEGER,
    minutes_this_week INTEGER,
    episodes_this_month INTEGER,
    minutes_this_month INTEGER,
    average_episodes_per_day DECIMAL,
    most_watched_category TEXT,
    longest_watching_streak INTEGER,
    current_watching_streak INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            -- Estatísticas gerais
            (SELECT COUNT(*) FROM user_drama_lists WHERE user_id = p_user_id AND list_type = 'completed') as completed_dramas,
            (SELECT COALESCE(SUM(episodes_watched), 0) FROM user_drama_lists WHERE user_id = p_user_id) as total_episodes,
            (SELECT COALESCE(SUM(watched_minutes), 0) FROM user_drama_lists WHERE user_id = p_user_id) as total_minutes,
            
            -- Estatísticas semanais
            (SELECT COUNT(*) FROM episode_watch_history 
             WHERE user_id = p_user_id AND watch_completed_at >= NOW() - INTERVAL '7 days') as week_episodes,
            (SELECT COALESCE(SUM(episode_duration_minutes), 0) FROM episode_watch_history 
             WHERE user_id = p_user_id AND watch_completed_at >= NOW() - INTERVAL '7 days') as week_minutes,
            
            -- Estatísticas mensais
            (SELECT COUNT(*) FROM episode_watch_history 
             WHERE user_id = p_user_id AND watch_completed_at >= NOW() - INTERVAL '30 days') as month_episodes,
            (SELECT COALESCE(SUM(episode_duration_minutes), 0) FROM episode_watch_history 
             WHERE user_id = p_user_id AND watch_completed_at >= NOW() - INTERVAL '30 days') as month_minutes,
            
            -- Categoria mais assistida
            (SELECT drama_category FROM user_drama_lists 
             WHERE user_id = p_user_id AND drama_category IS NOT NULL 
             GROUP BY drama_category 
             ORDER BY COUNT(*) DESC 
             LIMIT 1) as top_category
    )
    SELECT 
        s.completed_dramas::INTEGER,
        s.total_episodes::INTEGER,
        s.total_minutes::INTEGER,
        ROUND(s.total_minutes::DECIMAL / 60, 2) as hours_watched,
        ROUND(s.total_minutes::DECIMAL / 1440, 2) as days_watched,
        s.week_episodes::INTEGER,
        s.week_minutes::INTEGER,
        s.month_episodes::INTEGER,
        s.month_minutes::INTEGER,
        CASE 
            WHEN s.total_episodes > 0 THEN 
                ROUND(s.total_episodes::DECIMAL / GREATEST(1, EXTRACT(days FROM (NOW() - (SELECT MIN(created_at) FROM user_drama_lists WHERE user_id = p_user_id)))), 2)
            ELSE 0 
        END as avg_episodes_per_day,
        COALESCE(s.top_category, 'N/A') as most_watched_category,
        0 as longest_streak, -- Implementar lógica de streak depois
        0 as current_streak   -- Implementar lógica de streak depois
    FROM stats s;
END;
$$ LANGUAGE plpgsql;

-- 9. Política de segurança RLS para a nova tabela
ALTER TABLE episode_watch_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own episode history" ON episode_watch_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own episode history" ON episode_watch_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own episode history" ON episode_watch_history
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own episode history" ON episode_watch_history
    FOR DELETE USING (auth.uid() = user_id);

-- 10. Comentários para documentação
COMMENT ON TABLE episode_watch_history IS 'Histórico detalhado de episódios assistidos pelos usuários';
COMMENT ON COLUMN episode_watch_history.episode_duration_minutes IS 'Duração do episódio em minutos (padrão 45min)';
COMMENT ON COLUMN episode_watch_history.watch_started_at IS 'Quando começou a assistir o episódio';
COMMENT ON COLUMN episode_watch_history.watch_completed_at IS 'Quando terminou de assistir o episódio';

COMMENT ON COLUMN user_drama_lists.drama_category IS 'Categoria do drama (comédia, romance, ação, etc.)';

-- Mensagem de sucesso
SELECT 'Sistema de rastreamento de episódios melhorado com sucesso!' as status;