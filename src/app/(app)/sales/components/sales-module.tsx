"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  PhilippinePeso,
  TrendingUp,
  ShoppingCart,
  Wallet,
  Package,
  CalendarDays,
  FileText,
  Truck,
  Undo2,
  Ban,
  ScrollText,
  Receipt,
  Search,
  Printer,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { Order } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const CASH_METHODS = ["cash", "cod", "cash on delivery"];

const peso = (n: number) =>
  "₱" +
  (Number.isFinite(n) ? n : 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const num = (n: number) => (Number.isFinite(n) ? n : 0).toLocaleString();

type LineItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  cost: number;
};

function getLineItems(order: any): LineItem[] {
  const raw = Array.isArray(order?.items)
    ? order.items
    : typeof order?.items === "string"
      ? safeParse(order.items)
      : [];

  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((it: any) => ({
      name: it?.product?.name || it?.productName || it?.name || "Item",
      quantity: Number(it?.quantity) || 0,
      unitPrice: Number(it?.product?.retailPrice ?? it?.price ?? it?.pricePerUnit ?? 0),
      cost: Number(it?.product?.cost ?? 0),
    }));
  }

  // Fallback: single-line order
  return [
    {
      name: order?.itemName || "Item",
      quantity: Number(order?.quantity) || 1,
      unitPrice: Number(order?.price) || 0,
      cost: 0,
    },
  ];
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}

function orderCogs(order: any): number {
  return getLineItems(order).reduce((sum, it) => sum + it.quantity * it.cost, 0);
}

function isCashMethod(method?: string | null): boolean {
  return CASH_METHODS.includes((method || "").trim().toLowerCase());
}

const RETURNED_STATUSES = ["returned", "refunded", "refund", "return"];
const VOIDED_STATUSES = ["cancelled", "canceled", "voided", "void"];

function statusVariant(status?: string | null): "default" | "secondary" | "destructive" | "outline" {
  const s = (status || "").toLowerCase();
  if (s === "delivered" || s === "paid" || s === "claimed") return "default";
  if (VOIDED_STATUSES.includes(s) || RETURNED_STATUSES.includes(s) || s === "unpaid") return "destructive";
  if (s === "pending" || s === "hold") return "outline";
  return "secondary";
}

/* -------------------------------------------------------------------------- */
/*  Small reusable pieces                                                      */
/* -------------------------------------------------------------------------- */

