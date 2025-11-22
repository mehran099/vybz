import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, Users, Zap, Shield, Sparkles, Gamepad2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const AVAILABLE_COLORS = [
  "#00F5FF", "#FF00FF", "#A855F7", "#10B981", "#FBBF24", 
  "#EF4444", "#06B6D4", "#8B5CF6", "#F97316", "#14B8A6"
];

const getRandomColor = () => AVAILABLE_COLORS[Math.floor(Math.random() * AVAILABLE_COLORS.length)];

export default function Index() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGuestJoin = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error("Please enter a username");
      return;
    }

    if (username.length < 3 || username.length > 20) {
      toast.error("Username must be 3-20 characters");
      return;
    }

    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `${username.toLowerCase().replace(/\s/g, '')}_${Date.now()}@guest.vybe.chat`,
        password: Math.random().toString(36).slice(-16),
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: authData.user.id,
          username: username.trim(),
          display_color: getRandomColor(),
          is_guest: true,
        });

      if (profileError) throw profileError;

      toast.success(`Welcome, ${username}! 🎉`);
      navigate("/chat");
    } catch (error: any) {
      console.error("Error joining:", error);
      if (error.message?.includes("duplicate")) {
        toast.error("Username taken. Try another!");
      } else {
        toast.error("Failed to join. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
      
      {/* Floating orbs with neon glow */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-primary/30 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[120px] animate-float" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[150px] animate-pulse" />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6">
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Logo/Title */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-3 mb-6 animate-float">
              <Gamepad2 className="w-16 h-16 text-primary drop-shadow-[0_0_15px_hsl(var(--primary))]" />
              <Sparkles className="w-12 h-12 text-accent animate-pulse drop-shadow-[0_0_15px_hsl(var(--accent))]" />
            </div>
            
            <h1 className="font-['Orbitron'] text-8xl md:text-9xl font-black mb-6 tracking-tighter">
              <span className="inline-block bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-neon-flicker drop-shadow-[0_0_30px_hsl(var(--primary))]">
                VYBE
              </span>
            </h1>
            
            <div className="space-y-3">
              <p className="text-3xl md:text-4xl font-bold text-primary drop-shadow-[0_0_10px_hsl(var(--primary))] tracking-wide">
                // CONNECT_INSTANTLY
              </p>
              <p className="text-xl md:text-2xl text-muted-foreground font-medium">
                Real-time gaming chat • Voice calls • Global community
              </p>
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground/80 font-mono">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_hsl(var(--primary))]" />
                  NO SIGNUP REQUIRED
                </span>
                <span className="text-border">|</span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_10px_hsl(var(--accent))]" />
                  INSTANT ACCESS
                </span>
              </div>
            </div>
          </div>

          {/* Join Form */}
          <Card className="max-w-lg mx-auto p-8 bg-card/40 backdrop-blur-xl border-2 border-primary/30 shadow-[0_0_50px_hsl(var(--primary)/0.3)] relative overflow-hidden group hover:border-primary/50 transition-all">
            {/* Animated border glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
            
            <div className="relative z-10">
              <form onSubmit={handleGuestJoin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-3 h-3" />
                    ENTER USERNAME
                  </label>
                  <Input
                    type="text"
                    placeholder="xXGamerXx"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={20}
                    className="h-14 text-lg font-bold bg-input/50 border-2 border-primary/30 focus:border-primary focus:shadow-[0_0_20px_hsl(var(--primary)/0.4)] text-foreground placeholder:text-muted-foreground/50 uppercase tracking-wide"
                    disabled={isLoading}
                  />
                </div>
                
                <Button
                  type="submit"
                  size="lg"
                  variant="cyber"
                  className="w-full h-16 text-xl"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                      CONNECTING...
                    </span>
                  ) : (
                    <span className="flex items-center gap-3">
                      <Zap className="w-6 h-6" />
                      JOIN THE VYBE
                      <Sparkles className="w-5 h-5" />
                    </span>
                  )}
                </Button>
                
                <div className="flex items-center justify-center gap-6 text-xs font-bold text-muted-foreground uppercase">
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    ANONYMOUS
                  </span>
                  <span className="text-border">•</span>
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-accent" />
                    INSTANT
                  </span>
                  <span className="text-border">•</span>
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-secondary" />
                    GLOBAL
                  </span>
                </div>
              </form>
            </div>
          </Card>

          {/* Features Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
            {[
              { icon: Zap, title: "INSTANT", desc: "Join in seconds", color: "primary" },
              { icon: Users, title: "GLOBAL", desc: "Connect worldwide", color: "secondary" },
              { icon: MessageCircle, title: "REAL-TIME", desc: "Live chat", color: "accent" },
              { icon: Shield, title: "PRIVATE", desc: "Anonymous", color: "primary" },
            ].map((feature, i) => (
              <Card 
                key={i} 
                className="p-6 bg-card/30 backdrop-blur-sm border-2 border-border hover:border-primary/50 hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)] transition-all group cursor-pointer"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <feature.icon className={`w-10 h-10 mx-auto mb-3 text-${feature.color} drop-shadow-[0_0_10px_hsl(var(--${feature.color}))] group-hover:scale-110 transition-transform`} />
                <h3 className="font-bold text-sm mb-1 text-foreground tracking-wider">{feature.title}</h3>
                <p className="text-xs text-muted-foreground font-medium">{feature.desc}</p>
              </Card>
            ))}
          </div>

          {/* Stats bar */}
          <div className="mt-12 flex items-center justify-center gap-8 text-sm font-mono">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-sm animate-pulse shadow-[0_0_10px_hsl(var(--primary))]" />
              <span className="text-muted-foreground">ONLINE: <span className="text-primary font-bold">1,337</span></span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-accent rounded-sm animate-pulse shadow-[0_0_10px_hsl(var(--accent))]" />
              <span className="text-muted-foreground">ROOMS: <span className="text-accent font-bold">42</span></span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
