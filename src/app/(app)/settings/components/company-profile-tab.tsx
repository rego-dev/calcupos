"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2, Image as ImageIcon, Save, X } from "lucide-react";
import { getCompanyProfile, updateCompanyProfile } from "../actions";
import type { CompanyProfile } from "@/lib/types";

export function CompanyProfileTab() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [taxId, setTaxId] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const profile = await getCompanyProfile();
        setCompanyName(profile.companyName || "");
        setAddress(profile.address || "");
        setPhone(profile.phone || "");
        setEmail(profile.email || "");
        setTaxId(profile.taxId || "");
        setLogoUrl(profile.logoUrl || null);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    setLogoUrl(dataUrl);
  };

  const handleSave = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("companyName", companyName);
      formData.append("address", address);
      formData.append("phone", phone);
      formData.append("email", email);
      formData.append("taxId", taxId);
      formData.append("logoUrl", logoUrl || "");

      const result = await updateCompanyProfile(formData);

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
          variant: "default",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-xl shadow-zinc-500/10 bg-white/80 backdrop-blur-sm overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-zinc-800 via-amber-500 to-zinc-800" />

      <CardHeader className="space-y-3 pb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-zinc-200 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-zinc-700" />
          </div>
          <CardTitle className="text-2xl">Company Profile</CardTitle>
        </div>
        <CardDescription className="text-base">
          This information is used to brand your receipts and printed reports.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pb-8">
        {/* Logo */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold flex items-center gap-2 text-zinc-700">
            <ImageIcon className="w-4 h-4 text-amber-500" />
            Company Logo
          </Label>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Company logo" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="w-8 h-8 text-zinc-300" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Logo
              </Button>
              {logoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => setLogoUrl(null)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="company-name" className="text-sm font-semibold text-zinc-700">
            Company Name
          </Label>
          <Input
            id="company-name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Your Company Name"
            className="h-12 border-2 border-zinc-200 focus:border-amber-400 focus:ring-amber-400/20"
          />
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="company-address" className="text-sm font-semibold text-zinc-700">
            Address
          </Label>
          <Textarea
            id="company-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, City, Province"
            className="border-2 border-zinc-200 focus:border-amber-400 focus:ring-amber-400/20"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="company-phone" className="text-sm font-semibold text-zinc-700">
              Phone
            </Label>
            <Input
              id="company-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+63 900 000 0000"
              className="h-12 border-2 border-zinc-200 focus:border-amber-400 focus:ring-amber-400/20"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="company-email" className="text-sm font-semibold text-zinc-700">
              Email
            </Label>
            <Input
              id="company-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@company.com"
              className="h-12 border-2 border-zinc-200 focus:border-amber-400 focus:ring-amber-400/20"
            />
          </div>
        </div>

        {/* Tax ID */}
        <div className="space-y-2">
          <Label htmlFor="company-tax-id" className="text-sm font-semibold text-zinc-700">
            Tax ID / TIN
          </Label>
          <Input
            id="company-tax-id"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            placeholder="000-000-000-000"
            className="h-12 border-2 border-zinc-200 focus:border-amber-400 focus:ring-amber-400/20"
          />
        </div>
      </CardContent>

      <CardFooter className="border-t bg-zinc-50/50 px-6 py-5 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!companyName.trim() || isPending}
          className="bg-gradient-to-r from-zinc-800 to-amber-600 hover:from-zinc-900 hover:to-amber-700 text-white shadow-lg shadow-zinc-500/30 h-11 px-8 font-semibold transition-all duration-200 hover:shadow-xl hover:shadow-zinc-500/40 hover:scale-105"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
