import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Palette, User } from "lucide-react";
import { ThemeSettings } from "@/components/ThemeSettings";

export default function Settings() {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (profile) {
        setCurrentUserId(profile.id);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Settings
              </h1>
            </div>
            <Button onClick={() => navigate("/chat")} variant="outline">
              Back to Chat
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue="theme" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-card/50 backdrop-blur-xl border-2 border-primary/20">
            <TabsTrigger value="theme">
              <Palette className="w-4 h-4 mr-2" />
              Theme
            </TabsTrigger>
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="theme" className="mt-6">
            {currentUserId && <ThemeSettings userId={currentUserId} />}
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <Card className="p-6 bg-card/50 backdrop-blur-xl border-2 border-primary/20">
              <h3 className="text-lg font-semibold mb-4">Profile Settings</h3>
              <p className="text-muted-foreground">
                Profile customization coming soon...
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
