export default function HeroGraphic() {
  return (
    <div className="hidden md:flex relative w-96 h-96 items-center justify-center mt-12 md:mt-0 opacity-80 animate-in fade-in duration-1000 delay-300">
       <div className="absolute w-64 h-64 border border-yellow-500/20 rotate-45 transition-transform duration-700 hover:rotate-90"></div>
       <div className="absolute w-48 h-48 border border-yellow-500/40 rotate-60"></div>
       <div className="absolute w-32 h-32 border-2 border-yellow-500 flex items-center justify-center bg-yellow-500/5 shadow-[0_0_30px_rgba(234,179,8,0.2)]"></div>
       
       <div className="absolute top-10 right-10 w-2 h-2 bg-yellow-500 rounded-full"></div>
       <div className="absolute bottom-20 left-10 w-2 h-2 bg-yellow-500 rounded-full opacity-50"></div>
       <div className="absolute top-1/2 -right-8 w-3 h-3 bg-yellow-500 rounded-full opacity-80"></div>
    </div>
  );
}