"use client";
import React, { useEffect, useRef, useState } from 'react';

const TETROMINOES = [
  // Each shape is a 2D array of 1s and 0s
  { color: '#f44336', shape: [[1, 1, 1, 1]] }, // I
  { color: '#ffeb3b', shape: [[1, 1], [1, 1]] }, // O
  { color: '#4caf50', shape: [[0, 1, 0], [1, 1, 1]] }, // T
  { color: '#2196f3', shape: [[1, 0, 0], [1, 1, 1]] }, // J
  { color: '#ff9800', shape: [[0, 0, 1], [1, 1, 1]] }, // L
  { color: '#9c27b0', shape: [[0, 1, 1], [1, 1, 0]] }, // S
  { color: '#00bcd4', shape: [[1, 1, 0], [0, 1, 1]] }, // Z
];

const TILE_SIZE = 28; // px
const FALL_DURATION = 7000; // ms
const SPAWN_INTERVAL = 900; // ms

function getRandomTetromino() {
  const t = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
  return {
    ...t,
    left: Math.random() * 90, // percent
    delay: Math.random() * 2, // seconds
    id: Math.random().toString(36).slice(2),
  };
}

export default function TetrisBackground() {
  const [tiles, setTiles] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTiles(tiles => [getRandomTetromino(), ...tiles.filter(t => t.top === undefined || t.top < 100)]);
    }, SPAWN_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Animate falling
  useEffect(() => {
    const raf = () => {
      setTiles(tiles => tiles.map(tile => ({ ...tile, top: (tile.top ?? 0) + 0.7 })));
      requestAnimationFrame(raf);
    };
    const id = requestAnimationFrame(raf);
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {tiles.map(tile => (
        <div
          key={tile.id}
          style={{
            position: 'absolute',
            left: `${tile.left}%`,
            top: `${tile.top ?? 0}%`,
            transition: 'top 0.2s linear',
            opacity: 0.7,
          }}
        >
          {tile.shape.map((row: number[], y: number) =>
            row.map((cell, x) =>
              cell ? (
                <div
                  key={x}
                  style={{
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    background: tile.color,
                    border: '2px solid #222a4d',
                    borderRadius: 6,
                    boxShadow: '0 2px 8px #0004',
                    position: 'absolute',
                    left: x * TILE_SIZE,
                    top: y * TILE_SIZE,
                  }}
                />
              ) : null
            )
          )}
        </div>
      ))}
    </div>
  );
} 