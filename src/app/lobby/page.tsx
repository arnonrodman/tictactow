"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom, joinRoom, getRoomByCode } from '../../utils/gameRoomApi';

const GAME_MODES = [
  { value: 'regular', label: 'Regular (X/O)' },
  { value: 'words', label: 'Words (3-letter)' },
  { value: 'emoji', label: 'Emoji' },
];

const LobbyPage = () => {
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [playerWord, setPlayerWord] = useState('');
  const [playerColor, setPlayerColor] = useState('#2563eb');
  const [gameMode, setGameMode] = useState('words');
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
      const room = await createRoom({
        player1_id,
        player1_name: playerName,
        player1_word: gameMode === 'words' ? playerWord.toUpperCase() : 'X',
        player1_color: playerColor,
        game_mode: gameMode,
      });
      router.push(`/game/${room.room_code}?pid=${player1_id}`);
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
      await joinRoom({
        room_code: roomCode.toUpperCase(),
        player2_id,
        player2_name: playerName,
        player2_word: gameMode === 'words' ? playerWord.toUpperCase() : 'O',
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-6">Tic-Tac-Toe Lobby</h1>
      <div className="flex flex-col items-center w-full max-w-xs mb-4">
        <label className="mb-2 w-full">
          <span className="block mb-1 font-semibold">Game Mode</span>
          <select
            className="w-full px-4 py-2 border-2 border-yellow-300 rounded"
            value={gameMode}
            onChange={e => setGameMode(e.target.value)}
          >
            {GAME_MODES.map(mode => (
              <option key={mode.value} value={mode.value}>{mode.label}</option>
            ))}
          </select>
        </label>
        <input
          className="mb-2 px-4 py-2 border-2 border-yellow-300 rounded w-full text-lg text-gray-900 bg-yellow-50 placeholder:text-blue-700"
          type="text"
          placeholder="Your Name"
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
        />
        {gameMode === 'words' && (
          <>
            <input
              className="mb-2 px-4 py-2 border-2 border-yellow-300 rounded w-full uppercase text-lg text-gray-900 bg-yellow-50 placeholder:text-blue-700"
              type="text"
              placeholder="Your 3-letter Word"
              maxLength={3}
              value={playerWord}
              onChange={e => setPlayerWord(e.target.value)}
            />
            <input
              className="mb-2 px-4 py-2 border-2 border-yellow-300 rounded w-full bg-yellow-50"
              type="color"
              value={playerColor}
              onChange={e => setPlayerColor(e.target.value)}
            />
          </>
        )}
        {gameMode === 'emoji' && (
          <input
            className="mb-2 px-4 py-2 border-2 border-yellow-300 rounded w-full text-2xl text-gray-900 bg-yellow-50 placeholder:text-blue-700"
            type="text"
            placeholder="Your Emoji (e.g. 😎)"
            maxLength={2}
            value={playerWord}
            onChange={e => setPlayerWord(e.target.value)}
          />
        )}
      </div>
      <button
        className="mb-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
        onClick={handleCreateRoom}
        disabled={loading}
      >
        {loading ? 'Creating...' : 'Create Room'}
      </button>
      <div className="flex flex-col items-center w-full max-w-xs">
        <input
          className="mb-2 px-4 py-2 border-2 border-yellow-300 rounded w-full uppercase text-lg text-gray-900 bg-yellow-50 placeholder:text-blue-700"
          type="text"
          placeholder="Enter Room Code"
          value={roomCode}
          onChange={e => setRoomCode(e.target.value)}
        />
        <button
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition w-full disabled:opacity-50"
          onClick={handleJoinRoom}
          disabled={loading}
        >
          {loading ? 'Joining...' : 'Join Room'}
        </button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
};

export default LobbyPage; 