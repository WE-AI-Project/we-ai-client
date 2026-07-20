import React from 'react';

interface ErrorStateProps {
  message?: string;
  description?: string;
  onRetry?: () => void;
}

export default function ErrorState({ 
  message = "문제가 발생했습니다.", 
  description = "잠시 후 다시 시도해 주세요.", 
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[350px] w-full p-6 text-center max-w-sm mx-auto">
      <div 
        className="flex items-center justify-center w-14 h-14 rounded-full mb-4 border"
        style={{ 
          backgroundColor: 'rgba(65, 67, 27, 0.06)', 
          borderColor: 'rgba(65, 67, 27, 0.15)' 
        }}
      >
        <span className="text-2xl leading-none">🚨</span>
      </div>

      <h3 
        className="text-sm font-semibold"
        style={{ color: 'rgb(65, 67, 27)' }}
      >
        {message}
      </h3>

      <p 
        className="mt-2 text-sm leading-relaxed mb-4 break-keep"
        style={{ color: 'rgba(65, 67, 27, 0.7)' }}
      >
        {description}
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2.5 text-white font-medium font-semibold text-sm rounded-xl transition-all shadow-sm hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{ 
            backgroundColor: 'rgb(65, 67, 27)',
            '--tw-ring-color': 'rgb(65, 67, 27)' 
          } as React.CSSProperties}
        >
          다시 시도
        </button>
      )}
    </div>
  );
}