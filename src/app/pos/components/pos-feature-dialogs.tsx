"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, Play, Ban, Undo2, Plus, Search, UserPlus, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@/lib/types";
import {
  getHeldTransactions,
  resumeHeldTransaction,
  discardHeldTransaction,
  getRecentSales,
  voidSale,
  returnSale,
  recordCashEvent,
  getCashEvents,
  getDrawerStatus,
  quickAddCustomer,
} from "../pos-actions";
import { getShiftSalesData } from "../actions";

const peso = (n: number) =>
  "₱" + (Number.isFinite(n) ? n : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ================================================================== */
/*  Held Transactions                                                  */
/* ================================================================== */

export function HeldTransactionsDialog({
  open,
  onOpenChange,
  onResume,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onResume: (items: any[]) => void;
}) {
  const { toast } = useToast();
  const [held, setHeld] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setHeld(await getHeldTransactions());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const resume = async (id: string) => {
    setBusyId(id);
    try {
      const { items } = await resumeHeldTransaction(id);
      onResume(items || []);
      toast({ title: "Transaction resumed" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Failed to resume", description: e.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const discard = async (id: string) => {
    setBusyId(id);
    try {
      await discardHeldTransaction(id);
      toast({ title: "Held transaction discarded" });
      await load();
    } catch (e: any) {
      toast({ title: "Failed to discard", description: e.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Held Transactions</DialogTitle>
          <DialogDescription>Resume a parked sale or discard it (stock is returned).</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[55vh]">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : held.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No held transactions.</p>
          ) : (
            <div className="space-y-2 pr-2">
              {held.map((h) => (
                <div key={h.id} className="flex items-center gap-3 border rounded-xl p-3 bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">#{h.id} · {h.customerName || "Walk-in"}</p>
                    <p className="text-xs text-muted-foreground truncate">{h.itemName} · {h.quantity} items</p>
                  </div>
                  <span className="font-bold text-primary">{peso(h.totalAmount)}</span>
                  <Button size="sm" onClick={() => resume(String(h.id))} disabled={busyId === String(h.id)}>
                    {busyId === String(h.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 mr-1" />} Resume
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => discard(String(h.id))} disabled={busyId === String(h.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */
/*  Recent / Void / Return sales                                       */
/* ================================================================== */

export function ManageSalesDialog({
  open,
  onOpenChange,
  mode,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: "recent" | "void" | "return";
}) {
  const { toast } = useToast();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [printSale, setPrintSale] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Return-authorization form state
  const [refType, setRefType] = useState<"invoice" | "sales_order">("invoice");
  const [refNumber, setRefNumber] = useState("");
  const [returnCustomer, setReturnCustomer] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const resetForm = () => {
    setReason("");
    setRefType("invoice");
    setRefNumber("");
    setReturnCustomer("");
    setAdminEmail("");
    setAdminPassword("");
  };

  const titles = {
    recent: "Recent Sales",
    void: "Void a Sale",
    return: "Return a Sale",
  };

  // When a sale is selected for printing, render its receipt (hidden) then
  // capture it to a PDF and open it in a new tab for printing.
  useEffect(() => {
    if (!printSale || !printRef.current) return;
    const node = printRef.current;
    let cancelled = false;
    (async () => {
      try {
        // @ts-ignore
        const html2pdf = (await import("html2pdf.js")).default;
        const opt = {
          margin: [5, 2, 5, 2] as [number, number, number, number],
          filename: `receipt-${printSale.id}.pdf`,
          image: { type: "jpeg" as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: [80, 200] as [number, number], orientation: "portrait" as const },
        };
        const blobUrl = await html2pdf().set(opt).from(node).output("bloburl");
        if (!cancelled) window.open(blobUrl, "_blank");
      } catch (err) {
        console.error("Receipt print error:", err);
        if (!cancelled) window.print();
      } finally {
        if (!cancelled) setPrintSale(null);
      }
    })();
    return () => { cancelled = true; };
  }, [printSale]);

  const load = async () => {
    setLoading(true);
    try {
      setSales(await getRecentSales(40));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setActiveId(null);
      resetForm();
      load();
    }
  }, [open]);

  const act = async (id: string) => {
    if (!reason.trim()) {
      toast({ title: "Reason required", variant: "destructive" });
      return;
    }
    if (mode === "return") {
      if (!refNumber.trim()) {
        toast({ title: refType === "sales_order" ? "Sales Order # required" : "Invoice # required", variant: "destructive" });
        return;
      }
      if (!returnCustomer.trim()) {
        toast({ title: "Customer name required", variant: "destructive" });
        return;
      }
      if (!adminEmail.trim() || !adminPassword) {
        toast({ title: "Admin credentials required", variant: "destructive" });
        return;
      }
    }
    setBusyId(id);
    try {
      if (mode === "void") {
        await voidSale(id, reason);
      } else {
        await returnSale(id, {
          reason,
          reference: refNumber,
          referenceType: refType,
          customerName: returnCustomer,
          adminEmail,
          adminPassword,
        });
      }
      toast({ title: mode === "void" ? "Sale voided" : "Sale returned" });
      setActiveId(null);
      resetForm();
      await load();
    } catch (e: any) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const statusColor = (s: string) => {
    const l = (s || "").toLowerCase();
    if (l === "cancelled") return "destructive";
    if (l === "returned") return "destructive";
    if (l === "delivered") return "default";
    return "secondary";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titles[mode]}</DialogTitle>
          <DialogDescription>
            {mode === "recent"
              ? "The latest transactions processed at this terminal."
              : `Select a sale and enter a reason to ${mode} it. Stock is returned to inventory.`}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[55vh]">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : sales.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No sales found.</p>
          ) : (
            <div className="space-y-2 pr-2">
              {sales.map((s) => {
                const actionable =
                  mode !== "recent" &&
                  (s.shippingStatus || "").toLowerCase() !== "cancelled" &&
                  (s.shippingStatus || "").toLowerCase() !== "returned";
                return (
                  <div key={s.id} className="border rounded-xl p-3 bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">#{s.id} · {s.customerName || "Walk-in"}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.itemName} · {s.paymentMethod}</p>
                      </div>
                      <Badge variant={statusColor(s.shippingStatus) as any}>{s.shippingStatus}</Badge>
                      <span className="font-bold text-primary w-24 text-right">{peso(s.totalAmount)}</span>
                      {mode === "recent" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPrintSale(s)}
                          disabled={!!printSale}
                          title="Print receipt"
                        >
                          {printSale?.id === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                        </Button>
                      )}
                      {actionable && activeId !== String(s.id) && (
                        <Button
                          size="sm"
                          variant={mode === "void" ? "destructive" : "outline"}
                          onClick={() => {
                            setActiveId(String(s.id));
                            resetForm();
                            if (mode === "return") setReturnCustomer(s.customerName || "");
                          }}
                        >
                          {mode === "void" ? <Ban className="h-4 w-4 mr-1" /> : <Undo2 className="h-4 w-4 mr-1" />}
                          {mode === "void" ? "Void" : "Return"}
                        </Button>
                      )}
                    </div>
                    {actionable && activeId === String(s.id) && mode === "void" && (
                      <div className="flex gap-2 mt-3">
                        <Input
                          autoFocus
                          placeholder="Reason for void..."
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className="h-9"
                        />
                        <Button size="sm" onClick={() => act(String(s.id))} disabled={busyId === String(s.id)}>
                          {busyId === String(s.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setActiveId(null)}>Cancel</Button>
                      </div>
                    )}
                    {actionable && activeId === String(s.id) && mode === "return" && (
                      <div className="mt-3 space-y-3 rounded-lg border bg-background p-3">
                        {/* Reference */}
                        <div className="space-y-1.5">
                          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Reference</Label>
                          <div className="flex gap-2">
                            <div className="grid grid-cols-2 gap-1 shrink-0">
                              <Button type="button" size="sm" variant={refType === "invoice" ? "default" : "outline"} className="h-9" onClick={() => setRefType("invoice")}>Invoice #</Button>
                              <Button type="button" size="sm" variant={refType === "sales_order" ? "default" : "outline"} className="h-9" onClick={() => setRefType("sales_order")}>Sales Order</Button>
                            </div>
                            <Input
                              autoFocus
                              placeholder={refType === "sales_order" ? "Sales Order #" : "Invoice #"}
                              value={refNumber}
                              onChange={(e) => setRefNumber(e.target.value)}
                              className="h-9"
                            />
                          </div>
                        </div>
                        {/* Customer */}
                        <div className="space-y-1.5">
                          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Customer</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Customer name"
                              value={returnCustomer}
                              onChange={(e) => setReturnCustomer(e.target.value)}
                              className="h-9"
                            />
                            <Button type="button" size="sm" variant="outline" className="h-9 shrink-0" onClick={() => setReturnCustomer("Walk-in")}>Walk-in</Button>
                          </div>
                        </div>
                        {/* Reason */}
                        <div className="space-y-1.5">
                          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Reason</Label>
                          <Input placeholder="Reason for return..." value={reason} onChange={(e) => setReason(e.target.value)} className="h-9" />
                        </div>
                        {/* Admin authorization */}
                        <div className="space-y-1.5 rounded-md bg-amber-500/5 border border-amber-500/20 p-2.5">
                          <Label className="text-[11px] uppercase tracking-wide text-amber-600 font-semibold">Admin Authorization</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="email"
                              autoComplete="off"
                              placeholder="Admin email"
                              value={adminEmail}
                              onChange={(e) => setAdminEmail(e.target.value)}
                              className="h-9"
                            />
                            <Input
                              type="password"
                              autoComplete="new-password"
                              placeholder="Admin password"
                              value={adminPassword}
                              onChange={(e) => setAdminPassword(e.target.value)}
                              className="h-9"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => { setActiveId(null); resetForm(); }}>Cancel</Button>
                          <Button size="sm" onClick={() => act(String(s.id))} disabled={busyId === String(s.id)}>
                            {busyId === String(s.id) ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Processing...</> : "Confirm Return"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Hidden printable receipt (rendered only while printing a sale) */}
        <div className="fixed -left-[9999px] top-0" aria-hidden="true">
          {printSale && (
            <div ref={printRef} className="bg-white text-black font-mono text-[11px] leading-relaxed p-4" style={{ width: 300 }}>
              <div className="text-center mb-2">
                <p className="font-black text-sm tracking-wide">SALES RECEIPT</p>
                <p>Order #{printSale.id}</p>
                <p>{new Date(printSale.createdAt).toLocaleString()}</p>
              </div>
              <div className="border-t border-dashed border-gray-400 my-2" />
              <div className="grid grid-cols-2 gap-x-2 text-[10px] mb-2">
                <p>Customer: <span className="font-semibold">{printSale.customerName || "Walk-in"}</span></p>
                <p className="text-right">Cashier: <span className="font-semibold">{printSale.createdBy?.name || "Cashier"}</span></p>
                <p>Payment: <span className="font-semibold">{printSale.paymentMethod}</span></p>
                <p className="text-right">Status: <span className="font-semibold">{printSale.paymentStatus}</span></p>
              </div>
              <div className="border-t border-dashed border-gray-400 my-2" />
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-gray-400">
                    <th className="text-left py-1">ITEM</th>
                    <th className="text-center py-1 w-8">QTY</th>
                    <th className="text-right py-1 w-16">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {(printSale.items || []).map((it: any, i: number) => {
                    const nm = it.productName || it.product?.name || "Item";
                    const qty = Number(it.quantity) || 1;
                    const price = it.price ?? it.product?.retailPrice ?? 0;
                    return (
                      <tr key={i} className="border-b border-dotted border-gray-200">
                        <td className="py-0.5 pr-1">{nm}</td>
                        <td className="text-center">{qty}</td>
                        <td className="text-right">{(price * qty).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="border-t border-dashed border-gray-400 my-2" />
              <div className="flex justify-between font-black text-sm">
                <span>TOTAL</span>
                <span>{peso(printSale.totalAmount)}</span>
              </div>
              {printSale.remarks && <p className="text-[9px] mt-2 text-gray-600">{printSale.remarks}</p>}
              <p className="text-center text-[9px] mt-3">--- Reprint ---</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */
/*  Cash drawer (count / transfer / open)                              */
/* ================================================================== */

export function CashDrawerDialog({
  open,
  onOpenChange,
  mode,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: "count" | "transfer";
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState<{ expectedCash: number; cashSalesToday: number; transfersOutToday: number; floatToday: number } | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [transferType, setTransferType] = useState<"deposit" | "pickup">("deposit");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [st, ev] = await Promise.all([getDrawerStatus(), getCashEvents(20)]);
    setStatus(st);
    setEvents(ev);
  };

  useEffect(() => {
    if (open) {
      setAmount("");
      setNote("");
      setTransferType("deposit");
      load();
    }
  }, [open]);

  const submit = async (kind: "count" | "transfer" | "float") => {
    const amt = Number(amount);
    if (kind !== "count" && (!amount || isNaN(amt) || amt <= 0)) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const details =
        kind === "count" && status
          ? { expected: status.expectedCash, counted: amt, variance: amt - status.expectedCash }
          : kind === "transfer"
          ? { transferType }
          : undefined;
      const transferNote = kind === "transfer"
        ? `${transferType === "deposit" ? "Deposit" : "Pickup"}${note ? ` — ${note}` : ""}`
        : note;
      await recordCashEvent(kind, amt, transferNote, details);
      toast({
        title: "Recorded",
        description:
          kind === "count"
            ? "Cash count saved."
            : kind === "float"
            ? "Opening float set."
            : `Cash ${transferType} recorded.`,
      });
      setAmount("");
      setNote("");
      await load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const variance = status && amount !== "" ? Number(amount) - status.expectedCash : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "count" ? "Cash Count" : "Cash Transfer / Pickup"}</DialogTitle>
          <DialogDescription>
            {mode === "count"
              ? "Reconcile the physical cash in the drawer against expected."
              : "Record cash removed from the drawer (bank deposit / pickup)."}
          </DialogDescription>
        </DialogHeader>

        {/* Expected drawer summary */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Opening Float</p>
            <p className="font-bold">{peso(status?.floatToday || 0)}</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Cash Sales Today</p>
            <p className="font-bold">{peso(status?.cashSalesToday || 0)}</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Transferred Out</p>
            <p className="font-bold">{peso(status?.transfersOutToday || 0)}</p>
          </div>
          <div className="bg-primary/10 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Expected in Drawer</p>
            <p className="font-bold text-primary">{peso(status?.expectedCash || 0)}</p>
          </div>
        </div>

        {mode === "transfer" && (
          <div className="space-y-2 pt-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={transferType === "deposit" ? "default" : "outline"}
                className="h-10"
                onClick={() => setTransferType("deposit")}
              >
                Deposit
              </Button>
              <Button
                type="button"
                variant={transferType === "pickup" ? "default" : "outline"}
                className="h-10"
                onClick={() => setTransferType("pickup")}
              >
                Pickup
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {mode === "count" ? "Counted Amount" : `${transferType === "deposit" ? "Deposit" : "Pickup"} Amount`}
          </Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-12 text-xl font-bold text-right"
            placeholder="₱0.00"
          />
          {mode === "count" && variance !== null && (
            <p className={`text-sm font-semibold text-right ${variance === 0 ? "text-green-600" : variance < 0 ? "text-destructive" : "text-amber-600"}`}>
              Variance: {peso(variance)} {variance < 0 ? "(short)" : variance > 0 ? "(over)" : "(balanced)"}
            </p>
          )}
          <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="h-9" />
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {mode === "count" ? (
            <>
              <Button variant="outline" onClick={() => submit("float")} disabled={saving}>Set as Opening Float</Button>
              <Button onClick={() => submit("count")} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Save Count
              </Button>
            </>
          ) : (
            <Button className="w-full" onClick={() => submit("transfer")} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Record {transferType === "deposit" ? "Deposit" : "Pickup"}
            </Button>
          )}
        </DialogFooter>

        {events.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Today's Cash Activity</p>
            <ScrollArea className="max-h-32">
              <div className="space-y-1 pr-2">
                {events.map((e) => (
                  <div key={e.id} className="flex justify-between text-xs">
                    <span className="text-muted-foreground truncate">{e.description}</span>
                    <span className="font-medium whitespace-nowrap">{e.performedBy?.name}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */
/*  Z-Reading                                                          */
/* ================================================================== */

export function ZReadingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getShiftSalesData()
        .then(setData)
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handlePrint = async () => {
    if (!printRef.current) { window.print(); return; }
    try {
      toast({ title: "Preparing Z-Reading..." });
      // @ts-ignore
      const html2pdf = (await import("html2pdf.js")).default;
      const opt = {
        margin: [5, 2, 5, 2] as [number, number, number, number],
        filename: `z-reading-${new Date(data?.date || Date.now()).toISOString().slice(0, 10)}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: [80, 200] as [number, number], orientation: "portrait" as const },
      };
      const blobUrl = await html2pdf().set(opt).from(printRef.current).output("bloburl");
      window.open(blobUrl, "_blank");
    } catch (err) {
      console.error("Z-Reading print error:", err);
      window.print();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>POS Z-Reading</DialogTitle>
          <DialogDescription>Today's cumulative shift totals for this cashier.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !data ? (
          <p className="text-center text-muted-foreground py-10">No shift data.</p>
        ) : (
          <div ref={printRef} className="bg-white text-black font-mono text-sm space-y-1 border border-dashed border-gray-300 rounded-lg p-5">
            <div className="text-center font-bold mb-2">— Z-READING —</div>
            <Row label="Cashier" value={data.cashierName} />
            <Row label="Date" value={new Date(data.date).toLocaleDateString()} />
            <div className="border-t border-dashed border-gray-300 my-2" />
            <Row label="Transactions" value={String(data.totalTransactions)} />
            <Row label="Items Sold" value={String(data.totalItemsSold)} />
            <div className="border-t border-dashed border-gray-300 my-2" />
            {Object.entries(data.paymentBreakdown || {}).map(([m, v]: any) => (
              <Row key={m} label={m} value={`${v.count}× · ${peso(v.total)}`} />
            ))}
            <div className="border-t border-double border-gray-400 my-2" />
            <div className="flex justify-between font-black text-base">
              <span>GROSS SALES</span>
              <span>{peso(data.totalSales)}</span>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={handlePrint} disabled={loading || !data}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

/* ================================================================== */
/*  Customer selector / quick add                                      */
/* ================================================================== */

export function CustomerDialog({
  open,
  onOpenChange,
  customers,
  value,
  onSelect,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customers: any[];
  value: string;
  onSelect: (id: string) => void;
  onAdded: (c: { id: number; name: string; phone: string }) => void;
}) {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setQ(""); setName(""); setPhone(""); }
  }, [open]);

  const filtered = customers.filter(
    (c) => c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone || "").includes(q)
  );

  const add = async () => {
    if (!name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const c = await quickAddCustomer(name, phone);
      onAdded(c);
      toast({ title: "Customer added" });
      setName(""); setPhone("");
    } catch (e: any) {
      toast({ title: "Failed to add", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customer</DialogTitle>
          <DialogDescription>Select a customer for this sale or add a new one.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customer..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <ScrollArea className="max-h-52 border rounded-lg">
          <div className="p-1">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => { onSelect(String(c.id)); onOpenChange(false); }}
                className={`w-full text-left px-3 py-2 rounded-md hover:bg-muted flex justify-between items-center ${value === String(c.id) ? "bg-primary/10" : ""}`}
              >
                <span className="font-medium text-sm">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.phone}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No matches.</p>}
          </div>
        </ScrollArea>
        <div className="border-t pt-3 space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Add</Label>
          <div className="flex gap-2">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
            <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 w-32" />
            <Button size="sm" onClick={add} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */
/*  Price inquiry                                                       */
/* ================================================================== */

export function PriceInquiryDialog({
  open,
  onOpenChange,
  products,
  onAddToCart,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  products: Product[];
  onAddToCart: (p: Product) => void;
}) {
  const [q, setQ] = useState("");
  useEffect(() => { if (open) setQ(""); }, [open]);

  const filtered = q
    ? products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()))
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Price Inquiry</DialogTitle>
          <DialogDescription>Look up a product's price and stock without adding it to the cart.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input autoFocus placeholder="Scan / type name or SKU..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <ScrollArea className="max-h-72">
          <div className="space-y-2 pr-2">
            {filtered.map((p) => {
              const price = p.retailPrice || p.cost || 0;
              return (
                <div key={p.id} className="flex items-center gap-3 border rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">SKU: {p.sku} · {p.quantity} in stock</p>
                  </div>
                  <span className="font-bold text-primary">{peso(price)}</span>
                  <Button size="sm" variant="outline" onClick={() => onAddToCart(p)} disabled={p.quantity <= 0}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            {q && filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-6">No products found.</p>}
            {!q && <p className="text-center text-muted-foreground text-sm py-6">Start typing to search.</p>}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */
/*  Discount                                                           */
/* ================================================================== */

export type DiscountLine = { id: string; name: string; lineTotal: number };

export function DiscountDialog({
  open,
  onOpenChange,
  lines,
  discountType,
  discountValue,
  discountScope,
  discountItemIds,
  onApply,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lines: DiscountLine[];
  discountType: "amount" | "percent";
  discountValue: number;
  discountScope: "all" | "selected";
  discountItemIds: string[];
  onApply: (type: "amount" | "percent", value: number, scope: "all" | "selected", itemIds: string[]) => void;
}) {
  const [type, setType] = useState<"amount" | "percent">(discountType);
  const [value, setValue] = useState(String(discountValue || ""));
  const [scope, setScope] = useState<"all" | "selected">(discountScope);
  const [selectedIds, setSelectedIds] = useState<string[]>(discountItemIds);

  const multiItem = lines.length > 1;

  useEffect(() => {
    if (open) {
      setType(discountType);
      setValue(discountValue ? String(discountValue) : "");
      setScope(multiItem ? discountScope : "all");
      setSelectedIds(discountItemIds.filter(id => lines.some(l => l.id === id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const itemsTotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const base = scope === "selected"
    ? lines.reduce((s, l) => (selectedIds.includes(l.id) ? s + l.lineTotal : s), 0)
    : itemsTotal;

  const v = Number(value) || 0;
  const computed = type === "percent" ? Math.min(base, (base * v) / 100) : Math.min(base, v);

  const toggleItem = (id: string) =>
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const noSelection = scope === "selected" && selectedIds.length === 0;

  const apply = () => {
    if (noSelection) return;
    onApply(type, v, scope, scope === "selected" ? selectedIds : []);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Apply Discount</DialogTitle>
          <DialogDescription>
            {scope === "selected" ? "Discount applied to the selected items." : "Discount applied to the whole sale."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {multiItem && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Apply to</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={scope === "all" ? "default" : "outline"}
                  className="h-10"
                  onClick={() => setScope("all")}
                >
                  All items
                </Button>
                <Button
                  type="button"
                  variant={scope === "selected" ? "default" : "outline"}
                  className="h-10"
                  onClick={() => setScope("selected")}
                >
                  Selected items
                </Button>
              </div>
            </div>
          )}

          {scope === "selected" && (
            <ScrollArea className="max-h-40 rounded-lg border">
              <div className="p-1">
                {lines.map(l => (
                  <label
                    key={l.id}
                    className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-muted/50"
                  >
                    <Checkbox checked={selectedIds.includes(l.id)} onCheckedChange={() => toggleItem(l.id)} />
                    <span className="flex-1 text-sm truncate">{l.name}</span>
                    <span className="text-sm text-muted-foreground">{peso(l.lineTotal)}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          )}

          <Select value={type} onValueChange={(x: string) => setType(x as "amount" | "percent")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="amount">Fixed Amount (₱)</SelectItem>
              <SelectItem value="percent">Percentage (%)</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="h-12 text-xl text-right font-bold" placeholder="0" autoFocus />
          <div className="flex justify-between bg-muted/40 rounded-lg p-3 text-sm">
            <span className="text-muted-foreground">
              Discount{scope === "selected" ? ` (on ${selectedIds.length} item${selectedIds.length === 1 ? "" : "s"})` : ""}
            </span>
            <span className="font-bold text-destructive">-{peso(computed)}</span>
          </div>
          <div className="flex justify-between rounded-lg p-3 text-sm border">
            <span className="text-muted-foreground">New Total</span>
            <span className="font-bold text-primary">{peso(Math.max(0, itemsTotal - computed))}</span>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => { onApply(type, 0, "all", []); onOpenChange(false); }}>Clear</Button>
          <Button onClick={apply} disabled={noSelection}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */
/*  Edit line (item / price / quantity)                                */
/* ================================================================== */

export function EditLineDialog({
  open,
  onOpenChange,
  mode,
  line,
  onSave,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: "item" | "price" | "quantity";
  line: { product: Product; quantity: number; priceOverride?: number } | null;
  onSave: (qty: number, price: number) => void;
  onRemove: () => void;
}) {
  const basePrice = line ? (line.priceOverride ?? line.product.retailPrice ?? line.product.cost ?? 0) : 0;
  const [qty, setQty] = useState(String(line?.quantity || 1));
  const [price, setPrice] = useState(String(basePrice));

  useEffect(() => {
    if (open && line) {
      setQty(String(line.quantity));
      setPrice(String(line.priceOverride ?? line.product.retailPrice ?? line.product.cost ?? 0));
    }
  }, [open, line]);

  if (!line) return null;

  const maxStock = line.product.quantity;
  const titles = { item: "Edit Item", price: "Edit Price", quantity: "Edit Quantity" };

  const save = () => {
    const q = Math.max(1, Math.min(maxStock, Number(qty) || 1));
    const p = Math.max(0, Number(price) || 0);
    onSave(q, p);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{titles[mode]}</DialogTitle>
          <DialogDescription className="truncate">{line.product.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {(mode === "item" || mode === "quantity") && (
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Quantity (max {maxStock})</Label>
              <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="h-12 text-xl text-right font-bold" />
            </div>
          )}
          {(mode === "item" || mode === "price") && (
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Unit Price</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="h-12 text-xl text-right font-bold" />
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" className="text-destructive" onClick={() => { onRemove(); onOpenChange(false); }}>
            <Trash2 className="h-4 w-4 mr-1" /> Remove
          </Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */
/*  Cancel — choose which item(s) to remove from the current order     */
/* ================================================================== */

export function CancelOrderDialog({
  open,
  onOpenChange,
  items,
  onRemove,
  onClearAll,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  items: { product: Product; quantity: number; priceOverride?: number }[];
  onRemove: (productId: string) => void;
  onClearAll: () => void;
}) {
  // Auto-close once the order is empty.
  useEffect(() => {
    if (open && items.length === 0) onOpenChange(false);
  }, [open, items.length, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Item</DialogTitle>
          <DialogDescription>Select which product to remove from the current order.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-2 pr-2">
            {items.map((item) => {
              const price = item.priceOverride ?? item.product.retailPrice ?? item.product.cost ?? 0;
              return (
                <div key={item.product.id} className="flex items-center gap-3 border rounded-xl p-3 bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{item.quantity} × {peso(price)}</p>
                  </div>
                  <span className="font-bold text-primary">{peso(price * item.quantity)}</span>
                  <Button size="sm" variant="destructive" onClick={() => onRemove(String(item.product.id))}>
                    <Trash2 className="h-4 w-4 mr-1" /> Remove
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="destructive" onClick={() => { onClearAll(); onOpenChange(false); }}>
            <Ban className="h-4 w-4 mr-1" /> Cancel Entire Order
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Keep Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
