import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageSquare, Users, Sparkles, Video, Shield, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [guestName, setGuestName] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGuestJoin = async () => {
    if (!guestName.trim()) {
      toast({
        title: "Username required",
        description: "Please enter a username to continue",
        variant: "destructive",
      });
      return;
    }

    try {
      const colors = ["#8B5CF6", "#EC4899", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const { data, error } = await supabase
        .from("profiles")
        .insert({
          username: guestName,
          is_guest: true,
          display_color: randomColor,
        })
        .select()
        .single();

      if (error) throw error;

      localStorage.setItem("guestProfile", JSON.stringify(data));
      navigate("/lobby");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated sparkles */}
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute text-2xl pointer-events-none animate-float-sparkle"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 10}s`,
            animationDuration: `${10 + Math.random() * 10}s`,
          }}
        >
          ✨
        </div>
      ))}

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          {/* Main Hero */}
          <div className="text-center mb-20 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 sparkles">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Modern Chat Experience</span>
            </div>
            
            <h1 className="text-7xl md:text-8xl font-display font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent leading-tight">
              Welcome to Vybe
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              Connect, chat, and collaborate in real-time. 
              <span className="text-foreground font-medium"> No signup required.</span> Just vibe.
            </p>

            {/* Guest Join Card */}
            <Card className="max-w-md mx-auto p-8 bg-card/80 backdrop-blur-xl border-2 border-border shadow-strong animate-slide-up">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Start Chatting Now</h3>
                </div>
                <Input
                  type="text"
                  placeholder="Enter your username"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGuestJoin()}
                  className="h-12 bg-background border-2 border-border focus:border-primary transition-colors"
                />
                <Button 
                  onClick={handleGuestJoin}
                  variant="gradient"
                  size="lg"
                  className="w-full sparkles"
                >
                  Join as Guest
                </Button>
                <p className="text-xs text-muted-foreground">
                  Or{" "}
                  <button
                    onClick={() => navigate("/login")}
                    className="text-primary hover:underline font-medium"
                  >
                    sign in
                  </button>
                  {" "}for the full experience
                </p>
              </div>
            </Card>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-20">
            {[
              {
                icon: MessageSquare,
                title: "Real-time Chat",
                description: "Instant messaging with emoji reactions, file sharing, and voice notes",
              },
              {
                icon: Video,
                title: "Video Calls",
                description: "Crystal-clear video calls with screen sharing and whiteboard",
              },
              {
                icon: Users,
                title: "Public Rooms",
                description: "Join topic-based rooms or create your own community spaces",
              },
              {
                icon: Shield,
                title: "Safe & Moderated",
                description: "AI-powered moderation keeps conversations friendly and safe",
              },
              {
                icon: Zap,
                title: "Lightning Fast",
                description: "Real-time updates with zero lag. Experience instant connectivity",
              },
              {
                icon: Sparkles,
                title: "Modern Design",
                description: "Beautiful, intuitive interface that works perfectly on any device",
              },
            ].map((feature, idx) => (
              <Card
                key={idx}
                className="p-6 bg-card/60 backdrop-blur-xl border-2 border-border hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 group animate-scale-in"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { value: "10K+", label: "Active Users" },
              { value: "50+", label: "Chat Rooms" },
              { value: "1M+", label: "Messages Sent" },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="text-center p-6 rounded-2xl bg-card/40 backdrop-blur-xl border border-border animate-fade-in"
                style={{ animationDelay: `${0.6 + idx * 0.1}s` }}
              >
                <div className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
