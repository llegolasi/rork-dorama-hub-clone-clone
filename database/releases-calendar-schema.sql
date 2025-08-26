-- =====================================================
-- CALENDÁRIO DE LANÇAMENTOS - SCHEMA SQL
-- =====================================================
-- Este arquivo contém as tabelas necessárias para a funcionalidade
-- de calendário de lançamentos de K-dramas

-- =====================================================
-- TABELA DE LANÇAMENTOS FUTUROS
-- =====================================================

-- Tabela para armazenar informações de K-dramas com lançamento futuro
CREATE TABLE public.upcoming_releases (
    id SERIAL PRIMARY KEY,
    tmdb_id INTEGER UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    original_name VARCHAR(200),
    poster_path TEXT,
    backdrop_path TEXT,
    overview TEXT,
    release_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'upcoming',
    genre_ids INTEGER[] DEFAULT '{}',
    origin_country VARCHAR(10)[] DEFAULT '{}',
    vote_average DECIMAL(3,1) DEFAULT 0,
    popularity DECIMAL(8,3) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices para performance
    CONSTRAINT upcoming_releases_release_date_check CHECK (release_date >= CURRENT_DATE)
);

-- =====================================================
-- TABELA DE LEMBRETES DE LANÇAMENTOS
-- =====================================================

-- Tabela para armazenar os lembretes dos usuários para lançamentos
CREATE TABLE public.release_reminders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    release_id INTEGER REFERENCES public.upcoming_releases(id) ON DELETE CASCADE NOT NULL,
    
    -- Dados salvos para economizar chamadas à API
    drama_name VARCHAR(200) NOT NULL,
    drama_poster TEXT,
    release_date DATE NOT NULL,
    
    -- Configurações do lembrete
    notification_sent BOOLEAN DEFAULT FALSE,
    reminder_type VARCHAR(20) DEFAULT 'push' CHECK (reminder_type IN ('push', 'calendar')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para evitar lembretes duplicados
    UNIQUE(user_id, release_id)
);

-- =====================================================
-- TABELA DE ESTATÍSTICAS DE LEMBRETES (para premium)
-- =====================================================

-- Tabela para controlar limites de lembretes para usuários gratuitos
CREATE TABLE public.user_reminder_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    active_reminders_count INTEGER DEFAULT 0,
    total_reminders_created INTEGER DEFAULT 0,
    last_reminder_created TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para upcoming_releases
CREATE INDEX idx_upcoming_releases_release_date ON public.upcoming_releases(release_date);
CREATE INDEX idx_upcoming_releases_tmdb_id ON public.upcoming_releases(tmdb_id);
CREATE INDEX idx_upcoming_releases_status ON public.upcoming_releases(status);
CREATE INDEX idx_upcoming_releases_popularity ON public.upcoming_releases(popularity DESC);

-- Índices para release_reminders
CREATE INDEX idx_release_reminders_user_id ON public.release_reminders(user_id);
CREATE INDEX idx_release_reminders_release_id ON public.release_reminders(release_id);
CREATE INDEX idx_release_reminders_release_date ON public.release_reminders(release_date);
CREATE INDEX idx_release_reminders_notification_sent ON public.release_reminders(notification_sent);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE public.upcoming_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reminder_stats ENABLE ROW LEVEL SECURITY;

-- Políticas para upcoming_releases (leitura pública)
CREATE POLICY "Anyone can view upcoming releases" ON public.upcoming_releases
    FOR SELECT USING (true);

-- Políticas para release_reminders (usuários podem gerenciar seus próprios lembretes)
CREATE POLICY "Users can view own reminders" ON public.release_reminders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reminders" ON public.release_reminders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders" ON public.release_reminders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders" ON public.release_reminders
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para user_reminder_stats
CREATE POLICY "Users can view own reminder stats" ON public.user_reminder_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own reminder stats" ON public.user_reminder_stats
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS E FUNÇÕES
-- =====================================================

