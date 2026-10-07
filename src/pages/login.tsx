import { useState, type FormEvent } from 'react';
import { supabase } from '../utils/supabase';
import Background from '../components/Background';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    window.location.href = '/app';
  };

  return (
    <Background>
      <div className="flex min-h-screen items-center justify-center">
        <form
          onSubmit={handleSubmit}
          className="fieldset mx-auto w-auto rounded-2xl bg-base-100/90 backdrop-blur border border-base-300 shadow-lg p-8 sm:p-6"
        >
          <p className="text-2xl text-center font-bold">Login</p>

          {error && (
            <div className="alert alert-error alert-sm mt-2">
              <span>{error}</span>
            </div>
          )}

          <fieldset className="fieldset">
            <label className="label">Email</label>
            <input
              type="email"
              className="input validator"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="validator-hint hidden">Required</p>
          </fieldset>

          <label className="fieldset">
            <span className="label">Password</span>
            <input
              type="password"
              className="input validator"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="validator-hint hidden">Required</span>
          </label>

          <button
            className="btn btn-primary text-black mt-4"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center mt-4 text-sm">
            Don&apos;t have an account?{' '}
            <a href="/register" className="link link-primary">
              Register
            </a>
          </p>
        </form>
      </div>
    </Background>
  );
}

