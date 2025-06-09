"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { getRoomByCode, subscribeToRoom, makeMove } from '../../../utils/gameRoomApi';
import dynamic from 'next/dynamic';

const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

interface GamePageProps {
  params: { roomCode: string };
}

type BoardCell = string | null;

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
  const router = useRouter();

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [moveLoading, setMoveLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [opponentRematch, setOpponentRematch] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const { width, height } = useWindowSize();

  // Fetch room on mount
  useEffect(() => {
    getRoomByCode(roomCode.toUpperCase())
      .then(setRoom)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [roomCode]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!room) return;
    const sub = subscribeToRoom(roomCode.toUpperCase(), payload => {
      if (payload.new) setRoom(payload.new);
    });
    return () => {
      sub.unsubscribe();
    };
  }, [room, roomCode]);

  const isPlayer1 = room && playerId === room.player1_id;
  const isPlayer2 = room && playerId === room.player2_id;
  const myTurn = room && ((room.current_player === 1 && isPlayer1) || (room.current_player === 2 && isPlayer2));
  const board: BoardCell[] = room?.board || Array(9).fill(null);

  // Get player info
  const myWord = isPlayer1 ? room?.player1_word : room?.player2_word;
  const myColor = isPlayer1 ? room?.player1_color : room?.player2_color;
  const oppWord = isPlayer1 ? room?.player2_word : room?.player1_word;
  const oppColor = isPlayer1 ? room?.player2_color : room?.player1_color;
  const gameMode = room?.game_mode || 'words';
  const regularSymbols = isPlayer1 ? 'X' : 'O';
  const oppSymbol = isPlayer1 ? 'O' : 'X';

  // Handle move
  const handleCellClick = useCallback(async (idx: number) => {
    if (!room || !myTurn || board[idx] || room.winner_id || room.is_draw || moveLoading) return;
    setMoveLoading(true);
    const newBoard = [...board];
    newBoard[idx] = gameMode === 'regular' ? regularSymbols : myWord;
    // Check for win
    let winner_id = null;
    let is_draw = false;
    let winning_cells: number[] = [];
    let status = 'active';
    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
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
      await makeMove({
        room_code: roomCode.toUpperCase(),
        board: newBoard,
        current_player: room.current_player === 1 ? 2 : 1,
        winner_id,
        is_draw,
        winning_cells,
        status,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMoveLoading(false);
    }
  }, [room, myTurn, board, myWord, playerId, roomCode, moveLoading, gameMode, regularSymbols]);

  // Rematch logic (simplified: both players must click rematch)
  const handleRematch = async () => {
    setRematchRequested(true);
    // Here, you would update a rematch flag in Supabase and listen for both players to agree
    // For demo, just reset board if both click
    if (opponentRematch) {
      try {
        await makeMove({
          room_code: roomCode.toUpperCase(),
          board: Array(9).fill(null),
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

  // Listen for opponent rematch (simulate with state for now)
  useEffect(() => {
    if (rematchRequested && !opponentRematch) {
      // In real app, listen to a rematch flag in Supabase
      // For demo, auto-set after 2s
      const t = setTimeout(() => setOpponentRematch(true), 2000);
      return () => clearTimeout(t);
    }
  }, [rematchRequested, opponentRematch]);

  // Avatar helper
  const renderAvatar = (name: string, color: string) => (
    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-2" style={{ backgroundColor: color }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>;
  if (!room) return <div className="flex items-center justify-center min-h-screen">Room not found.</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900">Room: {roomCode}</h1>
      <div className="mb-2 text-lg font-semibold text-gray-800">Mode: {gameMode === 'regular' ? 'Regular (X/O)' : gameMode === 'words' ? 'Words (3-letter)' : 'Emoji'}</div>
      <div className="flex items-center mb-2 text-gray-900">
        {renderAvatar(room.player1_name, room.player1_color)}
        <span className="mr-4">{room.player1_name} ({gameMode === 'regular' ? 'X' : gameMode === 'words' ? room.player1_word : room.player1_word})</span>
        <span className="mx-2">vs</span>
        {renderAvatar(room.player2_name, room.player2_color)}
        <span>{room.player2_name || 'Waiting...'} ({gameMode === 'regular' ? 'O' : gameMode === 'words' ? room.player2_word : room.player2_word || '...'})</span>
      </div>
      <div className="mb-2">
        {room.status === 'waiting' && <span className="text-yellow-600">Waiting for opponent...</span>}
        {room.status === 'active' && (
          <span className="text-blue-700 font-semibold">
            {myTurn ? 'Your turn!' : 'Waiting for opponent...'}
          </span>
        )}
        {room.status === 'finished' && (
          <span className="text-green-700 font-semibold">
            {room.is_draw
              ? 'Draw!'
              : room.winner_id === playerId
              ? 'You win!'
              : 'You lose!'}
          </span>
        )}
      </div>
      <div className="w-full max-w-xs">
        <div className="grid grid-cols-3 gap-2">
          {board.map((cell, idx) => {
            const isWinning = room.winning_cells?.includes(idx);
            let display = cell;
            if (gameMode === 'regular') {
              if (cell === room.player1_word) display = 'X';
              else if (cell === room.player2_word) display = 'O';
            }
            return (
              <button
                key={idx}
                className={`aspect-square w-20 sm:w-24 rounded text-2xl font-bold border-2 flex items-center justify-center transition-all
                  ${cell === room.player1_word ? `text-white` : cell === room.player2_word ? `text-white` : 'text-gray-700'}
                  ${cell === room.player1_word ? `bg-[${room.player1_color}]` : cell === room.player2_word ? `bg-[${room.player2_color}]` : 'bg-white'}
                  ${isWinning ? 'ring-4 ring-green-400' : ''}
                  ${!myTurn || cell || room.status !== 'active' ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-200 cursor-pointer'}
                `}
                style={cell === room.player1_word ? { backgroundColor: room.player1_color } : cell === room.player2_word ? { backgroundColor: room.player2_color } : {}}
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
      {room.status === 'active' && !room.player2_id && (
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
    </div>
  );
};

export default GamePage; 