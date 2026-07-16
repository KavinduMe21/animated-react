import './App.css'
import Hero from './components/Hero';
import { useSmoothScroll } from './hooks/useSmoothScroll';

function App() {
  useSmoothScroll();

  return (
    <main>
      <Hero />
      {/* Spacer after hero for natural page flow */}
      <section className="h-screen flex items-center justify-center">
        <p className="text-white/20 text-sm tracking-widest uppercase">
          Continue scrolling
        </p>
      </section>
    </main>
  );
}

export default App
