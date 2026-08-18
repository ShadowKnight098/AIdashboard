import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext.js';

export const LoginPage: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        if (!displayName.trim()) {
          setError('Please enter your name.');
          setLoading(false);
          return;
        }
        await signUp(email, password, displayName);
        setSignupSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4 font-body">
      <div className="w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-[6px] bg-[#3654FF] flex items-center justify-center text-white font-display font-bold text-xl">
              T
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-[#12172B]">
              TechScroll<span className="text-[#3654FF]"> AI</span>
            </span>
          </div>
          <p className="text-sm text-slate-600 font-body">
            Don't stop scrolling. Make it useful.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#FFFFFF] rounded-[8px] border border-[#E4E7EC] p-6 sm:p-8 space-y-6">
          {signupSuccess ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-[#0F9C93]/10 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-[#0F9C93]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-display font-bold text-[#12172B]">Account Created!</h3>
              <p className="text-xs text-slate-600 font-body leading-relaxed">
                Check your email <span className="font-mono text-[#3654FF]">{email}</span> for a confirmation link.
                Once confirmed, you can log in.
              </p>
              <button
                onClick={() => { setMode('login'); setSignupSuccess(false); }}
                className="btn-primary px-6 py-2.5 text-xs mx-auto"
              >
                Go to Login
              </button>
            </div>
          ) : (
            <>
              {/* Mode Toggle Tabs */}
              <div className="flex rounded-[6px] bg-[#F7F8FA] p-1 border border-[#E4E7EC]">
                <button
                  onClick={() => { setMode('login'); setError(null); }}
                  className={`flex-1 py-2 text-xs font-medium rounded-[4px] transition-colors ${
                    mode === 'login' ? 'bg-[#FFFFFF] text-[#12172B] shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Log In
                </button>
                <button
                  onClick={() => { setMode('signup'); setError(null); }}
                  className={`flex-1 py-2 text-xs font-medium rounded-[4px] transition-colors ${
                    mode === 'signup' ? 'bg-[#FFFFFF] text-[#12172B] shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-[6px] bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="text-xs font-medium text-[#12172B] block mb-1.5">
                      Your Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Alex Chen"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[6px] border border-[#E4E7EC] text-sm font-body text-[#12172B] placeholder:text-slate-400 focus:outline-none focus:border-[#3654FF] focus:ring-1 focus:ring-[#3654FF]/20"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-[#12172B] block mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="you@university.edu"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[6px] border border-[#E4E7EC] text-sm font-body text-[#12172B] placeholder:text-slate-400 focus:outline-none focus:border-[#3654FF] focus:ring-1 focus:ring-[#3654FF]/20"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#12172B] block mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    minLength={6}
                    className="w-full px-3.5 py-2.5 rounded-[6px] border border-[#E4E7EC] text-sm font-body text-[#12172B] placeholder:text-slate-400 focus:outline-none focus:border-[#3654FF] focus:ring-1 focus:ring-[#3654FF]/20"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-2.5 text-sm font-medium flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{mode === 'login' ? 'Logging in...' : 'Creating account...'}</span>
                    </>
                  ) : (
                    <span>{mode === 'login' ? 'Log In' : 'Create Account'}</span>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] font-mono text-slate-400">
          TechScroll AI • High-Signal CS Feed Engine
        </p>
      </div>
    </div>
  );
};
