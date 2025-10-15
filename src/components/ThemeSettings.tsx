import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Palette, Type, Image } from "lucide-react";

interface ThemePreferences {
  bubble_style: string;
  font_family: string;
  background_theme: string;
}

interface ThemeSettingsProps {
  userId: string;
}

export function ThemeSettings({ userId }: ThemeSettingsProps) {
  const [preferences, setPreferences] = useState<ThemePreferences>({
    bubble_style: "default",
    font_family: "inter",
    background_theme: "solid",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("bubble_style, font_family, background_theme")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (data) setPreferences(data);
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
  };

  const savePreferences = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: userId,
          ...preferences,
        });

      if (error) throw error;
      toast.success("Theme settings saved!");
      
      // Apply font to document
      document.documentElement.style.setProperty(
        '--user-font',
        preferences.font_family === 'inter' ? 'Inter' :
        preferences.font_family === 'comic' ? '"Comic Sans MS", cursive' :
        preferences.font_family === 'mono' ? '"Courier New", monospace' :
        '"Georgia", serif'
      );
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save theme settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Bubble Style
          </CardTitle>
          <CardDescription>Choose how your messages appear</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={preferences.bubble_style}
            onValueChange={(value) => setPreferences({ ...preferences, bubble_style: value })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="default" id="default" />
              <Label htmlFor="default">Default</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="rounded" id="rounded" />
              <Label htmlFor="rounded">Rounded</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="minimal" id="minimal" />
              <Label htmlFor="minimal">Minimal</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fancy" id="fancy" />
              <Label htmlFor="fancy">Fancy</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Font Family
          </CardTitle>
          <CardDescription>Select your preferred font</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={preferences.font_family}
            onValueChange={(value) => setPreferences({ ...preferences, font_family: value })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="inter" id="inter" />
              <Label htmlFor="inter" style={{ fontFamily: 'Inter' }}>Inter (Default)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="comic" id="comic" />
              <Label htmlFor="comic" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Comic Sans</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="mono" id="mono" />
              <Label htmlFor="mono" style={{ fontFamily: 'Courier New, monospace' }}>Monospace</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="serif" id="serif" />
              <Label htmlFor="serif" style={{ fontFamily: 'Georgia, serif' }}>Serif</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Background Theme
          </CardTitle>
          <CardDescription>Choose your background style</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={preferences.background_theme}
            onValueChange={(value) => setPreferences({ ...preferences, background_theme: value })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="solid" id="solid" />
              <Label htmlFor="solid">Solid</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="gradient" id="gradient" />
              <Label htmlFor="gradient">Gradient</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pattern" id="pattern" />
              <Label htmlFor="pattern">Pattern</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Button onClick={savePreferences} disabled={loading} className="w-full">
        {loading ? "Saving..." : "Save Theme Settings"}
      </Button>
    </div>
  );
}
