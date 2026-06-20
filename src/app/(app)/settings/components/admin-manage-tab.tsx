"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, ClipboardList, Boxes } from "lucide-react";
import SalesLogsTable from "../../admin/sales-logs/components/sales-logs-table";
import AdminLogsTable from "../../admin/admin-logs/components/admin-logs-table";
import { InventoryLogsTable } from "../../admin/inventory-logs/components/inventory-logs-table";
import { getUsersForLogs } from "../actions";

export function AdminManageTab() {
    const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        getUsersForLogs().then(setUsers);
    }, []);

    return (
        <Tabs defaultValue="sales-logs" className="w-full">
            <TabsList>
                <TabsTrigger value="sales-logs">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Sales Logs
                </TabsTrigger>
                <TabsTrigger value="admin-logs">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    System Logs
                </TabsTrigger>
                <TabsTrigger value="inventory-logs">
                    <Boxes className="h-4 w-4 mr-2" />
                    Inventory Logs
                </TabsTrigger>
            </TabsList>
            <TabsContent value="sales-logs">
                <SalesLogsTable />
            </TabsContent>
            <TabsContent value="admin-logs">
                <AdminLogsTable />
            </TabsContent>
            <TabsContent value="inventory-logs">
                <InventoryLogsTable users={users} />
            </TabsContent>
        </Tabs>
    );
}
