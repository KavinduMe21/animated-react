import './App.css'
import Hero from './components/Hero';
import { useSmoothScroll } from './hooks/useSmoothScroll';

function App() {
  useSmoothScroll();

  return (
    <main>
      <Hero />
    </main>
  );
}

export default App
