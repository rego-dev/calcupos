"use client";

import { useState, useEffect } from "react";
import UsersTable from "../../users/components/users-table";
import { getUsers, getAuthenticatedUser } from "../../users/actions";
import type { User } from "@/lib/types";
import { Loader2 } from "lucide-react";

export function UserManagementTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const [userData, authData] = await Promise.all([
          getUsers(),
          getAuthenticatedUser(),
        ]);
        setUsers(userData);
        setCurrentUser(authData.user);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleUserAdded = async () => {
    try {
      const updatedUsers = await getUsers();
      setUsers(updatedUsers);
    } catch (error) {
      console.error("Failed to refresh users:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <UsersTable
      users={users}
      currentUser={currentUser}
      onUserAdded={handleUserAdded}
      onUserUpdated={handleUserAdded}
    />
  );
}
