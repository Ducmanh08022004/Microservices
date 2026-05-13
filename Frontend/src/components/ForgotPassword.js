import React, { useState } from 'react';
import { useEffect } from 'react';
import axios from 'axios';
import { API_GATEWAY } from '../config';
import { Link, useNavigate } from 'react-router-dom';

function ForgotPassword() {
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [stage, setStage] = useState('request');
  const [loading, setLoading] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [expiresAt, setExpiresAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    if (!expiresAt || stage !== 'confirm') return undefined;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt, stage]);

  const formatTime = (totalSeconds) => {
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const requestCode = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await axios.post(`${API_GATEWAY}/auth/forgot-password/request`, { username });
      setMessage(response.data.message || 'Mã xác nhận đã được gửi tới email của bạn.');
      setExpiresAt(response.data.expiresAtEpochMillis || 0);
      setSecondsLeft(response.data.expiresInSeconds || 180);
      setStage('confirm');
      setAttemptsLeft(5);
      setCode('');
      setNewPassword('');
    } catch (err) {
      const responseError = err.response?.data?.error || 'Không thể gửi mã xác nhận.';
      setError(responseError);
      if (err.response?.status === 403) {
        setStage('locked');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    await requestCode();
  };

  const handleResend = async () => {
    await requestCode();
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await axios.post(`${API_GATEWAY}/auth/forgot-password/confirm`, {
        username,
        code,
        newPassword,
      });
      setMessage(response.data.message || 'Đặt lại mật khẩu thành công.');
      setTimeout(() => navigate('/login'), 1000);
    } catch (err) {
      const responseError = err.response?.data?.error || 'Xác nhận thất bại.';
      setError(responseError);
      const left = err.response?.data?.attemptsLeft;
      if (typeof left === 'number') {
        setAttemptsLeft(left);
      }
      if (err.response?.data?.locked || err.response?.status === 423) {
        setStage('locked');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSupport = async () => {
    setSupportLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await axios.post(`${API_GATEWAY}/auth/forgot-password/support`, { username });
      setMessage(response.data.message || 'Đã gửi yêu cầu hỗ trợ đến quản trị viên.');
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể gửi yêu cầu hỗ trợ.');
    } finally {
      setSupportLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="card login-panel">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 className="login-title">Quên mật khẩu</h2>
          <p className="login-subtitle">Nhập tên đăng nhập để nhận mã xác nhận qua email và đặt lại mật khẩu.</p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 30, justifyContent: 'center' }}>
          <div style={{ height: 4, width: 40, borderRadius: 2, background: stage === 'request' ? 'var(--brand)' : 'var(--brand)' }} />
          <div style={{ height: 4, width: 40, borderRadius: 2, background: stage === 'confirm' ? 'var(--brand)' : (stage === 'request' ? 'var(--border-color)' : 'var(--brand)') }} />
          <div style={{ height: 4, width: 40, borderRadius: 2, background: stage === 'locked' ? 'var(--danger)' : 'var(--border-color)' }} />
        </div>

        {stage === 'request' && (
          <form className="form-col" onSubmit={handleRequest}>
            <div className="form-group">
              <label className="field-label">Tên đăng nhập</label>
              <input
                className="input"
                type="text"
                placeholder="Nhập username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Đang gửi mã...' : 'Gửi mã xác nhận'}
            </button>
          </form>
        )}

        {stage === 'confirm' && (
          <form className="form-col" onSubmit={handleConfirm}>
            <div className="form-group">
              <label className="field-label">Tên đăng nhập</label>
              <input className="input" type="text" value={username} readOnly />
            </div>

            <div className="form-group">
              <label className="field-label">Mã xác nhận</label>
              <input
                className="input"
                type="text"
                placeholder="Nhập mã 6 chữ số"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label className="field-label">Mật khẩu mới</label>
              <input
                className="input"
                type="password"
                placeholder="Nhập mật khẩu mới"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Mã xác nhận có hiệu lực trong:</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: secondsLeft > 30 ? 'var(--brand)' : 'var(--danger)' }}>{secondsLeft > 0 ? formatTime(secondsLeft) : 'Hết hạn'}</span>
              </div>
              <div style={{ height: 6, width: '100%', background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(secondsLeft / 180) * 100}%`, background: secondsLeft > 30 ? 'var(--brand)' : 'var(--danger)', transition: 'width 1s linear' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <button className="btn btn-primary" type="submit" disabled={loading || secondsLeft === 0}>
                {loading ? 'Đang xác nhận...' : secondsLeft === 0 ? 'Mã đã hết hạn' : 'Xác nhận mã và đổi mật khẩu'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={handleResend} disabled={loading}>
                Gửi lại mã
              </button>
            </div>
          </form>
        )}

        {stage === 'locked' && (
          <div className="form-col">
            <p className="error-text" style={{ textAlign: 'center', marginBottom: 0 }}>
              Tài khoản đã bị khóa do nhập sai quá 5 lần. Bạn có thể yêu cầu hỗ trợ để mở khóa.
            </p>
            <button className="btn btn-accent" type="button" onClick={handleSupport} disabled={supportLoading}>
              {supportLoading ? 'Đang gửi yêu cầu...' : 'Yêu cầu hỗ trợ mở khóa'}
            </button>
          </div>
        )}

        {message && <p style={{ color: 'var(--ok)', marginTop: 14, textAlign: 'center', fontWeight: 600 }}>{message}</p>}
        {error && <p className="error-text" style={{ textAlign: 'center' }}>{error}</p>}

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14 }}>
          <Link to="/login" style={{ color: 'var(--brand)', textDecoration: 'none', fontWeight: 700 }}>Quay lại đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;