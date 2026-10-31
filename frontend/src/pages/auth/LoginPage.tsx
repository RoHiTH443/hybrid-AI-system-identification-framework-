import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, CheckCircle2, Shield, Loader2, ArrowLeft, Zap, Sparkles, KeyRound } from 'lucide-react';
import { login, registerDirect, enterDemoMode, requestOtp, verifyOtp, resendOtp, forgotPassword, resetPassword } from '../../api/authApi';
import { useAuthStore } from '../../store/authStore';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

type AuthTab = 'login' | 'otp' | 'register' | 'forgot';

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('remembered_email') || 'arul@example.com';
  });
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    localStorage.setItem('remembered_email', val);
  };

  // OTP state
  const [otpStep, setOtpStep] = useState<1 | 2>(1);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot password state
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [welcomeText, setWelcomeText] = useState('Verification Successful');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { setAuth } = useAuthStore();

  // Background scientific particle & dynamic wave canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const particles = Array.from({ length: 30 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2 + 0.8,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    const render = () => {
      time += 0.01;
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Scientific grid
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 45;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Nonlinear phase trajectory wave (Cyan)
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x += 6) {
        const y = canvas.height * 0.55 + Math.sin(x * 0.008 + time) * 70 + Math.cos(x * 0.004 - time * 0.8) * 40;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.28)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Damped harmonic oscillation wave (Violet)
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x += 6) {
        const y = canvas.height * 0.55 + Math.cos(x * 0.007 - time) * 60 + Math.sin(x * 0.012 + time * 1.2) * 35;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.22)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha})`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // OTP Countdown
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (otpStep === 2 && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpStep, countdown]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide your email address and password.');
      triggerShake();
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await login(email, password, rememberMe);
      const data = res.data;
      if (data.token) {
        localStorage.setItem('remembered_email', email);
        localStorage.setItem('auth_token', data.token);
        sessionStorage.setItem('auth_token', data.token);
        if (data.user) {
          localStorage.setItem('auth_user', JSON.stringify(data.user));
          sessionStorage.setItem('auth_user', JSON.stringify(data.user));
        }
        setWelcomeText(`Welcome back, ${data.user.name || 'Researcher'}!`);
        setIsSuccess(true);
        setAuth(data.user, data.token);
        setTimeout(() => { onLoginSuccess(); }, 1200);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Login failed. Please check your credentials or enter via Demo Mode.';
      setError(msg);
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setError('Please fill in your full name, email, and password.');
      triggerShake();
      return;
    }
    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      triggerShake();
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await registerDirect(email, password, name);
      const data = res.data;
      localStorage.setItem('remembered_email', email);
      localStorage.setItem('auth_token', data.token);
      sessionStorage.setItem('auth_token', data.token);
      if (data.user) {
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        sessionStorage.setItem('auth_user', JSON.stringify(data.user));
      }
      setWelcomeText(`Account created! Welcome, ${data.user.name}.`);
      setIsSuccess(true);
      setAuth(data.user, data.token);
      setTimeout(() => { onLoginSuccess(); }, 1200);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Registration failed. Email may already be in use.';
      setError(msg);
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await enterDemoMode();
      const data = res.data;
      localStorage.setItem('remembered_email', data.user?.email || 'demo.researcher@antigravity.ai');
      localStorage.setItem('auth_token', data.token);
      sessionStorage.setItem('auth_token', data.token);
      if (data.user) {
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        sessionStorage.setItem('auth_user', JSON.stringify(data.user));
      }
      setWelcomeText('Welcome to Hybrid AI SysID Laboratory!');
      setIsSuccess(true);
      setAuth(data.user, data.token);
      setTimeout(() => { onLoginSuccess(); }, 1000);
    } catch (err: any) {
      // Local fallback in case backend is starting
      const mockUser = { id: 1, email: 'demo@antigravity.ai', name: 'Dr. Sarah Lin (Lead)', role: 'Research Lead' };
      localStorage.setItem('remembered_email', mockUser.email);
      localStorage.setItem('auth_token', 'demo-token');
      sessionStorage.setItem('auth_token', 'demo-token');
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      sessionStorage.setItem('auth_user', JSON.stringify(mockUser));
      setWelcomeText('Entering Demo Engineering Laboratory...');
      setIsSuccess(true);
      setAuth(mockUser, 'demo-token');
      setTimeout(() => { onLoginSuccess(); }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  // OTP handlers
  const handleOtpEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      triggerShake();
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await requestOtp(email);
      setOtpStep(2);
      setCountdown(300);
      setResendCooldown(60);
      if (res.data?.dev_otp) {
        setOtpDigits(res.data.dev_otp.split(''));
        setSuccessMsg(`Development code auto-filled: ${res.data.dev_otp}`);
      }
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to dispatch verification code.');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otpDigits];
    next[index] = val;
    setOtpDigits(next);
    if (val && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpVerifySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      triggerShake();
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await verifyOtp(email, code);
      const data = res.data;
      if (data.success && data.token) {
        localStorage.setItem('remembered_email', email);
        localStorage.setItem('auth_token', data.token);
        sessionStorage.setItem('auth_token', data.token);
        if (data.user) {
          localStorage.setItem('auth_user', JSON.stringify(data.user));
          sessionStorage.setItem('auth_user', JSON.stringify(data.user));
        }
        setWelcomeText(`Identity Verified! Welcome, ${data.user.name || 'Researcher'}.`);
        setIsSuccess(true);
        setAuth(data.user, data.token);
        setTimeout(() => { onLoginSuccess(); }, 1200);
      } else {
        setError(data.message || 'Incorrect verification code.');
        triggerShake();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid or expired verification code.');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password handlers
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide your registered email address.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await forgotPassword(email);
      setForgotStep(2);
      if (res.data?.dev_otp) {
        setResetOtp(res.data.dev_otp);
        setSuccessMsg(`Reset code generated: ${res.data.dev_otp}`);
      } else {
        setSuccessMsg('Reset code dispatched to your email.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to process password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtp || !newPassword) {
      setError('Please enter the reset code and your new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await resetPassword(email, resetOtp, newPassword);
      setSuccessMsg('Password successfully updated! You may now sign in.');
      setActiveTab('login');
      setPassword(newPassword);
      setForgotStep(1);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden font-sans bg-[#020617] text-slate-100 p-4">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-lg"
      >
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-cyan-500/25 rounded-2xl p-8 shadow-2xl relative overflow-hidden shadow-cyan-950/50">

          {/* Top subtle glow banner */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-violet-500 to-emerald-400" />

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-violet-500/20 to-blue-500/10 border border-cyan-400/30 mb-3 shadow-inner">
              <Sparkles className="w-7 h-7 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              Hybrid AI SysID Framework
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Nonlinear Dynamic System Identification & Physics-Informed Learning Laboratory
            </p>
          </div>

          {/* Instant Demo Access Button */}
          <div className="mb-6">
            <button
              onClick={handleDemoLogin}
              disabled={isLoading}
              type="button"
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 hover:from-cyan-400 hover:via-blue-500 hover:to-violet-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] border border-cyan-400/30"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>Enter Demo Mode (One-Click Instant Access)</span>
            </button>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-[11px] text-slate-500 uppercase tracking-widest font-mono">or authenticate</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/60 rounded-xl border border-slate-800 mb-6 text-xs font-medium">
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setError(null); }}
              className={`py-2 rounded-lg transition-all ${activeTab === 'login' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('otp'); setError(null); }}
              className={`py-2 rounded-lg transition-all ${activeTab === 'otp' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              OTP Code
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('register'); setError(null); }}
              className={`py-2 rounded-lg transition-all ${activeTab === 'register' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('forgot'); setError(null); }}
              className={`py-2 rounded-lg transition-all ${activeTab === 'forgot' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Reset
            </button>
          </div>

          <motion.div animate={shake ? { x: [-8, 8, -8, 8, 0] } : {}} transition={{ duration: 0.35 }}>
            {error && (
              <div className="mb-4 text-xs text-rose-300 bg-rose-950/50 border border-rose-500/30 p-3 rounded-xl flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 text-xs text-emerald-300 bg-emerald-950/50 border border-emerald-500/30 p-3 rounded-xl flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <AnimatePresence mode="wait">
              {isSuccess ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center justify-center py-8 text-center space-y-3"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{welcomeText}</h3>
                  <p className="text-xs text-slate-400">Redirecting to Engineering Research Studio...</p>
                </motion.div>
              ) : (
                <>
                  {/* TAB 1: EMAIL & PASSWORD LOGIN */}
                  {activeTab === 'login' && (
                    <motion.form
                      key="login"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      onSubmit={handleLoginSubmit}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => handleEmailChange(e.target.value)}
                            placeholder="researcher@university.edu"
                            required
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-medium text-slate-300">Password</label>
                          <button
                            type="button"
                            onClick={() => setActiveTab('forgot')}
                            className="text-xs text-cyan-400 hover:text-cyan-300"
                          >
                            Forgot?
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••••••"
                            required
                            className="w-full pl-9 pr-10 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-500/20"
                          />
                          <span>Remember me on this machine</span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm rounded-xl transition-all shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 mt-2"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : 'Sign In to Laboratory'}
                      </button>
                    </motion.form>
                  )}

                  {/* TAB 2: OTP VERIFICATION */}
                  {activeTab === 'otp' && (
                    <motion.div
                      key="otp"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-4"
                    >
                      {otpStep === 1 ? (
                        <form onSubmit={handleOtpEmailSubmit} className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                              <input
                                type="email"
                                value={email}
                                onChange={(e) => handleEmailChange(e.target.value)}
                                placeholder="researcher@university.edu"
                                required
                                className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                              />
                            </div>
                          </div>
                          <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm rounded-xl transition-all shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2"
                          >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send 6-Digit Code'}
                          </button>
                        </form>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-xs">
                            <button
                              type="button"
                              onClick={() => setOtpStep(1)}
                              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" /> Back to email
                            </button>
                            <span className="text-slate-400">{countdown}s remaining</span>
                          </div>

                          <div className="flex justify-between gap-2">
                            {otpDigits.map((digit, i) => (
                              <input
                                key={i}
                                ref={(el) => { otpRefs.current[i] = el; }}
                                type="text"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Backspace' && !digit && i > 0) otpRefs.current[i - 1]?.focus();
                                }}
                                className="w-12 h-12 text-center text-lg font-bold bg-slate-950 border border-slate-700 rounded-xl text-cyan-300 focus:border-cyan-400 focus:outline-none"
                              />
                            ))}
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-slate-400">Didn't receive code?</span>
                            <button
                              type="button"
                              disabled={resendCooldown > 0}
                              onClick={() => resendOtp(email)}
                              className="text-cyan-400 hover:text-cyan-300 disabled:text-slate-600"
                            >
                              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOtpVerifySubmit()}
                            disabled={isLoading}
                            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
                          >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Enter'}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* TAB 3: REGISTER */}
                  {activeTab === 'register' && (
                    <motion.form
                      key="register"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      onSubmit={handleRegisterSubmit}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Dr. Evelyn Hayes"
                            required
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => handleEmailChange(e.target.value)}
                            placeholder="researcher@lab.org"
                            required
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Create Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            required
                            className="w-full pl-9 pr-10 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-violet-600/20 flex items-center justify-center gap-2 mt-2"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : 'Create Research Account'}
                      </button>
                    </motion.form>
                  )}

                  {/* TAB 4: FORGOT PASSWORD */}
                  {activeTab === 'forgot' && (
                    <motion.div
                      key="forgot"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-4"
                    >
                      {forgotStep === 1 ? (
                        <form onSubmit={handleForgotSubmit} className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">Registered Email</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                              <input
                                type="email"
                                value={email}
                                onChange={(e) => handleEmailChange(e.target.value)}
                                placeholder="researcher@university.edu"
                                required
                                className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                              />
                            </div>
                          </div>
                          <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm rounded-xl transition-all shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2"
                          >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Request Password Reset Code'}
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">Verification Code</label>
                            <input
                              type="text"
                              value={resetOtp}
                              onChange={(e) => setResetOtp(e.target.value)}
                              placeholder="6-digit code"
                              required
                              className="w-full px-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">New Password</label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="New password (min 6 chars)"
                              required
                              className="w-full px-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm rounded-xl transition-all shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2"
                          >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set New Password'}
                          </button>
                        </form>
                      )}
                    </motion.div>
                  )}
                </>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Footer note */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>TLS / Salted PBKDF2 Encrypted</span>
            </span>
            <span>Version 2.0 Scientific Edition</span>
          </div>

        </div>
      </motion.div>
    </div>
  );
};
