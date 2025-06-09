"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const GAME_MODES = [
  { value: 'regular', label: 'Regular (X/O)', icon: '❌⭕', desc: 'Classic X and O' },
  { value: 'words', label: 'Words (3-letter)', icon: '🔤', desc: 'Use your own 3-letter word' },
  { value: 'emoji', label: 'Emoji', icon: '😎', desc: 'Play with your favorite emoji' },
];

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

const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  React.useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}

export default function LocalGame() {
  const router = useRouter();
  const [gameMode, setGameMode] = useState('regular');
  const [p1, setP1] = useState('Player 1');
  const [p2, setP2] = useState('Player 2');
  const [p1Word, setP1Word] = useState('X');
  const [p2Word, setP2Word] = useState('O');
  const [p1Color, setP1Color] = useState('#2563eb');
  const [p2Color, setP2Color] = useState('#e11d48');
  const [started, setStarted] = useState(false);
  const [board, setBoard] = useState<(string|null)[]>(Array(9).fill(null));
  const [current, setCurrent] = useState(1);
  const [winner, setWinner] = useState<string|null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [winningCells, setWinningCells] = useState<number[]>([]);
  const { width, height } = useWindowSize();

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setCurrent(1);
    setWinner(null);
    setIsDraw(false);
    setWinningCells([]);
  };

  const handleCellClick = (idx: number) => {
    if (board[idx] || winner || isDraw) return;
    const newBoard = [...board];
    newBoard[idx] = current === 1 ? p1Word : p2Word;
    setBoard(newBoard);
    // Check win
    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
        setWinner(current === 1 ? p1 : p2);
        setWinningCells(pattern);
        return;
      }
    }
    if (newBoard.every(cell => cell)) {
      setIsDraw(true);
      return;
    }
    setCurrent(current === 1 ? 2 : 1);
  };

  // UI helpers
  const renderAvatar = (name: string, color: string) => (
    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-2" style={{ backgroundColor: color }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
      <div className="bg-white/90 shadow-2xl rounded-3xl p-8 max-w-md w-full flex flex-col items-center border border-blue-200">
        <button
          className="mb-4 px-4 py-2 bg-white text-blue-700 border border-blue-200 rounded-full shadow hover:bg-blue-50 transition self-start"
          onClick={() => router.push('/')}
        >
          ← Back to Lobby
        </button>
        <h1 className="text-3xl font-bold mb-4 text-blue-700 flex items-center gap-2">
          <span role="img" aria-label="game">🎮</span> Local Game
        </h1>
        {!started ? (
          <>
            <div className="w-full mb-4">
              <span className="block mb-2 font-semibold text-gray-700">Game Mode</span>
              <div className="flex flex-col gap-2">
                {GAME_MODES.map(mode => (
                  <label key={mode.value} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${gameMode === mode.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'} hover:border-blue-400`}>
                    <input
                      type="radio"
                      className="accent-blue-600"
                      value={mode.value}
                      checked={gameMode === mode.value}
                      onChange={() => {
                        setGameMode(mode.value);
                        setP1Word(mode.value === 'regular' ? 'X' : '');
                        setP2Word(mode.value === 'regular' ? 'O' : '');
                      }}
                    />
                    <span className="text-2xl">{mode.icon}</span>
                    <span className="font-bold text-gray-800">{mode.label}</span>
                    <span className="text-xs text-gray-500 ml-2">{mode.desc}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full mb-4">
              <input
                className="px-4 py-2 border rounded w-full text-lg text-gray-900"
                type="text"
                placeholder="Player 1 Name"
                value={p1}
                onChange={e => setP1(e.target.value)}
              />
              {gameMode === 'words' && (
                <input
                  className="px-4 py-2 border rounded w-full uppercase text-lg text-gray-900"
                  type="text"
                  placeholder="P1 3-letter Word"
                  maxLength={3}
                  value={p1Word}
                  onChange={e => setP1Word(e.target.value)}
                />
              )}
              {gameMode === 'emoji' && (
                <input
                  className="px-4 py-2 border rounded w-full text-2xl text-gray-900"
                  type="text"
                  placeholder="P1 Emoji (e.g. 😎)"
                  maxLength={2}
                  value={p1Word}
                  onChange={e => setP1Word(e.target.value)}
                />
              )}
              {gameMode !== 'regular' && (
                <input
                  className="px-4 py-2 border rounded w-full"
                  type="color"
                  value={p1Color}
                  onChange={e => setP1Color(e.target.value)}
                />
              )}
              <input
                className="px-4 py-2 border rounded w-full text-lg text-gray-900"
                type="text"
                placeholder="Player 2 Name"
                value={p2}
                onChange={e => setP2(e.target.value)}
              />
              {gameMode === 'words' && (
                <input
                  className="px-4 py-2 border rounded w-full uppercase text-lg text-gray-900"
                  type="text"
                  placeholder="P2 3-letter Word"
                  maxLength={3}
                  value={p2Word}
                  onChange={e => setP2Word(e.target.value)}
                />
              )}
              {gameMode === 'emoji' && (
                <input
                  className="px-4 py-2 border rounded w-full text-2xl text-gray-900"
                  type="text"
                  placeholder="P2 Emoji (e.g. 😎)"
                  maxLength={2}
                  value={p2Word}
                  onChange={e => setP2Word(e.target.value)}
                />
              )}
              {gameMode !== 'regular' && (
                <input
                  className="px-4 py-2 border rounded w-full"
                  type="color"
                  value={p2Color}
                  onChange={e => setP2Color(e.target.value)}
                />
              )}
            </div>
            <button
              className="px-8 py-3 bg-blue-600 text-white rounded-xl text-lg font-bold shadow hover:bg-blue-700 transition w-full"
              onClick={() => setStarted(true)}
              disabled={gameMode === 'words' && (p1Word.length !== 3 || p2Word.length !== 3)}
            >
              Start Game
            </button>
          </>
        ) : (
          <>
            {/* Confetti when win */}
            {winner && width > 0 && height > 0 && <Confetti width={width} height={height} />}
            <div className="mb-2 text-lg font-semibold text-gray-800">Mode: {GAME_MODES.find(m => m.value === gameMode)?.label}</div>
            <div className="flex items-center mb-2 text-gray-900">
              {renderAvatar(p1, p1Color)}
              <span className="mr-4">{p1} ({gameMode === 'regular' ? 'X' : p1Word})</span>
              <span className="mx-2">vs</span>
              {renderAvatar(p2, p2Color)}
              <span>{p2} ({gameMode === 'regular' ? 'O' : p2Word})</span>
            </div>
            <div className="w-full max-w-xs mb-4">
              <div className="grid grid-cols-3 gap-2">
                {board.map((cell, idx) => {
                  const isWinning = winningCells.includes(idx);
                  let display = cell;
                  if (gameMode === 'regular') {
                    if (cell === p1Word) display = 'X';
                    else if (cell === p2Word) display = 'O';
                  }
                  return (
                    <button
                      key={idx}
                      className={`aspect-square w-20 sm:w-24 rounded text-2xl font-bold border-2 flex items-center justify-center transition-all
                        ${cell === p1Word ? `text-white` : cell === p2Word ? `text-white` : 'text-gray-700'}
                        ${cell === p1Word ? `bg-[${p1Color}]` : cell === p2Word ? `bg-[${p2Color}]` : 'bg-white'}
                        ${isWinning ? 'ring-4 ring-green-400' : ''}
                        ${winner || isDraw || cell ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-200 cursor-pointer'}
                      `}
                      style={cell === p1Word ? { backgroundColor: p1Color } : cell === p2Word ? { backgroundColor: p2Color } : {}}
                      disabled={!!cell || !!winner || isDraw}
                      onClick={() => handleCellClick(idx)}
                    >
                      {display}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mb-2 text-blue-700 font-semibold text-lg">
              {winner ? `${winner} wins!` : isDraw ? 'Draw!' : `${current === 1 ? p1 : p2}'s turn`}
            </div>
            <button
              className="mt-4 px-8 py-3 bg-purple-600 text-white rounded-xl text-lg font-bold shadow hover:bg-purple-700 transition w-full"
              onClick={resetGame}
            >
              Rematch
            </button>
          </>
        )}
      </div>
    </div>
  );
} 