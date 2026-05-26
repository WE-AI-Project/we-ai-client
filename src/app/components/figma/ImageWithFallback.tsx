import React, { useState } from 'react'

/** 
 * 이미지 로딩 실패 시 보여줄 기본 SVG 아이콘 (Base64 형식)
 * 디자인 시스템에 따라 다른 에러 이미지 주소로 대체 가능합니다 [cite: 1].
 */
const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

/**
 * 표준 <img /> 태그의 모든 속성을 상속받습니다.
 */
export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const { src, alt, style, className, ...rest } = props

  // 에러 발생 상태 관리 [cite: 1]
  const [didError, setDidError] = useState(false)
  
  // 로딩 상태 관리: 컴포넌트 마운트 시 true로 시작하여 스켈레톤을 보여줌 [cite: 1, 62]
  const [isLoading, setIsLoading] = useState(true)

  /**
   * 이미지 로드 중 에러 발생 시 실행되는 핸들러 [cite: 1]
   */
  const handleError = () => {
    setDidError(true)
    setIsLoading(false) // 에러가 나도 스켈레톤은 끕니다.
  }

  /**
   * 이미지 로드가 완전히 완료되었을 때 실행되는 핸들러 [cite: 1, 62]
   */
  const handleLoad = () => {
    setIsLoading(false) // 스켈레톤을 제거하고 실제 이미지를 보여줍니다.
  }

  return (
    // 부모 div는 상대 경로(relative)를 가져서 스켈레톤을 위에 띄울 수 있게 합니다 [cite: 1].
    <div className="relative inline-block overflow-hidden" style={style}>
      
      {/* 1. 스켈레톤 레이어: 로딩 중이고 에러가 아닐 때만 렌더링됨 [cite: 1, 69] */}
      {isLoading && !didError && (
        <div
          // bg-gray-200와 animate-pulse를 사용해 깜빡이는 효과를 줌 [cite: 1]
          className={`absolute inset-0 bg-gray-200 animate-pulse ${className ?? ''}`}
          style={style}
          data-testid="skeleton" // 테스트용 [cite: 1]
        />
      )}

      {/* 2. 에러가 발생했을 때 보여줄 Fallback (대체) 화면 [cite: 1] */}
      {didError ? (
        <div
          className={`bg-gray-100 text-center align-middle ${className ?? ''}`}
          style={style}
        >
          <div className="flex items-center justify-center w-full h-full">
            <img 
              src={ERROR_IMG_SRC} 
              alt="Error loading image" 
              className="w-1/2 h-1/2 opacity-50"
              {...rest} 
            />
          </div>
        </div>
      ) : (
        /* 3. 실제 이미지 태그 [cite: 1] */
        <img
          src={src}
          alt={alt}
          /*
           * 로딩 중일 때는 invisible로 숨겨두되 자리는 차지하게 하여 레이아웃 밀림을 방지 [cite: 1].
           * 로딩 완료 시 fade-in 효과(transition-opacity)를 주어 자연스럽게 등장시킵니다.
           */
          className={`${className ?? ''} ${isLoading ? 'invisible' : 'visible transition-opacity duration-300'}`}
          style={style}
          {...rest}
          onError={handleError} // 에러 핸들러 연결
          onLoad={handleLoad}   // 완료 핸들러 연결
        />
      )}
    </div>
  )
}