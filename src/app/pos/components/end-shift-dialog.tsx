"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Banknote,
  Coins,
  Calculator,
  Printer,
  LogOut,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Clock,
  Hash,
  User,
  Loader2,
  ArrowRight,
  Minus,
  Plus,
} from "lucide-react";
import { getShiftSalesData, performLogout } from "../actions";
import { format } from "date-fns";

// Philippine Peso denominations
const DENOMINATIONS = [
  { label: "₱1,000", value: 1000, type: "bill" },
  { label: "₱500", value: 500, type: "bill" },
  { label: "₱200", value: 200, type: "bill" },
  { label: "₱100", value: 100, type: "bill" },
  { label: "₱50", value: 50, type: "bill" },
  { label: "₱20", value: 20, type: "bill" },
  { label: "₱10", value: 10, type: "coin" },
  { label: "₱5", value: 5, type: "coin" },
  { label: "₱1", value: 1, type: "coin" },
  { label: "₱0.25", value: 0.25, type: "coin" },
] as const;

type ShiftSalesData = {
  cashierName: string;
  cashierId: string | number;
  date: string;
  totalSales: number;
  totalTransactions: number;
  totalItemsSold: number;
  paymentBreakdown: Record<string, { count: number; total: number }>;
  transactionList: {
    id: number;
    time: string;
    customer: string;
    amount: number;
    method: string;
    items: number;
  }[];
};

type DenominationCount = Record<number, number>;

interface EndShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashierName: string;
  cashierRole: string;
}