-- Trigger para atualizar updated_at
CREATE TRIGGER update_upcoming_releases_updated_at BEFORE UPDATE ON public.upcoming_releases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_release_reminders_updated_at BEFORE UPDATE ON public.release_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_reminder_stats_updated_at BEFORE UPDATE ON public.user_reminder_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar contadores de lembretes
CREATE OR REPLACE FUNCTION update_reminder_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Incrementar contador de lembretes ativos
        INSERT INTO public.user_reminder_stats (user_id, active_reminders_count, total_reminders_created, last_reminder_created)
        VALUES (NEW.user_id, 1, 1, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            active_reminders_count = user_reminder_stats.active_reminders_count + 1,
            total_reminders_created = user_reminder_stats.total_reminders_created + 1,
            last_reminder_created = NOW();
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrementar contador de lembretes ativos
        UPDATE public.user_reminder_stats 
        SET active_reminders_count = GREATEST(0, active_reminders_count - 1)
        WHERE user_id = OLD.user_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger para atualizar contadores
CREATE TRIGGER update_reminder_counts_trigger
    AFTER INSERT OR DELETE ON public.release_reminders
    FOR EACH ROW EXECUTE FUNCTION update_reminder_counts();

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para verificar se usuário pode criar mais lembretes
CREATE OR REPLACE FUNCTION can_create_reminder(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER := 0;
    is_premium BOOLEAN := false;
BEGIN
    -- Verificar se é usuário premium
    SELECT CASE 
        WHEN ps.status = 'active' AND ps.expires_at > NOW() THEN true 
        ELSE false 
    END INTO is_premium
    FROM public.premium_subscriptions ps
    WHERE ps.user_id = user_uuid;
    
    -- Se for premium, pode criar lembretes ilimitados
    IF is_premium THEN
        RETURN true;
    END IF;
    
    -- Para usuários gratuitos, verificar limite de 5 lembretes
    SELECT COALESCE(active_reminders_count, 0) INTO current_count
    FROM public.user_reminder_stats
    WHERE user_id = user_uuid;
    
    RETURN current_count < 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter lembretes do usuário
CREATE OR REPLACE FUNCTION get_user_reminders(user_uuid UUID)
RETURNS TABLE (
    reminder_id UUID,
    release_id INTEGER,
    drama_name VARCHAR(200),
    drama_poster TEXT,
    release_date DATE,
    notification_sent BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rr.id as reminder_id,
        rr.release_id,
        rr.drama_name,
        rr.drama_poster,
        rr.release_date,
        rr.notification_sent,
        rr.created_at
    FROM public.release_reminders rr
    WHERE rr.user_id = user_uuid
    ORDER BY rr.release_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter lançamentos próximos
CREATE OR REPLACE FUNCTION get_upcoming_releases(days_ahead INTEGER DEFAULT 90)
RETURNS TABLE (
    release_id INTEGER,
    tmdb_id INTEGER,
    name VARCHAR(200),
    original_name VARCHAR(200),
    poster_path TEXT,
    release_date DATE,
    overview TEXT,
    vote_average DECIMAL(3,1),
    popularity DECIMAL(8,3)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ur.id as release_id,
        ur.tmdb_id,
        ur.name,
        ur.original_name,
        ur.poster_path,
        ur.release_date,
        ur.overview,
        ur.vote_average,
        ur.popularity
    FROM public.upcoming_releases ur
    WHERE ur.release_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '1 day' * days_ahead)
    AND ur.status = 'upcoming'
    ORDER BY ur.release_date ASC, ur.popularity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS ÚTEIS
-- =====================================================

-- View para lançamentos com informações de lembretes
CREATE VIEW public.releases_with_reminder_count AS
SELECT 
    ur.*,
    COUNT(rr.id) as reminder_count
FROM public.upcoming_releases ur
LEFT JOIN public.release_reminders rr ON ur.id = rr.release_id
GROUP BY ur.id
ORDER BY ur.release_date ASC;

-- View para estatísticas de usuário com lembretes
CREATE VIEW public.user_reminder_overview AS
SELECT 
    u.id as user_id,
    u.username,
    u.display_name,
    COALESCE(urs.active_reminders_count, 0) as active_reminders,
    COALESCE(urs.total_reminders_created, 0) as total_reminders,
    CASE 
        WHEN ps.status = 'active' AND ps.expires_at > NOW() THEN true 
        ELSE false 
    END as is_premium,
    CASE 
        WHEN ps.status = 'active' AND ps.expires_at > NOW() THEN 999 
        ELSE 5 
    END as reminder_limit
FROM public.users u
LEFT JOIN public.user_reminder_stats urs ON u.id = urs.user_id
LEFT JOIN public.premium_subscriptions ps ON u.id = ps.user_id;

-- =====================================================
-- DADOS INICIAIS (OPCIONAL)
-- =====================================================

-- Inserir alguns lançamentos de exemplo (opcional - normalmente virão da API do TMDB)
-- INSERT INTO public.upcoming_releases (tmdb_id, name, original_name, poster_path, release_date, overview) VALUES
-- (123456, 'Exemplo K-Drama 2025', '예시 드라마 2025', '/exemplo-poster.jpg', '2025-03-15', 'Um drama de exemplo sobre...');

-- =====================================================
-- COMENTÁRIOS E INSTRUÇÕES
-- =====================================================

-- Este schema fornece:
-- 1. Tabela para armazenar lançamentos futuros de K-dramas
-- 2. Sistema de lembretes com limite para usuários gratuitos (5) e ilimitado para premium
-- 3. Estatísticas de uso de lembretes
-- 4. Funções auxiliares para verificar limites e obter dados
-- 5. Views para consultas otimizadas
-- 6. Políticas de segurança RLS
-- 7. Triggers para manter contadores atualizados

-- Para usar:
-- 1. Execute este SQL no Supabase SQL Editor
-- 2. Configure a sincronização com a API do TMDB para popular upcoming_releases
-- 3. Implemente a lógica de notificações push
-- 4. Configure jobs para limpar lançamentos passados
-- 5. Implemente a integração com calendário nativo para usuários premium