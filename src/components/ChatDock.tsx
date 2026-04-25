export default function ChatDock() {
  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4">
      <div className="w-full max-w-2xl flex items-center gap-2 p-2 glass rounded-full shadow-2xl border border-white/20 backdrop-blur-md">
        
        <input 
          type="text" 
          placeholder="Ask a question about your manual" 
          className="flex-grow bg-transparent border-none outline-none px-4 py-2 text-base-content placeholder:text-base-content/50"
        />
        { /* TODO: Implement actual Credit score per user */ }
        <p className="rounded-full p-2 text-sm font-bold text-amber-800 bg-amber-400">10 CR</p>
        <button className="btn btn-circle btn-warning shadow-md hover:scale-105 transition-transform">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
            />
          </svg>
        </button>
      </div>
    </div>
  )
}