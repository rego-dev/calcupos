"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Save, Shield, AlertTriangle } from "lucide-react";
import { updateProfile } from "./actions";
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

interface ProfileFormProps {
    user: {
        name: string;
        email: string;
    };
}

export function ProfileForm({ user }: ProfileFormProps) {
    const { toast } = useToast();

    const [displayName, setDisplayName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [isLoading, setIsLoading] = useState(false);

    const handleSaveChanges = async () => {
        setIsLoading(true);
        const formData = new FormData();
        formData.append("displayName", displayName);
        formData.append("email", email);

        try {
            const result = await updateProfile(formData) as any;

            if (result.error) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.error,
                });
            } else {
                toast({
                    title: "Success",
                    description: "Profile updated successfully.",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "An unexpected error occurred.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-0 shadow-xl shadow-zinc-500/10 bg-white/80 backdrop-blur-sm overflow-hidden">
            {/* Decorative gradient bar */}
            <div className="h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

            <CardHeader className="space-y-3 pb-6">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-zinc-200 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-zinc-700" />
                    </div>
                    <CardTitle className="text-2xl">Personal Information</CardTitle>
                </div>
                <CardDescription className="text-base">
                    Update your display name and email address to keep your profile current.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-8 pb-8">
                {/* Display Name Field */}
                <div className="space-y-3 group">
                    <Label
                        htmlFor="displayName"
                        className="text-sm font-semibold flex items-center gap-2 text-zinc-700"
                    >
                        <User className="w-4 h-4 text-amber-500" />
                        Display Name
                    </Label>
                    <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your display name"
                        className="h-12 border-2 border-zinc-200 focus:border-amber-400 focus:ring-amber-400/20 transition-all duration-200 hover:border-zinc-300"
                    />
                </div>

                {/* Email Field */}
                <div className="space-y-3 group">
                    <Label
                        htmlFor="email"
                        className="text-sm font-semibold flex items-center gap-2 text-zinc-700"
                    >
                        <Mail className="w-4 h-4 text-amber-500" />
                        Email Address
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        className="h-12 border-2 border-zinc-200 focus:border-amber-400 focus:ring-amber-400/20 transition-all duration-200 hover:border-zinc-300"
                    />
                </div>

                {/* Info Banner */}
                <div className="bg-gradient-to-r from-amber-50 to-zinc-100 border-l-4 border-amber-400 p-4 rounded-r-lg">
                    <p className="text-sm text-zinc-700">
                        <span className="font-semibold">Privacy Note:</span> Your information is securely stored and never shared with third parties.
                    </p>
                </div>

                {/* Warning Banner */}
                <div className="bg-gradient-to-r from-amber-50 to-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-zinc-800">Warning</p>
                            <p className="text-sm text-zinc-700">
                                Changing your personal information will affect your data across the application.
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="border-t bg-zinc-50/50 px-6 py-5 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
                <p className="text-sm text-muted-foreground">
                    Last updated: Never
                </p>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            className="bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-zinc-900 hover:to-black text-white shadow-lg shadow-zinc-500/30 h-11 px-8 font-semibold transition-all duration-200 hover:shadow-xl hover:shadow-zinc-500/40 hover:scale-105"
                            disabled={isLoading}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isLoading ? "Saving..." : "Save Changes"}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to change your personal information? This action will update your profile data.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleSaveChanges} className="bg-zinc-800 hover:bg-zinc-900">
                                Confirm Change
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
}
