import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, Users, Zap, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import heroBg from "@/assets/hero-bg.jpg";

const AVAILABLE_COLORS = [
  "#8B5CF6", "#3B82F6", "#EC4899", "#10B981", "#F59E0B", 
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
      // Sign up as guest (anonymous)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `${username.toLowerCase().replace(/\s/g, '')}_${Date.now()}@guest.vybe.chat`,
        password: Math.random().toString(36).slice(-16),
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Create profile
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${heroBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        
        {/* Floating orbs */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-primary/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000" />

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="mb-8">
            <h1 className="text-7xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000">
              VYBE
            </h1>
            <p className="text-2xl text-muted-foreground mb-2 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
              Connect Instantly. Chat Globally.
            </p>
            <p className="text-lg text-muted-foreground/80 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
              Real-time conversations with people worldwide. No signup required.
            </p>
          </div>

          {/* Join Form */}
          <Card className="max-w-md mx-auto p-6 bg-card/80 backdrop-blur-xl border-primary/20 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
            <form onSubmit={handleGuestJoin} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Choose your username..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={20}
                  className="text-lg h-12 bg-input border-border focus:ring-2 focus:ring-primary"
                  disabled={isLoading}
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground shadow-lg hover:shadow-glow"
                disabled={isLoading}
              >
                {isLoading ? "Joining..." : "🚀 Join as Guest"}
              </Button>
              <p className="text-xs text-muted-foreground">
                ✓ Instant access • ✓ No email required • ✓ Anonymous
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Guests can chat, join rooms, and connect with others instantly
              </p>
            </form>
          </Card>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-16 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-700">
            {[
              { icon: Zap, title: "Instant", desc: "Join in seconds" },
              { icon: Users, title: "Global", desc: "Connect worldwide" },
              { icon: MessageCircle, title: "Real-time", desc: "Live conversations" },
              { icon: Shield, title: "Private", desc: "Anonymous chat" },
            ].map((feature, i) => (
              <Card key={i} className="p-4 bg-card/50 backdrop-blur-sm border-primary/10 hover:border-primary/30 hover:shadow-glow transition-all">
                <feature.icon className="w-8 h-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}