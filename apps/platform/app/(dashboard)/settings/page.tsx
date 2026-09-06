'use client';
import { useEffect, useState } from 'react';
import { Languages, Moon, Sun } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PayoutDestinationManager } from '@/components/dashboard/withdrawals/PayoutDestinationManager';
import { LANGUAGE_OPTIONS } from '@/lib/i18n';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useI18n } from '@/hooks/useI18n';
import { toast } from 'sonner';
import type { LanguageCode, ThemePreference } from '@/types';

export default function SettingsPage() {
  const { user, setUser, language, setLanguage, theme, setTheme } = useDashboardStore();
  const { t } = useI18n();
  const [walletAddress, setWalletAddress] = useState(user.walletAddress ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setWalletAddress(user.walletAddress ?? '');
  }, [user.walletAddress]);

  const saveProfile = async (payload: { walletAddress?: string; language?: LanguageCode; theme?: ThemePreference }) => {
    const res = await fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Settings could not be saved');
  };

  const handleLanguageChange = async (value: LanguageCode) => {
    const previous = language;
    setLanguage(value);
    setUser({ ...user, language: value });
    try {
      await saveProfile({ language: value });
      toast.success('Language saved');
    } catch (err) {
      setLanguage(previous);
      setUser({ ...user, language: previous });
      toast.error(err instanceof Error ? err.message : 'Language could not be saved');
    }
  };

  const handleThemeChange = async (value: ThemePreference) => {
    const previous = theme;
    setTheme(value);
    setUser({ ...user, theme: value });
    try {
      await saveProfile({ theme: value });
      toast.success('Theme saved');
    } catch (err) {
      setTheme(previous);
      setUser({ ...user, theme: previous });
      toast.error(err instanceof Error ? err.message : 'Theme could not be saved');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProfile({ walletAddress });
      setUser({ ...user, walletAddress });
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Settings could not be saved');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-space text-3xl font-bold text-foreground mb-2">{t('settings')}</h1>
        <p className="text-foreground/50">Manage account preferences, language, theme and payout details.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <GlassCard>
          <div className="mb-6 flex items-center gap-3">
            <Languages size={20} className="text-primary" />
            <h3 className="font-space font-semibold text-foreground text-xl">Language Preference</h3>
          </div>
          <Label>Dashboard language</Label>
          <Select value={language} onValueChange={(value) => handleLanguageChange(value as LanguageCode)}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((item) => (
                <SelectItem key={item.code} value={item.code}>
                  {item.native}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </GlassCard>

        <GlassCard>
          <div className="mb-6 flex items-center gap-3">
            {theme === 'light' ? <Sun size={20} className="text-primary" /> : <Moon size={20} className="text-primary" />}
            <h3 className="font-space font-semibold text-foreground text-xl">{t('theme')}</h3>
          </div>
          <Label>Appearance</Label>
          <Select value={theme} onValueChange={(value) => handleThemeChange(value as ThemePreference)}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">{t('dark')}</SelectItem>
              <SelectItem value="light">{t('light')}</SelectItem>
              <SelectItem value="system">{t('system')}</SelectItem>
            </SelectContent>
          </Select>
        </GlassCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <GlassCard>
          <h3 className="font-space font-semibold text-foreground text-xl mb-6">Primary Wallet Address</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="wallet" className="text-foreground/70">Payout Wallet</Label>
              <Input
                id="wallet"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x... or wallet address"
                className="mt-1 bg-background border-input text-foreground"
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-foreground font-semibold">
              Save Changes
            </Button>
          </div>
        </GlassCard>
        <PayoutDestinationManager />
      </div>
    </div>
  );
}