function KpiCard({
  title,
  value,
  hint,
  icon,
  accent,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Card className={`relative overflow-hidden border-l-4 ${accent} shadow-sm hover:shadow-md transition-all`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function SectionCard({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-t-4 border-t-amber-500/50 shadow-sm overflow-hidden">
      <CardHeader className="border-b bg-muted/30 flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center text-muted-foreground h-28">
        {label}
      </TableCell>
    </TableRow>
  );
}

function ScrollTable({ children }: { children: React.ReactNode }) {
  return <div className="max-h-[540px] overflow-auto">{children}</div>;
}

/* -------------------------------------------------------------------------- */
/*  Main module                                                                */
/* -------------------------------------------------------------------------- */

export function SalesModule({ orders }: { orders: Order[] }) {
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cashier, setCashier] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [printingZ, setPrintingZ] = useState<any>(null);
  const zPrintRef = useRef<HTMLDivElement>(null);

  // Generate a receipt PDF from the hidden Z-reading node once it is rendered.
  useEffect(() => {
    if (!printingZ || !zPrintRef.current) return;
    const node = zPrintRef.current;
    let cancelled = false;
    (async () => {
      try {
        // @ts-ignore
        const html2pdf = (await import("html2pdf.js")).default;
        const opt = {
          margin: [5, 2, 5, 2] as [number, number, number, number],
          filename: `z-reading-${printingZ.date}.pdf`,
          image: { type: "jpeg" as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: [80, 220] as [number, number], orientation: "portrait" as const },
        };
        const blobUrl = await html2pdf().set(opt).from(node).output("bloburl");
        if (!cancelled) window.open(blobUrl, "_blank");
      } catch (err) {
        console.error("Z-Reading print error:", err);
        if (!cancelled) window.print();
      } finally {
        if (!cancelled) setPrintingZ(null);
      }
    })();
    return () => { cancelled = true; };
  }, [printingZ]);

  const all = orders as any[];

  const q = query.trim().toLowerCase();
  const cashierQ = cashier.trim().toLowerCase();
  const invoiceQ = invoiceNo.trim();

  const getCashierName = (o: any): string => {
    const cb = o.createdBy;
    if (!cb) return o.cashierName || "";
    if (typeof cb === "string") {
      try { return JSON.parse(cb)?.name || cb; } catch { return cb; }
    }
    return cb.name || "";
  };

  const hasFilters = !!(q || cashierQ || invoiceQ || dateFrom || dateTo);

  const clearFilters = () => {
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setCashier("");
    setInvoiceNo("");
  };

  // All filters are applied at the order level so every tab reflects them.
  const filteredOrders = useMemo(() => {
    const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    return all.filter((o) => {
      if (fromTs != null || toTs != null) {
        const raw = o.orderDate || o.createdAt;
        const t = raw ? new Date(raw).getTime() : NaN;
        if (Number.isNaN(t)) return false;
        if (fromTs != null && t < fromTs) return false;
        if (toTs != null && t > toTs) return false;
      }
      if (cashierQ && !getCashierName(o).toLowerCase().includes(cashierQ)) return false;
      if (invoiceQ && !String(o.id).includes(invoiceQ)) return false;
      if (q) {
        const items = getLineItems(o).map((it) => it.name).join(" ");
        const hay = `${o.id} ${o.customerName || ""} ${o.itemName || ""} ${o.paymentMethod || ""} ${getCashierName(o)} ${items}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, dateFrom, dateTo, cashierQ, invoiceQ, q]);

  const data = useMemo(() => {
    const valid = filteredOrders.filter((o) => !VOIDED_STATUSES.includes((o.shippingStatus || "").toLowerCase()));
    const returned = filteredOrders.filter((o) => RETURNED_STATUSES.includes((o.shippingStatus || "").toLowerCase()));
    const voided = filteredOrders.filter((o) => VOIDED_STATUSES.includes((o.shippingStatus || "").toLowerCase()));

    let revenue = 0;
    let cogs = 0;
    let cashPickup = 0;
    let unitsSold = 0;

    for (const o of valid) {
      revenue += Number(o.totalAmount) || 0;
      cogs += orderCogs(o);
      unitsSold += getLineItems(o).reduce((s, it) => s + it.quantity, 0);
      if (isCashMethod(o.paymentMethod)) cashPickup += Number(o.totalAmount) || 0;
    }
    const profit = revenue - cogs;

    // Sales by product
    const byProductMap = new Map<string, { units: number; revenue: number; cost: number }>();
    for (const o of valid) {
      for (const it of getLineItems(o)) {
        const cur = byProductMap.get(it.name) || { units: 0, revenue: 0, cost: 0 };
        cur.units += it.quantity;
        cur.revenue += it.quantity * it.unitPrice;
        cur.cost += it.quantity * it.cost;
        byProductMap.set(it.name, cur);
      }
    }
    const byProduct = Array.from(byProductMap.entries())
      .map(([name, v]) => ({ name, ...v, profit: v.revenue - v.cost }))
      .sort((a, b) => b.revenue - a.revenue);
    const topProductRevenue = byProduct.length ? byProduct[0].revenue : 0;

    // Sales by date
    const byDateMap = new Map<string, { count: number; units: number; revenue: number; cogs: number }>();
    for (const o of valid) {
      const key = o.orderDate ? format(new Date(o.orderDate), "yyyy-MM-dd") : "Unknown";
      const cur = byDateMap.get(key) || { count: 0, units: 0, revenue: 0, cogs: 0 };
      cur.count += 1;
      cur.units += getLineItems(o).reduce((s, it) => s + it.quantity, 0);
      cur.revenue += Number(o.totalAmount) || 0;
      cur.cogs += orderCogs(o);
      byDateMap.set(key, cur);
    }
    const byDate = Array.from(byDateMap.entries())
      .map(([date, v]) => ({ date, ...v, profit: v.revenue - v.cogs }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    const topDateRevenue = byDate.reduce((m, d) => Math.max(m, d.revenue), 0);

    // Sales detail (flattened line items)
    const detail: {
      orderId: number | string;
      date: string;
      customer: string;
      product: string;
      qty: number;
      unitPrice: number;
      lineTotal: number;
    }[] = [];
    for (const o of valid) {
      for (const it of getLineItems(o)) {
        detail.push({
          orderId: o.id,
          date: o.orderDate ? format(new Date(o.orderDate), "MMM dd, yyyy") : "—",
          customer: o.customerName || "Walk-in",
          product: it.name,
          qty: it.quantity,
          unitPrice: it.unitPrice,
          lineTotal: it.quantity * it.unitPrice,
        });
      }
    }

    // POS Z-Reading (per-day close-out)
    const zMap = new Map<
      string,
      { gross: number; txns: number; units: number; cash: number; digital: number; cogs: number }
    >();
    for (const o of valid) {
      const key = o.orderDate ? format(new Date(o.orderDate), "yyyy-MM-dd") : "Unknown";
      const cur = zMap.get(key) || { gross: 0, txns: 0, units: 0, cash: 0, digital: 0, cogs: 0 };
      const amt = Number(o.totalAmount) || 0;
      cur.gross += amt;
      cur.txns += 1;
      cur.units += getLineItems(o).reduce((s, it) => s + it.quantity, 0);
      cur.cogs += orderCogs(o);
      if (isCashMethod(o.paymentMethod)) cur.cash += amt;
      else cur.digital += amt;
      zMap.set(key, cur);
    }
    const zReadings = Array.from(zMap.entries())
      .map(([date, v]) => ({ date, ...v, profit: v.gross - v.cogs }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    return {
      valid,
      returned,
      voided,
      revenue,
      cogs,
      profit,
      cashPickup,
      unitsSold,
      byProduct,
      topProductRevenue,
      byDate,
      topDateRevenue,
      detail,
      zReadings,
    };
  }, [filteredOrders]);

  // Orders are already filtered upstream; these are the per-tab views.
  const txns = data.valid;
  const detail = data.detail;

  return (
    <div className="flex flex-col gap-6">
      {/* Headline dashboard */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Revenue"
          value={peso(data.revenue)}
          hint="Gross sales value"
          icon={<PhilippinePeso className="h-5 w-5 text-amber-600" />}
          accent="border-l-amber-400"
        />
        <KpiCard
          title="Total Profit"
          value={peso(data.profit)}
          hint="Revenue minus cost of goods"
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
          accent="border-l-emerald-400"
        />
        <KpiCard
          title="Total Cash Pickup"
          value={peso(data.cashPickup)}
          hint="Cash / COD collected"
          icon={<Wallet className="h-5 w-5 text-sky-600" />}
          accent="border-l-sky-400"
        />
        <KpiCard
          title="Transactions"
          value={num(data.valid.length)}
          hint={`${num(data.unitsSold)} units sold`}
          icon={<ShoppingCart className="h-5 w-5 text-zinc-600" />}
          accent="border-l-zinc-400"
        />
      </div>

      {/* Filters (apply to every tab) */}
      <div className="rounded-xl border bg-muted/20 p-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Date From</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Date To</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Cashier Name</label>
            <Input placeholder="Cashier…" value={cashier} onChange={(e) => setCashier(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Invoice No</label>
            <Input placeholder="Invoice #…" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ID, customer, product, method…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </div>
        {hasFilters && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {num(filteredOrders.length)} order{filteredOrders.length === 1 ? "" : "s"} match your filters
            </span>
            <Button variant="ghost" size="sm" className="h-8" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transaction" className="w-full">
        <div className="overflow-x-auto pb-1">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="transaction">Sales Transaction</TabsTrigger>
            <TabsTrigger value="detail">Sales Detail</TabsTrigger>
            <TabsTrigger value="product">Sales by Product</TabsTrigger>
            <TabsTrigger value="date">Sales by Date</TabsTrigger>
            <TabsTrigger value="order">Sales Order</TabsTrigger>
            <TabsTrigger value="invoice">Sales Invoice/Delivery</TabsTrigger>
            <TabsTrigger value="returned">Returned Sales</TabsTrigger>
            <TabsTrigger value="voided">Voided Sales</TabsTrigger>
            <TabsTrigger value="zreading">POS Z-Reading</TabsTrigger>
          </TabsList>
        </div>

        {/* 1. Sales Transaction */}
        <TabsContent value="transaction" className="mt-4">
          <SectionCard title="Sales Transactions" icon={<FileText className="h-5 w-5 text-amber-500" />}>
            <ScrollTable>
              <Table>
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur">
                  <TableRow>
                    <TableHead>Txn ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txns.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">#{String(o.id).padStart(5, "0")}</TableCell>
                      <TableCell className="text-sm">
                        {o.orderDate ? format(new Date(o.orderDate), "MMM dd, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="font-medium">{o.customerName || "Walk-in"}</TableCell>
                      <TableCell className="text-sm">{o.paymentMethod || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(o.paymentStatus)}>{o.paymentStatus || "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(o.shippingStatus)}>{o.shippingStatus || "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">{peso(Number(o.totalAmount) || 0)}</TableCell>
                    </TableRow>
                  ))}
                  {txns.length === 0 && <EmptyRow colSpan={7} label="No transactions found." />}
                </TableBody>
              </Table>
            </ScrollTable>
          </SectionCard>
        </TabsContent>

        {/* 2. Sales Detail */}
        <TabsContent value="detail" className="mt-4">
          <SectionCard title="Sales Detail (Line Items)" icon={<ScrollText className="h-5 w-5 text-amber-500" />}>
            <ScrollTable>
              <Table>
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur">
                  <TableRow>
                    <TableHead>Txn ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.map((d, i) => (
                    <TableRow key={`${d.orderId}-${i}`}>
                      <TableCell className="font-mono text-xs">#{String(d.orderId).padStart(5, "0")}</TableCell>
                      <TableCell className="text-sm">{d.date}</TableCell>
                      <TableCell>{d.customer}</TableCell>
                      <TableCell className="font-medium">{d.product}</TableCell>
                      <TableCell className="text-right">{num(d.qty)}</TableCell>
                      <TableCell className="text-right">{peso(d.unitPrice)}</TableCell>
                      <TableCell className="text-right font-semibold">{peso(d.lineTotal)}</TableCell>
                    </TableRow>
                  ))}
                  {detail.length === 0 && <EmptyRow colSpan={7} label="No line items found." />}
                </TableBody>
              </Table>
            </ScrollTable>
          </SectionCard>
        </TabsContent>

        {/* 3. Sales by Product */}
        <TabsContent value="product" className="mt-4">
          <SectionCard title="Sales by Product" icon={<Package className="h-5 w-5 text-amber-500" />}>
            <ScrollTable>
              <Table>
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur">
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-40">Share</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Est. Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byProduct.map((p) => (
                    <TableRow key={p.name}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-500"
                            style={{
                              width: `${data.topProductRevenue ? (p.revenue / data.topProductRevenue) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{num(p.units)}</TableCell>
                      <TableCell className="text-right font-semibold">{peso(p.revenue)}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-semibold">{peso(p.profit)}</TableCell>
                    </TableRow>
                  ))}
                  {data.byProduct.length === 0 && <EmptyRow colSpan={5} label="No product sales found." />}
                </TableBody>
              </Table>
            </ScrollTable>
          </SectionCard>
        </TabsContent>

        {/* 4. Sales by Date */}
        <TabsContent value="date" className="mt-4">
          <SectionCard title="Sales by Date" icon={<CalendarDays className="h-5 w-5 text-amber-500" />}>
            <ScrollTable>
              <Table>
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-40">Volume</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byDate.map((d) => (
                    <TableRow key={d.date}>
                      <TableCell className="font-medium">
                        {d.date === "Unknown" ? "Unknown" : format(new Date(d.date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-500"
                            style={{ width: `${data.topDateRevenue ? (d.revenue / data.topDateRevenue) * 100 : 0}%` }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{num(d.count)}</TableCell>
                      <TableCell className="text-right">{num(d.units)}</TableCell>
                      <TableCell className="text-right font-semibold">{peso(d.revenue)}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-semibold">{peso(d.profit)}</TableCell>
                    </TableRow>
                  ))}
                  {data.byDate.length === 0 && <EmptyRow colSpan={6} label="No dated sales found." />}
                </TableBody>
              </Table>
            </ScrollTable>
          </SectionCard>
        </TabsContent>

        {/* 5. Sales Order */}
        <TabsContent value="order" className="mt-4">
          <SectionCard title="Sales Orders" icon={<ShoppingCart className="h-5 w-5 text-amber-500" />}>
            <ScrollTable>
              <Table>
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur">
                  <TableRow>
                    <TableHead>SO No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txns.map((o) => {
                    const items = getLineItems(o);
                    const itemCount = items.reduce((s, it) => s + it.quantity, 0);
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">SO-{String(o.id).padStart(5, "0")}</TableCell>
                        <TableCell className="text-sm">
                          {o.orderDate ? format(new Date(o.orderDate), "MMM dd, yyyy") : "—"}
                        </TableCell>
                        <TableCell className="font-medium">{o.customerName || "Walk-in"}</TableCell>
                        <TableCell className="text-right">{num(itemCount)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(o.shippingStatus)}>{o.shippingStatus || "Open"}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">{peso(Number(o.totalAmount) || 0)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {txns.length === 0 && <EmptyRow colSpan={6} label="No sales orders found." />}
                </TableBody>
              </Table>
            </ScrollTable>
          </SectionCard>
        </TabsContent>

        {/* 6. Sales Invoice / Delivery */}
        <TabsContent value="invoice" className="mt-4">
          <SectionCard title="Sales Invoice / Delivery" icon={<Truck className="h-5 w-5 text-amber-500" />}>
            <ScrollTable>
              <Table>
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur">
                  <TableRow>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Courier / Tracking</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txns.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">INV-{String(o.id).padStart(5, "0")}</TableCell>
                      <TableCell className="text-sm">
                        {o.orderDate ? format(new Date(o.orderDate), "MMM dd, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="font-medium">{o.customerName || "Walk-in"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(o as any).courierName || "—"}
                        {(o as any).trackingNumber ? ` · ${(o as any).trackingNumber}` : ""}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(o.shippingStatus)}>{o.shippingStatus || "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(o.paymentStatus)}>{o.paymentStatus || "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">{peso(Number(o.totalAmount) || 0)}</TableCell>
                    </TableRow>
                  ))}
                  {txns.length === 0 && <EmptyRow colSpan={7} label="No invoices found." />}
                </TableBody>
              </Table>
            </ScrollTable>
          </SectionCard>
        </TabsContent>

        {/* 7. Returned Sales */}
        <TabsContent value="returned" className="mt-4">
          <SectionCard title="Returned Sales" icon={<Undo2 className="h-5 w-5 text-amber-500" />}>
            <ScrollTable>
              <Table>
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur">
                  <TableRow>
                    <TableHead>Txn ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Refund</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.returned.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">#{String(o.id).padStart(5, "0")}</TableCell>
                      <TableCell className="text-sm">
                        {o.orderDate ? format(new Date(o.orderDate), "MMM dd, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="font-medium">{o.customerName || "Walk-in"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{(o as any).remarks || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{o.shippingStatus}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-destructive">
                        {peso(Number(o.totalAmount) || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.returned.length === 0 && (
                    <EmptyRow colSpan={6} label="No returned sales for this period." />
                  )}
                </TableBody>
              </Table>
            </ScrollTable>
          </SectionCard>
        </TabsContent>

        {/* 8. Voided Sales */}
        <TabsContent value="voided" className="mt-4">
          <SectionCard title="Voided / Cancelled Sales" icon={<Ban className="h-5 w-5 text-amber-500" />}>
            <ScrollTable>
              <Table>
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur">
                  <TableRow>
                    <TableHead>Txn ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Voided Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.voided.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">#{String(o.id).padStart(5, "0")}</TableCell>
                      <TableCell className="text-sm">
                        {o.orderDate ? format(new Date(o.orderDate), "MMM dd, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="font-medium">{o.customerName || "Walk-in"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{(o as any).remarks || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{o.shippingStatus}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-muted-foreground line-through">
                        {peso(Number(o.totalAmount) || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.voided.length === 0 && <EmptyRow colSpan={6} label="No voided sales for this period." />}
                </TableBody>
              </Table>
            </ScrollTable>
          </SectionCard>
        </TabsContent>

        {/* 9. POS Z-Reading */}
        <TabsContent value="zreading" className="mt-4">
          <SectionCard title="POS Z-Reading (Daily Close-out)" icon={<Receipt className="h-5 w-5 text-amber-500" />}>
            <ScrollTable>
              <Table>
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur">
                  <TableRow>
                    <TableHead>Business Date</TableHead>
                    <TableHead className="text-right">Txns</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Gross Sales</TableHead>
                    <TableHead className="text-right">Cash Pickup</TableHead>
                    <TableHead className="text-right">Digital</TableHead>
                    <TableHead className="text-right">Net Profit</TableHead>
                    <TableHead className="text-right w-16">Print</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.zReadings.map((z) => (
                    <TableRow key={z.date}>
                      <TableCell className="font-medium">
                        {z.date === "Unknown" ? "Unknown" : format(new Date(z.date), "EEE, MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">{num(z.txns)}</TableCell>
                      <TableCell className="text-right">{num(z.units)}</TableCell>
                      <TableCell className="text-right font-semibold">{peso(z.gross)}</TableCell>
                      <TableCell className="text-right text-sky-600 font-semibold">{peso(z.cash)}</TableCell>
                      <TableCell className="text-right">{peso(z.digital)}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-semibold">{peso(z.profit)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Print Z-Reading"
                          disabled={!!printingZ}
                          onClick={() => setPrintingZ(z)}
                        >
                          {printingZ?.date === z.date ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.zReadings.length === 0 && <EmptyRow colSpan={8} label="No POS activity for this period." />}
                </TableBody>
              </Table>
            </ScrollTable>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Hidden printable Z-Reading receipt */}
      <div className="fixed -left-[9999px] top-0" aria-hidden="true">
        {printingZ && (
          <div ref={zPrintRef} className="bg-white text-black font-mono text-[11px] leading-relaxed p-5" style={{ width: 300 }}>
            <div className="text-center mb-2">
              <p className="font-black text-sm tracking-wide">POS Z-READING</p>
              <p className="text-[10px]">Daily Close-out</p>
              <p className="text-[10px]">
                {printingZ.date === "Unknown" ? "Unknown" : format(new Date(printingZ.date), "EEE, MMM dd, yyyy")}
              </p>
            </div>
            <div className="border-t border-dashed border-gray-400 my-2" />
            <ZRow label="Transactions" value={num(printingZ.txns)} />
            <ZRow label="Units Sold" value={num(printingZ.units)} />
            <div className="border-t border-dashed border-gray-400 my-2" />
            <ZRow label="Gross Sales" value={peso(printingZ.gross)} />
            <ZRow label="Cash Pickup" value={peso(printingZ.cash)} />
            <ZRow label="Digital" value={peso(printingZ.digital)} />
            <ZRow label="COGS" value={peso(printingZ.cogs)} />
            <div className="border-t border-double border-gray-500 my-2" />
            <div className="flex justify-between font-black text-sm">
              <span>NET PROFIT</span>
              <span>{peso(printingZ.profit)}</span>
            </div>
            <p className="text-center text-[9px] mt-3">--- End of Z-Reading ---</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ZRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
