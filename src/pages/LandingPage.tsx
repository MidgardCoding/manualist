import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold mb-6">Manualist</h1>
        <p className="text-xl mb-8 opacity-80">
          Transform your user manuals into quick, structured summaries.
          Upload photos, PDFs, or paste plain text — we handle the rest.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/login" className="btn btn-primary btn-lg text-black">
            Sign In
          </Link>
          <Link to="/register" className="btn btn-outline btn-lg">
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}

