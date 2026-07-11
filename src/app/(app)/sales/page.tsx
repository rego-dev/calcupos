"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Printer, Loader2, Target } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalesModule } from "./components/sales-module";
import { Order, PreOrder } from "@/lib/types";
import { getSalesData, getPreOrderSalesData } from "./actions";

// Dynamically import charts to disable SSR
const SalesChart = dynamic(() => import("../reports/components/sales-chart"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[350px] text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  ),
});

type Timeframe = "week" | "month" | "year" | "all";
type ViewType = "regular" | "preorder";

export default function SalesPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [viewType, setViewType] = useState<ViewType>("regular");
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allPreOrders, setAllPreOrders] = useState<PreOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchData = async () => {
      setIsLoading(true);
      if (viewType === "regular") {
        const { orders, isAuthorized } = await getSalesData(timeframe);
        if (!isAuthorized) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }
        setIsAuthorized(true);
        setAllOrders(orders);
      } else {
        const { preOrders, isAuthorized } = await getPreOrderSalesData(timeframe);
        if (!isAuthorized) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }
        setIsAuthorized(true);
        setAllPreOrders(preOrders);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [timeframe, viewType]);

  const handlePrint = () => {
    window.open(`/sales/report?timeframe=${timeframe}`, "_blank");
  };

  // Orders fed to the sales module. Regular view uses the full order set so
  // transactions, voids and returns are all visible; pre-order view maps paid
  // pre-orders into Order-compatible objects.
  const moduleOrders = useMemo<Order[]>(() => {
    if (viewType === "regular") return allOrders;

    return allPreOrders.map((preOrder: any) => ({
      id: preOrder.id,
      customerName: preOrder.customerName,
      contactNumber: preOrder.contactNumber || "",
      address: preOrder.address || "",
      orderDate: preOrder.orderDate,
      itemName: preOrder.items?.map((item: any) => item.productName).join(", ") || "Pre-order items",
      items:
        preOrder.items?.map((item: any) => ({
          product: {
            id: "",
            name: item.productName,
            sku: "",
            description: "",
            quantity: item.quantity,
            totalStock: 0,
            alertStock: 0,
            cost: 0,
            retailPrice: item.pricePerUnit,
            images: item.images || [],
          },
          quantity: item.quantity,
        })) || [],
      quantity: preOrder.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
      price: preOrder.items?.[0]?.pricePerUnit || 0,
      shippingFee: 0,
      totalAmount: preOrder.totalAmount,
      paymentMethod: (preOrder.paymentMethod || "GCash") as any,
      paymentStatus: (preOrder.paymentStatus || "Paid") as any,
      shippingStatus: "Delivered" as any,
      customerId: preOrder.customerId,
      customerEmail: preOrder.customerEmail,
      rushShip: false,
      createdAt: preOrder.createdAt,
    })) as Order[];
  }, [viewType, allOrders, allPreOrders]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-amber-500 w-fit pb-1">
            {viewType === "regular" ? "Sales Module" : "Pre-Order Sales"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {viewType === "regular"
              ? "Transactions, product & date breakdowns, invoices, returns, voids and POS Z-readings."
              : "Overview of your pre-order sales performance and metrics."}
          </p>
        </div>
        <div className="flex flex-nowrap items-center gap-3 overflow-x-auto lg:overflow-x-visible">
          <Button variant="outline" onClick={handlePrint} className="shrink-0">
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
          <Tabs
            defaultValue="regular"
            value={viewType}
            onValueChange={(value) => setViewType(value as ViewType)}
            className="shrink-0"
          >
            <TabsList>
              <TabsTrigger value="regular">Regular Sales</TabsTrigger>
              <TabsTrigger value="preorder">Pre-Order Sales</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs
            defaultValue="month"
            value={timeframe}
            onValueChange={(value) => setTimeframe(value as Timeframe)}
            className="shrink-0"
          >
            <TabsList>
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="month">This Month</TabsTrigger>
              <TabsTrigger value="year">This Year</TabsTrigger>
              <TabsTrigger value="all">All Time</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <SalesModule orders={moduleOrders} />

          <Card className="border-t-4 border-t-amber-500/50 shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-500" />
                Revenue Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <SalesChart orders={moduleOrders} timeframe={timeframe} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
