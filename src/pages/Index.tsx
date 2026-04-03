import { Camera, Shield, BarChart3, Users, ArrowRight, Eye, Zap, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import AppHeader from "@/components/AppHeader";

const features = [
  { icon: Camera, title: "3-Second Reporting", desc: "Snap a photo, auto-geotagged with AI classification." },
  { icon: Shield, title: "Anti-Fake System", desc: "Community verification and AI metadata analysis." },
  { icon: BarChart3, title: "Smart Priority", desc: "Dynamic S-Score algorithm ranks issues by urgency." },
  { icon: Users, title: "Civic Leaderboard", desc: "Earn Karma points and badges for real contributions." },
];

const stats = [
  { value: "2,847", label: "Issues Resolved" },
  { value: "12,340", label: "Active Citizens" },
  { value: "< 48h", label: "Avg Resolution" },
  { value: "94%", label: "Verification Rate" },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container relative py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-sm font-medium text-accent-foreground mb-2">
              <Zap className="h-4 w-4 text-accent" />
              AI-Powered Urban Governance
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gradient-navy leading-[1.1]">
              Your City, <br />
              <span className="relative">
                Your Voice
                <span className="absolute -bottom-2 left-0 w-full h-3 bg-accent/30 rounded-full -z-10" />
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Report civic issues in seconds. AI classifies, prioritizes, and routes them to the right department — transparently.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Link to="/report">
                <Button variant="civic" size="lg" className="text-base px-8 h-12">
                  <Camera className="h-5 w-5 mr-2" />
                  Report Issue
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground mt-2 w-full text-center">Can be accessed by authorised Member</p>
              <Link to="/admin">
                <Button variant="navy" size="lg" className="text-base px-8 h-12">
                  <Eye className="h-5 w-5 mr-2" />
                  Admin Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/50 bg-card/50">
        <div className="container py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl md:text-4xl font-extrabold text-gradient-navy">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gradient-navy">How CivicEye Works</h2>
          <p className="text-muted-foreground mt-2">From report to resolution — powered by AI</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="glass-card rounded-2xl p-6 hover:shadow-xl transition-all duration-300 group animate-fade-in-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="h-12 w-12 rounded-xl gradient-accent flex items-center justify-center mb-4 group-hover:animate-pulse-glow transition-shadow">
                <f.icon className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="gradient-navy rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-transparent to-accent/5" />
          <div className="relative z-10">
            <MapPin className="h-10 w-10 text-accent mx-auto mb-4 animate-float" />
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              See a problem? Fix it in 3 seconds.
            </h2>
            <p className="text-primary-foreground/70 max-w-md mx-auto mb-8">
              Join thousands of citizens making their neighborhoods safer and cleaner.
            </p>
            <Link to="/report">
              <Button variant="civic" size="lg" className="text-base px-10 h-12">
                Get Started <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>CivicEye AI — Built by Team Minions 🍌</p>
        </div>
      </footer>
    </div>
  );
}
