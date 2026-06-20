"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff, Shield, Key, Loader2, AlertTriangle } from "lucide-react";
import { updatePassword } from "../actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function AccountTab() {
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isPending, startTransition] = useTransition();

  const handlePasswordChange = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("newPassword", newPassword);
      formData.append("confirmPassword", confirmPassword);

      const result = await updatePassword(formData);

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
          variant: "default",
        });
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      }
    });
  };

  const passwordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: "", color: "" };
    if (password.length < 6) return { strength: 25, label: "Weak", color: "bg-red-500" };
    if (password.length < 10) return { strength: 50, label: "Fair", color: "bg-orange-500" };
    if (password.length < 14) return { strength: 75, label: "Good", color: "bg-yellow-500" };
    return { strength: 100, label: "Strong", color: "bg-green-500" };
  };

  const strength = passwordStrength(newPassword);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  return (
    <Card className="border-0 shadow-xl shadow-zinc-500/10 bg-white/80 backdrop-blur-sm overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-zinc-800 via-amber-500 to-zinc-800" />

      <CardHeader className="space-y-3 pb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-zinc-200 flex items-center justify-center">
            <Lock className="w-4 h-4 text-zinc-700" />
          </div>
          <CardTitle className="text-2xl">Account Security</CardTitle>
        </div>
        <CardDescription className="text-base">
          Update your password to keep your account secure. Use a strong, unique password.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pb-8">
        {/* New Password Field */}
        <div className="space-y-3 group">
          <Label
            htmlFor="new-password"
            className="text-sm font-semibold flex items-center gap-2 text-zinc-700"
          >
            <Key className="w-4 h-4 text-amber-500" />
            New Password
          </Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Enter your new password"
              className="h-12 border-2 border-zinc-200 focus:border-amber-400 focus:ring-amber-400/20 transition-all duration-200 hover:border-zinc-300 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {newPassword && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-600">Password Strength:</span>
                <span className={`font-semibold ${strength.strength === 100 ? 'text-green-600' :
                  strength.strength === 75 ? 'text-yellow-600' :
                    strength.strength === 50 ? 'text-orange-600' : 'text-red-600'
                  }`}>
                  {strength.label}
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${strength.color} transition-all duration-300`}
                  style={{ width: `${strength.strength}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-3 group">
          <Label
            htmlFor="confirm-password"
            className="text-sm font-semibold flex items-center gap-2 text-zinc-700"
          >
            <Shield className="w-4 h-4 text-amber-500" />
            Confirm New Password
          </Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Confirm your new password"
              className="h-12 border-2 border-zinc-200 focus:border-amber-400 focus:ring-amber-400/20 transition-all duration-200 hover:border-zinc-300 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Password Match Indicator */}
          {confirmPassword && (
            <div className="flex items-center gap-2 text-sm">
              {passwordsMatch ? (
                <>
                  <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-green-600 font-medium">Passwords match</span>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-red-600 font-medium">Passwords do not match</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Security Tips */}
        <div className="bg-gradient-to-r from-amber-50 to-zinc-100 border-l-4 border-amber-400 p-4 rounded-r-lg">
          <p className="text-sm font-semibold text-zinc-700 mb-2">Password Tips:</p>
          <ul className="text-sm text-zinc-600 space-y-1 ml-4 list-disc">
            <li>Use at least 12 characters</li>
            <li>Include numbers, symbols, and mixed case letters</li>
            <li>Avoid common words or personal information</li>
          </ul>
        </div>

        {/* Warning Banner */}
        <div className="bg-gradient-to-r from-amber-50 to-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-zinc-800">Warning</p>
              <p className="text-sm text-zinc-700">
                Changing your password will require you to log in again on all devices.
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t bg-zinc-50/50 px-6 py-5 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
        <p className="text-sm text-muted-foreground">
          Last password change: Never
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              className="bg-gradient-to-r from-zinc-800 to-amber-600 hover:from-zinc-900 hover:to-amber-700 text-white shadow-lg shadow-zinc-500/30 h-11 px-8 font-semibold transition-all duration-200 hover:shadow-xl hover:shadow-zinc-500/40 hover:scale-105"
              disabled={!passwordsMatch || strength.strength < 50 || isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Update Password
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to change your password? You will be required to log in again with your new password.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handlePasswordChange} className="bg-zinc-800 hover:bg-zinc-900">
                Confirm Change
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
