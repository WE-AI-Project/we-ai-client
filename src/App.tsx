import React, { useState } from 'react';
import './App.css';

// --- 1. 아이콘 컴포넌트 정의 (이미지와 동일한 SVG) ---
const NameIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const EmailIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const LockIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const EyeIcon = ({ show }: { show: boolean }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>{show && <line x1="1" y1="1" x2="23" y2="23"/>}</svg>;

// --- 2. 하위 컴포넌트 타입 정의 ---
interface InputProps {
  label: string;
  placeholder: string;
  icon: React.ReactNode;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const InputWithIcon: React.FC<InputProps> = ({ label, placeholder, icon, type = "text", value, onChange }) => (
  <div className="input-group">
    <label className="label">{label}</label>
    <div className="input-container">
      <span className="input-icon">{icon}</span>
      <input type={type} placeholder={placeholder} className="input-field" value={value} onChange={onChange} />
    </div>
  </div>
);

// --- 3. 아코디언 약관 아이템 컴포넌트 ---
interface AgreementItemProps {
  title: string;
  checked: boolean;
  onCheck: () => void;
  content: string;
}

const AgreementItem: React.FC<AgreementItemProps> = ({ title, checked, onCheck, content }) => {
  const [isOpen, setIsOpen] = useState(false);

  // 헤더 클릭 시 토글 (체크박스 영역 제외)
  const toggleAccordion = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    setIsOpen(!isOpen);
  };

  return (
    <div style={{ borderBottom: '1px solid #f3f4f6' }}>
      <div className="term-item-header" onClick={toggleAccordion}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
          <input 
            type="checkbox" 
            checked={checked} 
            onChange={onCheck} 
            className="checkbox" 
            onClick={(e) => e.stopPropagation()} 
          />
          <span style={{ fontSize: '13px', fontWeight: '500' }}>
            {title}
            {title.includes('(필수)') && <span style={{color: '#ef4444'}}></span>}
          </span>
        </label>
        {/* 화살표: isOpen 상태에 따라 클래스 추가 */}
        <span className={`accordion-arrow ${isOpen ? 'open' : ''}`}>❯</span>
      </div>
      {/* 열려있을 때만 상세 내용 표시 */}
      {isOpen && <div className="term-content">{content}</div>}
    </div>
  );
};

// --- 4. 메인 App 컴포넌트 ---
const App: React.FC = () => {
  const [agreements, setAgreements] = useState({ all: false, term1: false, term2: false, term3: false });
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  
  const [emailVerified, setEmailVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [modal, setModal] = useState({ isOpen: false, message: '' });

  const handleSignUp = () => {
    if (!emailVerified) return setModal({ isOpen: true, message: "이메일 인증에 실패하였습니다." });
    if (password !== confirmPw || !password) return setModal({ isOpen: true, message: "비밀번호 확인에 실패하였습니다." });
    if (!agreements.term1) return setModal({ isOpen: true, message: "(필수) 약관 동의를 완료해주세요." });
    alert("회원가입 성공!");
  };

  const handleAllCheck = () => {
    const nextValue = !agreements.all;
    setAgreements({ all: nextValue, term1: nextValue, term2: nextValue, term3: nextValue });
  };

  const handleCheck = (key: keyof typeof agreements) => {
    const next = { ...agreements, [key]: !agreements[key] };
    next.all = next.term1 && next.term2 && next.term3;
    setAgreements(next);
  };

  return (
    <div className="form-wrapper">
      <header className="header">
        <div className="logo-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        </div>
        <h1 className="app-title">ProjectHub</h1>
        <p className="app-subtitle">새 계정을 만드세요</p>
      </header>

      <div className="form-body">
        <InputWithIcon label="이름" placeholder="홍길동" icon={<NameIcon />} />
        
        <div className="input-group">
          <label className="label">이메일</label>
          <div className="email-row">
            <div className="input-container">
              <span className="input-icon"><EmailIcon /></span>
              <input type="email" placeholder="your@email.com" className="input-field" />
            </div>
            <button className="verify-button" type="button" onClick={() => {setEmailVerified(true); alert("인증 완료");}}>인증하기</button>
          </div>
        </div>

        <div className="input-group">
          <label className="label">비밀번호</label>
          <div className="input-container">
            <span className="input-icon"><LockIcon /></span>
            <input 
              type={showPw ? "text" : "password"} 
              className="input-field" 
              placeholder="8자 이상 입력" 
              value={password}
              onChange={(e)=>setPassword(e.target.value)} 
            />
            <span 
              className="eye-button" 
              onMouseDown={()=>setShowPw(true)} 
              onMouseUp={()=>setShowPw(false)} 
              onMouseLeave={()=>setShowPw(false)}
              onTouchStart={()=>setShowPw(true)}
              onTouchEnd={()=>setShowPw(false)}
            >
              <EyeIcon show={showPw}/>
            </span>
          </div>
        </div>

        <div className="input-group">
          <label className="label">비밀번호 확인</label>
          <div className="input-container">
            <span className="input-icon"><LockIcon /></span>
            <input 
              type={showConfirmPw ? "text" : "password"} 
              className="input-field" 
              placeholder="비밀번호 재입력" 
              value={confirmPw}
              onChange={(e)=>setConfirmPw(e.target.value)} 
            />
            <span 
              className="eye-button" 
              onMouseDown={()=>setShowConfirmPw(true)} 
              onMouseUp={()=>setShowConfirmPw(false)} 
              onMouseLeave={()=>setShowConfirmPw(false)}
              onTouchStart={()=>setShowConfirmPw(true)}
              onTouchEnd={()=>setShowConfirmPw(false)}
            >
              <EyeIcon show={showConfirmPw}/>
            </span>
          </div>
        </div>

        <section className="terms-container">
          <div className="all-agree">
            <input type="checkbox" checked={agreements.all} onChange={handleAllCheck} className="checkbox" />
            <span>전체 동의</span>
          </div>
          <AgreementItem 
            title="개인정보 수집 및 이용 동의(필수)" 
            checked={agreements.term1} 
            onCheck={() => handleCheck('term1')} 
            content={`수집 항목: 이름, 이메일 주소, 비밀번호(암호화 저장)
수집 목적: 회원 식별, 서비스 제공 및 운영, 고객 문의 처리
보유 기간: 회원 탈퇴 시까지 (단, 법령에 따라 일정 기간 보존)
귀하는 개인정보 수집 및 이용에 동의하지 않을 권리가 있으나, 동의 거부 시 서비스 이용이 제한됩니다.`} 
          />

          <AgreementItem 
            title="마케팅 수신 동의(선택)" 
            checked={agreements.term2} 
            onCheck={() => handleCheck('term2')} 
            content={`수집 목적: 신규 서비스 홍보, 이벤트 정보 안내 및 혜택 제공, 개인별 맞춤 콘텐츠 추천
수집 항목: 이메일 주소, 서비스 이용 기록
보유 및 이용 기간: 동의 철회 시 또는 회원 탈퇴 시까지
* 해당 동의를 거부하시더라도 서비스 이용은 가능하나, 다양한 이벤트 혜택 안내가 제한될 수 있습니다.`} 
          />

          <AgreementItem 
            title="푸시 알림 수신 동의(선택)" 
            checked={agreements.term3} 
            onCheck={() => handleCheck('term3')} 
            content={`알림 목적: 서비스 내 활동 알림(댓글, 좋아요 등), 실시간 보안 알림, 맞춤형 정보 및 광고성 정보 전송
수신 방법: 앱 내 푸시 알림
보유 기간: 앱 삭제 시 또는 알림 설정 해제 시까지
* 기기 설정 메뉴를 통해 언제든지 알림 수신 여부를 변경하실 수 있습니다.`} 
          />
        </section>

        <button className="submit-button" type="button" onClick={handleSignUp}>회원가입</button>
        <div className="login-link">이미 계정이 있으신가요? <a href="/login">로그인</a></div>
      </div>

      {modal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p className="modal-text">{modal.message}</p>
            <button className="modal-button" type="button" onClick={() => setModal({ ...modal, isOpen: false })}>확인</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;