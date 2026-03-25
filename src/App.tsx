import React, { useState } from 'react';

const App: React.FC = () => {
  // 1. 각 약관의 체크 상태를 관리하는 State
  const [agreements, setAgreements] = useState({
    all: false,
    term1: false,
    term2: false,
    term3: false,
  });

  // 2. 전체 동의 핸들러
  const handleAllCheck = () => {
    const newValue = !agreements.all;
    setAgreements({
      all: newValue,
      term1: newValue,
      term2: newValue,
      term3: newValue,
    });
  };

  // 3. 개별 동의 핸들러
  const handleCheck = (key: keyof typeof agreements) => {
    const nextAgreements = { ...agreements, [key]: !agreements[key] };
    // 세 개가 모두 체크되었는지 확인하여 '전체 동의' 상태 업데이트
    nextAgreements.all = nextAgreements.term1 && nextAgreements.term2 && nextAgreements.term3;
    setAgreements(nextAgreements);
  };

  return (
    <div style={containerStyle}>
      <div style={wrapperStyle}>
        {/* 헤더 섹션 */}
        <header style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>회원가입</h1>
          <p style={{ color: '#888', fontSize: '15px' }}>회원가입을 위해 아래 정보를 입력해주세요</p>
        </header>

        <main style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 이메일 (아이디) */}
          <section>
            <label style={labelStyle}>
              이메일 (아이디) <span style={requiredStyle}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="email" placeholder="example@email.com" style={inputStyle} />
              <button type="button" style={blackButtonStyle}>이메일 인증</button>
            </div>
          </section>

          {/* 비밀번호 */}
          <section>
            <label style={labelStyle}>
              비밀번호 <span style={requiredStyle}>*</span>
            </label>
            <input type="password" placeholder="비밀번호를 입력하세요" style={{ ...inputStyle, marginBottom: '12px' }} />
            <input type="password" placeholder="비밀번호를 다시 입력하세요" style={inputStyle} />
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '16px 0' }} />

          {/* 약관 동의 */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>약관 동의</h2>
              {/* 모두 동의하기 버튼 */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#333' }}>
                <input 
                  type="checkbox" 
                  checked={agreements.all} 
                  onChange={handleAllCheck}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0a0a14' }} 
                />
                <strong>모두 동의하기</strong>
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <AgreementItem 
                title="개인정보 수집 및 이용 동의" 
                required 
                checked={agreements.term1}
                onCheck={() => handleCheck('term1')}
                content={
                  <div>
                    <strong style={{ display: 'block', marginBottom: '8px', color: '#333' }}>1. 수집하는 개인정보 항목</strong>
                    <p>회사는 회원가입, 상담, 서비스 신청 등을 위해 아래와 같은 개인정보를 수집하고 있습니다.</p>
                    <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                      <li>필수항목: 이메일, 비밀번호</li>
                      <li>선택항목: 마케팅 수신 동의, 푸시 알림 수신 동의</li>
                    </ul>
                    <strong style={{ display: 'block', margin: '16px 0 8px', color: '#333' }}>2. 개인정보의 수집 및 이용목적</strong>
                    <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                      <li>회원 가입 의사 확인, 회원제 서비스 제공</li>
                      <li>본인 식별 및 인증</li>
                      <li>서비스 제공에 관한 계약 이행 및 요금 정산</li>
                    </ul>
                    <strong style={{ display: 'block', margin: '16px 0 8px', color: '#333' }}>3. 개인정보의 보유 및 이용기간</strong>
                    <p>회원 탈퇴 시까지 보유하며, 탈퇴 후 즉시 파기합니다.</p>
                  </div>
                }
              />
              <AgreementItem 
                title="야간 마케팅 수신 동의" 
                optional 
                checked={agreements.term2}
                onCheck={() => handleCheck('term2')}
                content={
                  <div>
                    <p style={{ marginBottom: '8px' }}>야간(21시 ~ 익일 08시)에 서비스 관련 혜택 및 이벤트 정보를 제공받으실 수 있습니다.</p>
                    <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                      <li>제공 내용: 맞춤형 혜택 안내, 이벤트 정보, 서비스 이용 권유</li>
                      <li>제공 방법: 이메일, 앱 푸시, SMS 등</li>
                    </ul>
                  </div>
                }
              />
              <AgreementItem 
                title="푸시 알림 수신 동의" 
                optional 
                checked={agreements.term3}
                onCheck={() => handleCheck('term3')}
                content={
                  <div>
                    <p style={{ marginBottom: '8px' }}>서비스 주요 업데이트 및 활동 알림을 실시간으로 받아보실 수 있습니다.</p>
                    <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                      <li>알림 종류: 서비스 공지사항, 채팅 알림, 보안 로그인 알림</li>
                      <li>수신 거부 방법: 서비스 내 설정 메뉴</li>
                    </ul>
                  </div>
                }
              />
            </div>
          </section>

          {/* 하단 버튼 영역 */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button style={{ ...blackButtonStyle, flex: 2, padding: '16px', fontSize: '16px' }}>회원가입 완료</button>
            <button style={{ ...whiteButtonStyle, flex: 1, padding: '16px', fontSize: '16px' }}>취소</button>
          </div>
        </main>
      </div>
    </div>
  );
};

/* --- 스타일 정의 (TS 타입 적용) --- */

const containerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  backgroundColor: '#ffffff',
  padding: '20px',
  fontFamily: '"Pretendard", -apple-system, sans-serif',
};

const wrapperStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '600px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: '600',
  marginBottom: '10px',
};

const requiredStyle: React.CSSProperties = {
  color: '#ff4d4f',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '16px',
  backgroundColor: '#f5f6f7',
  border: '1px solid transparent',
  borderRadius: '12px',
  outline: 'none',
  fontSize: '15px',
  boxSizing: 'border-box',
};

const blackButtonStyle: React.CSSProperties = {
  backgroundColor: '#0a0a14',
  color: '#fff',
  border: 'none',
  borderRadius: '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
  padding: '0 24px',
  whiteSpace: 'nowrap',
};

const whiteButtonStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  color: '#666',
  border: '1px solid #e2e2e2',
  borderRadius: '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
};

/* --- 하위 컴포넌트 --- */

interface AgreementProps { 
  title: string; 
  required?: boolean; 
  optional?: boolean; 
  content?: React.ReactNode;
  checked: boolean;
  onCheck: () => void;
}

const AgreementItem: React.FC<AgreementProps> = ({ title, required, optional, content, checked, onCheck }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ border: '1px solid #f0f0f0', borderRadius: '12px', marginBottom: '10px', overflow: 'hidden' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer', backgroundColor: '#fff' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input 
            type="checkbox" 
            checked={checked}
            onChange={onCheck}
            onClick={(e) => e.stopPropagation()} 
            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0a0a14' }} 
          />
          <span style={{ fontSize: '15px', color: '#333', fontWeight: '500' }}>
            {title}
            {required && <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>}
            {optional && <span style={{ color: '#aaa', marginLeft: '4px' }}>(선택)</span>}
          </span>
        </div>
        <span style={{ color: '#ccc', fontSize: '18px', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>❯</span>
      </div>

      {isOpen && content && (
        <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderTop: '1px solid #f0f0f0', fontSize: '13px', lineHeight: '1.6', color: '#666' }}>
          {content}
        </div>
      )}
    </div>
  );
};

export default App;