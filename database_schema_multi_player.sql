-- Updated game_rooms table for Multi-Multi Player support
CREATE TABLE game_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(6) UNIQUE NOT NULL,
  creator_id VARCHAR(50) NOT NULL,
  max_players INTEGER DEFAULT 2,
  current_players INTEGER DEFAULT 1,
  board_size INTEGER DEFAULT 3, -- Dynamic board size (3x3, 4x4, 5x5, etc.)
  board TEXT[] DEFAULT '{}', -- Dynamic board array
  current_player_index INTEGER DEFAULT 0, -- 0-based index for current player
  winner_id VARCHAR(50),
  is_draw BOOLEAN DEFAULT FALSE,
  game_mode VARCHAR(20) DEFAULT 'regular',
  winning_cells INTEGER[] DEFAULT '{}',
  game_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'waiting', -- waiting, active, finished
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- New table for players in a room (supports multiple players)
CREATE TABLE room_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(6) NOT NULL,
  player_id VARCHAR(50) NOT NULL,
  player_name VARCHAR(100) NOT NULL,
  player_word VARCHAR(10) NOT NULL, -- Increased length for emojis
  player_color VARCHAR(7) NOT NULL,
  player_symbol VARCHAR(10) NOT NULL, -- X, O, or custom symbol
  player_score INTEGER DEFAULT 0,
  join_order INTEGER NOT NULL, -- Order in which player joined (0, 1, 2, ...)
  is_creator BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_code, player_id),
  UNIQUE(room_code, join_order)
);

-- Keep player_moves table as is (already supports multiple players)
CREATE TABLE player_moves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(6) NOT NULL,
  player_id VARCHAR(50) NOT NULL,
  cell_index INTEGER NOT NULL,
  word VARCHAR(10) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable real-time for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;

-- Create indexes for better performance
CREATE INDEX idx_game_rooms_room_code ON game_rooms(room_code);
CREATE INDEX idx_game_rooms_status ON game_rooms(status);
CREATE INDEX idx_room_players_room_code ON room_players(room_code);
CREATE INDEX idx_room_players_player_id ON room_players(player_id);
CREATE INDEX idx_player_moves_room_code ON player_moves(room_code);

-- Enable Row Level Security (RLS)
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_moves ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access (for simplicity)
CREATE POLICY "Allow all operations on game_rooms" ON game_rooms FOR ALL USING (true);
CREATE POLICY "Allow all operations on room_players" ON room_players FOR ALL USING (true);
CREATE POLICY "Allow all operations on player_moves" ON player_moves FOR ALL USING (true); 