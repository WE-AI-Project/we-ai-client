import React from 'react';

interface UnauthorizedStateProps {
  message?: string;
  onLoginRedirect?: () => void;
}

export default function UnauthorizedState({
  message = "로그인이 필요한 서비스입니다.",
  onLoginRedirect
}: UnauthorizedStateProps) {

  const handleCleanSignOut = () => {
    if (onLoginRedirect) {
      onLoginRedirect();
      return;
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.clear();
    sessionStorage.clear();

    // 2. 브라우저 일반 쿠키 강제 만료 (자동 로그인 방지 유틸)
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      // 과거 날짜로 세팅하여 쿠키를 브라우저에서 강제 삭제
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }

    window.location.href = '/login';
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px] w-full max-w-sm mx-auto">
      {/* 🛡️ 아이콘 부모 박스: ErrorState와 완벽히 대칭되는 투명도 및 테두리 설정 */}
      <div 
        className="flex items-center justify-center w-14 h-14 rounded-full mb-4 border"
        style={{
          backgroundColor: 'rgba(65, 67, 27, 0.06)',
          borderColor: 'rgba(65, 67, 27, 0.15)'
        }}
      >
        <span className="text-2xl leading-none">🛡️</span>
      </div>

      {/* 안내 메시지 제목: 슬레이트 톤을 걷어내고 메인 시그니처 컬러 적용 */}
      <h3 
        className="text-base font-semibold mb-2"
        style={{ color: 'rgb(65, 67, 27)' }}
      >
        {message}
      </h3>

      {/* 하단 가이드 설명: 가독성을 위해 70% 수준의 투명도를 준 서브 카키 톤 */}
      <p 
        className="text-sm max-w-xs mb-6 leading-relaxed break-keep"
        style={{ color: 'rgba(65, 67, 27, 0.7)' }}
      >
        인증 세션이 만료되었거나 권한이 없습니다.<br />
        로그인 후 이용해 주세요.
      </p>

      {/* 로그인하기 버튼: 통일된 유저 경험을 위한 마우스 모션 및 링 오프셋 부여 */}
      <button
        type="button"
        onClick={handleCleanSignOut}
        className="flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold transition-all shadow-sm hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{ 
          backgroundColor: 'rgb(65, 67, 27)', 
          color: 'white',
          '--tw-ring-color': 'rgb(65, 67, 27)'
        } as React.CSSProperties}
      >
        로그인하기
      </button>
    </div>
  );
}