import React from 'react';

interface EmptyStateProps {
    message?: string;
    description?: string;
    onGoBack?: () => void;
}

export default function EmptyState({
    message = "조회된 데이터가 없습니다.",
    description = "새로운 항목을 추가하거나 필터를 변경해 보세요.",
    onGoBack = () => window.location.href = '/'
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[350px] w-full p-6 text-center mx-auto max-w-2xl md:max-w-xl">
            <h3
                className="text-base font-semibold text-center break-keep whitespace-normal max-w-prose"
                style={{ color: 'rgb(65, 67, 27)' }}
            >
                {message}
            </h3>
            <p
                className="mt-2 text-sm leading-relaxed break-keep max-w-md mx-auto"
                style={{ color: 'rgba(65, 67, 27, 0.7)' }}
            >
                {description}
            </p>

            {/* focusRingColor 오류 해결 및 Tailwind 표준 포커스 링 적용 */}
            <button
                type="button"
                onClick={onGoBack}
                className="mt-6 flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#41431B] focus:ring-offset-2"
                style={{
                    background: 'rgb(65, 67, 27)'
                }}
            >
                돌아가기
            </button>
        </div>
    );
}