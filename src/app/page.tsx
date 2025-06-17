"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom, joinRoom, getRoomByCode } from '../utils/gameRoomApi';
import { createMultiRoom, joinMultiRoom, getMultiRoomByCode } from '../utils/multiPlayerGameRoomApi';

const GAME_MODES = [
  { value: 'regular', label: 'Regular (X/O)', icon: '❌⭕', desc: 'Classic X and O' },
  { value: 'words', label: 'Words (3-letter)', icon: '🔤', desc: 'Use your own 3-letter word' },
  { value: 'emoji', label: 'Emoji', icon: '😎', desc: 'Play with your favorite emoji' },
  { value: 'multi', label: 'Multi-Multi Player', icon: '👥', desc: 'Play with 3+ players' },
];

export default function Home() {
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [playerWord, setPlayerWord] = useState('');
  const [playerColor, setPlayerColor] = useState('#2563eb');
  const [gameMode, setGameMode] = useState('regular');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isMultiMode, setIsMultiMode] = useState(false);
  const router = useRouter();

  const handleCreateRoom = async () => {
    setError('');
    if (!playerName || (gameMode === 'words' && (!playerWord || playerWord.length !== 3)) || (gameMode === 'emoji' && (!playerWord || playerWord.length < 1))) {
      setError('Enter your name' + (gameMode === 'words' ? ' and a 3-letter word.' : gameMode === 'emoji' ? ' and an emoji.' : '.'));
      return;
    }
    setLoading(true);
    try {
      const player1_id = Math.random().toString(36).substring(2, 12); // temp anon id
      
      if (gameMode === 'multi') {
        // Use Multi-Multi Player API
        const room = await createMultiRoom({
          creator_id: player1_id,
          creator_name: playerName,
          creator_word: playerWord || 'X',
          creator_color: playerColor,
          game_mode: 'words',
          max_players: maxPlayers,
        });
        router.push(`/game/${room.room_code}?pid=${player1_id}&multi=true`);
      } else {
        // Use regular 2-player API
        const room = await createRoom({
          player1_id,
          player1_name: playerName,
          player1_word: gameMode === 'words' || gameMode === 'emoji' ? playerWord : 'X',
          player1_color: playerColor,
          game_mode: gameMode,
        });
        router.push(`/game/${room.room_code}?pid=${player1_id}`);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    setError('');
    if (!roomCode || !playerName || (gameMode === 'words' && (!playerWord || playerWord.length !== 3)) || (gameMode === 'emoji' && (!playerWord || playerWord.length < 1))) {
      setError('Enter room code, your name' + (gameMode === 'words' ? ', and a 3-letter word.' : gameMode === 'emoji' ? ', and an emoji.' : '.'));
      return;
    }
    setLoading(true);
    try {
      const player2_id = Math.random().toString(36).substring(2, 12); // temp anon id
      
      // First check if it's a multi-player room
      try {
        const multiRoom = await getMultiRoomByCode(roomCode.toUpperCase());
        if (multiRoom) {
          // It's a multi-player room
          await joinMultiRoom({
            room_code: roomCode.toUpperCase(),
            player_id: player2_id,
            player_name: playerName,
            player_word: playerWord || 'O',
            player_color: playerColor,
          });
          router.push(`/game/${roomCode.toUpperCase()}?pid=${player2_id}&multi=true`);
          return;
        }
      } catch (e) {
        // Not a multi-player room, try regular room
      }
      
      // Try regular 2-player room
      await joinRoom({
        room_code: roomCode.toUpperCase(),
        player2_id,
        player2_name: playerName,
        player2_word: gameMode === 'words' || gameMode === 'emoji' ? playerWord : 'O',
        player2_color: playerColor,
        game_mode: gameMode,
      });
      router.push(`/game/${roomCode.toUpperCase()}?pid=${player2_id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-transparent px-2 sm:px-0">
      <div className="bg-[#222a4d]/95 shadow-2xl rounded-3xl p-3 sm:p-8 max-w-md w-full flex flex-col items-center border-4 border-[#3f51b5] relative z-10 overflow-y-auto max-h-[98vh]">
        <h1 className="text-2xl sm:text-4xl font-extrabold mb-1 sm:mb-2 flex items-center gap-2 text-yellow-400 drop-shadow-lg">
          <span role="img" aria-label="game">🟦</span> Tic-Tac-Toe
        </h1>
        <p className="mb-3 sm:mb-6 text-base sm:text-lg text-blue-200 font-medium text-center">Play with a friend in real time or locally!</p>
        <button
          className="mb-3 sm:mb-6 px-4 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-yellow-400 via-pink-500 to-blue-400 text-white rounded-xl text-base sm:text-lg font-bold shadow-lg hover:scale-105 transition w-full border-2 border-yellow-300"
          onClick={() => router.push('/local')}
        >
          Play Local (Same Device)
        </button>
        <div className="w-full mb-3 sm:mb-6">
          <span className="block mb-1 sm:mb-2 font-semibold text-gray-700 text-sm sm:text-base">Choose Game Mode</span>
          <div className="flex flex-col gap-1 sm:gap-2">
            {GAME_MODES.map(mode => (
              <label key={mode.value} className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl border-2 cursor-pointer transition-all ${gameMode === mode.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'} hover:border-blue-400 text-xs sm:text-base`}>
                <input
                  type="radio"
                  className="accent-blue-600"
                  value={mode.value}
                  checked={gameMode === mode.value}
                  onChange={() => setGameMode(mode.value)}
                />
                <span className="text-lg sm:text-2xl">{mode.icon}</span>
                <span className="font-bold text-gray-800">{mode.label}</span>
                <span className="hidden sm:inline text-xs text-gray-500 ml-2">{mode.desc}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center w-full mb-2 sm:mb-4">
          <input
            className="mb-2 px-3 sm:px-4 py-2 border-2 border-yellow-300 rounded w-full text-base sm:text-lg text-gray-900 bg-yellow-50 placeholder:text-blue-700"
            type="text"
            placeholder="Your Name"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
          />
          {gameMode === 'words' && (
            <>
              <input
                className="mb-2 px-3 sm:px-4 py-2 border-2 border-yellow-300 rounded w-full uppercase text-base sm:text-lg text-gray-900 bg-yellow-50 placeholder:text-blue-700"
                type="text"
                placeholder="Your 3-letter Word"
                maxLength={3}
                value={playerWord}
                onChange={e => setPlayerWord(e.target.value)}
              />
              <input
                className="mb-2 px-3 sm:px-4 py-2 border-2 border-yellow-300 rounded w-full bg-yellow-50"
                type="color"
                value={playerColor}
                onChange={e => setPlayerColor(e.target.value)}
              />
            </>
          )}
          {gameMode === 'emoji' && (
            <input
              className="mb-2 px-3 sm:px-4 py-2 border-2 border-yellow-300 rounded w-full text-2xl text-gray-900 bg-yellow-50 placeholder:text-blue-700"
              type="text"
              placeholder="Your Emoji (e.g. 😎)"
              maxLength={2}
              value={playerWord}
              onChange={e => setPlayerWord(e.target.value)}
            />
          )}
        </div>
        <button
          className="mb-2 sm:mb-4 px-4 sm:px-8 py-2 sm:py-3 bg-blue-600 text-white rounded-xl text-base sm:text-lg font-bold shadow hover:bg-blue-700 transition disabled:opacity-50 w-full"
          onClick={handleCreateRoom}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Room'}
        </button>
        <div className="flex flex-col items-center w-full">
          <input
            className="mb-2 px-3 sm:px-4 py-2 border-2 border-yellow-300 rounded w-full uppercase text-base sm:text-lg text-gray-900 bg-yellow-50 placeholder:text-blue-700"
            type="text"
            placeholder="Enter Room Code"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value)}
          />
          <button
            className="px-4 sm:px-8 py-2 sm:py-3 bg-green-600 text-white rounded-xl text-base sm:text-lg font-bold shadow hover:bg-green-700 transition w-full disabled:opacity-50"
            onClick={handleJoinRoom}
            disabled={loading}
          >
            {loading ? 'Joining...' : 'Join Room'}
          </button>
          {error && <p className="text-red-500 mt-2 text-center font-semibold">{error}</p>}
        </div>
        {gameMode === 'multi' && (
          <div className="mb-2 w-full">
            <label className="block mb-1 font-semibold text-sm">Max Players</label>
            <select
              className="w-full px-3 sm:px-4 py-2 border-2 border-yellow-300 rounded bg-yellow-50"
              value={maxPlayers}
              onChange={e => setMaxPlayers(parseInt(e.target.value))}
            >
              <option value={3}>3 Players</option>
              <option value={4}>4 Players</option>
              <option value={5}>5 Players</option>
              <option value={6}>6 Players</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
