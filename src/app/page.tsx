"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom, joinRoom, getRoomByCode } from '../utils/gameRoomApi';

const GAME_MODES = [
  { value: 'regular', label: 'Regular (X/O)', icon: '❌⭕', desc: 'Classic X and O' },
  { value: 'words', label: 'Words (3-letter)', icon: '🔤', desc: 'Use your own 3-letter word' },
  { value: 'emoji', label: 'Emoji', icon: '😎', desc: 'Play with your favorite emoji' },
];

export default function Home() {
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
        player1_word: gameMode === 'words' || gameMode === 'emoji' ? playerWord : 'X',
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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      <div className="bg-white/90 shadow-2xl rounded-3xl p-8 max-w-md w-full flex flex-col items-center border border-blue-200">
        <h1 className="text-4xl font-extrabold mb-2 flex items-center gap-2 text-blue-700 drop-shadow-lg">
          <span role="img" aria-label="game">🎮</span> Tic-Tac-Toe
        </h1>
        <p className="mb-6 text-lg text-gray-600 font-medium">Play with a friend in real time or locally!</p>
        <button
          className="mb-6 px-8 py-3 bg-purple-600 text-white rounded-xl text-lg font-bold shadow hover:bg-purple-700 transition w-full"
          onClick={() => router.push('/local')}
        >
          Play Local (Same Device)
        </button>
        <div className="w-full mb-6">
          <span className="block mb-2 font-semibold text-gray-700">Choose Game Mode</span>
          <div className="flex flex-col gap-2">
            {GAME_MODES.map(mode => (
              <label key={mode.value} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${gameMode === mode.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'} hover:border-blue-400`}>
                <input
                  type="radio"
                  className="accent-blue-600"
                  value={mode.value}
                  checked={gameMode === mode.value}
                  onChange={() => setGameMode(mode.value)}
                />
                <span className="text-2xl">{mode.icon}</span>
                <span className="font-bold text-gray-800">{mode.label}</span>
                <span className="text-xs text-gray-500 ml-2">{mode.desc}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center w-full mb-4">
          <input
            className="mb-2 px-4 py-2 border rounded w-full text-lg text-gray-900"
            type="text"
            placeholder="Your Name"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
          />
          {gameMode === 'words' && (
            <>
              <input
                className="mb-2 px-4 py-2 border rounded w-full uppercase text-lg text-gray-900"
                type="text"
                placeholder="Your 3-letter Word"
                maxLength={3}
                value={playerWord}
                onChange={e => setPlayerWord(e.target.value)}
              />
              <input
                className="mb-2 px-4 py-2 border rounded w-full"
                type="color"
                value={playerColor}
                onChange={e => setPlayerColor(e.target.value)}
              />
            </>
          )}
          {gameMode === 'emoji' && (
            <input
              className="mb-2 px-4 py-2 border rounded w-full text-2xl text-gray-900"
              type="text"
              placeholder="Your Emoji (e.g. 😎)"
              maxLength={2}
              value={playerWord}
              onChange={e => setPlayerWord(e.target.value)}
            />
          )}
        </div>
        <button
          className="mb-4 px-8 py-3 bg-blue-600 text-white rounded-xl text-lg font-bold shadow hover:bg-blue-700 transition disabled:opacity-50 w-full"
          onClick={handleCreateRoom}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Room'}
        </button>
        <div className="flex flex-col items-center w-full">
          <input
            className="mb-2 px-4 py-2 border rounded w-full uppercase text-lg text-gray-900"
            type="text"
            placeholder="Enter Room Code"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value)}
          />
          <button
            className="px-8 py-3 bg-green-600 text-white rounded-xl text-lg font-bold shadow hover:bg-green-700 transition w-full disabled:opacity-50"
            onClick={handleJoinRoom}
            disabled={loading}
          >
            {loading ? 'Joining...' : 'Join Room'}
          </button>
          {error && <p className="text-red-500 mt-2 text-center font-semibold">{error}</p>}
        </div>
      </div>
    </div>
  );
}
