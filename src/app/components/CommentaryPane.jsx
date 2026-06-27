// src/app/components/CommentaryPane.jsx
"use client";

export default function CommentaryPane({ commentaryData, isLoading = false, className = '' }) {
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="loading-spinner-small"></div>
          <p className="text-sm text-gray-400">Loading Commentary...</p>
          <style jsx>{`
            .loading-spinner-small {
              width: 32px;
              height: 32px;
              border: 2px solid rgba(255,255,255,0.1);
              border-top-color: #7c3aed;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!commentaryData || !commentaryData.notes || commentaryData.notes.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <p className="text-sm text-gray-400">No commentary available.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <div className="mb-4 pb-3 border-b border-gray-700/40">
        <h2 className="text-xs font-medium uppercase tracking-wider text-gray-400">
          {commentaryData.commentary || 'Commentary'}
        </h2>
        <h1 className="text-lg font-semibold text-white">
          {commentaryData.book} {commentaryData.chapter}
        </h1>
      </div>

      {/* Notes */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {commentaryData.notes.map((note, index) => (
          <div
            key={index}
            className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30"
          >
            {/* Note Header */}
            <div className="flex items-center flex-wrap gap-2 mb-2">
              {note.verses && (
                <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  {note.verses}
                </span>
              )}
              {note.title && (
                <h3 className="text-sm font-medium text-gray-200">
                  {note.title}
                </h3>
              )}
            </div>

            {/* Note Content */}
            <div className="text-sm text-gray-300 leading-relaxed">
              {note.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}