'use client';

import { useCollaboration } from './CollaborationProvider';

export function CursorTracker() {
  const { activeUsers } = useCollaboration();

  return (
    <>
      {activeUsers.map((user) => {
        if (!user.cursor) return null;
        
        return (
          <div
            key={user.id}
            className="fixed pointer-events-none z-50 transition-transform duration-100"
            style={{
              left: user.cursor.x,
              top: user.cursor.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Cursor */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.5 3.21V20.79L10.5 15.79L13.5 20.79L15.5 19.79L12.5 14.79L18.5 13.79L5.5 3.21Z"
                fill={user.color}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>
            
            {/* User label */}
            <div
              className="ml-6 -mt-2 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap shadow-lg"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        );
      })}
    </>
  );
}
