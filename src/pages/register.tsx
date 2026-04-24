import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== repeatPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!confirmed) {
      setError('You must confirm private use.');
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      // Auto-signed in (email confirmation disabled)
      navigate('/app');
    } else {
      setMessage('Registration successful! Check your email to confirm your account.');
    }
  };

  return (
    <main>
      <div className="mt-[5%]">
        <form
          onSubmit={handleSubmit}
          className="fieldset bg-gray-100 border-base-300 rounded-box w-xs border p-4 mx-auto"
        >
          <p className="text-2xl text-center font-bold">Register</p>

          {error && (
            <div className="alert alert-error alert-sm mt-2">
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div className="alert alert-success alert-sm mt-2">
              <span>{message}</span>
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

          <label className="fieldset">
            <span className="label">Repeat Password</span>
            <input
              type="password"
              className="input validator"
              placeholder="Repeat Password"
              required
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
            />
            <span className="validator-hint hidden">Required</span>
          </label>

          <label className="my-2 flex items-start gap-2 text-left">
            <input
              type="checkbox"
              className="checkbox validator mt-1"
              required
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <p className="text-sm">
              I confirm that I am using this website for private use and the information I send will not be published.
            </p>
          </label>

          <button
            className="btn btn-primary text-black mt-4"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>

          <p className="text-center mt-4 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="link link-primary">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

