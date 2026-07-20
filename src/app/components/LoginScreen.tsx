import { useEffect, useRef, useState } from "react";
import {
  OLIVE_DARK,
  SAGE,
  TEXT_PRIMARY,
  STATUS_ERROR,
  STATUS_SUCCESS,
  LOGIN_MUTED,
  LOGIN_ICON_MUTED,
  LOGIN_CHECKBOX,
  LOGIN_CHEVRON,
  LOGIN_OLIVE_TEXT,
  LOGIN_DISABLED_BG,
  LOGIN_DISABLED_BG2,
  LOGIN_SHADOW_1,
  LOGIN_SHADOW_2,
  INPUT_BG,
  TEXT_LABEL,
  TEXT_SECONDARY,
} from "../colors";
import {
  FolderGit2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ChevronRight,
  ChevronDown,
  CheckSquare,
  Square,
  X,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import {
  AuthSession,
  CurrentUser,
  SocialProvider,
  VerificationCodeDispatchResponse,
  createPublishingSession,
  fetchCurrentUser,
  formatApiError,
  login,
  loginWithEmailCode,
  sendEmailLoginCode,
  signUp,
  fetchSocialLoginUrl,
} from "../lib/api";

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

type CardMode = "login" | "signup" | "email-code";
type FeedbackTone = "success" | "error" | "info";
type Feedback = {
  tone: FeedbackTone;
  text: string;
};
type Props = {
  onAuthenticated: (session: AuthSession, user: CurrentUser) => void;
};

const SOCIAL_LABELS: Record<SocialProvider, string> = {
  kakao: "카카오",
  naver: "네이버",
  google: "Google",
};

// 약관 상세 내용 데이터
const TERMS_CONTENT = {
  privacy: {
    content: `SynAIpse는 원활한 서비스 제공을 위해 아래와 같이 개인정보를 수집 및 이용합니다.
    
1. 수집 항목: 이메일, 이름, 비밀번호
2. 수집 목적: 회원 식별, 서비스 제공 및 고객 상담
3. 보유 기간: 회원 탈퇴 시 파기 (단, 관계 법령에 따른 보존 필요 시 보관)

본 동의를 거부하실 권리가 있으나, 거부 시 회원가입 및 서비스 이용이 제한될 수 있습니다.`,
  },
  marketing: {
    content: `SynAIpse의 새로운 기능, 업데이트 소식, 이벤트 및 프로모션 안내 등 다양한 마케팅 정보를 이메일 또는 푸시 알림 등의 방법으로 보내드립니다.
    
본 동의는 선택 사항이며, 동의하지 않으셔도 기본 서비스 이용에는 지장이 없습니다. 동의 후 언제든지 내 정보 설정에서 철회하실 수 있습니다.`,
  },
  push: {
    content: `프로젝트 내 중요한 알림(에이전트 상태 변경, 빌드 완료 등), 팀원 초대 및 멘션 등 서비스 이용에 필요한 실시간 푸시 알림을 수신하는 데 동의합니다.
    
본 동의는 선택 사항이며, 알림 설정에서 개별 항목별로 수신 여부를 변경하실 수 있습니다.`,
  },
};

function buildMockSocialEmail(provider: SocialProvider) {
  return `${provider}.${Date.now()}@example.com`;
}

function createLocalVerificationDispatch(email: string): VerificationCodeDispatchResponse {
  return {
    purpose: "EMAIL_LOGIN",
    deliveryChannel: "EMAIL",
    deliveryTarget: email,
    deliveryMode: "SIMULATED",
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    debugCode: null,
  };
}

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
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function OtpInput({
  onComplete,
  disabled,
  resetKey,
}: {
  onComplete: (code: string) => void;
  disabled?: boolean;
  resetKey?: string;
}) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setDigits(["", "", "", "", "", ""]);
  }, [resetKey]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) {
      return;
    }
    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);
    if (value && index < 5) {
      refs.current[index + 1]?.focus();
    }
    const code = next.join("");
    if (next.every((digit) => digit !== "")) {
      onComplete(code);
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      refs.current[5]?.focus();
      onComplete(pasted);
    }
    event.preventDefault();
  };

  return (
    <div className="flex justify-center gap-2" style={{ animation: "otp-slide 0.25s ease forwards" }}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          value={digit}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={index === 0 ? handlePaste : undefined}
          maxLength={1}
          disabled={disabled}
          inputMode="numeric"
          className="rounded-xl text-center font-bold outline-none"
          style={{
            width: 42,
            height: 50,
            fontSize: 20,
            background: digit ? "#FFFFFF" : INPUT_BG,
            border: `2px solid ${digit ? OLIVE_DARK : "rgba(0,0,0,0.08)"}`,
            color: TEXT_PRIMARY,
            transition: "all 0.15s",
            boxShadow: digit ? "0 2px 8px rgba(65,67,27,0.12)" : "none",
          }}
        />
      ))}
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  right,
  error,
  disabled,
  onEnter,
}: {
  label: string;
  icon: React.ElementType;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  right?: React.ReactNode;
  error?: string;
  disabled?: boolean;
  onEnter?: () => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-semibold uppercase tracking-widest" style={{ color: LOGIN_MUTED }}>
        {label}
      </label>
      <div
        className="flex items-center gap-2.5 rounded-xl px-3.5 py-3"
        style={{
          background: focused ? "#FFFFFF" : INPUT_BG,
          border: `1.5px solid ${focused ? OLIVE_DARK : error ? STATUS_ERROR : "transparent"}`,
          transition: "all 0.15s ease",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <Icon
          className="h-4 w-4 shrink-0"
          style={{ color: focused ? OLIVE_DARK : LOGIN_ICON_MUTED, transition: "color 0.15s" }}
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && onEnter) {
              event.preventDefault();
              onEnter();
            }
          }}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          style={{ color: TEXT_PRIMARY }}
        />
        {right}
      </div>
      {error && (
        <p className="pl-1 text-[9px]" style={{ color: STATUS_ERROR }}>
          {error}
        </p>
      )}
    </div>
  );
}

