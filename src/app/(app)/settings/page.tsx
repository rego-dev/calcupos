"use client";

import { useEffect, useState } from "react";
import { Settings2, Lock, Building2, ShieldCheck, Database, Shield, Loader2, MapPin, Palette } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuthenticatedUser } from "../users/actions";
import { hasPermission } from "@/lib/permissions";
import type { User } from "@/lib/types";
import { AccountTab } from "./components/account-tab";
import { CompanyProfileTab } from "./components/company-profile-tab";
import { UserManagementTab } from "./components/user-management-tab";
import { DatabaseManagementTab } from "./components/database-management-tab";
import { AdminManageTab } from "./components/admin-manage-tab";
import { StationsTab } from "./components/stations-tab";
import { AppearanceTab } from "./components/appearance-tab";

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAuthenticatedUser()
      .then(({ user }) => setCurrentUser(user))
      .finally(() => setIsLoading(false));
  }, []);

  const role = currentUser?.role?.name;
  const permissions = currentUser?.permissions;

  const canUserManagement = hasPermission("/users", permissions, role);
  const canStations = hasPermission("/stations", permissions, role);
  const canDatabaseManagement = hasPermission("/settings/download-database", permissions, role);
  const canAdminManage = hasPermission("/admin", permissions, role);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100/30 to-amber-50/30">
      <div className="w-full p-6 md:p-8">
        {/* Header Section */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-800 to-amber-500 flex items-center justify-center shadow-lg">
              <Settings2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
              Settings
            </h1>
          </div>
          <p className="text-muted-foreground text-lg ml-15">
            Manage your account, company profile, and system administration.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          </div>
        ) : (
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="account">
                <Lock className="h-4 w-4 mr-2" />
                Account
              </TabsTrigger>
              <TabsTrigger value="company-profile">
                <Building2 className="h-4 w-4 mr-2" />
                Company Profile
              </TabsTrigger>
              <TabsTrigger value="appearance">
                <Palette className="h-4 w-4 mr-2" />
                Appearance
              </TabsTrigger>
              {canUserManagement && (
                <TabsTrigger value="user-management">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  User Management
                </TabsTrigger>
              )}
              {canStations && (
                <TabsTrigger value="stations">
                  <MapPin className="h-4 w-4 mr-2" />
                  Courier & Pickup Stations
                </TabsTrigger>
              )}
              {canDatabaseManagement && (
                <TabsTrigger value="database-management">
                  <Database className="h-4 w-4 mr-2" />
                  Database Management
                </TabsTrigger>
              )}
              {canAdminManage && (
                <TabsTrigger value="admin-manage">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Manage
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="account" className="mt-6">
              <AccountTab />
            </TabsContent>

            <TabsContent value="company-profile" className="mt-6">
              <CompanyProfileTab />
            </TabsContent>

            <TabsContent value="appearance" className="mt-6">
              <AppearanceTab />
            </TabsContent>

            {canUserManagement && (
              <TabsContent value="user-management" className="mt-6">
                <UserManagementTab />
              </TabsContent>
            )}

            {canStations && (
              <TabsContent value="stations" className="mt-6">
                <StationsTab />
              </TabsContent>
            )}

            {canDatabaseManagement && (
              <TabsContent value="database-management" className="mt-6">
                <DatabaseManagementTab />
              </TabsContent>
            )}

            {canAdminManage && (
              <TabsContent value="admin-manage" className="mt-6">
                <AdminManageTab />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </div>
  );
}
