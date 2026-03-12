export default function HeroContent() {
  return (
    <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-tight text-white">
        Welcome <br />
        to <span className="text-yellow-500">EventHive</span>
      </h1>
      
      <p className="text-gray-400 text-lg md:text-xl leading-relaxed max-w-lg">
        The autonomous multi-agent swarm for event logistics. Orchestrate hackathons and technical events with AI-powered coordination.
      </p>
      
      <div className="flex flex-wrap items-center gap-4 pt-4">
        <button className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg transition-colors">
          Get Started
        </button>
        <button className="px-8 py-3 bg-transparent border border-gray-700 hover:border-gray-500 text-white font-medium rounded-lg transition-colors">
          View Demo
        </button>
      </div>

      <div className="flex items-center gap-6 pt-12 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          4 Agents Active
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
          Multi-Agent Swarm
        </div>
      </div>
    </div>
  );
}