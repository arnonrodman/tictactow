import { supabase } from './supabaseClient';

export interface Player {
  id: string;
  name: string;
  word: string;
  color: string;
  symbol: string;
  score: number;
  join_order: number;
  is_creator: boolean;
}

export interface GameRoom {
  id: string;
  room_code: string;
  creator_id: string;
  max_players: number;
  current_players: number;
  board_size: number;
  board: (string | null)[];
  current_player_index: number;
  winner_id: string | null;
  is_draw: boolean;
  game_mode: string;
  winning_cells: number[];
  game_count: number;
  status: string;
  created_at: string;
  updated_at: string;
  players?: Player[];
}

// Create a new Multi-Multi Player room
export async function createMultiRoom({
  creator_id,
  creator_name,
  creator_word,
  creator_color,
  game_mode = 'words',
  max_players = 4,
}: {
  creator_id: string;
  creator_name: string;
  creator_word: string;
  creator_color: string;
  game_mode?: string;
  max_players?: number;
}) {
  // Generate a unique 6-char room code
  const room_code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const board_size = Math.max(3, max_players);
  const board = Array(board_size * board_size).fill(null);

  // Create the room
  const { data: room, error: roomError } = await supabase
    .from('game_rooms')
    .insert([
      {
        room_code,
        creator_id,
        max_players,
        current_players: 1,
        board_size,
        board,
        status: 'waiting',
        game_mode,
      },
    ])
    .select()
    .single();

  if (roomError) throw roomError;

  // Add the creator as the first player
  const { error: playerError } = await supabase
    .from('room_players')
    .insert([
      {
        room_code,
        player_id: creator_id,
        player_name: creator_name,
        player_word: creator_word,
        player_color: creator_color,
        player_symbol: game_mode === 'regular' ? 'X' : creator_word,
        join_order: 0,
        is_creator: true,
      },
    ]);

  if (playerError) throw playerError;

  return room;
}

// Join an existing Multi-Multi Player room
export async function joinMultiRoom({
  room_code,
  player_id,
  player_name,
  player_word,
  player_color,
}: {
  room_code: string;
  player_id: string;
  player_name: string;
  player_word: string;
  player_color: string;
}) {
  // Get current room info (without join)
  const { data: room, error: roomError } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('room_code', room_code)
    .single();

  if (roomError) throw roomError;
  if (!room) throw new Error('Room not found');
  if (room.status !== 'waiting') throw new Error('Room is not accepting new players');
  if (room.current_players >= room.max_players) throw new Error('Room is full');

  // Get current players separately
  const { data: existingPlayers, error: playersError } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_code', room_code);

  if (playersError) throw playersError;

  // Check if room is actually full
  if (existingPlayers && existingPlayers.length >= room.max_players) {
    throw new Error('Room is full');
  }

  const join_order = existingPlayers ? existingPlayers.length : room.current_players;
  const symbols = ['X', 'O', '△', '□', '◯', '★', '♦', '♠'];
  const player_symbol = room.game_mode === 'regular' ? symbols[join_order] : player_word;

  // Add the player
  const { error: playerError } = await supabase
    .from('room_players')
    .insert([
      {
        room_code,
        player_id,
        player_name,
        player_word,
        player_color,
        player_symbol,
        join_order,
        is_creator: false,
      },
    ]);

  if (playerError) throw playerError;

  // Update room player count and board size
  const new_board_size = Math.max(3, join_order + 2);
  const new_board = Array(new_board_size * new_board_size).fill(null);
  const new_player_count = join_order + 1;

  const { data: updatedRoom, error: updateError } = await supabase
    .from('game_rooms')
    .update({
      current_players: new_player_count,
      board_size: new_board_size,
      board: new_board,
      // Auto-start the game when 2+ players join (like regular rooms)
      status: new_player_count >= 2 ? 'active' : 'waiting',
    })
    .eq('room_code', room_code)
    .select()
    .single();

  if (updateError) throw updateError;

  return updatedRoom;
}

// Get room with players
export async function getMultiRoomByCode(room_code: string): Promise<GameRoom> {
  const { data: room, error: roomError } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('room_code', room_code)
    .single();

  if (roomError) throw roomError;

  const { data: players, error: playersError } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_code', room_code)
    .order('join_order');

  if (playersError) throw playersError;

  return {
    ...room,
    players: players.map(p => ({
      id: p.player_id,
      name: p.player_name,
      word: p.player_word,
      color: p.player_color,
      symbol: p.player_symbol,
      score: p.player_score,
      join_order: p.join_order,
      is_creator: p.is_creator,
    })),
  };
}

// Start the Multi-Multi game
export async function startMultiGame(room_code: string, creator_id: string) {
  // Verify the creator is starting the game
  const { data: player, error: playerError } = await supabase
    .from('room_players')
    .select('is_creator')
    .eq('room_code', room_code)
    .eq('player_id', creator_id)
    .single();

  if (playerError) throw playerError;
  if (!player?.is_creator) throw new Error('Only the room creator can start the game');

  const { data, error } = await supabase
    .from('game_rooms')
    .update({ status: 'active' })
    .eq('room_code', room_code)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Make a move in Multi-Multi game
export async function makeMultiMove({
  room_code,
  player_id,
  cell_index,
  board,
  current_player_index,
  winner_id,
  is_draw,
  winning_cells,
  status,
}: {
  room_code: string;
  player_id: string;
  cell_index: number;
  board: (string | null)[];
  current_player_index: number;
  winner_id?: string | null;
  is_draw?: boolean;
  winning_cells?: number[];
  status?: string;
}) {
  // Record the move
  const { data: room, error: roomError } = await supabase
    .from('game_rooms')
    .select('game_mode')
    .eq('room_code', room_code)
    .single();

  if (roomError) throw roomError;

  const { data: player, error: playerError } = await supabase
    .from('room_players')
    .select('player_word')
    .eq('room_code', room_code)
    .eq('player_id', player_id)
    .single();

  if (playerError) throw playerError;

  // Record the move in history
  await supabase
    .from('player_moves')
    .insert([
      {
        room_code,
        player_id,
        cell_index,
        word: player.player_word,
      },
    ]);

  // Update the game state
  const { data, error } = await supabase
    .from('game_rooms')
    .update({
      board,
      current_player_index,
      winner_id: winner_id ?? null,
      is_draw: is_draw ?? false,
      winning_cells: winning_cells ?? [],
      status: status ?? 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('room_code', room_code)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Subscribe to room changes
export function subscribeToMultiRoom(room_code: string, callback: (payload: any) => void) {
  return supabase
    .channel('multi_game_rooms')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_rooms',
        filter: `room_code=eq.${room_code}`,
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'room_players',
        filter: `room_code=eq.${room_code}`,
      },
      callback
    )
    .subscribe();
} 