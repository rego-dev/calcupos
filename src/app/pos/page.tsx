"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getProducts } from "@/app/(app)/inventory/actions";
import { getCustomers } from "@/app/(app)/customers/actions";
import { createOrder } from "@/app/(app)/orders/actions";
import { getCashierInfo } from "@/app/pos/actions";
import { getCompanyProfile } from "@/app/(app)/settings/actions";
import { Customer, Product, PaymentMethod, PaymentStatus, CompanyProfile } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Plus, Minus, Trash2, Search, Package, User, ReceiptText, ShieldAlert, Loader2, PhilippinePeso, Coffee, Check, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { format } from 'date-fns';

export default function POSPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Cart & Checkout State
  const [cart, setCart] = useState<{ product: Product, quantity: number }[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [paymentStatus, setPaymentStatus] = useState<string>("Paid");

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [tenderOpen, setTenderOpen] = useState(false);
  const [cashTendered, setCashTendered] = useState<string>("");
  const [lastOrderDetails, setLastOrderDetails] = useState<any>(null);
  const [cashierName, setCashierName] = useState<string>("Cashier");
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [fetchedProducts, fetchedCustomers] = await Promise.all([
          getProducts(),
          getCustomers()
        ]);

        // Filter out out-of-stock products for POS view
        setProducts(fetchedProducts.filter(p => !p.alertStock || p.quantity > 0));
        setCustomers(fetchedCustomers);

        // Fetch cashier info
        const cashier = await getCashierInfo();
        if (cashier) setCashierName(cashier.name);

        // Fetch company profile for receipt branding
        const profile = await getCompanyProfile();
        setCompanyProfile(profile);

        const walkIn = fetchedCustomers.find(c => c.name.toLowerCase().includes('walk in'));
        if (walkIn) setCustomerId(String(walkIn.id));
        else if (fetchedCustomers.length > 0) setCustomerId(String(fetchedCustomers[0].id));

      } catch (err) {
        toast({ title: "Failed to load POS data", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if ((p as any).category?.name) cats.add((p as any).category.name);
    });
    return ["All", ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = categoryFilter === "All" || (p as any).category?.name === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [products, query, categoryFilter]);

  const subtotal = cart.reduce((sum, item) => sum + (item.product.retailPrice || item.product.cost || 0) * item.quantity, 0);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          toast({ title: "Cannot exceed available stock", variant: "destructive" });
          return prev;
        }
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty > item.product.quantity) {
            toast({ title: "Stock limit reached", variant: "destructive" });
            return item;
          }
          return { ...item, quantity: Math.max(1, newQty) };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const openTenderDialog = () => {
    if (cart.length === 0) return toast({ title: "Cart is empty", variant: "destructive" });
    if (!customerId) return toast({ title: "Please select a customer", variant: "destructive" });
    
    setCashTendered("");
    setTenderOpen(true);
  };

  const processTransaction = async () => {
    if (cart.length === 0) return toast({ title: "Cart is empty", variant: "destructive" });
    if (!customerId) return toast({ title: "Please select a customer", variant: "destructive" });

    setProcessing(true);
    try {
      const customer = customers.find(c => String(c.id) === customerId);

      const orderData = {
        customerName: customer?.name || "Walk-in Customer",
        customerId: Number(customerId),
        paymentMethod: paymentMethod as PaymentMethod,
        paymentStatus: paymentStatus as PaymentStatus,
        shippingStatus: "Delivered" as any, // Completed transaction
        shippingFee: 0,
        price: subtotal,
        totalAmount: subtotal,
        quantity: cart.reduce((sum, item) => sum + item.quantity, 0),
        itemName: cart.length === 1 ? cart[0].product.name : `${cart[0].product.name} + ${cart.length - 1} other items`,
        items: cart.map(c => ({
          product: c.product,
          productId: c.product.id,
          productName: c.product.name,
          quantity: c.quantity,
          price: c.product.retailPrice || c.product.cost
        })),
        orderDate: new Date(),
        remarks: "POS Walk-in Transaction",
      };

      const result = await createOrder(orderData as any);

      setLastOrderDetails({
        ...orderData,
        orderId: result.id,
        date: new Date(),
        cashTendered: Number(cashTendered),
        change: cashTendered === "" ? 0 : Math.max(0, Number(cashTendered) - subtotal)
      });
      setTenderOpen(false);
      setReceiptOpen(true);

      // Reset cart but keep customer selection for speed
      setCart([]);
      toast({ title: "Transaction Successful!" });
    } catch (error: any) {
      toast({ title: "Transaction Failed", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-primary">
        <Loader2 className="h-12 w-12 animate-spin" />
        <p className="text-lg font-medium animate-pulse">Initializing Point of Sale...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-6 p-2 lg:p-4">
      {/* LEFT PANEL: PRODUCTS INVENTORY */}
      <div className="w-full lg:w-[65%] flex flex-col gap-4">
        {/* Header & Controls */}
        <div className="flex flex-col gap-4 bg-card p-4 rounded-2xl shadow-sm border border-border/50">
          <div className="flex flex-col xl:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by Product Name or SKU..."
                className="pl-10 h-11 bg-background border-border/50 text-base rounded-xl w-full"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            
            <div className="w-full xl:w-64 flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="w-full bg-background border-border shadow-sm h-11 rounded-xl">
                  <SelectValue placeholder="Select Customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>
          
          <ScrollArea className="w-full pb-2 md:pb-0">
            <div className="flex gap-2">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? "default" : "outline"}
                  onClick={() => setCategoryFilter(cat)}
                  className="rounded-full px-5 h-9 whitespace-nowrap"
                >
                  {cat}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Product Grid */}
        <div className="flex-1 bg-card/40 border border-border/50 rounded-2xl p-4 overflow-hidden shadow-inner relative">
          <ScrollArea className="h-full">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20 opacity-60">
                <Coffee className="h-24 w-24 mb-4" />
                <p className="text-xl">No products match your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                {filteredProducts.map(product => {
                  const price = product.retailPrice || product.cost || 0;
                  return (
                    <Card
                      key={product.id}
                      className="group overflow-hidden cursor-pointer hover:border-primary/50 transition-all hover:shadow-md h-full flex flex-col bg-card"
                      onClick={() => addToCart(product)}
                    >
                      <div className="h-32 bg-muted/30 flex items-center justify-center border-b overflow-hidden p-2 relative">
                        {product.images && product.images.length > 0 ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal group-hover:scale-105 transition-transform" />
                        ) : (
                          <Package className="h-12 w-12 text-muted-foreground/30" />
                        )}
                        <div className="absolute top-2 right-2 flex gap-1 flex-col">
                          {product.quantity <= (product.alertStock || 5) && (
                            <Badge variant="destructive" className="text-[10px] uppercase font-bold shadow-sm">Low Stock</Badge>
                          )}
                        </div>
                      </div>
                      <CardContent className="p-3 flex flex-col justify-between flex-1">
                        <div>
                          <p className="text-xs text-muted-foreground truncate mb-1">SKU: {product.sku}</p>
                          <h3 className="font-semibold text-sm leading-tight line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">{product.name}</h3>
                        </div>
                        <div className="mt-3 flex justify-between items-end">
                          <span className="font-bold text-base text-primary">₱{price.toLocaleString()}</span>
                          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">{product.quantity} left</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* RIGHT PANEL: CART & CHECKOUT */}
      <div className="w-full lg:w-[35%] flex flex-col gap-4">
        {/* Cart Display */}
        <Card className="flex-1 shadow-md border-border/70 rounded-2xl overflow-hidden flex flex-col bg-card">
          <div className="p-4 border-b bg-muted/40 shrink-0 flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2 text-lg">
              <ShoppingCart className="w-5 h-5 text-primary" /> Current Order
            </h2>
            <Badge variant="secondary" className="px-3 py-1 font-semibold text-sm rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
            </Badge>
          </div>

          <ScrollArea className="flex-1 p-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3 opacity-60">
                <div className="bg-muted p-4 rounded-full"><ShoppingCart className="h-8 w-8" /></div>
                <p>Register items to start</p>
              </div>
            ) : (
              <div className="space-y-2 p-2">
                {cart.map((item) => {
                  const price = item.product.retailPrice || item.product.cost || 0;
                  return (
                    <div key={item.product.id} className="flex gap-3 bg-background border border-border/50 p-3 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex flex-col justify-between flex-1 overflow-hidden">
                        <span className="font-semibold text-sm truncate">{item.product.name}</span>
                        <span className="text-primary font-bold">₱{price.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-background shadow-sm" onClick={() => updateQuantity(String(item.product.id), -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-background shadow-sm" onClick={() => updateQuantity(String(item.product.id), 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeFromCart(String(item.product.id))} className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-lg self-center shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Checkout Area */}
          <div className="p-4 border-t bg-muted/10 shrink-0 space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-muted-foreground font-semibold uppercase text-sm tracking-widest">Total Due</span>
              <span className="text-4xl font-black tracking-tight text-primary">₱{subtotal.toLocaleString()}</span>
            </div>

            <Button
              size="lg"
              className="w-full h-14 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
              onClick={openTenderDialog}
              disabled={cart.length === 0 || processing}
            >
              <ReceiptText className="mr-2" /> Tender
            </Button>
          </div>
        </Card>
      </div>

      {/* TENDER DIALOG */}
      <Dialog open={tenderOpen} onOpenChange={setTenderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Tender Details</DialogTitle>
             <DialogDescription className="text-center">Enter the cash tendered by the customer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border">
               <span className="text-muted-foreground font-medium text-sm">Total Due</span>
               <span className="text-2xl font-black text-primary">₱{subtotal.toLocaleString()}</span>
            </div>

            <div className="flex gap-4">
              <div className="w-1/2 space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-11 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Gcash">Gcash</SelectItem>
                    <SelectItem value="Transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-1/2 space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger className="h-11 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {paymentMethod === "Cash" && (
              <>
                <div className="space-y-2 mt-2">
                   <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount Tendered</Label>
                   <Input 
                     type="number" 
                     value={cashTendered}
                     onChange={(e) => setCashTendered(e.target.value)}
                     className="h-14 text-2xl font-bold bg-background text-right"
                     placeholder="₱0.00"
                   />
                   <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 mt-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setCashTendered(subtotal.toString())}>Exact Amt</Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setCashTendered((Math.ceil(subtotal / 100) * 100).toString())}>Next 100</Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setCashTendered((Math.ceil(subtotal / 500) * 500).toString())}>Next 500</Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setCashTendered((Math.ceil(subtotal / 1000) * 1000).toString())}>Next 1000</Button>
                   </div>
                </div>

                <div className="flex justify-between items-center bg-muted/50 p-4 rounded-xl border border-border/70 mt-4">
                   <span className="text-muted-foreground font-bold uppercase text-sm">Change</span>
                   <span className={`text-3xl font-black tracking-tight ${Number(cashTendered) < subtotal && cashTendered !== "" ? 'text-destructive' : 'text-green-600'}`}>
                      ₱{cashTendered === "" ? "0" : Math.max(0, Number(cashTendered) - subtotal).toLocaleString()}
                   </span>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="mt-4">
             <Button 
               className="w-full h-12 text-lg font-bold" 
               onClick={processTransaction}
               disabled={processing || (Number(cashTendered) < subtotal && paymentMethod === "Cash")}
             >
                {processing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</> : <><Check className="mr-2" /> Complete Transaction</>}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SUCCESS DIALOG / RECEIPT */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-center flex flex-col items-center gap-2">
              <div className="h-14 w-14 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center">
                <Check className="h-7 w-7 stroke-[3]" />
              </div>
              Transaction Completed!
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              Order #{lastOrderDetails?.orderId} registered successfully.
            </DialogDescription>
          </DialogHeader>

          {/* Receipt Preview — Philippine Grocery Style */}
          <div className="mx-4 mb-2">
            <ScrollArea className="max-h-[55vh]">
              <div ref={receiptRef} className="bg-white text-black font-mono text-[11px] leading-relaxed p-5 border border-dashed border-gray-300 rounded-lg">
                {/* ===== HEADER: Logo + Store Info ===== */}
                <div className="text-center mb-3">
                  <img src={companyProfile?.logoUrl || "/images/logo.png"} alt={`${companyProfile?.companyName || 'FlowCart Sync'} Logo`} className="h-14 w-14 mx-auto mb-1 rounded-full object-cover" />
                  <p className="font-black text-sm tracking-wide">{(companyProfile?.companyName || 'FlowCart Sync Store').toUpperCase()}</p>
                  {companyProfile?.address ? (
                    <p className="text-[9px] text-gray-500">{companyProfile.address}</p>
                  ) : (
                    <>
                      <p className="text-[9px] text-gray-500">Order Management System</p>
                      <p className="text-[9px] text-gray-500">Manila, Philippines</p>
                    </>
                  )}
                  {companyProfile?.phone && (
                    <p className="text-[9px] text-gray-500">{companyProfile.phone}</p>
                  )}
                </div>

                <div className="border-t border-dashed border-gray-400 my-2" />

                {/* ===== DOCUMENT INFO ===== */}
                <div className="text-center mb-1">
                  <p className="font-bold text-xs">SALES INVOICE</p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] mb-2">
                  <p>Date: <span className="font-semibold">{lastOrderDetails?.date && format(lastOrderDetails.date, 'MM/dd/yyyy')}</span></p>
                  <p className="text-right">Time: <span className="font-semibold">{lastOrderDetails?.date && format(lastOrderDetails.date, 'hh:mm:ss a')}</span></p>
                  <p>SO No.: <span className="font-semibold">SO-{lastOrderDetails?.orderId}</span></p>
                  <p className="text-right">OR No.: <span className="font-semibold">OR-{lastOrderDetails?.orderId}</span></p>
                  <p>Invoice No.: <span className="font-semibold">INV-{lastOrderDetails?.orderId}</span></p>
                  <p className="text-right">Terminal: <span className="font-semibold">POS-01</span></p>
                </div>

                <div className="border-t border-dashed border-gray-400 my-2" />

                {/* ===== CUSTOMER & CASHIER ===== */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] mb-2">
                  <p>Customer: <span className="font-semibold">{lastOrderDetails?.customerName || 'Walk-in'}</span></p>
                  <p className="text-right">Cashier: <span className="font-semibold">{cashierName}</span></p>
                  <p>Payment: <span className="font-semibold">{lastOrderDetails?.paymentMethod}</span></p>
                  <p className="text-right">Status: <span className="font-semibold">{lastOrderDetails?.paymentStatus}</span></p>
                </div>

                <div className="border-t border-dashed border-gray-400 my-2" />

                {/* ===== ITEMS TABLE ===== */}
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-gray-400">
                      <th className="text-left py-1 font-bold">ITEM DESCRIPTION</th>
                      <th className="text-center py-1 font-bold w-10">QTY</th>
                      <th className="text-right py-1 font-bold w-16">PRICE</th>
                      <th className="text-right py-1 font-bold w-20">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastOrderDetails?.items?.map((item: any, i: number) => {
                      const unitPrice = item.price || 0;
                      const lineTotal = unitPrice * item.quantity;
                      return (
                        <tr key={i} className="border-b border-dotted border-gray-200">
                          <td className="py-1 pr-1 max-w-[140px] truncate">{item.productName}</td>
                          <td className="py-1 text-center">{item.quantity}</td>
                          <td className="py-1 text-right">{unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-1 text-right font-semibold">{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="border-t border-dashed border-gray-400 my-2" />

                {/* ===== TOTALS ===== */}
                <div className="text-[10px] space-y-0.5 mb-1">
                  <div className="flex justify-between">
                    <span>No. of Items:</span>
                    <span className="font-semibold">{lastOrderDetails?.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0}</span>
                  </div>
                </div>
                <div className="flex justify-between font-black text-sm border-t border-double border-gray-500 pt-1 mt-1">
                  <span>TOTAL AMOUNT</span>
                  <span>₱{lastOrderDetails?.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>

                {/* ===== TENDER INFO ===== */}
                {lastOrderDetails?.paymentMethod === 'Cash' && (
                  <div className="text-[10px] mt-1 space-y-0.5">
                    <div className="flex justify-between">
                      <span>AMOUNT TENDERED (Cash):</span>
                      <span className="font-semibold">₱{lastOrderDetails?.cashTendered?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>CHANGE:</span>
                      <span>₱{lastOrderDetails?.change?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}

                <div className="border-t border-dashed border-gray-400 my-3" />

                {/* ===== FOOTER / RETURN POLICY ===== */}
                <div className="text-center text-[9px] text-gray-500 space-y-1">
                  <p className="font-semibold text-gray-700">Thank you for your purchase!</p>
                  <p>Keep this invoice for item return/exchange.</p>
                  <p>Return/Exchange acceptable within <span className="font-bold text-gray-700">7 days</span> from purchase date.</p>
                  <p className="mt-2">--- {companyProfile?.companyName || 'FlowCart Sync'} POS System ---</p>
                  <p>© {new Date().getFullYear()} {companyProfile?.companyName || 'FlowCart Sync'}</p>
                </div>
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="px-4 pb-4 pt-2 gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setReceiptOpen(false)} className="w-full sm:w-auto">Close</Button>
            <Button onClick={async () => {
              if (!receiptRef.current) return;
              try {
                toast({ title: "Generating PDF...", description: "Preparing receipt..." });
                // @ts-ignore
                const html2pdf = (await import('html2pdf.js')).default;
                const opt = {
                  margin: [5, 2, 5, 2] as [number, number, number, number],
                  filename: `receipt-${lastOrderDetails?.orderId || 'pos'}.pdf`,
                  image: { type: 'jpeg' as const, quality: 0.98 },
                  html2canvas: { scale: 2, useCORS: true, logging: false },
                  jsPDF: { unit: 'mm', format: [80, 200] as [number, number], orientation: 'portrait' as const },
                };
                const blobUrl = await html2pdf().set(opt).from(receiptRef.current).output('bloburl');
                window.open(blobUrl, '_blank');
              } catch (err) {
                console.error('PDF generation error:', err);
                window.print();
              }
            }} className="w-full sm:w-auto bg-primary">
              <Printer className="mr-2 h-4 w-4" /> Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
