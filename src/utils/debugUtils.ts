import { supabase } from './supabaseClient';

// Debug function to get all players from database
export async function getAllPlayers() {
  try {
    const { data, error } = await supabase
      .from('room_players')
      .select('*')
      .order('joined_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching players:', error);
      return null;
    }
    
    console.log('All players in database:', data);
    return data;
  } catch (e) {
    console.error('Exception fetching players:', e);
    return null;
  }
}

// Debug function to get all rooms from database
export async function getAllRooms() {
  try {
    const { data, error } = await supabase
      .from('game_rooms')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching rooms:', error);
      return null;
    }
    
    console.log('All rooms in database:', data);
    return data;
  } catch (e) {
    console.error('Exception fetching rooms:', e);
    return null;
  }
}

// Debug function to get room with players by room code
export async function debugRoomByCode(room_code: string) {
  try {
    console.log('Debugging room:', room_code);
    
    // Get room
    const { data: room, error: roomError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', room_code)
      .single();
    
    if (roomError) {
      console.error('Room error:', roomError);
      return null;
    }
    
    console.log('Room data:', room);
    
    // Get players
    const { data: players, error: playersError } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_code', room_code)
      .order('join_order');
    
    if (playersError) {
      console.error('Players error:', playersError);
      return null;
    }
    
    console.log('Players data:', players);
    
    return { room, players };
  } catch (e) {
    console.error('Exception debugging room:', e);
    return null;
  }
}

// Test function to create a sample room and player
export async function createTestRoom() {
  try {
    const room_code = 'TEST' + Math.random().toString(36).substring(2, 4).toUpperCase();
    const player_id = 'test_player_' + Math.random().toString(36).substring(2, 8);
    
    console.log('Creating test room:', room_code, 'with player:', player_id);
    
    // Create room
    const { data: room, error: roomError } = await supabase
      .from('game_rooms')
      .insert([
        {
          room_code,
          creator_id: player_id,
          max_players: 2,
          current_players: 1,
          board_size: 3,
          board: Array(9).fill(null),
          status: 'waiting',
          game_mode: 'words',
        },
      ])
      .select()
      .single();
    
    if (roomError) {
      console.error('Room creation error:', roomError);
      return null;
    }
    
    console.log('Room created:', room);
    
    // Create player
    const { data: player, error: playerError } = await supabase
      .from('room_players')
      .insert([
        {
          room_code,
          player_id,
          player_name: 'Test Player',
          player_word: 'TST',
          player_color: '#ff0000',
          player_symbol: 'TST',
          join_order: 0,
          is_creator: true,
        },
      ])
      .select()
      .single();
    
    if (playerError) {
      console.error('Player creation error:', playerError);
      return null;
    }
    
    console.log('Player created:', player);
    
    return { room, player, room_code, player_id };
  } catch (e) {
    console.error('Exception creating test room:', e);
    return null;
  }
} 