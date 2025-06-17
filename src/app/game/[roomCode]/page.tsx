"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { getRoomByCode, subscribeToRoom, makeMove } from '../../../utils/gameRoomApi';
import { getMultiRoomByCode, subscribeToMultiRoom, makeMultiMove, startMultiGame } from '../../../utils/multiPlayerGameRoomApi';
import { debugRoomByCode, getAllPlayers, getAllRooms } from '../../../utils/debugUtils';
import dynamic from 'next/dynamic';

const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

interface GamePageProps {
  params: { roomCode: string };
}

type BoardCell = string | null;

// Define a type for players
interface Player {
  id: string;
  name: string;
  color: string;
  word: string;
  symbol: string;
  is_creator: boolean;
}

const winPatterns = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}

const GamePage = () => {
  const params = useParams();
  const roomCode = params.roomCode as string;
  const searchParams = useSearchParams();
  const playerId = searchParams.get('pid');
  const isMultiMode = searchParams.get('multi') === 'true';
  const router = useRouter();

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [moveLoading, setMoveLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [opponentRematch, setOpponentRematch] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [debugData, setDebugData] = useState<any>(null);
  const { width, height } = useWindowSize();

  // Transform old room structure to new players array format
  const transformRoomToPlayers = (room: any): Player[] => {
    const players: Player[] = [];
    
    // Add player 1 if exists
    if (room.player1_id) {
      players.push({
        id: room.player1_id,
        name: room.player1_name,
        color: room.player1_color,
        word: room.player1_word,
        symbol: room.game_mode === 'regular' ? 'X' : room.player1_word,
        is_creator: true, // Player 1 is always the creator in old schema
      });
    }
    
    // Add player 2 if exists
    if (room.player2_id) {
      players.push({
        id: room.player2_id,
        name: room.player2_name,
        color: room.player2_color,
        word: room.player2_word,
        symbol: room.game_mode === 'regular' ? 'O' : room.player2_word,
        is_creator: false, // Player 2 is never the creator in old schema
      });
    }
    
    return players;
  };

  // For multi-mode, use the players from the room.players array directly
  const getPlayersArray = (room: any): Player[] => {
    if (isMultiMode && room?.players) {
      // Multi-mode: use the players array from multiPlayerGameRoomApi
      return room.players.map((p: any) => ({
        id: p.id, // This should match the player_id from database
        name: p.name,
        color: p.color,
        word: p.word,
        symbol: p.symbol,
        is_creator: p.is_creator,
      }));
    } else {
      // Regular mode: transform the old format
      return transformRoomToPlayers(room);
    }
  };

  // Update players array type - use appropriate data source
  const players: Player[] = room ? getPlayersArray(room) : [];
  const currentPlayerIndex = room?.current_player_index ?? 0; // Use current_player_index directly (0-based)
  const myPlayerIndex = players.findIndex(player => player.id === playerId);
  const myTurn = room && currentPlayerIndex === myPlayerIndex;
  const boardSize = Math.max(3, players.length + 1); // Dynamic board size based on players
  const board: BoardCell[] = room?.board || Array(boardSize * boardSize).fill(null);
  const gameMode = room?.game_mode || 'regular';
  const myWord = players[myPlayerIndex]?.word;
  const regularSymbols = players[myPlayerIndex]?.symbol;

  // Trigger confetti when someone wins
  useEffect(() => {
    if (room?.status === 'finished' && (room?.winner_id || room?.is_draw)) {
      setShowConfetti(true);
      // Stop confetti after 5 seconds
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else if (room?.status !== 'finished') {
      // Clear confetti when game is reset/rematch
      setShowConfetti(false);
    }
  }, [room?.winner_id, room?.is_draw, room?.status]);

  // Enhanced debugging effect
  useEffect(() => {
    console.log('=== DEBUGGING GAME PAGE ===');
    console.log('Room Code:', roomCode);
    console.log('Player ID from URL:', playerId);
    console.log('Is Multi Mode:', isMultiMode);
    console.log('Raw Room Data:', room);
    console.log('Transformed Players Array:', players);
    console.log('My Player Index:', myPlayerIndex);
    console.log('Current Player Index:', currentPlayerIndex);
    
    // Show detailed player ID matching
    if (players.length > 0) {
      console.log('=== PLAYER ID MATCHING ===');
      players.forEach((player, index) => {
        const matches = player.id === playerId;
        console.log(`Player ${index}: ID="${player.id}", Name="${player.name}", Matches URL: ${matches}`);
      });
      
      if (myPlayerIndex === -1) {
        console.error('❌ PLAYER NOT FOUND!');
        console.error('Looking for player ID:', playerId);
        console.error('Available player IDs:', players?.length > 0 ? players.map(p => p.id) : 'No players available');
        console.error('Player ID type:', typeof playerId);
        console.error('Available ID types:', players?.length > 0 ? players.map(p => typeof p.id) : 'No players available');
      } else {
        console.log('✅ Player found at index:', myPlayerIndex);
        console.log('Player data:', players[myPlayerIndex]);
      }
    }
    
    // Debug database directly
    if (roomCode) {
      debugRoomByCode(roomCode.toUpperCase()).then(debugData => {
        console.log('=== DIRECT DB DEBUG ===');
        console.log('Direct DB Debug:', debugData);
        if (debugData?.players) {
          console.log('DB Players:', debugData.players.map((p: any) => ({
            player_id: p.player_id,
            player_name: p.player_name,
            join_order: p.join_order
          })));
        }
      });
    }
  }, [room, players, myPlayerIndex, roomCode, playerId, isMultiMode, currentPlayerIndex]);

  // Move handleCellClick to the top with other hooks
  const handleCellClick = useCallback(async (idx: number) => {
    if (!room || !myTurn || board[idx] || room.winner_id || room.is_draw || moveLoading) return;
    setMoveLoading(true);
    const newBoard = [...board];
    newBoard[idx] = gameMode === 'regular' ? regularSymbols : myWord;
    
    // Check for win (update logic for larger boards)
    let winner_id = null;
    let is_draw = false;
    let winning_cells: number[] = [];
    let status = 'active';
    
    // Generate win patterns dynamically based on board size
    const boardSize = Math.sqrt(board.length);
    const winPatterns = generateWinPatterns(boardSize);
    
    for (const pattern of winPatterns) {
      if (pattern.every(pos => newBoard[pos] && newBoard[pos] === newBoard[pattern[0]])) {
        winner_id = playerId;
        winning_cells = pattern;
        status = 'finished';
        break;
      }
    }
    
    if (!winner_id && newBoard.every(cell => cell)) {
      is_draw = true;
      status = 'finished';
    }
    
    try {
      if (isMultiMode) {
        await makeMultiMove({
          room_code: roomCode.toUpperCase(),
          player_id: playerId!,
          cell_index: idx,
          board: newBoard,
          current_player_index: (currentPlayerIndex + 1) % players.length,
          winner_id,
          is_draw,
          winning_cells,
          status,
        });
      } else {
      await makeMove({
        room_code: roomCode.toUpperCase(),
        board: newBoard,
          current_player: ((currentPlayerIndex + 1) % players.length) + 1,
        winner_id,
        is_draw,
        winning_cells,
        status,
      });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMoveLoading(false);
    }
  }, [room, myTurn, board, myWord, playerId, roomCode, moveLoading, gameMode, regularSymbols, players, currentPlayerIndex, isMultiMode]);

  // Fetch room on mount - use appropriate API based on mode
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        let roomData;
        if (isMultiMode) {
          roomData = await getMultiRoomByCode(roomCode.toUpperCase());
        } else {
          roomData = await getRoomByCode(roomCode.toUpperCase());
        }
        setRoom(roomData);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRoom();
  }, [roomCode, isMultiMode]);

  // Subscribe to real-time updates - use appropriate subscription
  useEffect(() => {
    if (!room) return;
    
    let sub;
    if (isMultiMode) {
      sub = subscribeToMultiRoom(roomCode.toUpperCase(), payload => {
        if (payload.new) {
          // Refetch room data to get updated players
          getMultiRoomByCode(roomCode.toUpperCase()).then(setRoom);
        }
      });
    } else {
      sub = subscribeToRoom(roomCode.toUpperCase(), payload => {
        if (payload.new) {
          // Refetch complete room data instead of using raw payload
          getRoomByCode(roomCode.toUpperCase()).then(setRoom).catch(console.error);
        }
      });
    }
    
    return () => {
      sub.unsubscribe();
    };
  }, [room, roomCode, isMultiMode]);

  // Move error handling to useEffect
  useEffect(() => {
    if (myPlayerIndex === -1 && playerId && players && players.length > 0) {
      const fetchDebugData = async () => {
        try {
          // Fetch all players and rooms from database
          const [allPlayers, allRooms] = await Promise.all([
            getAllPlayers(),
            getAllRooms()
          ]);
          
          const debugInfo = {
            allPlayers,
            allRooms,
            currentRoom: room,
            currentPlayers: players,
            searchingFor: playerId,
            roomCode: roomCode
          };
          
          setDebugData(debugInfo);
          setError(`Player not found in the room. Looking for player ID: "${playerId}". Available players: ${players.map(p => `"${p.id}"`).join(', ')}`);
        } catch (e) {
          console.error('Error fetching debug data:', e);
          setError(`Player not found in the room. Looking for player ID: "${playerId}". Available players: ${players.map(p => `"${p.id}"`).join(', ')}. Failed to fetch debug data.`);
        }
      };
      
      fetchDebugData();
    }
  }, [myPlayerIndex, playerId, players, room, roomCode]);

  // Listen for opponent rematch (simulate with state for now)
  useEffect(() => {
    if (rematchRequested && !opponentRematch) {
      // In real app, listen to a rematch flag in Supabase
      // For demo, auto-set after 2s
      const t = setTimeout(() => setOpponentRematch(true), 2000);
      return () => clearTimeout(t);
    }
  }, [rematchRequested, opponentRematch]);

  // Ensure myPlayerIndex is valid
  if (myPlayerIndex === -1) {
    return <div className="flex items-center justify-center min-h-screen text-red-500">Player not found in the room.</div>;
  }

  // Get player info safely
  const myColor = players[myPlayerIndex]?.color;
  const nextPlayerIndex = (currentPlayerIndex + 1) % Math.max(players.length, 1);
  const oppWord = players[nextPlayerIndex]?.word;
  const oppColor = players[nextPlayerIndex]?.color;
  const oppSymbol = players[nextPlayerIndex]?.symbol;

  // Calculate grid size
  const gridSize = Math.sqrt(board.length);

  // Function to generate win patterns for any board size
  const generateWinPatterns = (size: number): number[][] => {
    const patterns: number[][] = [];
    
    // Rows
    for (let row = 0; row < size; row++) {
      const pattern = [];
      for (let col = 0; col < size; col++) {
        pattern.push(row * size + col);
      }
      patterns.push(pattern);
    }
    
    // Columns
    for (let col = 0; col < size; col++) {
      const pattern = [];
      for (let row = 0; row < size; row++) {
        pattern.push(row * size + col);
      }
      patterns.push(pattern);
    }
    
    // Diagonal (top-left to bottom-right)
    const diag1 = [];
    for (let i = 0; i < size; i++) {
      diag1.push(i * size + i);
    }
    patterns.push(diag1);
    
    // Diagonal (top-right to bottom-left)
    const diag2 = [];
    for (let i = 0; i < size; i++) {
      diag2.push(i * size + (size - 1 - i));
    }
    patterns.push(diag2);
    
    return patterns;
  };

  // Rematch logic (simplified: both players must click rematch)
  const handleRematch = async () => {
    setRematchRequested(true);
    // Here, you would update a rematch flag in Supabase and listen for both players to agree
    // For demo, just reset board if both click
    if (opponentRematch) {
      try {
        await makeMove({
          room_code: roomCode.toUpperCase(),
          board: Array(boardSize * boardSize).fill(null),
          current_player: 1,
          winner_id: null,
          is_draw: false,
          winning_cells: [],
          status: 'active',
        });
        setRematchRequested(false);
        setOpponentRematch(false);
        setShowConfetti(false);
      } catch (e: any) {
        setError(e.message);
      }
    }
  };

  // Avatar helper
  const renderAvatar = (name: string, color: string) => (
    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-2" style={{ backgroundColor: color }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );

  // Update handleStartMultiMultiGame to actually start the game
  const handleStartMultiMultiGame = async () => {
    if (!isMultiMode || !room || !playerId) return;
    
    try {
      await startMultiGame(roomCode.toUpperCase(), playerId);
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Function to generate a shareable link
  const generateShareableLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/game/${roomCode}`;
  };

  // Function to share the room code via WhatsApp
  const shareViaWhatsApp = () => {
    const link = generateShareableLink();
    const whatsappUrl = `https://wa.me/?text=Join%20my%20Tic-Tac-Toe%20game!%20Click%20here%20to%20join:%20${encodeURIComponent(link)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>;
  if (!room) return <div className="flex items-center justify-center min-h-screen">Room not found.</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-transparent p-4">
      <div className="bg-[#222a4d]/95 shadow-2xl rounded-3xl p-8 max-w-md w-full flex flex-col items-center border-4 border-[#3f51b5] relative z-10">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900">Room: {roomCode}</h1>
        <div className="mb-2 text-lg font-semibold text-gray-800">
          Mode: {isMultiMode ? 'Multi-Multi Player' : gameMode === 'regular' ? 'Regular (X/O)' : gameMode === 'words' ? 'Words (3-letter)' : 'Emoji'}
        </div>
        {isMultiMode ? (
          // Multi-Multi Player UI
          <div className="mb-4 w-full">
            <div className="text-sm font-semibold text-gray-700 mb-2">Players ({players.length}/{room?.max_players || 4}):</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {players.map((player, index) => (
                <div key={player.id} className={`flex items-center p-2 rounded ${currentPlayerIndex === index ? 'bg-blue-100 border-2 border-blue-400' : 'bg-gray-100'}`}>
                  {renderAvatar(player.name, player.color)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{player.name}</div>
                    <div className="text-xs text-gray-500">{player.symbol}</div>
                  </div>
                  {player.is_creator && <span className="text-xs bg-yellow-200 px-1 rounded">Host</span>}
                  {player.id === playerId && <span className="text-xs bg-green-200 px-1 rounded">You</span>}
                </div>
              ))}
            </div>
            {room?.status === 'waiting' && (
              <div className="text-center text-sm text-gray-600">
                Waiting for more players... Share the room code to invite others!
              </div>
            )}
          </div>
        ) : (
          // Regular 2-player UI
          <div className="flex items-center mb-2 text-gray-900">
            {players[myPlayerIndex] && renderAvatar(players[myPlayerIndex].name, players[myPlayerIndex].color)}
            <span className="mr-4">{players[myPlayerIndex]?.name} ({gameMode === 'regular' ? regularSymbols : myWord})</span>
            <span className="mx-2">vs</span>
            {players.length > 1 ? (
              <>
                {renderAvatar(players[nextPlayerIndex].name, players[nextPlayerIndex].color)}
                <span>{players[nextPlayerIndex].name} ({gameMode === 'regular' ? oppSymbol : oppWord})</span>
              </>
            ) : (
              <span>Waiting for players...</span>
            )}
          </div>
        )}
        <div className="mb-2">
          {room.status === 'waiting' && <span className="text-yellow-600">Waiting for {isMultiMode ? 'players' : 'opponent'}...</span>}
          {room.status === 'active' && (
            <span className="text-blue-700 font-semibold">
              {isMultiMode ? (
                myTurn ? "Your turn!" : `${players[currentPlayerIndex]?.name}'s turn`
              ) : (
                myTurn ? 'Your turn!' : 'Waiting for opponent...'
              )}
            </span>
          )}
          {room.status === 'finished' && (
            <span className="text-green-700 font-semibold">
              {room.is_draw
                ? 'Draw!'
                : room.winner_id === playerId
                ? 'You win!'
                : `${players.find(p => p.id === room.winner_id)?.name || 'Someone'} wins!`}
            </span>
          )}
        </div>
        <div className="w-full max-w-xs">
          <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
            {board.map((cell, idx) => {
              const isWinning = room.winning_cells?.includes(idx);
              let display = cell;
              let cellColor = 'bg-white';
              if (cell === myWord) cellColor = 'bg-yellow-400';
              else if (cell === oppWord) cellColor = 'bg-pink-500';
              if (gameMode === 'regular') {
                if (cell === myWord) display = regularSymbols;
                else if (cell === oppWord) display = oppSymbol;
              }
              return (
                <button
                  key={idx}
                  className={`aspect-square w-16 sm:w-20 rounded text-lg sm:text-2xl font-bold border-2 flex items-center justify-center transition-all ${cellColor} ${isWinning ? 'ring-4 ring-green-400' : ''} ${!myTurn || cell || room.status !== 'active' ? 'cursor-not-allowed opacity-60' : 'hover:scale-105 hover:brightness-110 cursor-pointer'}`}
                  style={cell === myWord ? { backgroundColor: myColor } : cell === oppWord ? { backgroundColor: oppColor } : {}}
                  disabled={!myTurn || !!cell || room.status !== 'active' || moveLoading}
                  onClick={() => handleCellClick(idx)}
                >
                  {display}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <div>You: <span style={{ color: myColor }}>{gameMode === 'regular' ? regularSymbols : myWord}</span></div>
          <div>Opponent: <span style={{ color: oppColor }}>{gameMode === 'regular' ? oppSymbol : oppWord || '...'}</span></div>
        </div>
        {room.status === 'finished' && (
          <button
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
            onClick={handleRematch}
            disabled={rematchRequested}
          >
            {rematchRequested ? (opponentRematch ? 'Rematching...' : 'Waiting for opponent...') : 'Rematch'}
          </button>
        )}
        {error && <div className="mt-4 text-red-500">{error}</div>}
        {debugData && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-bold text-red-800 mb-3">🐛 Debug Information</h3>
            
            {/* Current Search Info */}
            <div className="mb-4 p-3 bg-white rounded border">
              <h4 className="font-semibold text-gray-800 mb-2">Search Details</h4>
              <p className="text-sm"><strong>Looking for Player ID:</strong> <code className="bg-gray-100 px-1 rounded">{debugData.searchingFor}</code></p>
              <p className="text-sm"><strong>In Room:</strong> <code className="bg-gray-100 px-1 rounded">{debugData.roomCode}</code></p>
              <p className="text-sm"><strong>Players in Room:</strong> {debugData.currentPlayers?.length || 0}</p>
            </div>

            {/* All Players in Database */}
            <div className="mb-4 p-3 bg-white rounded border">
              <h4 className="font-semibold text-gray-800 mb-2">All Players in Database ({debugData.allPlayers?.length || 0})</h4>
              {debugData.allPlayers && debugData.allPlayers.length > 0 ? (
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-1">Room</th>
                        <th className="text-left p-1">Player ID</th>
                        <th className="text-left p-1">Name</th>
                        <th className="text-left p-1">Join Order</th>
                        <th className="text-left p-1">Creator</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debugData.allPlayers.map((player: any, index: number) => (
                        <tr key={index} className={`border-b ${player.player_id === debugData.searchingFor ? 'bg-yellow-100' : ''}`}>
                          <td className="p-1 font-mono">{player.room_code}</td>
                          <td className="p-1 font-mono text-xs">{player.player_id}</td>
                          <td className="p-1">{player.player_name}</td>
                          <td className="p-1">{player.join_order}</td>
                          <td className="p-1">{player.is_creator ? '👑' : '👤'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No players found in database</p>
              )}
            </div>

            {/* All Rooms in Database */}
            <div className="mb-4 p-3 bg-white rounded border">
              <h4 className="font-semibold text-gray-800 mb-2">All Rooms in Database ({debugData.allRooms?.length || 0})</h4>
              {debugData.allRooms && debugData.allRooms.length > 0 ? (
                <div className="max-h-32 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-1">Room Code</th>
                        <th className="text-left p-1">Creator ID</th>
                        <th className="text-left p-1">Status</th>
                        <th className="text-left p-1">Players</th>
                        <th className="text-left p-1">Game Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debugData.allRooms.map((room: any, index: number) => (
                        <tr key={index} className={`border-b ${room.room_code === debugData.roomCode ? 'bg-blue-100' : ''}`}>
                          <td className="p-1 font-mono font-bold">{room.room_code}</td>
                          <td className="p-1 font-mono text-xs">{room.creator_id}</td>
                          <td className="p-1">
                            <span className={`px-1 rounded text-xs ${
                              room.status === 'active' ? 'bg-green-100 text-green-800' :
                              room.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {room.status}
                            </span>
                          </td>
                          <td className="p-1">{room.current_players}/{room.max_players}</td>
                          <td className="p-1">{room.game_mode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No rooms found in database</p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 text-xs">
              <button 
                onClick={() => router.push('/debug')} 
                className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Go to Debug Page
              </button>
              <button 
                onClick={() => router.push('/')} 
                className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Back to Home
              </button>
              <button 
                onClick={() => setDebugData(null)} 
                className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Hide Debug Info
              </button>
            </div>
          </div>
        )}
        {room.status === 'active' && currentPlayerIndex !== players.length - 1 && (
          <div className="mt-4 text-yellow-600">Opponent left or not joined yet.</div>
        )}
        <div className="mt-8 w-full flex justify-center">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 border border-blue-200 rounded-full shadow hover:bg-blue-50 transition"
            onClick={() => router.push('/')}
          >
            <span className="text-xl">←</span> <span className="font-semibold">Back to Lobby</span>
          </button>
        </div>
        {showConfetti && width > 0 && height > 0 && <Confetti width={width} height={height} />}
        {room.status === 'waiting' && isMultiMode && players.find(p => p.id === playerId)?.is_creator && (
          <button 
            onClick={handleStartMultiMultiGame} 
            className="mb-4 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            disabled={players.length < 2}
          >
            Start Multi-Multi Game ({players.length} players)
          </button>
        )}
        {isMultiMode && room.status === 'waiting' && (
          <div className="mb-4 w-full">
            <button onClick={shareViaWhatsApp} className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
              📱 Share Room Code via WhatsApp
            </button>
            <div className="mt-2 text-center">
              <span className="text-sm text-gray-600">Room Code: </span>
              <span className="font-bold text-lg">{roomCode}</span>
            </div>
          </div>
        )}
        {!isMultiMode && room.status === 'waiting' && (
          <div className="flex justify-center mt-4">
            <button onClick={shareViaWhatsApp} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
              Share Room Code via WhatsApp
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamePage; 