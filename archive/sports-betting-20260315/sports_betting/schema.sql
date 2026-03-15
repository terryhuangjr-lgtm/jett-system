-- Games table
CREATE TABLE games (
    game_id TEXT PRIMARY KEY,
    sport TEXT NOT NULL,
    game_date DATE NOT NULL,
    game_time TIME,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    venue TEXT,
    status TEXT DEFAULT 'scheduled',
    home_score INTEGER,
    away_score INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_games_date ON games(game_date);
CREATE INDEX idx_games_sport ON games(sport);

-- Team statistics
CREATE TABLE team_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_name TEXT NOT NULL,
    sport TEXT NOT NULL,
    season TEXT NOT NULL,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    home_wins INTEGER DEFAULT 0,
    home_losses INTEGER DEFAULT 0,
    away_wins INTEGER DEFAULT 0,
    away_losses INTEGER DEFAULT 0,
    last_10_wins INTEGER,
    avg_points_scored REAL,
    avg_points_allowed REAL,
    point_differential REAL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_team_stats_team ON team_stats(team_name);

-- Player injuries
CREATE TABLE player_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    team_name TEXT NOT NULL,
    position TEXT,
    injury_status TEXT,
    injury_description TEXT,
    impact_score REAL DEFAULT 5.0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ppg REAL DEFAULT 0,
    mpg REAL DEFAULT 0,
    per REAL DEFAULT 0,
    is_starter INTEGER DEFAULT 0,
    UNIQUE(player_name, team_name, last_updated)
);

CREATE TABLE IF NOT EXISTS watch_list (
    game_id TEXT NOT NULL,
    date DATE NOT NULL,
    confidence REAL DEFAULT 0,
    PRIMARY KEY (game_id, date)
);

CREATE INDEX idx_player_team ON player_stats(team_name);
CREATE INDEX idx_player_status ON player_stats(injury_status);
CREATE INDEX idx_player_impact ON player_stats(impact_score);

-- Betting lines
CREATE TABLE betting_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    home_spread REAL,
    away_spread REAL,
    home_ml INTEGER,
    away_ml INTEGER,
    total REAL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lines_game ON betting_lines(game_id);

-- Bet recommendations
CREATE TABLE bet_recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    bet_type TEXT NOT NULL,
    bet_selection TEXT NOT NULL,
    confidence_score REAL NOT NULL,
    expected_value REAL,
    risk_level TEXT NOT NULL,
    max_bet_amount REAL,
    recommended_bet_amount REAL,
    primary_reasoning TEXT,
    concerns TEXT,
    is_daily_pick BOOLEAN DEFAULT 0,
    recommended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recs_game ON bet_recommendations(game_id);
CREATE INDEX idx_recs_daily ON bet_recommendations(is_daily_pick);

-- Bet results
CREATE TABLE bet_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recommendation_id INTEGER,
    game_id TEXT NOT NULL,
    bet_type TEXT NOT NULL,
    bet_selection TEXT NOT NULL,
    odds INTEGER NOT NULL,
    bet_amount REAL,
    placed_at TIMESTAMP,
    placed_by TEXT,
    result TEXT,
    profit_loss REAL,
    notes TEXT
);

CREATE INDEX idx_results_date ON bet_results(placed_at);

-- System configuration
CREATE TABLE system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT
);

-- Default config values
INSERT INTO system_config VALUES
    ('max_bet_amount', '10', 'Maximum dollars per bet'),
    ('min_confidence', '7.0', 'Minimum confidence to recommend'),
    ('daily_bet_limit', '1', 'Max bets per day'),
    ('monthly_budget', '200', 'Max wagered per month'),
    ('enabled_sports', 'nba', 'Active sports'),
    ('paper_trading', 'true', 'Track without real money');
