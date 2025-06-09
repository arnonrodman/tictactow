import { supabase } from './supabaseClient';

export async function createRoom({
  player1_id,
  player1_name,
  player1_word,
  player1_color,
  game_mode,
}: {
  player1_id: string;
  player1_name: string;
  player1_word: string;
  player1_color: string;
  game_mode?: string;
}) {
  // Generate a unique 6-char room code
  const room_code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data, error } = await supabase
    .from('game_rooms')
    .insert([
      {
        room_code,
        player1_id,
        player1_name,
        player1_word,
        player1_color,
        status: 'waiting',
        game_mode,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function joinRoom({
  room_code,
  player2_id,
  player2_name,
  player2_word,
  player2_color,
  game_mode,
}: {
  room_code: string;
  player2_id: string;
  player2_name: string;
  player2_word: string;
  player2_color: string;
  game_mode?: string;
}) {
  // Only join if status is 'waiting' and player2_id is null
  const { data, error } = await supabase
    .from('game_rooms')
    .update({
      player2_id,
      player2_name,
      player2_word,
      player2_color,
      status: 'active',
      game_mode,
    })
    .eq('room_code', room_code)
    .is('player2_id', null)
    .eq('status', 'waiting')
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getRoomByCode(room_code: string) {
  const { data, error } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('room_code', room_code)
    .single();
  if (error) throw error;
  return data;
}

export function subscribeToRoom(room_code: string, callback: (payload: any) => void) {
  return supabase
    .channel('game_rooms')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_rooms',
        filter: `room_code=eq.${room_code}`,
      },
      payload => {
        callback(payload);
      }
    )
    .subscribe();
}

export async function makeMove({
  room_code,
  board,
  current_player,
  winner_id,
  is_draw,
  winning_cells,
  status,
}: {
  room_code: string;
  board: (string | null)[];
  current_player: number;
  winner_id?: string | null;
  is_draw?: boolean;
  winning_cells?: number[];
  status?: string;
}) {
  const { data, error } = await supabase
    .from('game_rooms')
    .update({
      board,
      current_player,
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