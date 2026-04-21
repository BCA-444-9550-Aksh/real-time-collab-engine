
import CtaSection from '../components/landing/CtaSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import Footer from '../components/landing/Footer';
import HeroSection from '../components/landing/HeroSection';
import HowItWorks from '../components/landing/HowItWorks';
import LivePreview from '../components/landing/LivePreview';
import Navbar from '../components/landing/Navbar';
import PerformanceSection from '../components/landing/PerformanceSection';
import TestimonialsSection from '../components/landing/TestimonialsSection';
import '../landing.css';

export default function LandingPage() {
  return (
    <div className="landing-root">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorks />
        <LivePreview />
        <PerformanceSection />
        <TestimonialsSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