function AgreeRow({
  label,
  checked,
  onChange,
  accent,
  content,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  accent?: boolean;
  content?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex w-full flex-col py-0.5">
      <div className="flex w-full items-center justify-between py-1">
        <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2.5 text-left flex-1">
          {checked ? (
            <CheckSquare className="h-4 w-4 shrink-0" style={{ color: OLIVE_DARK }} />
          ) : (
            <Square className="h-4 w-4 shrink-0" style={{ color: LOGIN_CHECKBOX }} />
          )}
          <span className="flex-1 text-[11px]" style={{ color: accent && !checked ? STATUS_ERROR : OLIVE_DARK }}>
            {label}
          </span>
        </button>
        
        {content && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 -mr-1 rounded-md hover:bg-black/[0.04] transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: LOGIN_CHEVRON }} />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: LOGIN_CHEVRON }} />
            )}
          </button>
        )}
      </div>

      {isExpanded && content && (
        <div
          className="mt-1 mb-2 ml-6 rounded-lg p-3 text-[10px] leading-relaxed"
          style={{ background: "rgba(0,0,0,0.03)", color: TEXT_SECONDARY, whiteSpace: "pre-wrap" }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

function SocialBtn({
  provider,
  loading,
  onClick,
}: {
  provider: SocialProvider;
  loading: boolean;
  onClick: (provider: SocialProvider) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const config = {
    kakao: {
      label: "카카오",
      bg: "#FEE500",
      hover: "#F5DC00",
      color: "#3C1E1E",
      icon: <KakaoIcon />,
    },
    naver: {
      label: "네이버",
      bg: "#03C75A",
      hover: "#02B04E",
      color: "#FFFFFF",
      icon: <NaverIcon />,
    },
    google: {
      label: "Google",
      bg: "#FFFFFF",
      hover: "#F5F5F5",
      color: "#3C4043",
      icon: <GoogleIcon />,
      border: "1px solid rgba(0,0,0,0.12)",
    },
  }[provider];

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => onClick(provider)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-1 flex-col items-center gap-1.5 rounded-xl py-3 transition-all"
      style={{
        background: hovered ? config.hover : config.bg,
        border: (config as { border?: string }).border ?? "none",
        opacity: loading ? 0.7 : 1,
        boxShadow: hovered ? "0 2px 8px rgba(0,0,0,0.14)" : "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      {loading ? (
        <span
          className="h-5 w-5 animate-spin rounded-full border-2"
          style={{ borderColor: "rgba(0,0,0,0.15)", borderTopColor: config.color }}
        />
      ) : (
        config.icon
      )}
      <span className="text-[9px] font-semibold" style={{ color: config.color }}>
        {config.label}
      </span>
    </button>
  );
}

async function resolveAuthenticatedUser(session: AuthSession) {
  return fetchCurrentUser();
}

function LoginForm({
  initialEmail = "",
  notice,
  onAuthenticated,
  onSwitchToSignup,
  onSwitchToEmailCode,
  onSocialLogin,
}: {
  initialEmail?: string;
  notice: Feedback | null;
  onAuthenticated: (session: AuthSession, user: CurrentUser) => void;
  onSwitchToSignup: (email?: string) => void;
  onSwitchToEmailCode: (email?: string) => void;
  onSocialLogin: (provider: SocialProvider) => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const publishingLogin = createPublishingSession(email, password);
      if (publishingLogin) {
        onAuthenticated(publishingLogin.session, publishingLogin.user);
        return;
      }

      const session = await login({
        email: email.trim(),
        password,
      });
      const user = await resolveAuthenticatedUser(session);
      onAuthenticated(session, user);
    } catch (loginError) {
      setError(formatApiError(loginError));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialClick = async (provider: SocialProvider) => {
    try {
      setSocialLoading(provider);
      // 1. 백엔드에서 선택한 소셜(구글 등)의 로그인 URL을 받아옵니다.
      const response = await fetchSocialLoginUrl(provider);
      
      // 2. 응답받은 URL로 브라우저를 이동시킵니다.
      if (response.authorizationUrl) {
        window.location.href = response.authorizationUrl;
      }
    } catch (err) {
      console.error(`${provider} 로그인 연동 실패:`, err);
      alert("소셜 로그인 서버와 연결할 수 없습니다.");
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <form 
      className="space-y-5 p-8"
      onSubmit={(e) => {
        e.preventDefault(); // 엔터 시 페이지 새로고침 방지
        void handleLogin(); // 로그인 함수 실행
      }}
    >
      <div className="flex items-center gap-3 border-b border-black/5 pb-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: OLIVE_DARK }}>
          <FolderGit2 className="h-5 w-5" style={{ color: "white" }} />
        </div>
        <div>
          <h2 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>
            로그인
          </h2>
          <p className="text-[11px]" style={{ color: LOGIN_MUTED }}>
            SynAIpse 계정으로 시작하세요
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="text-center text-[9px] font-semibold uppercase tracking-widest" style={{ color: LOGIN_MUTED }}>
          소셜 계정으로 로그인
        </p>
        <div className="flex gap-2">
          {(["kakao", "naver", "google"] as const).map((provider) => (
            <SocialBtn
              key={provider}
              provider={provider}
              loading={socialLoading === provider}
              onClick={handleSocialClick}
            />
          ))}
        </div>
        <p className="text-center text-[9px]" style={{ color: LOGIN_ICON_MUTED }}>
          원하는 소셜 계정을 선택해 로그인하세요.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1" style={{ background: "rgba(0,0,0,0.06)" }} />
        <span className="text-[10px] font-medium" style={{ color: LOGIN_ICON_MUTED }}>
          또는 이메일로 로그인
        </span>
        <div className="h-px flex-1" style={{ background: "rgba(0,0,0,0.06)" }} />
      </div>

      {notice && (
        <div
          className="rounded-xl px-3.5 py-2.5 text-[10px]"
          style={{
            background:
              notice.tone === "success"
                ? "rgba(90,138,74,0.08)"
                : notice.tone === "error"
                  ? "rgba(184,84,80,0.08)"
                  : "rgba(65,67,27,0.06)",
            color:
              notice.tone === "success"
                ? STATUS_SUCCESS
                : notice.tone === "error"
                  ? STATUS_ERROR
                  : TEXT_SECONDARY,
            border: `1px solid ${
              notice.tone === "success"
                ? "rgba(90,138,74,0.16)"
                : notice.tone === "error"
                  ? "rgba(184,84,80,0.16)"
                  : "rgba(65,67,27,0.12)"
            }`,
          }}
        >
          {notice.text}
        </div>
      )}

      <Field
        label="이메일"
        icon={Mail}
        type="email"
        value={email}
        onChange={(value) => {
          setEmail(value);
          setError("");
        }}
        placeholder="your@email.com"
      />

      <Field
        label="비밀번호"
        icon={Lock}
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(value) => {
          setPassword(value);
          setError("");
        }}
        placeholder="••••••••"
        onEnter={() => void handleLogin()}
        right={
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            style={{ color: LOGIN_ICON_MUTED, flexShrink: 0 }}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
      />

      {error && (
        <p className="flex items-center gap-1.5 text-[10px]" style={{ color: STATUS_ERROR }}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS_ERROR }} />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl py-3.5 text-sm font-semibold"
        style={{ background: OLIVE_DARK, color: "white", opacity: loading ? 0.75 : 1, transition: "opacity 0.15s" }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span
              className="h-4 w-4 animate-spin rounded-full border-2"
              style={{ borderColor: "rgba(255,255,255,0.2)", borderTopColor: "white" }}
            />
              로그인 중...
          </span>
        ) : (
          "로그인"
        )}
      </button>

      <p className="text-center text-[10px]" style={{ color: LOGIN_ICON_MUTED }}>
        퍼블리싱 테스트 계정: <strong style={{ color: OLIVE_DARK }}>publishing.backup.20260720@weai.local / 11!11111</strong>
      </p>

      <button
        type="button"
        onClick={() => onSwitchToEmailCode(email.trim() || undefined)}
        className="flex w-full items-center justify-center gap-1.5 text-[11px] font-semibold"
        style={{ color: OLIVE_DARK }}
      >
        <KeyRound className="h-3.5 w-3.5" />
        이메일 코드 로그인
      </button>

      <p className="text-center text-[11px]" style={{ color: LOGIN_MUTED }}>
        계정이 없으신가요?{" "}
        <button
          type="button"
          onClick={() => onSwitchToSignup(email.trim() || undefined)}
          className="font-semibold"
          style={{ color: OLIVE_DARK }}
          onMouseEnter={(event) => {
            event.currentTarget.style.textDecoration = "underline";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.textDecoration = "none";
          }}
        >
          회원가입
        </button>
      </p>
    </form>
  );
}

function SignupForm({
  onSwitchToLogin,
  initialEmail = "",
  socialProvider,
}: {
  onSwitchToLogin: (prefillEmail?: string, notice?: Feedback) => void;
  initialEmail?: string;
  socialProvider?: SocialProvider;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [dispatchResult, setDispatchResult] = useState<VerificationCodeDispatchResponse | null>(null);
  
  // 약관 동의 상태
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [agreePush, setAgreePush] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [signupError, setSignupError] = useState("");

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    if (password.length === 0) {
      setPasswordError("");
      return;
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_\-+={}\[\]|\\:;"'<>,.?/~`]).{8,16}$/;

    if (!passwordRegex.test(password)) {
      setPasswordError("비밀번호는 영문, 숫자, 특수문자를 포함하여 8~16자로 입력해야 합니다.");
      return;
    }

    setPasswordError("");
  }, [password]);

  const setAll = (value: boolean) => {
    setAgreeAll(value);
    setAgreePrivacy(value);
    setAgreeMarketing(value);
    setAgreePush(value);
  };

  const syncAll = (privacy: boolean, marketing: boolean, push: boolean) => {
    setAgreePrivacy(privacy);
    setAgreeMarketing(marketing);
    setAgreePush(push);
    setAgreeAll(privacy && marketing && push);
  };

  const resetVerification = (nextEmail: string) => {
    setEmail(nextEmail);
    setVerified(false);
    setOtpSent(false);
    setOtpError("");
    setDispatchResult(null);
  };

  const handleSendOtp = async () => {
    if (!email.trim()) {
      return;
    }

    setSending(true);
    setOtpError("");

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      const result = createLocalVerificationDispatch(email.trim());
      setDispatchResult(result);
      setOtpSent(true);
    } finally {
      setSending(false);
    }
  };

  const handleOtpComplete = (code: string) => {
    setOtpError("");
    setOtpVerifying(true);

    window.setTimeout(() => {
      setOtpVerifying(false);

      if (code.length === 6) {
        setVerified(true);
        setOtpError("");
        return;
      }

      setVerified(false);
      setOtpError("6자리 인증번호를 입력해주세요.");
    }, 700);
  };

  const handleSignup = async () => {
    if (!agreePrivacy || !verified) {
      return;
    }

    if (passwordError || !password) {
      return;
    }

    if (password !== passwordConfirm) {
      setSignupError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    setSignupError("");

    try {
      await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      onSwitchToLogin(email.trim(), {
        tone: "success",
        text: "회원가입이 완료되었습니다. 같은 이메일로 로그인해보세요.",
      });
    } catch (signupFailure) {
      setSignupError(formatApiError(signupFailure));
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    name.trim() !== "" &&
    agreePrivacy &&
    verified &&
    password !== "" &&
    !passwordError &&
    password === passwordConfirm;

  return (
    <div className="relative">
      <div className="overflow-y-auto" style={{ maxHeight: 580 }}>
        <div className="space-y-4 p-8">
          <div className="flex items-center gap-3 border-b border-black/5 pb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: SAGE }}>
              <User className="h-5 w-5" style={{ color: "white" }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>
                회원가입
              </h2>
              <p className="text-[11px]" style={{ color: LOGIN_MUTED }}>
                {socialProvider ? `${SOCIAL_LABELS[socialProvider]} 계정으로 가입` : "새 SynAIpse 계정을 만드세요"}
              </p>
            </div>
          </div>

          {socialProvider && (
            <div
              className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
              style={{ background: "rgba(65,67,27,0.05)", border: "1.5px solid rgba(65,67,27,0.12)" }}
            >
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background:
                    socialProvider === "kakao" ? "#FEE500" : socialProvider === "naver" ? "#03C75A" : "#FFFFFF",
                  border: socialProvider === "google" ? "1px solid rgba(0,0,0,0.1)" : "none",
                }}
              >
                {socialProvider === "kakao" && <KakaoIcon size={14} />}
                {socialProvider === "naver" && <NaverIcon size={14} />}
                {socialProvider === "google" && <GoogleIcon size={14} />}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold" style={{ color: TEXT_PRIMARY }}>
                  {SOCIAL_LABELS[socialProvider]} 이메일로 가입
                </p>
                <p className="truncate text-[9px]" style={{ color: LOGIN_MUTED }}>
                  {email}
                </p>
              </div>
              <CheckCircle2 className="ml-auto h-4 w-4 shrink-0" style={{ color: STATUS_SUCCESS }} />
            </div>
          )}

          <Field
            label="이름"
            icon={User}
            value={name}
            onChange={(value) => {
              setName(value);
              setSignupError("");
            }}
            placeholder="홍길동"
          />

          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold uppercase tracking-widest" style={{ color: LOGIN_MUTED }}>
              이메일
            </label>
            <div
              className="flex items-center gap-2.5 rounded-xl px-3.5 py-3"
              style={{
                background: INPUT_BG,
                border: `1.5px solid ${
                  verified ? STATUS_SUCCESS : otpSent ? "rgba(65,67,27,0.20)" : "transparent"
                }`,
                transition: "border-color 0.15s",
              }}
            >
              <Mail className="h-4 w-4 shrink-0" style={{ color: LOGIN_ICON_MUTED }} />
              <input
                value={email}
                onChange={(event) => {
                  resetVerification(event.target.value);
                  setSignupError("");
                }}
                type="email"
                placeholder="your@email.com"
                disabled={!!socialProvider || otpSent}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                style={{ color: TEXT_PRIMARY, opacity: socialProvider || otpSent ? 0.75 : 1 }}
              />
              {verified ? (
                <span
                  className="shrink-0 rounded-lg px-2 py-1 text-[9px] font-semibold"
                  style={{ background: "rgba(90,138,74,0.10)", color: STATUS_SUCCESS }}
                >
                  인증됨 ✓
                </span>
              ) : !otpSent ? (
                <button
                  type="button"
                  onClick={() => void handleSendOtp()}
                  disabled={!email.trim() || sending}
                  className="shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-semibold"
                  style={{
                    background: !email.trim() || sending ? LOGIN_DISABLED_BG : OLIVE_DARK,
                    color: !email.trim() || sending ? LOGIN_ICON_MUTED : "white",
                    transition: "all 0.15s",
                  }}
                >
                  {sending ? (
                    <span className="flex items-center gap-1">
                      <span
                        className="h-2.5 w-2.5 animate-spin rounded-full border-2"
                        style={{ borderColor: "rgba(0,0,0,0.15)", borderTopColor: LOGIN_ICON_MUTED }}
                      />
                      전송 중
                    </span>
                  ) : (
                    "인증하기"
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpError("");
                  }}
                  className="shrink-0 rounded-lg px-2.5 py-1 text-[9px] font-medium"
                  style={{ color: LOGIN_MUTED, background: "transparent" }}
                >
                  재전송
                </button>
              )}
            </div>

            {otpSent && !verified && (
              <div className="space-y-3 pt-2">
                <div
                  className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(65,67,27,0.04)", border: "1px solid rgba(65,67,27,0.10)" }}
                >
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: OLIVE_DARK }} />
                  <div>
                    <p className="text-[10px] font-semibold" style={{ color: TEXT_PRIMARY }}>
                      인증코드를 발송했습니다
                    </p>
                    <p className="text-[9px]" style={{ color: LOGIN_MUTED }}>
                      {email}로 전송된 6자리 코드를 입력하세요
                    </p>
                    <p className="mt-0.5 text-[8px]" style={{ color: LOGIN_ICON_MUTED }}>
                      로컬 mock 검증이라 아무 6자리 숫자나 입력하면 인증됩니다.
                    </p>
                  </div>
                </div>

                <OtpInput onComplete={handleOtpComplete} disabled={otpVerifying} resetKey={email} />

                {otpVerifying && (
                  <p className="flex items-center justify-center gap-1.5 text-center text-[10px]" style={{ color: LOGIN_MUTED }}>
                    <span
                      className="h-3 w-3 animate-spin rounded-full border-2"
                      style={{ borderColor: "rgba(0,0,0,0.12)", borderTopColor: OLIVE_DARK }}
                    />
                    확인 중...
                  </p>
                )}
                {otpError && (
                  <p className="text-center text-[10px]" style={{ color: STATUS_ERROR }}>
                    {otpError}
                  </p>
                )}
              </div>
            )}
          </div>

          <Field
            label="비밀번호"
            icon={Lock}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(value) => {
              setPassword(value);
              setSignupError("");
            }}
            placeholder="영문, 숫자, 특수문자 포함 8~16자"
            error={passwordError}
            right={
              <button type="button" onClick={() => setShowPassword((current) => !current)} style={{ color: LOGIN_ICON_MUTED, flexShrink: 0 }}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          <Field
            label="비밀번호 확인"
            icon={Lock}
            type={showPasswordConfirm ? "text" : "password"}
            value={passwordConfirm}
            onChange={(value) => {
              setPasswordConfirm(value);
              setSignupError("");
            }}
            placeholder="비밀번호 재입력"
            error={passwordConfirm && password !== passwordConfirm ? "비밀번호가 일치하지 않습니다." : undefined}
            right={
              <button
                type="button"
                onClick={() => setShowPasswordConfirm((current) => !current)}
                style={{ color: LOGIN_ICON_MUTED, flexShrink: 0 }}
              >
                {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          {!verified && (
            <p className="flex items-center gap-1.5 px-1 text-[9px]" style={{ color: LOGIN_MUTED }}>
              <ShieldCheck className="h-3 w-3 shrink-0" style={{ color: LOGIN_ICON_MUTED }} />
              회원가입 전 이메일 인증이 필요합니다
            </p>
          )}

          {/* 약관 영역 */}
          <div className="rounded-xl px-4 py-3" style={{ background: INPUT_BG, border: "1px solid rgba(0,0,0,0.04)" }}>
            <div className="mb-1.5 flex items-center gap-2.5 border-b border-black/6 pb-2.5">
              <button type="button" onClick={() => setAll(!agreeAll)}>
                {agreeAll ? (
                  <CheckSquare className="h-4 w-4" style={{ color: OLIVE_DARK }} />
                ) : (
                  <Square className="h-4 w-4" style={{ color: LOGIN_CHECKBOX }} />
                )}
              </button>
              <span className="text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }}>
                전체 동의
              </span>
            </div>
            
            <AgreeRow
              label="개인정보 수집 및 이용 동의 (필수)"
              checked={agreePrivacy}
              accent={!agreePrivacy}
              content={TERMS_CONTENT.privacy.content}
              onChange={(value) => syncAll(value, agreeMarketing, agreePush)}
            />
            <AgreeRow
              label="마케팅 수신 동의 (선택)"
              checked={agreeMarketing}
              content={TERMS_CONTENT.marketing.content}
              onChange={(value) => syncAll(agreePrivacy, value, agreePush)}
            />
            <AgreeRow
              label="푸시 알림 수신 동의 (선택)"
              checked={agreePush}
              content={TERMS_CONTENT.push.content}
              onChange={(value) => syncAll(agreePrivacy, agreeMarketing, value)}
            />
          </div>

          {signupError && (
            <p className="text-center text-[10px]" style={{ color: STATUS_ERROR }}>
              {signupError}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleSignup()}
            disabled={loading || !isFormValid}
            className="w-full rounded-xl py-3.5 text-sm font-semibold"
            style={{
              background: isFormValid ? OLIVE_DARK : LOGIN_DISABLED_BG2,
              color: isFormValid ? "white" : LOGIN_ICON_MUTED,
              transition: "all 0.15s",
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2"
                  style={{ borderColor: "rgba(255,255,255,0.2)", borderTopColor: "white" }}
                />
                가입 중...
              </span>
            ) : (
              "회원가입 완료"
            )}
          </button>

          <p className="pb-1 text-center text-[11px]" style={{ color: LOGIN_MUTED }}>
            이미 계정이 있으신가요?{" "}
            <button
              type="button"
              onClick={() => onSwitchToLogin(email.trim() || undefined)}
              className="font-semibold"
              style={{ color: OLIVE_DARK }}
              onMouseEnter={(event) => {
                event.currentTarget.style.textDecoration = "underline";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.textDecoration = "none";
              }}
            >
              로그인
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function EmailCodeLoginForm({
  initialEmail = "",
  onAuthenticated,
  onSwitchToLogin,
}: {
  initialEmail?: string;
  onAuthenticated: (session: AuthSession, user: CurrentUser) => void;
  onSwitchToLogin: (prefillEmail?: string) => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [dispatchResult, setDispatchResult] = useState<VerificationCodeDispatchResponse | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  const handleSendCode = async () => {
    if (!email.trim()) {
      setError("이메일을 입력해주세요.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const result = await sendEmailLoginCode({
        email: email.trim(),
        deliveryChannel: "EMAIL",
      });
      setDispatchResult(result);
      setCode("");
    } catch (sendError) {
      setDispatchResult(null);
      setError(formatApiError(sendError));
    } finally {
      setSending(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || code.length !== 6) {
      setError("이메일과 6자리 인증코드를 모두 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const session = await loginWithEmailCode({
        email: email.trim(),
        verificationCode: code,
      });
      const user = await resolveAuthenticatedUser(session);
      onAuthenticated(session, user);
    } catch (loginError) {
      setError(formatApiError(loginError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 p-8">
      <div className="flex items-center gap-3 border-b border-black/5 pb-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: OLIVE_DARK }}>
          <KeyRound className="h-5 w-5" style={{ color: "white" }} />
        </div>
        <div>
          <h2 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>
            이메일 코드 로그인
          </h2>
          <p className="text-[11px]" style={{ color: LOGIN_MUTED }}>
            비밀번호 없이 6자리 인증코드로 로그인하세요
          </p>
        </div>
      </div>

      <Field
        label="이메일"
        icon={Mail}
        type="email"
        value={email}
        onChange={(value) => {
          setEmail(value);
          setError("");
        }}
        placeholder="your@email.com"
      />

      <button
        type="button"
        onClick={() => void handleSendCode()}
        disabled={sending}
        className="w-full rounded-xl py-3 text-sm font-semibold"
        style={{
          background: "rgba(65,67,27,0.08)",
          color: OLIVE_DARK,
          border: "1px solid rgba(65,67,27,0.10)",
          opacity: sending ? 0.75 : 1,
        }}
      >
        {sending ? "코드 발급 중..." : "인증코드 발급"}
      </button>

      {dispatchResult && (
        <div
          className="rounded-xl px-3.5 py-3"
          style={{ background: "rgba(65,67,27,0.04)", border: "1px solid rgba(65,67,27,0.10)" }}
        >
          <p className="text-[10px] font-semibold" style={{ color: TEXT_PRIMARY }}>
            인증코드를 보냈습니다
          </p>
          <p className="mt-1 text-[9px]" style={{ color: LOGIN_MUTED }}>
            전달 채널: {dispatchResult.deliveryChannel}
          </p>
          <p className="text-[9px]" style={{ color: LOGIN_MUTED }}>
            만료 시각: {dispatchResult.expiresAt}
          </p>
          {dispatchResult.debugCode && (
            <p className="mt-1 text-[9px]" style={{ color: LOGIN_ICON_MUTED }}>
              dev mock code: {dispatchResult.debugCode}
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        <p className="text-center text-[10px] font-semibold uppercase tracking-widest" style={{ color: LOGIN_MUTED }}>
          6자리 인증코드 입력
        </p>
        <OtpInput onComplete={setCode} resetKey={`${email}:${dispatchResult?.expiresAt ?? "idle"}`} />
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-[10px]" style={{ color: STATUS_ERROR }}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS_ERROR }} />
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleLogin()}
        disabled={loading}
        className="w-full rounded-xl py-3.5 text-sm font-semibold"
        style={{ background: OLIVE_DARK, color: "white", opacity: loading ? 0.75 : 1 }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span
              className="h-4 w-4 animate-spin rounded-full border-2"
              style={{ borderColor: "rgba(255,255,255,0.2)", borderTopColor: "white" }}
            />
            로그인 중...
          </span>
        ) : (
          "이메일 코드로 로그인"
        )}
      </button>

      <p className="text-center text-[11px]" style={{ color: LOGIN_MUTED }}>
        비밀번호로 로그인하고 싶으신가요?{" "}
        <button
          type="button"
          onClick={() => onSwitchToLogin(email.trim() || undefined)}
          className="font-semibold"
          style={{ color: OLIVE_DARK }}
        >
          로그인
        </button>
      </p>
    </div>
  );
}

export function LoginScreen({ onAuthenticated }: Props) {
  const [cardOpen, setCardOpen] = useState(false);
  const [mode, setMode] = useState<CardMode>("login");
  const [blurring, setBlurring] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [prefillEmail, setPrefillEmail] = useState("");
  const [socialProvider, setSocialProvider] = useState<SocialProvider | undefined>(undefined);
  const [notice, setNotice] = useState<Feedback | null>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!innerRef.current) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const height =
        entries[0].borderBoxSize?.[0]?.blockSize ??
        entries[0].contentRect.height;
      setCardHeight(height);
    });
    observer.observe(innerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleAuthenticatedInternal = (session: AuthSession, user: CurrentUser) => {
    setExiting(true);
    window.setTimeout(() => {
      onAuthenticated(session, user);
    }, 450);
  };

  const switchMode = (
    target: CardMode,
    options?: {
      email?: string;
      provider?: SocialProvider;
      notice?: Feedback | null;
    }
  ) => {
    if (target === mode || blurring) {
      if (options?.notice !== undefined) {
        setNotice(options.notice);
      }
      if (options?.email !== undefined) {
        setPrefillEmail(options.email);
      }
      return;
    }
    if (options?.email !== undefined) {
      setPrefillEmail(options.email);
    }
    if (options?.provider !== undefined) {
      setSocialProvider(options.provider);
    }
    if (options?.notice !== undefined) {
      setNotice(options.notice);
    }
    if (target === "login" && options?.provider === undefined) {
      setSocialProvider(undefined);
    }

    setBlurring(true);
    window.setTimeout(() => {
      setMode(target);
      setBlurring(false);
    }, 220);
  };

  return (
    <div
      className="relative flex size-full items-center justify-center overflow-hidden bg-[#F5F4F1]"
      style={{
        opacity: exiting ? 0 : 1,
        transition: exiting ? "opacity 0.42s ease" : "none",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* 전체를 좌우로 분할하고 중앙 정렬을 복구한 컨테이너 */}
      <div
        className="absolute inset-0 flex"
        style={{
          opacity: cardOpen ? 0.12 : 1,
          filter: cardOpen ? "blur(4px)" : "none",
          transform: cardOpen ? "scale(0.985)" : "scale(1)",
          transition: "opacity 0.38s ease, filter 0.38s ease, transform 0.38s ease",
          pointerEvents: cardOpen ? "none" : "auto",
          zIndex: 5,
        }}
      >
        {/* --- 왼쪽 영역: 기존 내부 중앙 정렬 복구 --- */}
        <div className="flex h-full w-full flex-col items-center justify-center px-8 sm:px-12 lg:w-1/2">
          
          {/* Logo & Title */}
          <div className="mb-8 flex items-center justify-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: OLIVE_DARK }}>
              <FolderGit2 className="h-5.5 w-5.5" style={{ color: "white" }} />
            </div>
            <div>
              <p className="text-xl font-bold" style={{ color: TEXT_PRIMARY }}>
                SynAIpse
              </p>
              <p className="text-[10px]" style={{ color: LOGIN_MUTED }}>
                Project Office
              </p>
            </div>
          </div>

          <h1 className="mb-4 text-center text-[44px] font-bold leading-tight tracking-tight sm:text-[52px]">
            <span style={{ color: "#1A1C06" }}>Welcome to</span>
            <br />
            <span style={{ color: OLIVE_DARK }}>SynAIpse</span>
          </h1>

          <p className="mb-8 text-center text-sm sm:text-base" style={{ color: LOGIN_OLIVE_TEXT, maxWidth: 360 }}>
            Intelligent Multi-Agent Project Office
            <br />
            <span style={{ color: LOGIN_MUTED, fontSize: 11 }}>Java/Spring Boot 기반 엔터프라이즈 관리 플랫폼</span>
          </p>

          <div className="mb-10 flex max-w-[500px] flex-wrap justify-center gap-2">
            {["멀티에이전트 관리", "AI QA 모니터링", "실시간 빌드", "팀 협업 대시보드"].map((tag) => (
              <span
                key={tag}
                className="rounded-full px-3 py-1.5 text-[11px] font-medium"
                style={{ background: "rgba(65,67,27,0.07)", color: OLIVE_DARK, border: "1px solid rgba(65,67,27,0.12)" }}
              >
                {tag}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCardOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold"
            style={{ background: OLIVE_DARK, color: "white" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.opacity = "0.88";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.opacity = "1";
            }}
          >
            시작하기 <ArrowRight className="h-4 w-4" />
          </button>

          <p className="mt-8 text-center text-[10px]" style={{ color: LOGIN_ICON_MUTED }}>
            SynAIpse Enterprise Platform - v2025.1
          </p>
        </div>

        {/* --- 💡 오른쪽 영역: 로그인 팝업 카드와 비슷한 크기의 사진 배치 --- */}
        <div className="hidden relative flex h-full w-full items-center justify-center lg:flex lg:w-1/2">
          {/* 로그인 창과 비슷한 크기(약 420px), 라운딩 처리 추가 */}
          <div className="relative h-[65%] max-h-[580px] w-[420px] max-w-[90%] overflow-hidden rounded-[20px] shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1000"
              alt="SynAIpse Technology Background"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* 그라데이션 및 오버레이 제거하여 사진 원본 노출 */}
          </div>
        </div>
      </div>

      {cardOpen && (
        <div
          className="absolute inset-0 z-20"
          style={{ background: "rgba(15,17,5,0.50)" }}
          onClick={() => setCardOpen(false)}
        />
      )}

      {/* 💡 로그인 팝업 */}
      <div
        className="absolute w-[420px] max-w-[90vw]"
        style={{
          /* 💡 반응형 위치 처리: lg 이상일 때 left: 60% (우측 중앙 부근), 그 이하일 때 left: 50% */
          /* 💡 아래로 약간 내림: top-[55%] 사용, translate-y 조절로 중앙에서 약간 아래로 */
          top: "55%", 
          left: typeof window !== 'undefined' && window.innerWidth >= 1024 ? "75%" : "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 30,
          animation: cardOpen ? "card-appear 0.40s cubic-bezier(0.22, 1, 0.36, 1) forwards" : "none",
          opacity: cardOpen ? 1 : 0,
          pointerEvents: cardOpen ? "auto" : "none",
        }}
      >
        <button
          type="button"
          onClick={() => setCardOpen(false)}
          className="absolute -right-3 -top-3 z-50 flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.14)", color: TEXT_LABEL }}
        >
          <X className="h-4 w-4" />
        </button>

        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 20,
            boxShadow: THICK_SHADOW,
            border: "1px solid rgba(0,0,0,0.05)",
            overflow: "hidden",
            height: cardHeight != null ? cardHeight + 3 : "auto",
            transition: "height 0.42s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <div ref={innerRef}>
            <div
              style={{
                opacity: blurring ? 0 : 1,
                filter: blurring ? "blur(6px)" : "blur(0px)",
                transform: blurring ? "scale(0.99)" : "scale(1)",
                transition: blurring
                  ? "opacity 0.18s ease, filter 0.18s ease, transform 0.18s ease"
                  : "opacity 0.22s ease, filter 0.22s ease, transform 0.22s ease",
              }}
            >
              {mode === "login" && (
                <LoginForm
                  initialEmail={prefillEmail}
                  notice={notice}
                  onAuthenticated={handleAuthenticatedInternal}
                  onSwitchToSignup={(email) => switchMode("signup", { email, notice: null })}
                  onSwitchToEmailCode={(email) => switchMode("email-code", { email, notice: null })}
                  onSocialLogin={(provider) => {
                    switchMode("signup", {
                      email: buildMockSocialEmail(provider),
                      provider,
                      notice: null,
                    });
                  }}
                />
              )}

              {mode === "signup" && (
                <SignupForm
                  onSwitchToLogin={(email, nextNotice) => switchMode("login", { email, notice: nextNotice ?? null })}
                  initialEmail={prefillEmail}
                  socialProvider={socialProvider}
                />
              )}

              {mode === "email-code" && (
                <EmailCodeLoginForm
                  initialEmail={prefillEmail}
                  onAuthenticated={handleAuthenticatedInternal}
                  onSwitchToLogin={(email) => switchMode("login", { email, notice: null })}
                />
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 6,
            bottom: -5,
            right: 6,
            height: 12,
            background: LOGIN_SHADOW_1,
            borderRadius: "0 0 20px 20px",
            zIndex: -1,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 12,
            bottom: -9,
            right: 12,
            height: 10,
            background: LOGIN_SHADOW_2,
            borderRadius: "0 0 16px 16px",
            zIndex: -2,
          }}
        />
      </div>
    </div>
  );
}
