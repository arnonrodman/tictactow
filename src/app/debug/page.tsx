"use client";
import React, { useState, useEffect } from 'react';
import { getAllPlayers, getAllRooms, createTestRoom, debugRoomByCode } from '../../utils/debugUtils';

const DebugPage = () => {
  const [players, setPlayers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [roomCode, setRoomCode] = useState('');
  const [debugResult, setDebugResult] = useState<any>(null);

  const handleGetAllPlayers = async () => {
    setLoading(true);
    const result = await getAllPlayers();
    if (result) {
      setPlayers(result);
    }
    setLoading(false);
  };

  const handleGetAllRooms = async () => {
    setLoading(true);
    const result = await getAllRooms();
    if (result) {
      setRooms(result);
    }
    setLoading(false);
  };

  const handleCreateTestRoom = async () => {
    setLoading(true);
    const result = await createTestRoom();
    setTestResult(result);
    setLoading(false);
    
    // Refresh data
    if (result) {
      handleGetAllPlayers();
      handleGetAllRooms();
    }
  };

  const handleDebugRoom = async () => {
    if (!roomCode) return;
    setLoading(true);
    const result = await debugRoomByCode(roomCode.toUpperCase());
    setDebugResult(result);
    setLoading(false);
  };

  // Load data on mount
  useEffect(() => {
    handleGetAllPlayers();
    handleGetAllRooms();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Database Debug Page</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Controls</h2>
            <div className="space-y-4">
              <button
                onClick={handleGetAllPlayers}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Get All Players'}
              </button>
              
              <button
                onClick={handleGetAllRooms}
                disabled={loading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Get All Rooms'}
              </button>
              
              <button
                onClick={handleCreateTestRoom}
                disabled={loading}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Test Room'}
              </button>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Room Code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded"
                />
                <button
                  onClick={handleDebugRoom}
                  disabled={loading || !roomCode}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                >
                  Debug Room
                </button>
              </div>
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Test Room Created</h2>
              <div className="bg-gray-100 p-4 rounded text-sm">
                <p><strong>Room Code:</strong> {testResult.room_code}</p>
                <p><strong>Player ID:</strong> {testResult.player_id}</p>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="font-semibold text-blue-800 mb-2">Test Links:</p>
                  <div className="space-y-1">
                    <a 
                      href={`/game/${testResult.room_code}?pid=${testResult.player_id}`}
                      target="_blank"
                      className="block text-blue-600 hover:text-blue-800 underline text-sm"
                    >
                      Regular Game: /game/{testResult.room_code}?pid={testResult.player_id}
                    </a>
                    <a 
                      href={`/game/${testResult.room_code}?pid=${testResult.player_id}&multi=true`}
                      target="_blank"
                      className="block text-blue-600 hover:text-blue-800 underline text-sm"
                    >
                      Multi Game: /game/{testResult.room_code}?pid={testResult.player_id}&multi=true
                    </a>
                  </div>
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer font-semibold">Raw Data</summary>
                  <div className="mt-2 text-xs">
                    <p><strong>Room:</strong> {JSON.stringify(testResult.room, null, 2)}</p>
                    <p><strong>Player:</strong> {JSON.stringify(testResult.player, null, 2)}</p>
                  </div>
                </details>
              </div>
            </div>
          )}

          {/* Debug Result */}
          {debugResult && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Room Debug Result</h2>
              <div className="bg-gray-100 p-4 rounded text-sm">
                <pre>{JSON.stringify(debugResult, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Players Table */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Players ({players.length})</h2>
          {players.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Room Code</th>
                    <th className="text-left p-2">Player ID</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Word</th>
                    <th className="text-left p-2">Color</th>
                    <th className="text-left p-2">Join Order</th>
                    <th className="text-left p-2">Creator</th>
                    <th className="text-left p-2">Joined At</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{player.room_code}</td>
                      <td className="p-2 font-mono text-xs">{player.player_id}</td>
                      <td className="p-2">{player.player_name}</td>
                      <td className="p-2">{player.player_word}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded" 
                            style={{ backgroundColor: player.player_color }}
                          ></div>
                          {player.player_color}
                        </div>
                      </td>
                      <td className="p-2">{player.join_order}</td>
                      <td className="p-2">{player.is_creator ? 'Yes' : 'No'}</td>
                      <td className="p-2">{new Date(player.joined_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No players found</p>
          )}
        </div>

        {/* Rooms Table */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Rooms ({rooms.length})</h2>
          {rooms.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Room Code</th>
                    <th className="text-left p-2">Creator ID</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Game Mode</th>
                    <th className="text-left p-2">Players</th>
                    <th className="text-left p-2">Max Players</th>
                    <th className="text-left p-2">Board Size</th>
                    <th className="text-left p-2">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2 font-bold">{room.room_code}</td>
                      <td className="p-2 font-mono text-xs">{room.creator_id}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          room.status === 'active' ? 'bg-green-100 text-green-800' :
                          room.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {room.status}
                        </span>
                      </td>
                      <td className="p-2">{room.game_mode}</td>
                      <td className="p-2">{room.current_players}</td>
                      <td className="p-2">{room.max_players}</td>
                      <td className="p-2">{room.board_size}x{room.board_size}</td>
                      <td className="p-2">{new Date(room.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No rooms found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebugPage; 