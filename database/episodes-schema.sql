-- Episodes Schema for Drama Hub
-- This schema handles episode information including air dates and release schedules

-- Create episodes table
CREATE TABLE IF NOT EXISTS episodes (
  id SERIAL PRIMARY KEY,
  drama_id INTEGER NOT NULL,
  season_number INTEGER NOT NULL DEFAULT 1,
  episode_number INTEGER NOT NULL,
  name TEXT,
  overview TEXT,
  air_date DATE,
  runtime INTEGER, -- in minutes
  still_path TEXT, -- episode thumbnail
  vote_average DECIMAL(3,1) DEFAULT 0.0,
  vote_count INTEGER DEFAULT 0,
  production_code TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT episodes_drama_season_episode_unique UNIQUE (drama_id, season_number, episode_number),
  CONSTRAINT episodes_episode_number_positive CHECK (episode_number > 0),
  CONSTRAINT episodes_season_number_positive CHECK (season_number > 0),
  CONSTRAINT episodes_vote_average_range CHECK (vote_average >= 0 AND vote_average <= 10)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_episodes_drama_id ON episodes(drama_id);
CREATE INDEX IF NOT EXISTS idx_episodes_air_date ON episodes(air_date);
CREATE INDEX IF NOT EXISTS idx_episodes_drama_season ON episodes(drama_id, season_number);
CREATE INDEX IF NOT EXISTS idx_episodes_upcoming ON episodes(air_date) WHERE air_date > NOW();

-- Create function to get episodes for a drama
CREATE OR REPLACE FUNCTION get_drama_episodes(
  p_drama_id INTEGER,
  p_season_number INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id INTEGER,
  drama_id INTEGER,
  season_number INTEGER,
  episode_number INTEGER,
  name TEXT,
  overview TEXT,
  air_date DATE,
  runtime INTEGER,
  still_path TEXT,
  vote_average DECIMAL(3,1),
  vote_count INTEGER,
  is_aired BOOLEAN,
  days_until_air INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.drama_id,
    e.season_number,
    e.episode_number,
    e.name,
    e.overview,
    e.air_date,
    e.runtime,
    e.still_path,
    e.vote_average,
    e.vote_count,
    (e.air_date <= CURRENT_DATE) as is_aired,
    CASE 
      WHEN e.air_date > CURRENT_DATE THEN (e.air_date - CURRENT_DATE)::INTEGER
      ELSE NULL
    END as days_until_air
  FROM episodes e
  WHERE e.drama_id = p_drama_id
    AND (p_season_number IS NULL OR e.season_number = p_season_number)
  ORDER BY e.season_number, e.episode_number;
END;
$$ LANGUAGE plpgsql;

-- Create function to get upcoming episodes across all dramas
CREATE OR REPLACE FUNCTION get_upcoming_episodes(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id INTEGER,
  drama_id INTEGER,
  drama_name TEXT,
  season_number INTEGER,
  episode_number INTEGER,
  name TEXT,
  overview TEXT,
  air_date DATE,
  runtime INTEGER,
  still_path TEXT,
  days_until_air INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.drama_id,
    'Drama ' || e.drama_id::TEXT as drama_name, -- Placeholder, should join with dramas table
    e.season_number,
    e.episode_number,
    e.name,
    e.overview,
    e.air_date,
    e.runtime,
    e.still_path,
    (e.air_date - CURRENT_DATE)::INTEGER as days_until_air
  FROM episodes e
  WHERE e.air_date > CURRENT_DATE
  ORDER BY e.air_date ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create function to get episode statistics for a drama
CREATE OR REPLACE FUNCTION get_drama_episode_stats(
  p_drama_id INTEGER
)
RETURNS TABLE (
  total_episodes INTEGER,
  aired_episodes INTEGER,
  upcoming_episodes INTEGER,
  next_episode_date DATE,
  next_episode_number INTEGER,
  next_episode_name TEXT,
  last_aired_date DATE,
  average_runtime INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_episodes,
    COUNT(CASE WHEN e.air_date <= CURRENT_DATE THEN 1 END)::INTEGER as aired_episodes,
    COUNT(CASE WHEN e.air_date > CURRENT_DATE THEN 1 END)::INTEGER as upcoming_episodes,
    MIN(CASE WHEN e.air_date > CURRENT_DATE THEN e.air_date END) as next_episode_date,
    MIN(CASE WHEN e.air_date > CURRENT_DATE THEN e.episode_number END)::INTEGER as next_episode_number,
    MIN(CASE WHEN e.air_date > CURRENT_DATE THEN e.name END) as next_episode_name,
    MAX(CASE WHEN e.air_date <= CURRENT_DATE THEN e.air_date END) as last_aired_date,
    AVG(CASE WHEN e.runtime > 0 THEN e.runtime END)::INTEGER as average_runtime
  FROM episodes e
  WHERE e.drama_id = p_drama_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to update episode information
CREATE OR REPLACE FUNCTION upsert_episode(
  p_drama_id INTEGER,
  p_season_number INTEGER,
  p_episode_number INTEGER,
  p_name TEXT DEFAULT NULL,
  p_overview TEXT DEFAULT NULL,
  p_air_date DATE DEFAULT NULL,
  p_runtime INTEGER DEFAULT NULL,
  p_still_path TEXT DEFAULT NULL,
  p_vote_average DECIMAL(3,1) DEFAULT NULL,
  p_vote_count INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  episode_id INTEGER;
BEGIN
  INSERT INTO episodes (
    drama_id,
    season_number,
    episode_number,
    name,
    overview,
    air_date,
    runtime,
    still_path,
    vote_average,
    vote_count,
    updated_at
  ) VALUES (
    p_drama_id,
    p_season_number,
    p_episode_number,
    p_name,
    p_overview,
    p_air_date,
    p_runtime,
    p_still_path,
    COALESCE(p_vote_average, 0.0),
    COALESCE(p_vote_count, 0),
    NOW()
  )
  ON CONFLICT (drama_id, season_number, episode_number) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, episodes.name),
    overview = COALESCE(EXCLUDED.overview, episodes.overview),
    air_date = COALESCE(EXCLUDED.air_date, episodes.air_date),
    runtime = COALESCE(EXCLUDED.runtime, episodes.runtime),
    still_path = COALESCE(EXCLUDED.still_path, episodes.still_path),
    vote_average = COALESCE(EXCLUDED.vote_average, episodes.vote_average),
    vote_count = COALESCE(EXCLUDED.vote_count, episodes.vote_count),
    updated_at = NOW()
  RETURNING id INTO episode_id;
  
  RETURN episode_id;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample episodes for testing
-- Note: These are sample data, in production you would populate this from TMDB API
INSERT INTO episodes (drama_id, season_number, episode_number, name, overview, air_date, runtime) VALUES
-- Sample for drama ID 1
(1, 1, 1, 'Pilot', 'The beginning of an amazing journey', '2024-01-01', 60),
(1, 1, 2, 'First Steps', 'Our characters take their first steps', '2024-01-08', 60),
(1, 1, 3, 'The Challenge', 'A new challenge appears', '2024-01-15', 60),
(1, 1, 4, 'Revelations', 'Secrets are revealed', '2024-01-22', 60),
(1, 1, 5, 'The Turning Point', 'Everything changes', '2024-01-29', 60),
(1, 1, 6, 'New Beginnings', 'A fresh start', '2024-02-05', 60),
(1, 1, 7, 'The Journey Continues', 'The adventure goes on', '2024-02-12', 60),
(1, 1, 8, 'Unexpected Turns', 'Surprises await', '2024-02-19', 60),
(1, 1, 9, 'The Climax', 'The tension builds', '2024-02-26', 60),
(1, 1, 10, 'Resolution', 'All questions are answered', '2024-03-05', 60),
-- Future episodes
(1, 1, 11, 'New Horizons', 'Looking towards the future', '2025-03-12', 60),
(1, 1, 12, 'The Final Chapter', 'The end of season 1', '2025-03-19', 60),

-- Sample for drama ID 2
(2, 1, 1, 'Episode 1', 'First episode of drama 2', '2024-06-01', 45),
(2, 1, 2, 'Episode 2', 'Second episode of drama 2', '2024-06-08', 45),
(2, 1, 3, 'Episode 3', 'Third episode of drama 2', '2024-06-15', 45),
-- Future episodes for drama 2
(2, 1, 4, 'Episode 4', 'Fourth episode coming soon', '2025-01-15', 45),
(2, 1, 5, 'Episode 5', 'Fifth episode coming soon', '2025-01-22', 45)
ON CONFLICT (drama_id, season_number, episode_number) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_episodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER episodes_updated_at_trigger
  BEFORE UPDATE ON episodes
  FOR EACH ROW
  EXECUTE FUNCTION update_episodes_updated_at();

-- Create view for easy episode querying with additional info
CREATE OR REPLACE VIEW episodes_with_status AS
SELECT 
  e.*,
  CASE 
    WHEN e.air_date <= CURRENT_DATE THEN 'aired'
    WHEN e.air_date > CURRENT_DATE THEN 'upcoming'
    ELSE 'unknown'
  END as status,
  CASE 
    WHEN e.air_date > CURRENT_DATE THEN (e.air_date - CURRENT_DATE)::INTEGER
    ELSE NULL
  END as days_until_air,
  CASE 
    WHEN e.air_date <= CURRENT_DATE THEN (CURRENT_DATE - e.air_date)::INTEGER
    ELSE NULL
  END as days_since_air
FROM episodes e;

SELECT 'Episodes schema created successfully with sample data' as status;