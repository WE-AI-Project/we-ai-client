import { useState, useRef, useEffect } from "react";
import {
  OLIVE_DARK, SAGE, TEXT_PRIMARY, STATUS_ERROR, STATUS_SUCCESS,
  LOGIN_MUTED, LOGIN_ICON_MUTED, LOGIN_CHECKBOX, LOGIN_CHEVRON,
  LOGIN_OLIVE_TEXT, LOGIN_DISABLED_BG, LOGIN_DISABLED_BG2,
  LOGIN_SHADOW_1, LOGIN_SHADOW_2, INPUT_BG, TEXT_LABEL,
} from "../colors";
import {
  FolderGit2, Mail, Lock, Eye, EyeOff,
  User, ChevronRight, CheckSquare, Square, X, ArrowRight,
  ShieldCheck, CheckCircle2,
} from "lucide-react";

// ── 카드 등장 애니메이션 ──
const KEYFRAMES = `
  @keyframes card-appear {
    from { opacity: 0; transform: translate(-50%, -46%) scale(0.96); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
  @keyframes otp-slide {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

const THICK_SHADOW = [
  "0 0 0 1px rgba(0,0,0,0.05)",
  "0 4px 8px rgba(0,0,0,0.06)",
  "0 12px 28px rgba(0,0,0,0.12)",
  "0 32px 64px rgba(0,0,0,0.14)",
].join(", ");

type CardMode = "login" | "signup";

// ── 목 DB (등록된 이메일) ──
const MOCK_REGISTERED = new Set(["test@weai.com", "admin@weai.com"]);

// ── 소셜 공급자 목 이메일 (신규 유저 → 회원가입으로 이동) ──
const SOCIAL_EMAILS: Record<"kakao" | "naver" | "google", string> = {
  kakao:  "me@kakao.com",
  naver:  "me@naver.com",
  google: "me@gmail.com",
};

// ─── 소셜 SVG 아이콘 ─────────────────────────────────────
function KakaoIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3C6.477 3 2 6.477 2 10.8c0 2.74 1.614 5.147 4.054 6.618L5.04 21l4.478-2.367C10.29 18.86 11.128 19 12 19c5.523 0 10-3.477 10-8.2C22 6.477 17.523 3 12 3z"
        fill="#3C1E1E"
      />
    </svg>
  );
}

function NaverIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M13.6 12.4L9.8 6H6v12h4.4V11.6L14.2 18H18V6h-4.4v6.4z" fill="white" />
    </svg>
  );
}

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ─── OTP 6자리 입력 ──────────────────────────────────────
function OtpInput({ onComplete, disabled }: { onComplete: (code: string) => void; disabled?: boolean }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return;
    const next = [...digits];
    next[i] = v.slice(-1);
    setDigits(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
    const code = next.join("");
    if (next.every(d => d !== "")) onComplete(code);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      const next = [...digits];
      next[i - 1] = "";
      setDigits(next);
      refs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft"  && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      refs.current[5]?.focus();
      onComplete(pasted);
    }
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center" style={{ animation: "otp-slide 0.25s ease forwards" }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          maxLength={1}
          disabled={disabled}
          inputMode="numeric"
          className="outline-none text-center rounded-xl font-bold"
          style={{
            width: 42, height: 50,
            fontSize: 20,
            background: d ? "#FFFFFF" : INPUT_BG,
            border: `2px solid ${d ? OLIVE_DARK : "rgba(0,0,0,0.08)"}`,
            color: TEXT_PRIMARY,
            transition: "all 0.15s",
            boxShadow: d ? "0 2px 8px rgba(65,67,27,0.12)" : "none",
          }}
        />
      ))}
    </div>
  );
}

// ─── 인풋 필드 ──────────────────────────────────────────
function Field({
  label, icon: Icon, type = "text", value, onChange,
  placeholder, right, error, disabled,
}: {
  label: string; icon: React.ElementType; type?: string;
  value: string; onChange: (v: string) => void;
  placeholder: string; right?: React.ReactNode; error?: string; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-semibold tracking-widest uppercase" style={{ color: LOGIN_MUTED }}>
        {label}
      </label>
      <div
        className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl"
        style={{
          background: focused ? "#FFFFFF" : INPUT_BG,
          border: `1.5px solid ${focused ? OLIVE_DARK : error ? STATUS_ERROR : "transparent"}`,
          transition: "all 0.15s ease",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <Icon className="w-4 h-4 shrink-0" style={{ color: focused ? OLIVE_DARK : LOGIN_ICON_MUTED, transition: "color 0.15s" }} />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 text-sm outline-none min-w-0 bg-transparent"
          style={{ color: TEXT_PRIMARY }}
        />
        {right}
      </div>
      {error && <p className="text-[9px] pl-1" style={{ color: STATUS_ERROR }}>{error}</p>}
    </div>
  );
}

// ─── 동의 항목 ───────────────────────────────────────────
function AgreeRow({ label, checked, onChange, accent, showArrow }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; accent?: boolean; showArrow?: boolean;
}) {
  return (
    <button onClick={() => onChange(!checked)} className="w-full flex items-center gap-2.5 py-1.5 text-left">
      {checked
        ? <CheckSquare className="w-4 h-4 shrink-0" style={{ color: OLIVE_DARK }} />
        : <Square      className="w-4 h-4 shrink-0" style={{ color: LOGIN_CHECKBOX }} />}
      <span className="flex-1 text-[11px]" style={{ color: accent ? STATUS_ERROR : OLIVE_DARK }}>{label}</span>
      {showArrow && <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: LOGIN_CHEVRON }} />}
    </button>
  );
}

// ─── 소셜 로그인 버튼 ────────────────────────────────────
function SocialBtn({
  provider, loading, onClick,
}: {
  provider: "kakao" | "naver" | "google";
  loading: boolean;
  onClick: () => void;
}) {
  const [hov, setHov] = useState(false);

  const cfg = {
    kakao:  { label: "카카오",  bg: "#FEE500", hover: "#F5DC00", color: "#3C1E1E", icon: <KakaoIcon /> },
    naver:  { label: "네이버",  bg: "#03C75A", hover: "#02B04E", color: "#FFFFFF", icon: <NaverIcon /> },
    google: { label: "Google", bg: "#FFFFFF",  hover: "#F5F5F5", color: "#3C4043", icon: <GoogleIcon />, border: "1px solid rgba(0,0,0,0.12)" },
  }[provider];

  return (
    <button
      onClick={onClick}
      disabled={loading}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
      style={{
        background: hov ? cfg.hover : cfg.bg,
        border: (cfg as any).border ?? "none",
        opacity: loading ? 0.7 : 1,
        boxShadow: hov ? "0 2px 8px rgba(0,0,0,0.14)" : "0 1px 3px rgba(0,0,0,0.08)",
        transition: "all 0.15s",
      }}
    >
      {loading
        ? <span className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: `${cfg.color}30`, borderTopColor: cfg.color }} />
        : cfg.icon
      }
      <span className="text-[9px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
    </button>
  );
}

// ─── 로그인 폼 ───────────────────────────────────────────
function LoginForm({
  onLogin, onSwitchToSignup, onSocialLogin,
}: {
  onLogin: () => void;
  onSwitchToSignup: (email?: string) => void;
  onSocialLogin: (provider: "kakao" | "naver" | "google") => void;
}) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [socialLoading, setSocialLoading] = useState<"kakao" | "naver" | "google" | null>(null);

  const handleLogin = () => {
    if (!email.trim() || !password) { setError("이메일과 비밀번호를 입력해주세요."); return; }
    setError(""); setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 750);
  };

  const handleSocial = (p: "kakao" | "naver" | "google") => {
    setSocialLoading(p);
    setTimeout(() => {
      setSocialLoading(null);
      onSocialLogin(p);
    }, 1200);
  };

  return (
    <div className="p-8 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center gap-3 pb-5" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: OLIVE_DARK }}>
          <FolderGit2 className="w-5 h-5" style={{ color: "white" }} />
        </div>
        <div>
          <h2 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>로그인</h2>
          <p className="text-[11px]" style={{ color: LOGIN_MUTED }}>WE&amp;AI 계정으로 시작하세요</p>
        </div>
      </div>

      {/* 소셜 로그인 */}
      <div className="space-y-2.5">
        <p className="text-[9px] font-semibold tracking-widest uppercase text-center" style={{ color: LOGIN_MUTED }}>소셜 계정으로 로그인</p>
        <div className="flex gap-2">
          {(["kakao", "naver", "google"] as const).map(p => (
            <SocialBtn
              key={p}
              provider={p}
              loading={socialLoading === p}
              onClick={() => handleSocial(p)}
            />
          ))}
        </div>
      </div>

      {/* 구분선 */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.06)" }} />
        <span className="text-[10px] font-medium" style={{ color: LOGIN_ICON_MUTED }}>또는 이메일로 로그인</span>
        <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.06)" }} />
      </div>

      <Field label="이메일" icon={Mail} type="email" value={email}
        onChange={v => { setEmail(v); setError(""); }} placeholder="your@email.com" />

      <Field label="비밀번호" icon={Lock}
        type={showPw ? "text" : "password"}
        value={password} onChange={v => { setPassword(v); setError(""); }}
        placeholder="••••••••"
        right={
          <button onClick={() => setShowPw(p => !p)} style={{ color: LOGIN_ICON_MUTED, flexShrink: 0 }}>
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
      />

      {error && (
        <p className="text-[10px] flex items-center gap-1.5" style={{ color: STATUS_ERROR }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_ERROR }} />{error}
        </p>
      )}

      <button onClick={handleLogin} disabled={loading}
        className="w-full py-3.5 rounded-xl text-sm font-semibold"
        style={{ background: OLIVE_DARK, color: "white", opacity: loading ? 0.75 : 1, transition: "opacity 0.15s" }}>
        {loading
          ? <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 rounded-full animate-spin"
                style={{ borderColor: "rgba(255,255,255,0.2)", borderTopColor: "white" }} />
              로그인 중...
            </span>
          : "로그인"}
      </button>

      <p className="text-center text-[11px]" style={{ color: LOGIN_MUTED }}>
        계정이 없으신가요?{" "}
        <button onClick={() => onSwitchToSignup()} className="font-semibold" style={{ color: OLIVE_DARK }}
          onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
          onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
          회원가입
        </button>
      </p>
    </div>
  );
}

// ─── 회원가입 폼 ─────────────────────────────────────────
function SignupForm({
  onSwitchToLogin,
  initialEmail = "",
  socialProvider,
}: {
  onSwitchToLogin: () => void;
  initialEmail?: string;
  socialProvider?: "kakao" | "naver" | "google";
}) {
  const [name,           setName]           = useState("");
  const [email,          setEmail]          = useState(initialEmail);
  const [pw,             setPw]             = useState("");
  const [pwConfirm,      setPwConfirm]      = useState("");
  const [showPw,         setShowPw]         = useState(false);
  const [showPwC,        setShowPwC]        = useState(false);

  // ── 이메일 인증 상태 ──
  const [otpSent,        setOtpSent]        = useState(false);
  const [sending,        setSending]        = useState(false);
  const [otpVerifying,   setOtpVerifying]   = useState(false);
  const [verified,       setVerified]       = useState(false);
  const [otpError,       setOtpError]       = useState("");

  const [agreeAll,       setAgreeAll]       = useState(false);
  const [agreePrivacy,   setAgreePrivacy]   = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [agreePush,      setAgreePush]      = useState(false);
  const [loading,        setLoading]        = useState(false);

  const setAll  = (v: boolean) => { setAgreeAll(v); setAgreePrivacy(v); setAgreeMarketing(v); setAgreePush(v); };
  const syncAll = (p: boolean, m: boolean, pu: boolean) => {
    setAgreePrivacy(p); setAgreeMarketing(m); setAgreePush(pu); setAgreeAll(p && m && pu);
  };

  const handleSendOtp = () => {
    if (!email.trim()) return;
    setSending(true);
    setOtpError("");
    setTimeout(() => {
      setSending(false);
      setOtpSent(true);
    }, 1200);
  };

  const handleOtpComplete = (code: string) => {
    setOtpError("");
    setOtpVerifying(true);
    setTimeout(() => {
      setOtpVerifying(false);
      // 목 환경: 6자리면 모두 통과
      if (code.length === 6) {
        setVerified(true);
        setOtpError("");
      } else {
        setOtpError("인증코드가 올바르지 않습니다.");
      }
    }, 900);
  };

  const handleSignup = () => {
    if (!agreePrivacy || !verified) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); onSwitchToLogin(); }, 800);
  };

  const socialLabel: Record<string, string> = { kakao: "카카오", naver: "네이버", google: "Google" };

  return (
    <div className="overflow-y-auto" style={{ maxHeight: 580 }}>
      <div className="p-8 space-y-4">
        {/* 헤더 */}
        <div className="flex items-center gap-3 pb-5" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: SAGE }}>
            <User className="w-5 h-5" style={{ color: "white" }} />
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>회원가입</h2>
            <p className="text-[11px]" style={{ color: LOGIN_MUTED }}>
              {socialProvider
                ? `${socialLabel[socialProvider]} 계정으로 가입`
                : "새 WE&AI 계정을 만드세요"}
            </p>
          </div>
        </div>

        {/* 소셜 계정 연동 배지 */}
        {socialProvider && (
          <div
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
            style={{ background: "rgba(65,67,27,0.05)", border: "1.5px solid rgba(65,67,27,0.12)" }}
          >
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: socialProvider === "kakao" ? "#FEE500" : socialProvider === "naver" ? "#03C75A" : "#FFFFFF",
                border: socialProvider === "google" ? "1px solid rgba(0,0,0,0.1)" : "none",
              }}>
              {socialProvider === "kakao" && <KakaoIcon size={14} />}
              {socialProvider === "naver" && <NaverIcon size={14} />}
              {socialProvider === "google" && <GoogleIcon size={14} />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold" style={{ color: TEXT_PRIMARY }}>
                {socialLabel[socialProvider]} 이메일로 가입
              </p>
              <p className="text-[9px] truncate" style={{ color: LOGIN_MUTED }}>{email}</p>
            </div>
            <CheckCircle2 className="w-4 h-4 shrink-0 ml-auto" style={{ color: STATUS_SUCCESS }} />
          </div>
        )}

        <Field label="이름" icon={User} value={name} onChange={setName} placeholder="홍길동" />

        {/* 이메일 + 인증 */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-semibold tracking-widest uppercase" style={{ color: LOGIN_MUTED }}>
            이메일
          </label>
          <div
            className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl"
            style={{
              background: INPUT_BG,
              border: `1.5px solid ${verified ? STATUS_SUCCESS : otpSent ? "rgba(65,67,27,0.20)" : "transparent"}`,
              transition: "border-color 0.15s",
            }}
          >
            <Mail className="w-4 h-4 shrink-0" style={{ color: LOGIN_ICON_MUTED }} />
            <input
              value={email}
              onChange={e => { setEmail(e.target.value); setVerified(false); setOtpSent(false); setOtpError(""); }}
              type="email"
              placeholder="your@email.com"
              disabled={!!socialProvider || otpSent}
              className="flex-1 text-sm outline-none min-w-0 bg-transparent"
              style={{ color: TEXT_PRIMARY, opacity: (!!socialProvider || otpSent) ? 0.75 : 1 }}
            />
            {verified
              ? <span className="text-[9px] px-2 py-1 rounded-lg font-semibold shrink-0"
                  style={{ background: "rgba(90,138,74,0.10)", color: STATUS_SUCCESS }}>인증됨 ✓</span>
              : !otpSent
                ? <button
                    onClick={handleSendOtp}
                    disabled={!email.trim() || sending}
                    className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                    style={{
                      background: !email.trim() || sending ? LOGIN_DISABLED_BG : OLIVE_DARK,
                      color: !email.trim() || sending ? LOGIN_ICON_MUTED : "white",
                      transition: "all 0.15s",
                    }}
                  >
                    {sending
                      ? <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 border-2 rounded-full animate-spin"
                            style={{ borderColor: "rgba(0,0,0,0.15)", borderTopColor: LOGIN_ICON_MUTED }} />
                          전송 중
                        </span>
                      : "인증하기"}
                  </button>
                : <button
                    onClick={() => { setOtpSent(false); setOtpError(""); }}
                    className="shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-medium"
                    style={{ color: LOGIN_MUTED, background: "transparent" }}
                  >
                    재전송
                  </button>
            }
          </div>

          {/* OTP 입력 영역 */}
          {otpSent && !verified && (
            <div className="space-y-3 pt-2">
              {/* 안내 */}
              <div
                className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(65,67,27,0.04)", border: "1px solid rgba(65,67,27,0.10)" }}
              >
                <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: OLIVE_DARK }} />
                <div>
                  <p className="text-[10px] font-semibold" style={{ color: TEXT_PRIMARY }}>
                    인증코드를 발송했습니다
                  </p>
                  <p className="text-[9px]" style={{ color: LOGIN_MUTED }}>
                    {email}로 전송된 6자리 코드를 입력하세요
                  </p>
                  <p className="text-[8px] mt-0.5" style={{ color: LOGIN_ICON_MUTED }}>
                    (테스트 환경: 임의의 6자리 숫자)
                  </p>
                </div>
              </div>

              <OtpInput onComplete={handleOtpComplete} disabled={otpVerifying} />

              {otpVerifying && (
                <p className="text-center text-[10px] flex items-center justify-center gap-1.5" style={{ color: LOGIN_MUTED }}>
                  <span className="w-3 h-3 border-2 rounded-full animate-spin"
                    style={{ borderColor: "rgba(0,0,0,0.12)", borderTopColor: OLIVE_DARK }} />
                  확인 중...
                </p>
              )}
              {otpError && (
                <p className="text-center text-[10px]" style={{ color: STATUS_ERROR }}>{otpError}</p>
              )}
            </div>
          )}
        </div>

        <Field label="비밀번호" icon={Lock}
          type={showPw ? "text" : "password"}
          value={pw} onChange={setPw} placeholder="8자 이상"
          right={<button onClick={() => setShowPw(p => !p)} style={{ color: LOGIN_ICON_MUTED, flexShrink: 0 }}>
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>}
        />

        <Field label="비밀번호 확인" icon={Lock}
          type={showPwC ? "text" : "password"}
          value={pwConfirm} onChange={setPwConfirm} placeholder="비밀번호 재입력"
          error={pwConfirm && pw !== pwConfirm ? "비밀번호가 일치하지 않습니다." : undefined}
          right={<button onClick={() => setShowPwC(p => !p)} style={{ color: LOGIN_ICON_MUTED, flexShrink: 0 }}>
            {showPwC ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>}
        />

        {/* 이메일 인증 미완료 경고 */}
        {!verified && (
          <p className="text-[9px] flex items-center gap-1.5 px-1" style={{ color: LOGIN_MUTED }}>
            <ShieldCheck className="w-3 h-3 shrink-0" style={{ color: LOGIN_ICON_MUTED }} />
            회원가입 전 이메일 인증이 필요합니다
          </p>
        )}

        {/* 동의 섹션 */}
        <div className="rounded-xl px-4 py-3" style={{ background: INPUT_BG, border: "1px solid rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-2.5 pb-2.5 mb-1.5" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <button onClick={() => setAll(!agreeAll)}>
              {agreeAll
                ? <CheckSquare className="w-4 h-4" style={{ color: OLIVE_DARK }} />
                : <Square      className="w-4 h-4" style={{ color: LOGIN_CHECKBOX }} />}
            </button>
            <span className="text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }}>전체 동의</span>
          </div>
          <AgreeRow label="개인정보 수집 및 이용 동의 (필수)" checked={agreePrivacy} accent showArrow
            onChange={v => syncAll(v, agreeMarketing, agreePush)} />
          <AgreeRow label="마케팅 수신 동의 (선택)" checked={agreeMarketing} showArrow
            onChange={v => syncAll(agreePrivacy, v, agreePush)} />
          <AgreeRow label="푸시 알림 수신 동의 (선택)" checked={agreePush} showArrow
            onChange={v => syncAll(agreePrivacy, agreeMarketing, v)} />
        </div>

        <button
          onClick={handleSignup}
          disabled={loading || !agreePrivacy || !verified}
          className="w-full py-3.5 rounded-xl text-sm font-semibold"
          style={{
            background: agreePrivacy && verified ? OLIVE_DARK : LOGIN_DISABLED_BG2,
            color: agreePrivacy && verified ? "white" : LOGIN_ICON_MUTED,
            transition: "all 0.15s",
          }}
        >
          {loading
            ? <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: "rgba(255,255,255,0.2)", borderTopColor: "white" }} />
                가입 중...
              </span>
            : "회원가입 완료"}
        </button>

        <p className="text-center text-[11px] pb-1" style={{ color: LOGIN_MUTED }}>
          이미 계정이 있으신가요?{" "}
          <button onClick={onSwitchToLogin} className="font-semibold" style={{ color: OLIVE_DARK }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
            로그인
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── 메인 LoginScreen ────────────────────────────────────
type Props = { onLogin: () => void };

export function LoginScreen({ onLogin }: Props) {
  const [cardOpen,      setCardOpen]      = useState(false);
  const [mode,          setMode]          = useState<CardMode>("login");
  const [blurring,      setBlurring]      = useState(false);
  const [exiting,       setExiting]       = useState(false);
  const [prefillEmail,  setPrefillEmail]  = useState("");
  const [socialProvider, setSocialProvider] = useState<"kakao" | "naver" | "google" | undefined>(undefined);

  const innerRef      = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState<number | null>(null);

  useEffect(() => {
    if (!innerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const h =
        entries[0].borderBoxSize?.[0]?.blockSize ??
        entries[0].contentRect.height;
      setCardH(h);
    });
    ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, []);

  const handleLoginSuccess = () => {
    setExiting(true);
    setTimeout(() => onLogin(), 450);
  };

  // 블러 아웃 → 콘텐츠 전환 → 블러 인
  const switchMode = (target: CardMode, email?: string, provider?: "kakao" | "naver" | "google") => {
    if (target === mode || blurring) return;
    if (email !== undefined) setPrefillEmail(email);
    if (provider !== undefined) setSocialProvider(provider);
    if (target === "login") { setPrefillEmail(""); setSocialProvider(undefined); }
    setBlurring(true);
    setTimeout(() => {
      setMode(target);
      setBlurring(false);
    }, 220);
  };

  // 소셜 로그인 처리
  const handleSocialLogin = (provider: "kakao" | "naver" | "google") => {
    const email = SOCIAL_EMAILS[provider];
    if (MOCK_REGISTERED.has(email)) {
      // 이미 가입된 유저 → 바로 로그인
      handleLoginSuccess();
    } else {
      // 신규 유저 → 회원가입으로 이메일만 가져가기
      setCardOpen(true);
      switchMode("signup", email, provider);
    }
  };

  return (
    <div
      className="size-full relative overflow-hidden flex items-center justify-center"
      style={{
        background: "#F5F4F1",
        opacity:    exiting ? 0 : 1,
        transition: exiting ? "opacity 0.42s ease" : "none",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* ════ Welcome 콘텐츠 ════ */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-8"
        style={{
          opacity:    cardOpen ? 0.12 : 1,
          filter:     cardOpen ? "blur(4px)" : "none",
          transform:  cardOpen ? "scale(0.985)" : "scale(1)",
          transition: "opacity 0.38s ease, filter 0.38s ease, transform 0.38s ease",
          pointerEvents: cardOpen ? "none" : "auto",
          zIndex: 5,
        }}
      >
        {/* 로고 */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: OLIVE_DARK }}>
            <FolderGit2 className="w-5.5 h-5.5" style={{ color: "white" }} />
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: TEXT_PRIMARY }}>WE&amp;AI</p>
            <p className="text-[10px]" style={{ color: LOGIN_MUTED }}>Project Office</p>
          </div>
        </div>

        <h1 className="text-[40px] font-bold text-center mb-3 leading-tight tracking-tight">
          <span style={{ color: "#1A1C06" }}>Welcome to</span>
          <br />
          <span style={{ color: OLIVE_DARK }}>WE&amp;AI</span>
        </h1>

        <p className="text-sm text-center mb-8" style={{ color: LOGIN_OLIVE_TEXT, maxWidth: 310 }}>
          Intelligent Multi-Agent Project Office
          <br />
          <span style={{ color: LOGIN_MUTED, fontSize: 11 }}>Java/Spring Boot 기반 엔터프라이즈 관리 플랫폼</span>
        </p>

        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {["멀티에이전트 관리", "AI QA 모니터링", "실시간 빌드", "팀 협업 대시보드"].map(tag => (
            <span key={tag} className="px-3 py-1.5 rounded-full text-[11px] font-medium"
              style={{ background: "rgba(65,67,27,0.07)", color: OLIVE_DARK, border: "1px solid rgba(65,67,27,0.12)" }}>
              {tag}
            </span>
          ))}
        </div>

        <button
          onClick={() => setCardOpen(true)}
          className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold"
          style={{ background: OLIVE_DARK, color: "white" }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          시작하기 <ArrowRight className="w-4 h-4" />
        </button>

        <p className="mt-6 text-[10px]" style={{ color: LOGIN_ICON_MUTED }}>
          WE&amp;AI Enterprise Platform — v2025.1
        </p>
      </div>

      {/* ════ 딤 백드롭 ════ */}
      {cardOpen && (
        <div
          className="absolute inset-0 z-20"
          style={{ background: "rgba(15,17,5,0.50)" }}
          onClick={() => setCardOpen(false)}
        />
      )}

      {/* ════ 카드 ════ */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 420,
          zIndex: 30,
          animation: cardOpen ? "card-appear 0.40s cubic-bezier(0.22, 1, 0.36, 1) forwards" : "none",
          opacity: cardOpen ? 1 : 0,
          pointerEvents: cardOpen ? "auto" : "none",
          transform: "translate(-50%, -50%)",
        }}
      >
        {/* 닫기 */}
        <button
          onClick={() => setCardOpen(false)}
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center z-50"
          style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.14)", color: TEXT_LABEL }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* 카드 본체 */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 20,
            boxShadow: THICK_SHADOW,
            border: "1px solid rgba(0,0,0,0.05)",
            overflow: "hidden",
            height: cardH != null ? cardH + 3 : "auto",
            transition: "height 0.42s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {/* 내부 측정용 래퍼 */}
          <div ref={innerRef}>
            <div
              style={{
                opacity:    blurring ? 0 : 1,
                filter:     blurring ? "blur(6px)" : "blur(0px)",
                transform:  blurring ? "scale(0.99)" : "scale(1)",
                transition: blurring
                  ? "opacity 0.18s ease, filter 0.18s ease, transform 0.18s ease"
                  : "opacity 0.22s ease, filter 0.22s ease, transform 0.22s ease",
              }}
            >
              {mode === "login"
                ? <LoginForm
                    onLogin={handleLoginSuccess}
                    onSwitchToSignup={(email) => switchMode("signup", email)}
                    onSocialLogin={handleSocialLogin}
                  />
                : <SignupForm
                    onSwitchToLogin={() => switchMode("login")}
                    initialEmail={prefillEmail}
                    socialProvider={socialProvider}
                  />
              }
            </div>
          </div>
        </div>

        {/* 두께감 레이어 */}
        <div style={{ position: "absolute", left: 6, bottom: -5, right: 6, height: 12,
          background: LOGIN_SHADOW_1, borderRadius: "0 0 20px 20px", zIndex: -1 }} />
        <div style={{ position: "absolute", left: 12, bottom: -9, right: 12, height: 10,
          background: LOGIN_SHADOW_2, borderRadius: "0 0 16px 16px", zIndex: -2 }} />
      </div>
    </div>
  );
}