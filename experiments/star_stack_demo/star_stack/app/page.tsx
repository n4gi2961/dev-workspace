'use client';

import dynamic from 'next/dynamic';

// Dynamically import the 3D component with SSR disabled
// Three.js requires window/document which aren't available during SSR
const StarSandBottle = dynamic(
  () => import('../components/StarSandBottle'),
  { 
    ssr: false,
    loading: () => (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg,rgb(119, 115, 179) 0%,rgb(78, 98, 167) 50%,rgb(40, 27, 100) 100%)',
        fontFamily: "'Cormorant Garamond', Georgia, serif",
      }}>
        <div style={{
          textAlign: 'center',
          color: '#5a5048',
        }}>
          <div style={{
            fontSize: '24px',
            letterSpacing: '6px',
            marginBottom: '16px',
          }}>
            星の砂
          </div>
          <div style={{
            fontSize: '12px',
            letterSpacing: '2px',
            color: '#8b7d6b',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}>
            Loading...
          </div>
        </div>
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    )
  }
);

export default function StarSandPage() {
  return <StarSandBottle />;
}