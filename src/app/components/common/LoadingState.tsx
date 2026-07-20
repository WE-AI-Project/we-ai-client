import React from 'react';

interface LoadingStateProps {
    message?: string;
}

export default function LoadingState({ message = "Synaipse 로딩 중..." }: LoadingStateProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[350px] w-full p-6 text-center">
            <div className="relative w-12 h-12">
                <div
                    className="absolute inset-0 border-4 rounded-full"
                    style={{ borderColor: 'rgba(65, 67, 27, 0.1)' }}
                ></div>

                <div
                    className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: 'rgb(65, 67, 27)', borderTopColor: 'transparent' }}
                ></div>
            </div>
            <p
                className="mt-5 text-sm font-medium"
                style={{ color: 'rgb(65, 67, 27)' }}
            >
                {message}
            </p>
        </div>
    );
}