export default function EndShiftDialog({
  open,
  onOpenChange,
  cashierName,
  cashierRole,
}: EndShiftDialogProps) {
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<ShiftSalesData | null>(null);
  const [denominations, setDenominations] = useState<DenominationCount>({});
  const [activeTab, setActiveTab] = useState("cash-count");
  const [readingType, setReadingType] = useState<"x" | "z">("x");
  const [confirmed, setConfirmed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch sales data when dialog opens
  useEffect(() => {
    if (open) {
      setLoading(true);
      setConfirmed(false);
      setActiveTab("cash-count");
      // Reset denomination counts
      const initial: DenominationCount = {};
      DENOMINATIONS.forEach((d) => (initial[d.value] = 0));
      setDenominations(initial);

      getShiftSalesData()
        .then((data) => setSalesData(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open]);

  const updateDenomination = useCallback((value: number, count: number) => {
    setDenominations((prev) => ({
      ...prev,
      [value]: Math.max(0, count),
    }));
  }, []);

  const totalCounted = useMemo(() => {
    return Object.entries(denominations).reduce(
      (sum, [value, count]) => sum + Number(value) * count,
      0
    );
  }, [denominations]);

  const expectedCash = useMemo(() => {
    if (!salesData) return 0;
    return salesData.paymentBreakdown["Cash"]?.total || 0;
  }, [salesData]);

  const variance = useMemo(() => totalCounted - expectedCash, [totalCounted, expectedCash]);

  const handleConfirmAndPrint = () => {
    setConfirmed(true);
    setActiveTab("report");
  };

  const handlePrint = () => {
    // Create a print-specific window
    const printWindow = window.open("", "_blank", "width=400,height=800");
    if (!printWindow) return;

    const reportDate = salesData ? format(new Date(salesData.date), "MMMM dd, yyyy") : "";
    const reportTime = salesData ? format(new Date(salesData.date), "hh:mm a") : "";
    const readingLabel = readingType === "x" ? "X READING" : "Z READING";

    // Build denomination rows
    const denomRows = DENOMINATIONS.map((d) => {
      const count = denominations[d.value] || 0;
      const subtotal = count * d.value;
      if (count === 0) return "";
      return `
        <tr>
          <td style="text-align:left;padding:2px 0">${d.label}</td>
          <td style="text-align:center">${count}</td>
          <td style="text-align:right">₱${subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
        </tr>`;
    }).join("");

    // Build payment breakdown rows
    const paymentRows = salesData
      ? Object.entries(salesData.paymentBreakdown)
          .map(
            ([method, info]) => `
        <tr>
          <td style="text-align:left;padding:2px 0">${method}</td>
          <td style="text-align:center">${info.count}</td>
          <td style="text-align:right">₱${info.total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
        </tr>`
          )
          .join("")
      : "";

    // Build transaction rows
    const txRows = salesData
      ? salesData.transactionList
          .map(
            (tx) => `
        <tr style="font-size:10px">
          <td style="text-align:left;padding:1px 0">${tx.time}</td>
          <td style="text-align:left">#${tx.id}</td>
          <td style="text-align:right">₱${tx.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
        </tr>`
          )
          .join("")
      : "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${readingLabel} - FlowCart Sync</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 8px; }
          .center { text-align: center; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #333; margin: 6px 0; }
          .double-divider { border-top: 2px double #333; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; }
          h1 { font-size: 16px; margin: 4px 0; }
          h2 { font-size: 13px; margin: 4px 0; }
          .section-title { font-size: 11px; font-weight: bold; margin: 6px 0 3px ; text-transform: uppercase; letter-spacing: 1px; }
          .big-total { font-size: 18px; font-weight: bold; }
          .variance-positive { }
          .variance-negative { font-weight: bold; }
          @media print { body { width: 80mm; } }
        </style>
      </head>
      <body>
        <div class="center">
          <h1>FlowCart Sync</h1>
          <p>Point of Sale System</p>
          <div class="divider"></div>
          <h2>${readingLabel}</h2>
          <p>${readingType === "x" ? "Mid-Shift Report" : "End-of-Day Report"}</p>
        </div>
        
        <div class="divider"></div>
        
        <table>
          <tr><td>Date:</td><td class="right">${reportDate}</td></tr>
          <tr><td>Time:</td><td class="right">${reportTime}</td></tr>
          <tr><td>Cashier:</td><td class="right">${cashierName}</td></tr>
          <tr><td>Role:</td><td class="right">${cashierRole}</td></tr>
        </table>

        <div class="double-divider"></div>
        
        <p class="section-title">Sales Summary</p>
        <table>
          <tr><td>Total Transactions:</td><td class="right bold">${salesData?.totalTransactions || 0}</td></tr>
          <tr><td>Total Items Sold:</td><td class="right bold">${salesData?.totalItemsSold || 0}</td></tr>
          <tr><td>Gross Sales:</td><td class="right bold">₱${(salesData?.totalSales || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td></tr>
        </table>

        <div class="divider"></div>
        
        <p class="section-title">Payment Breakdown</p>
        <table>
          <tr style="font-weight:bold"><td>Method</td><td style="text-align:center">Txns</td><td style="text-align:right">Total</td></tr>
          ${paymentRows}
        </table>

        <div class="divider"></div>
        
        <p class="section-title">Cash Denomination Count</p>
        <table>
          <tr style="font-weight:bold"><td>Denom</td><td style="text-align:center">Qty</td><td style="text-align:right">Amount</td></tr>
          ${denomRows}
        </table>
        <div class="divider"></div>
        <table>
          <tr class="bold"><td>TOTAL COUNTED:</td><td class="right">₱${totalCounted.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td></tr>
          <tr><td>Expected Cash:</td><td class="right">₱${expectedCash.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td></tr>
          <tr class="${variance >= 0 ? "variance-positive" : "variance-negative"}">
            <td>${variance >= 0 ? "OVER:" : "SHORT:"}</td>
            <td class="right">₱${Math.abs(variance).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
          </tr>
        </table>

        <div class="double-divider"></div>

        <p class="section-title">Transaction List</p>
        <table>
          <tr style="font-weight:bold;font-size:10px"><td>Time</td><td>Order</td><td style="text-align:right">Amount</td></tr>
          ${txRows}
        </table>

        <div class="double-divider"></div>

        <div class="center" style="margin-top:8px">
          <p style="font-size:10px">--- End of ${readingLabel} ---</p>
          <p style="font-size:9px;margin-top:4px">Printed: ${format(new Date(), "MM/dd/yyyy hh:mm:ss a")}</p>
          <br/>
          <p style="font-size:9px">________________________</p>
          <p style="font-size:9px">Cashier Signature</p>
          <br/>
          <p style="font-size:9px">________________________</p>
          <p style="font-size:9px">Supervisor Signature</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await performLogout();
    } catch {
      // redirect will throw
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">
              Loading shift data...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              End Shift — Cash Count
            </DialogTitle>
            <DialogDescription className="flex items-center gap-4 mt-1 text-xs">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {cashierName} ({cashierRole})
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {format(new Date(), "MMM dd, yyyy — hh:mm a")}
              </span>
            </DialogDescription>
          </DialogHeader>

          {/* Reading Type Toggle */}
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant={readingType === "x" ? "default" : "outline"}
              onClick={() => setReadingType("x")}
              className="rounded-full px-5 text-xs font-bold"
            >
              X Reading (Mid-Shift)
            </Button>
            <Button
              size="sm"
              variant={readingType === "z" ? "default" : "outline"}
              onClick={() => setReadingType("z")}
              className="rounded-full px-5 text-xs font-bold"
            >
              Z Reading (End-of-Day)
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-5 pt-3">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="cash-count" className="text-xs font-semibold">
                <Banknote className="h-3.5 w-3.5 mr-1.5" />
                Cash Count
              </TabsTrigger>
              <TabsTrigger value="summary" className="text-xs font-semibold">
                <Calculator className="h-3.5 w-3.5 mr-1.5" />
                Sales Summary
              </TabsTrigger>
              <TabsTrigger value="report" className="text-xs font-semibold">
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Report
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: Cash Count */}
          <TabsContent
            value="cash-count"
            className="flex-1 overflow-hidden mt-0 px-5 pb-4"
          >
            <ScrollArea className="h-[calc(92vh-320px)]">
              <div className="space-y-4 pr-3 pt-3">
                {/* Sales Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/40 rounded-xl p-3 border border-border/50 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Total Sales
                    </p>
                    <p className="text-lg font-black text-primary">
                      ₱{(salesData?.totalSales || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-muted/40 rounded-xl p-3 border border-border/50 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Expected Cash
                    </p>
                    <p className="text-lg font-black text-emerald-600">
                      ₱{expectedCash.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-muted/40 rounded-xl p-3 border border-border/50 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Transactions
                    </p>
                    <p className="text-lg font-black">
                      {salesData?.totalTransactions || 0}
                    </p>
                  </div>
                </div>

                {/* Denomination Counter */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <Banknote className="h-4 w-4" /> Bills
                  </h3>
                  <div className="space-y-2">
                    {DENOMINATIONS.filter((d) => d.type === "bill").map((d) => (
                      <div
                        key={d.value}
                        className="flex items-center gap-3 bg-background border border-border/60 rounded-xl px-4  py-2.5 hover:border-primary/30 transition-colors group"
                      >
                        <span className="font-bold text-sm w-16 text-primary">
                          {d.label}
                        </span>
                        <div className="flex-1" />
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() =>
                              updateDenomination(
                                d.value,
                                (denominations[d.value] || 0) - 1
                              )
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min={0}
                            value={denominations[d.value] || 0}
                            onChange={(e) =>
                              updateDenomination(
                                d.value,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-16 h-8 text-center font-bold text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() =>
                              updateDenomination(
                                d.value,
                                (denominations[d.value] || 0) + 1
                              )
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="text-right font-semibold text-sm w-24 tabular-nums">
                          ₱
                          {(
                            (denominations[d.value] || 0) * d.value
                          ).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <Coins className="h-4 w-4" /> Coins
                  </h3>
                  <div className="space-y-2">
                    {DENOMINATIONS.filter((d) => d.type === "coin").map((d) => (
                      <div
                        key={d.value}
                        className="flex items-center gap-3 bg-background border border-border/60 rounded-xl px-4 py-2.5 hover:border-primary/30 transition-colors"
                      >
                        <span className="font-bold text-sm w-16 text-amber-600 dark:text-amber-400">
                          {d.label}
                        </span>
                        <div className="flex-1" />
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() =>
                              updateDenomination(
                                d.value,
                                (denominations[d.value] || 0) - 1
                              )
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min={0}
                            value={denominations[d.value] || 0}
                            onChange={(e) =>
                              updateDenomination(
                                d.value,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-16 h-8 text-center font-bold text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() =>
                              updateDenomination(
                                d.value,
                                (denominations[d.value] || 0) + 1
                              )
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="text-right font-semibold text-sm w-24 tabular-nums">
                          ₱
                          {(
                            (denominations[d.value] || 0) * d.value
                          ).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Cash Count Footer */}
            <div className="border-t pt-4 mt-3 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Counted
                </span>
                <span className="text-2xl font-black text-primary tabular-nums">
                  ₱{totalCounted.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">
                  Expected Cash Sales
                </span>
                <span className="text-lg font-bold tabular-nums">
                  ₱{expectedCash.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold flex items-center gap-2">
                  {variance >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  {variance >= 0 ? "Over" : "Short"}
                </span>
                <span
                  className={`text-xl font-black tabular-nums ${
                    variance === 0
                      ? "text-emerald-600"
                      : variance > 0
                      ? "text-amber-600"
                      : "text-red-600"
                  }`}
                >
                  {variance === 0
                    ? "Balanced ✓"
                    : `₱${Math.abs(variance).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}
                </span>
              </div>

              <Button
                className="w-full h-11 font-bold text-sm"
                onClick={handleConfirmAndPrint}
              >
                Confirm Cash Count
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          {/* TAB 2: Sales Summary */}
          <TabsContent
            value="summary"
            className="flex-1 overflow-hidden mt-0 px-5 pb-4"
          >
            <ScrollArea className="h-[calc(92vh-280px)]">
              <div className="space-y-4 pr-3 pt-3">
                {/* Payment Breakdown */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    Payment Method Breakdown
                  </h3>
                  <div className="space-y-2">
                    {salesData &&
                      Object.entries(salesData.paymentBreakdown).map(
                        ([method, info]) => (
                          <div
                            key={method}
                            className="flex items-center justify-between bg-background border border-border/50 rounded-xl px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Banknote className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">
                                  {method}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {info.count} transaction
                                  {info.count !== 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>
                            <span className="font-bold text-base tabular-nums">
                              ₱{info.total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )
                      )}
                    {salesData &&
                      Object.keys(salesData.paymentBreakdown).length === 0 && (
                        <p className="text-center text-muted-foreground py-4 text-sm">
                          No transactions today
                        </p>
                      )}
                  </div>
                </div>

                <Separator />

                {/* Transaction List */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5" />
                    Transaction List ({salesData?.transactionList.length || 0})
                  </h3>
                  <div className="space-y-1.5">
                    {salesData?.transactionList.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between bg-muted/30 border border-border/30 rounded-lg px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground font-mono w-16">
                            {tx.time}
                          </span>
                          <span className="font-medium">#{tx.id}</span>
                          <span className="text-muted-foreground text-xs truncate max-w-[100px]">
                            {tx.customer}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono"
                          >
                            {tx.method}
                          </Badge>
                          <span className="font-bold tabular-nums w-24 text-right">
                            ₱{tx.amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(!salesData || salesData.transactionList.length === 0) && (
                      <p className="text-center text-muted-foreground py-8 text-sm">
                        No transactions recorded for this shift
                      </p>
                    )}
                  </div>
                </div>

                {/* Grand Total */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                      Grand Total Sales
                    </span>
                    <span className="text-2xl font-black text-primary tabular-nums">
                      ₱
                      {(salesData?.totalSales || 0).toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB 3: Report / Print Preview */}
          <TabsContent
            value="report"
            className="flex-1 overflow-hidden mt-0 px-5 pb-4"
          >
            <ScrollArea className="h-[calc(92vh-280px)]">
              <div ref={printRef} className="pr-3 pt-3 space-y-3">
                {/* Report Preview */}
                <div className="bg-white dark:bg-zinc-900 border border-border rounded-xl p-5 font-mono text-xs space-y-3 shadow-inner">
                  <div className="text-center space-y-1">
                    <h2 className="text-base font-black">FlowCart Sync</h2>
                    <p className="text-[10px] text-muted-foreground">
                      Point of Sale System
                    </p>
                    <div className="border-t border-dashed my-2" />
                    <h3 className="text-sm font-black uppercase tracking-widest">
                      {readingType === "x" ? "X READING" : "Z READING"}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      {readingType === "x"
                        ? "Mid-Shift Report"
                        : "End-of-Day Report"}
                    </p>
                  </div>

                  <div className="border-t border-dashed" />

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Date:</span>
                      <span className="font-bold">
                        {salesData
                          ? format(new Date(salesData.date), "MMM dd, yyyy")
                          : ""}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time:</span>
                      <span className="font-bold">
                        {salesData
                          ? format(new Date(salesData.date), "hh:mm a")
                          : ""}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cashier:</span>
                      <span className="font-bold">{cashierName}</span>
                    </div>
                  </div>

                  <div className="border-t border-double border-border" />

                  <div>
                    <p className="font-bold text-[10px] uppercase tracking-widest mb-2">
                      Sales Summary
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Total Transactions:</span>
                        <span className="font-bold">
                          {salesData?.totalTransactions || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Items Sold:</span>
                        <span className="font-bold">
                          {salesData?.totalItemsSold || 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-black">
                        <span>Gross Sales:</span>
                        <span>
                          ₱
                          {(salesData?.totalSales || 0).toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-dashed" />

                  <div>
                    <p className="font-bold text-[10px] uppercase tracking-widest mb-2">
                      Payment Breakdown
                    </p>
                    {salesData &&
                      Object.entries(salesData.paymentBreakdown).map(
                        ([method, info]) => (
                          <div key={method} className="flex justify-between">
                            <span>
                              {method} ({info.count})
                            </span>
                            <span className="font-bold">
                              ₱{info.total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )
                      )}
                  </div>

                  <div className="border-t border-dashed" />

                  <div>
                    <p className="font-bold text-[10px] uppercase tracking-widest mb-2">
                      Cash Denomination Count
                    </p>
                    <div className="space-y-0.5">
                      {DENOMINATIONS.map((d) => {
                        const count = denominations[d.value] || 0;
                        if (count === 0) return null;
                        return (
                          <div key={d.value} className="flex justify-between">
                            <span>
                              {d.label} x {count}
                            </span>
                            <span>
                              ₱
                              {(count * d.value).toLocaleString("en-PH", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-double border-border" />

                  <div className="space-y-1">
                    <div className="flex justify-between font-bold text-sm">
                      <span>TOTAL COUNTED:</span>
                      <span>
                        ₱{totalCounted.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Expected Cash:</span>
                      <span>
                        ₱{expectedCash.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div
                      className={`flex justify-between font-bold ${
                        variance >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      <span>{variance >= 0 ? "OVER:" : "SHORT:"}</span>
                      <span>
                        ₱
                        {Math.abs(variance).toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-dashed" />

                  <div className="text-center space-y-2 pt-2">
                    <p className="text-[9px] text-muted-foreground">
                      --- End of{" "}
                      {readingType === "x" ? "X Reading" : "Z Reading"} ---
                    </p>
                    <div className="pt-4 space-y-3">
                      <div>
                        <div className="border-b border-border w-40 mx-auto mb-0.5" />
                        <p className="text-[9px] text-muted-foreground">
                          Cashier Signature
                        </p>
                      </div>
                      <div>
                        <div className="border-b border-border w-40 mx-auto mb-0.5" />
                        <p className="text-[9px] text-muted-foreground">
                          Supervisor Signature
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Variance Alert */}
                {confirmed && variance !== 0 && (
                  <div
                    className={`flex items-start gap-3 p-3 rounded-xl border ${
                      variance < 0
                        ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                        : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                    }`}
                  >
                    <AlertTriangle
                      className={`h-5 w-5 shrink-0 mt-0.5 ${
                        variance < 0 ? "text-red-500" : "text-amber-500"
                      }`}
                    />
                    <div>
                      <p className="font-bold text-sm">
                        {variance < 0
                          ? `Cash shortage of ₱${Math.abs(variance).toLocaleString()}`
                          : `Cash overage of ₱${variance.toLocaleString()}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Please have a supervisor review and acknowledge this
                        discrepancy before logging out.
                      </p>
                    </div>
                  </div>
                )}

                {confirmed && variance === 0 && (
                  <div className="flex items-start gap-3 p-3 rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                        Cash is balanced
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        The counted cash matches the expected amount. You may
                        now print the report and logout.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Report Actions */}
            <div className="border-t pt-4 mt-3 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-11 font-bold text-sm"
                onClick={handlePrint}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print {readingType === "x" ? "X" : "Z"} Reading
              </Button>
              {readingType === "z" && (
                <Button
                  variant="destructive"
                  className="flex-1 h-11 font-bold text-sm"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  {loggingOut ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging out...
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-2 h-4 w-4" />
                      End Shift & Logout
                    </>
                  )}
                </Button>
              )}
              {readingType === "x" && (
                <Button
                  variant="secondary"
                  className="flex-1 h-11 font-bold text-sm"
                  onClick={() => onOpenChange(false)}
                >
                  Return to POS
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
