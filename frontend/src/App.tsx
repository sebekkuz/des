import React from 'react';
import { Canvas } from '@react-three/fiber';
import useStore from './store/useModelStore';

// Main application component.  This file defines a minimal UI
// structure including a toolbar, palette, 3D canvas, and output panel.

const App: React.FC = () => {
  const { model } = useStore();

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar palette */}
      <div style={{ width: '240px', borderRight: '1px solid #ccc', padding: '0.5rem' }}>
        <h3>Palette</h3>
        <p>Drag components into the canvas</p>
        {/* Future: list of components with drag handlers */}
      </div>
      {/* Main content: 3D canvas and output */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <div style={{ padding: '0.5rem', borderBottom: '1px solid #ccc', display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => console.log('start')}>Start</button>
          <button onClick={() => console.log('pause')}>Pause</button>
          <button onClick={() => console.log('reset')}>Reset</button>
        </div>
        {/* 3D Canvas */}
        <Canvas style={{ flex: 1, background: '#f0f0f0' }}>
          {/* TODO: render nodes and connections based on model */}
        </Canvas>
        {/* Output panel */}
        <div style={{ height: '200px', borderTop: '1px solid #ccc', padding: '0.5rem', overflowY: 'auto' }}>
          <h3>Output</h3>
          {/* TODO: charts and logs */}
        </div>
      </div>
    </div>
  );
};

export default App;