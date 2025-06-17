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
  try {
    console.log('🎮 Creating room with params:', {
      player1_id,
      player1_name,
      player1_word,
      player1_color,
      game_mode,
    });

    // Generate a unique 6-char room code
    const room_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log('🔑 Generated room code:', room_code);
    
    // Create the room
    console.log('📝 Creating room in database...');
    const { data: room, error: roomError } = await supabase
      .from('game_rooms')
      .insert([
        {
          room_code,
          creator_id: player1_id,
          max_players: 2,
          current_players: 1,
          board_size: 3,
          board: Array(9).fill(null),
          status: 'waiting',
          game_mode,
        },
      ])
      .select()
      .single();

    if (roomError) {
      console.error('❌ Room creation error:', roomError);
      throw new Error(`Failed to create room: ${roomError.message}`);
    }

    console.log('✅ Room created successfully:', room);

    // Add the creator as the first player
    console.log('👤 Adding creator as first player...');
    const { error: playerError } = await supabase
      .from('room_players')
      .insert([
        {
          room_code,
          player_id: player1_id,
          player_name: player1_name,
          player_word: player1_word,
          player_color: player1_color,
          player_symbol: game_mode === 'regular' ? 'X' : player1_word,
          join_order: 0,
          is_creator: true,
        },
      ]);

    if (playerError) {
      console.error('❌ Player creation error:', playerError);
      throw new Error(`Failed to add player to room: ${playerError.message}`);
    }

    console.log('✅ Player added successfully');
    return room;
  } catch (error: any) {
    console.error('💥 createRoom exception:', error);
    
    // Provide more specific error messages
    if (error.message?.includes('Failed to fetch')) {
      throw new Error('Connection failed: Please check your internet connection and Supabase configuration. Visit /connection-test to diagnose the issue.');
    }
    
    if (error.message?.includes('JWT')) {
      throw new Error('Authentication error: Invalid Supabase credentials. Please check your NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    }
    
    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      throw new Error('Database schema error: Required tables do not exist. Please run the database schema setup.');
    }
    
    throw error;
  }
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

  // Add the second player
  const { error: playerError } = await supabase
    .from('room_players')
    .insert([
      {
        room_code,
        player_id: player2_id,
        player_name: player2_name,
        player_word: player2_word,
        player_color: player2_color,
        player_symbol: game_mode === 'regular' ? 'O' : player2_word,
        join_order: existingPlayers ? existingPlayers.length : 1,
        is_creator: false,
      },
    ]);

  if (playerError) throw playerError;

  // Update room status
  const { data: updatedRoom, error: updateError } = await supabase
    .from('game_rooms')
    .update({
      current_players: (existingPlayers ? existingPlayers.length : 0) + 1,
      status: 'active',
    })
    .eq('room_code', room_code)
    .select()
    .single();

  if (updateError) throw updateError;

  return updatedRoom;
}

export async function getRoomByCode(room_code: string) {
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

  // Transform to old format for backward compatibility
  const player1 = players.find(p => p.join_order === 0);
  const player2 = players.find(p => p.join_order === 1);

  return {
    ...room,
    player1_id: player1?.player_id,
    player1_name: player1?.player_name,
    player1_word: player1?.player_word,
    player1_color: player1?.player_color,
    player2_id: player2?.player_id,
    player2_name: player2?.player_name,
    player2_word: player2?.player_word,
    player2_color: player2?.player_color,
  };
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
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'room_players',
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
      current_player_index: current_player - 1, // Convert to 0-based index
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