import React, { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import './Login.css';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const [showError, setShowError] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      setShowError(true);
      return;
    }

    console.log('로그인 시도 : ', formData);
  };

  useEffect(() => {
    document.title = '로그인';
  }, []);

  return (
    <div className="login-wrapper">
      {showError && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p>아이디 또는 비밀번호가 틀렸습니다</p>
            <button
              className="modal-button"
              onClick={() => setShowError(false)}>
              확인
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>아이디</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
          />
        </div>

        <div className="input-group">
          <label>비밀번호</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
          />
        </div>

        <div className="button-group">
          <button type="submit">로그인</button>
          <button type="button">회원가입</button>
        </div>
      </form>
    </div>
  );
};

export default Login;