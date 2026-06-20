"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Customer, Order, PaymentStatus, ShippingStatus, PaymentMethod, OrderRemark, Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronsUpDown, Check, Copy, Package, Trash2, Plus, PhilippinePeso, User, MapPin, Phone, CreditCard, Truck, FileText, Printer, CheckCircle2, ShoppingCart, Zap, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectProductDialog } from "./select-product-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon } from "lucide-react";
import { createOrder } from "../actions";
import { createCustomer } from "../../customers/actions";
import { Station } from "../../stations/actions";
import { format } from "date-fns";

interface CreateOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  products: Product[];
  stations: Station[];
  onSuccess?: () => Promise<void>;
}

const paymentStatuses: PaymentStatus[] = ["Hold", "Paid", "Unpaid", "PAID PENDING"];
const shippingStatuses: ShippingStatus[] = ["Pending", "Ready", "Shipped", "Delivered", "Cancelled", "Claimed"];
const paymentMethods: PaymentMethod[] = ["COD", "GCash", "Bank Transfer"];
const remarksOptions: OrderRemark[] = ["PLUS Branch 1", "PLUS Branch 2", "PLUS Warehouse"];

export function CreateOrderDialog({
  isOpen,
  onClose,
  customers,
  products,
  stations,
  onSuccess,
}: CreateOrderDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState("Walk In Customer");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");

  const [selectedItems, setSelectedItems] = useState<{ product: Product; quantity: number | string }[]>([]);

  const [shippingFee, setShippingFee] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("Unpaid");
  const [shippingStatus, setShippingStatus] = useState<ShippingStatus>("Pending");
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [remarks, setRemarks] = useState<OrderRemark>('');
  const [rushShip, setRushShip] = useState(false);
  const [isPickup, setIsPickup] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  // Optional proof of payment uploader (stored inside `order.items` JSON to avoid DB migration)
  const paymentProofInputRef = useRef<HTMLInputElement>(null);
  const [isReadingPaymentProof, setIsReadingPaymentProof] = useState(false);
  const [paymentProofPreviewUrl, setPaymentProofPreviewUrl] = useState<string | null>(null);
  const [paymentProof, setPaymentProof] = useState<{
    fileName: string;
    mimeType: string;
    dataUrl: string;
  } | null>(null);

  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);
  const [isProductSelectOpen, setProductSelectOpen] = useState(false);

  useEffect(() => {
    const itemsTotal = selectedItems.reduce((sum, item) => sum + (item.product.retailPrice * (typeof item.quantity === 'string' ? 0 : item.quantity)), 0);
    const sf = parseFloat(shippingFee) || 0;
    setTotalAmount(itemsTotal + sf);
  }, [selectedItems, shippingFee]);

  useEffect(() => {
    if (customerName === "Walk In Customer") {
      setPaymentStatus("Paid");
      setShippingStatus("Delivered");
    }
  }, [customerName]);

  const resetForm = () => {
    if (paymentProofPreviewUrl) URL.revokeObjectURL(paymentProofPreviewUrl);
    setPaymentProofPreviewUrl(null);
    setPaymentProof(null);
    setIsReadingPaymentProof(false);
    if (paymentProofInputRef.current) paymentProofInputRef.current.value = "";
    setCustomerName("Walk In Customer");
    setContactNumber("");
    setAddress("");
    setSelectedItems([]);
    setShippingFee("");
    setPaymentMethod("COD");
    setPaymentStatus("Unpaid");
    setShippingStatus("Pending");
    setTotalAmount(0);
    setCourierName("");
    setTrackingNumber("");
    setRemarks('');
    setRushShip(false);
    setIsPickup(false);
    setSelectedStationId(null);
    setLastCreatedOrder(null);
    setIsSubmitting(false);
  };

  const handlePaymentProofChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      if (paymentProofPreviewUrl) URL.revokeObjectURL(paymentProofPreviewUrl);
      setPaymentProofPreviewUrl(null);
      setPaymentProof(null);
      return;
    }

    // Revoke previous preview (if any)
    if (paymentProofPreviewUrl) URL.revokeObjectURL(paymentProofPreviewUrl);

    const previewUrl = URL.createObjectURL(file);
    setPaymentProofPreviewUrl(previewUrl);
    setIsReadingPaymentProof(true);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) {
        toast({
          variant: "destructive",
          title: "Upload Error",
          description: "Failed to read the selected file.",
        });
        setPaymentProof(null);
        setIsReadingPaymentProof(false);
        return;
      }

      setPaymentProof({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        dataUrl,
      });
      setIsReadingPaymentProof(false);
    };
    reader.onerror = () => {
      toast({
        variant: "destructive",
        title: "Upload Error",
        description: "Failed to read the selected file.",
      });
      setPaymentProof(null);
      setIsReadingPaymentProof(false);
    };
    reader.readAsDataURL(file);
  };

  const copyInvoice = () => {
    if (!lastCreatedOrder) return;

    const itemsList = lastCreatedOrder.items?.map((item: any) =>
      `${item.product.name} (x${item.quantity}) - ₱${(item.product.retailPrice * item.quantity).toFixed(2)}`
    ).join('\n') || '';

    const invoiceText = `
ORDER CONFIRMATION
Order ID: ${String(lastCreatedOrder.id).substring(0, 7)}
Date: ${format(new Date(lastCreatedOrder.createdAt || new Date()), 'MMM d, yyyy h:mm a')}

CUSTOMER DETAILS
Name: ${lastCreatedOrder.customerName}
Contact: ${lastCreatedOrder.contactNumber || 'N/A'}
Address: ${lastCreatedOrder.address || 'N/A'}

ITEMS
${itemsList}

PAYMENT & DELIVERY
Payment Method: ${lastCreatedOrder.paymentMethod}
Payment Status: ${lastCreatedOrder.paymentStatus}
Shipping Status: ${lastCreatedOrder.shippingStatus}
Courier: ${lastCreatedOrder.courierName || 'N/A'}
Tracking No: ${lastCreatedOrder.trackingNumber || 'N/A'}

SUMMARY
Subtotal: ₱${(lastCreatedOrder.totalAmount - lastCreatedOrder.shippingFee).toFixed(2)}
Shipping Fee: ₱${lastCreatedOrder.shippingFee.toFixed(2)}
Total Amount: ₱${lastCreatedOrder.totalAmount.toFixed(2)}
    `.trim();

    navigator.clipboard.writeText(invoiceText).then(() => {
      toast({
        title: "Copied to Clipboard",
        description: "Invoice details have been copied securely.",
      });
    });
  };

  const handlePrintReceipt = async () => {
    if (!lastCreatedOrder) return;

    const element = document.getElementById('receipt-content');
    if (!element) return;

    const opt = {
      margin: 10,
      filename: `receipt-${String(lastCreatedOrder.id).substring(0, 7)}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    try {
      toast({
        title: "Generating PDF...",
        description: "Please wait while we prepare your receipt.",
      });
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      const pdfBlobUrl = await html2pdf().set(opt).from(element).output('bloburl');
      window.open(pdfBlobUrl, '_blank');
    } catch (error) {
      console.error("PDF generation failed", error);
      toast({
        variant: "destructive",
        title: "PDF Error",
        description: "Failed to generate receipt PDF.",
      });
    }
  };

  const handleSave = async () => {
    if (!customerName || selectedItems.length === 0 || !paymentProof) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select a customer, at least one item, and upload a proof of payment.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const existingCustomer = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase());
      let finalCustomerId = existingCustomer?.id;
      let finalCustomerEmail = existingCustomer?.email || `${customerName.split(' ').join('.').toLowerCase()}@example.com`;

      if (!existingCustomer) {
        toast({
          title: "Creating New Customer",
          description: `Adding ${customerName} to the database...`,
        });

        const newCustomer = await createCustomer({
          name: customerName,
          email: finalCustomerEmail,
          phone: contactNumber,
          avatar: "",
          address: {
            street: address.split(',')[0] || "",
            city: address.split(',')[1]?.trim() || "",
            state: address.split(',')[2]?.trim() || "",
            zip: "",
          },
          orderHistory: [],
          totalSpent: 0,
        });
        finalCustomerId = newCustomer.id;
      }

      const combinedItemName = selectedItems.map(item => `${item.product.name} (x${item.quantity})`).join(', ');

      const itemsForOrder = selectedItems.map(item => ({
        product: item.product,
        quantity: typeof item.quantity === 'string' ? 0 : item.quantity
      }));

      const orderData: Omit<Order, 'id' | 'createdAt'> = {
        customerId: finalCustomerId!,
        customerName: customerName,
        customerEmail: finalCustomerEmail,
        contactNumber: contactNumber || (existingCustomer ? (existingCustomer.phone || '') : ''),
        address: address || (existingCustomer ? `${existingCustomer.address.street}, ${existingCustomer.address.city}`.trim() : ''),
        orderDate: new Date().toISOString().split('T')[0],
        itemName: combinedItemName,
        quantity: selectedItems.reduce((sum, item) => sum + (typeof item.quantity === 'string' ? 0 : item.quantity), 0),
        price: selectedItems[0]?.product.retailPrice || 0,
        shippingFee: parseFloat(shippingFee) || 0,
        totalAmount: totalAmount || 0,
        paymentMethod,
        paymentStatus,
        shippingStatus,
        courierName,
        trackingNumber,
        remarks,
        rushShip,
        createdBy: { uid: 'user-id', name: 'Current User' },
        items: itemsForOrder,
        paymentProofFileName: paymentProof?.fileName ?? null,
        paymentProofMimeType: paymentProof?.mimeType ?? null,
        paymentProofDataUrl: paymentProof?.dataUrl ?? null,
      };

      const result = await createOrder(orderData);
      setLastCreatedOrder(result);
      toast({
        title: "Order Created",
        description: `A new order has been successfully created.`,
      });
      if (onSuccess) await onSuccess();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error Creating Order",
        description: error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  }

  const handleCustomerSelect = (customer: Customer) => {
    setCustomerName(customer.name);
    setContactNumber(customer.phone || "");
    setAddress([customer.address.street, customer.address.city, customer.address.state].filter(Boolean).join(', '));
    setComboboxOpen(false);
  }

  const handleProductSelect = (newSelectedItems: { product: Product; quantity: number | string }[]) => {
    setSelectedItems(prev => {
      const updated = [...prev];
      newSelectedItems.forEach(newItem => {
        const existingIndex = updated.findIndex(item => item.product.id === newItem.product.id);
        if (existingIndex > -1) {
          const currentQty = typeof updated[existingIndex].quantity === 'string' ? 0 : updated[existingIndex].quantity;
          const newQty = typeof newItem.quantity === 'string' ? 0 : newItem.quantity;
          updated[existingIndex].quantity = currentQty + newQty;
        } else {
          updated.push(newItem);
        }
      });
      return updated;
    });

    setProductSelectOpen(false);
  };

  const removeItem = (productId: string) => {
    setSelectedItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateItemQuantity = (productId: string, quantity: string) => {
    setSelectedItems(prev => prev.map(item =>
      item.product.id === productId ? { ...item, quantity: quantity === "" ? "" : Math.max(0, parseInt(quantity) || 0) } : item
    ));
  };

  const subtotal = selectedItems.reduce((sum, item) => sum + (item.product.retailPrice * (typeof item.quantity === 'string' ? 0 : item.quantity)), 0);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent
          className="sm:max-w-4xl max-h-[95vh] flex flex-col p-0 overflow-hidden bg-gradient-to-br from-zinc-50 to-amber-50/30"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {/* Header with gradient */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-zinc-800 to-amber-600 opacity-90" />
            <div className="relative p-6 pb-8">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    {lastCreatedOrder ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : (
                      <ShoppingCart className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <DialogTitle className="text-2xl font-bold text-white">
                    {lastCreatedOrder ? 'Order Created Successfully' : 'Create New Order'}
                  </DialogTitle>
                </div>
                {!lastCreatedOrder && (
                  <DialogDescription className="text-amber-100 text-base">
                    Fill in the details below to create a new order for your customer.
                  </DialogDescription>
                )}
              </DialogHeader>
            </div>
          </div>

          {lastCreatedOrder ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-8 py-12 px-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500 rounded-full blur-2xl opacity-20 animate-pulse" />
                <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-full shadow-2xl">
                  <CheckCircle2 className="h-16 w-16 text-white" />
                </div>
              </div>

              <div className="text-center space-y-3 max-w-md">
                <h3 className="text-2xl font-bold text-slate-900">
                  Order Confirmed!
                </h3>
                <p className="text-lg text-slate-600">
                  Order for <span className="font-semibold text-amber-600">{lastCreatedOrder.customerName}</span> has been created successfully.
                </p>
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mt-4">
                  <p className="text-sm text-slate-600 mb-1">Order ID</p>
                  <p className="text-xl font-bold text-amber-600">{String(lastCreatedOrder.id).substring(0, 8).toUpperCase()}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                <Button
                  onClick={handlePrintReceipt}
                  size="lg"
                  className="flex-1 bg-gradient-to-r from-amber-600 to-zinc-800 hover:from-amber-700 hover:to-zinc-900 text-white shadow-lg h-12"
                >
                  <Printer className="mr-2 h-5 w-5" />
                  Print Receipt
                </Button>
                <Button
                  onClick={copyInvoice}
                  variant="outline"
                  size="lg"
                  className="flex-1 border-2 hover:bg-slate-100 h-12"
                >
                  <Copy className="mr-2 h-5 w-5" />
                  Copy Invoice
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-6 max-w-3xl mx-auto">
                {/* Customer Information Card */}
                <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200">
                  <div className="bg-gradient-to-r from-amber-50 to-zinc-100 px-6 py-4 border-b-2 border-amber-200 rounded-t-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-amber-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">Customer Information</h3>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customerName" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <User className="w-4 h-4 text-amber-500" />
                          Customer Name
                        </Label>
                        <div className="relative">
                          <Input
                            id="customerName"
                            value={customerName}
                            onChange={(e) => {
                              setCustomerName(e.target.value);
                              setComboboxOpen(true);
                            }}
                            onFocus={() => setComboboxOpen(true)}
                            placeholder="Type customer name..."
                            className="h-11 border-2 focus:border-amber-400 pr-10"
                            autoComplete="off"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <Search className="w-4 h-4" />
                          </div>

                          {comboboxOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-[100]"
                                onClick={() => setComboboxOpen(false)}
                              />
                              <div className="absolute top-full left-0 w-full mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-xl z-[101] max-h-[250px] overflow-y-auto">
                                <div className="p-1">
                                  <div
                                    className={cn(
                                      "flex items-center px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors",
                                      customerName.toLowerCase() === "walk in customer" ? "bg-amber-50 text-amber-700 font-semibold" : "hover:bg-slate-100 text-slate-900 dark:text-slate-900"
                                    )}
                                    onClick={() => {
                                      setCustomerName("Walk In Customer");
                                      setContactNumber("");
                                      setAddress("");
                                      setPaymentStatus("Paid");
                                      setShippingStatus("Delivered");
                                      setShippingFee("0");
                                      setRushShip(false);
                                      setIsPickup(false);
                                      setCourierName("");
                                      setTrackingNumber("");
                                      setComboboxOpen(false);
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", customerName.toLowerCase() === "walk in customer" ? "opacity-100" : "opacity-0")} />
                                    Walk In Customer
                                  </div>

                                  {customers
                                    .filter(c =>
                                      c.isActive !== false &&
                                      c.name.toLowerCase() !== "walk in customer" &&
                                      c.name.toLowerCase().includes(customerName.toLowerCase())
                                    )
                                    .slice(0, 10)
                                    .map((customer) => (
                                      <div
                                        key={customer.id}
                                        className={cn(
                                          "flex items-center px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors",
                                          customerName.toLowerCase() === customer.name.toLowerCase() ? "bg-amber-50 text-amber-700 font-semibold" : "hover:bg-slate-100 text-slate-900 dark:text-slate-900"
                                        )}
                                        onClick={() => {
                                          handleCustomerSelect(customer);
                                          setComboboxOpen(false);
                                        }}
                                      >
                                        <Check className={cn("mr-2 h-4 w-4", customerName.toLowerCase() === customer.name.toLowerCase() ? "opacity-100" : "opacity-0")} />
                                        <div className="flex flex-col">
                                          <span>{customer.name}</span>
                                          <span className="text-[10px] text-slate-500 font-normal">{customer.phone || customer.email}</span>
                                        </div>
                                      </div>
                                    ))}

                                  {customers.filter(c =>
                                    c.name.toLowerCase() !== "walk in customer" &&
                                    c.name.toLowerCase().includes(customerName.toLowerCase())
                                  ).length === 0 && customerName !== "" && (
                                      <div className="px-3 py-4 text-center">
                                        <p className="text-sm text-slate-500">Creating new customer: <span className="font-semibold text-amber-600">"{customerName}"</span></p>
                                      </div>
                                    )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactNumber" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-green-500" />
                          Contact Number
                        </Label>
                        <Input
                          id="contactNumber"
                          value={contactNumber}
                          onChange={(e) => setContactNumber(e.target.value)}
                          placeholder="09XX-XXX-XXXX"
                          disabled={customerName === "Walk In Customer"}
                          className="h-11 border-2 focus:border-green-400"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-red-500" />
                        Address
                      </Label>
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Street, City, State"
                        disabled={customerName === "Walk In Customer"}
                        className="h-11 border-2 focus:border-red-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Item Purchases Card */}
                <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200">
                  <div className="bg-gradient-to-r from-zinc-100 to-zinc-200 px-6 py-4 border-b-2 border-zinc-300 flex items-center justify-between rounded-t-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-zinc-200 flex items-center justify-center">
                        <Package className="w-4 h-4 text-zinc-700" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">Item Purchases</h3>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProductSelectOpen(true)}
                      className="border-2 hover:border-zinc-400 hover:bg-zinc-100"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                  </div>

                  <div className="p-6">
                    {selectedItems.length === 0 ? (
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center bg-slate-50/50">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                          <Package className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="text-base font-medium text-slate-700 mb-1">No items added yet</p>
                        <p className="text-sm text-muted-foreground mb-4">Start adding products to this order</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProductSelectOpen(true)}
                          className="border-2 hover:border-zinc-400"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Choose Products
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedItems.map((item) => (
                          <div
                            key={item.product.id}
                            className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-zinc-100/30 border-2 border-slate-200 rounded-xl hover:border-zinc-300 transition-all group"
                          >
                            <Avatar className="h-14 w-14 rounded-xl border-2 border-white shadow-sm">
                              <AvatarImage src={item.product.images?.[0] as string} alt={item.product.name} />
                              <AvatarFallback className="rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200">
                                <ImageIcon className="h-6 w-6 text-zinc-700" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base truncate text-slate-900">{item.product.name}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-muted-foreground">SKU: {item.product.sku}</span>
                                <Badge variant="secondary" className="text-xs font-semibold bg-zinc-200 text-zinc-700">
                                  ₱{item.product.retailPrice.toFixed(2)}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Input
                                type="number"
                                min="0"
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(String(item.product.id), e.target.value)}
                                onFocus={(e) => e.target.select()}
                                className="w-20 h-10 text-center font-semibold border-2"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeItem(String(item.product.id))}
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </div>
                          </div>
                        ))}

                        {/* Order Summary */}
                        <div className="bg-gradient-to-r from-amber-50 to-zinc-100 border-2 border-amber-200 rounded-xl p-4 mt-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Subtotal ({selectedItems.reduce((sum, item) => sum + (typeof item.quantity === 'string' ? 0 : item.quantity), 0)} items)</span>
                              <span className="font-semibold text-slate-900">₱{subtotal.toFixed(2)}</span>
                            </div>
                            {customerName !== "Walk In Customer" && (
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Shipping Fee</span>
                                <span className="font-semibold text-slate-900">₱{parseFloat(shippingFee || "0").toFixed(2)}</span>
                              </div>
                            )}
                            <div className="border-t-2 border-amber-300 pt-2 mt-2">
                              <div className="flex justify-between">
                                <span className="text-base font-semibold text-slate-900">Total Amount</span>
                                <span className="text-2xl font-bold text-amber-600">₱{totalAmount.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery & Payment Card */}
                <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b-2 border-green-200 rounded-t-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                        <Truck className="w-4 h-4 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">Delivery & Payment</h3>
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    {customerName !== "Walk In Customer" && (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="shippingFee" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <PhilippinePeso className="w-4 h-4 text-green-500" />
                            Shipping Fee
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                              ₱
                            </span>
                            <Input
                              id="shippingFee"
                              type="number"
                              value={shippingFee}
                              onChange={(e) => setShippingFee(e.target.value)}
                              placeholder="0.00"
                              className="pl-8 h-11 border-2 focus:border-green-400"
                              disabled={isPickup}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-orange-500" />
                            Rush Shipping
                          </Label>
                          <Select
                            value={rushShip ? "yes" : "no"}
                            onValueChange={(value: string) => setRushShip(value === "yes")}
                            disabled={customerName === "Walk In Customer"}
                          >
                            <SelectTrigger className="h-11 border-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="no">Standard Shipping</SelectItem>
                              <SelectItem value="yes">Rush Shipping</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      {customerName !== "Walk In Customer" && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-zinc-500" />
                            Pickup Station
                          </Label>
                          <Select
                            value={isPickup && selectedStationId ? selectedStationId : "delivery"}
                            onValueChange={(value: string) => {
                              if (value === "delivery") {
                                setIsPickup(false);
                                setSelectedStationId(null);
                                setCourierName("");
                              } else {
                                setIsPickup(true);
                                setShippingFee("0");
                                setSelectedStationId(value);
                              }
                            }}
                          >
                            <SelectTrigger className="h-11 border-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="delivery">Standard Delivery</SelectItem>
                              {stations.length > 0 && stations.map((station) => (
                                <SelectItem key={station.id} value={String(station.id)}>
                                  Pickup at {station.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {customerName !== "Walk In Customer" && (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="courierName" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <Truck className="w-4 h-4 text-amber-500" />
                            Courier Name
                          </Label>
                          <Input
                            id="courierName"
                            value={courierName}
                            onChange={(e) => setCourierName(e.target.value)}
                            placeholder="Lalamove, J&T, etc."
                            className="h-11 border-2 focus:border-amber-400"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="trackingNumber" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-amber-500" />
                            Tracking Number
                          </Label>
                          <Input
                            id="trackingNumber"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            placeholder="TRACKING-123"
                            className="h-11 border-2 focus:border-amber-400"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500" />
                        Remarks
                      </Label>
                      <Select onValueChange={(value: OrderRemark) => setRemarks(value)} value={remarks}>
                        <SelectTrigger className="h-11 border-2">
                          <SelectValue placeholder="Select a remark (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {remarksOptions.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-amber-500" />
                          Payment Method
                        </Label>
                        <Select
                          onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}
                          value={paymentMethod}
                          disabled={customerName === "Walk In Customer"}
                        >
                          <SelectTrigger className="h-11 border-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethods.map((method) => (
                              <SelectItem key={method} value={method}>
                                {method}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Payment Status</Label>
                        <Select
                          onValueChange={(value: PaymentStatus) => setPaymentStatus(value)}
                          value={paymentStatus}
                          disabled={customerName === "Walk In Customer"}
                        >
                          <SelectTrigger className="h-11 border-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentStatuses.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {customerName !== "Walk In Customer" && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-slate-700">Shipping Status</Label>
                          <Select
                            onValueChange={(value: ShippingStatus) => setShippingStatus(value)}
                            value={shippingStatus}
                          >
                            <SelectTrigger className="h-11 border-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {shippingStatuses.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500" />
                        Upload Proof of Payment <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        ref={paymentProofInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handlePaymentProofChange}
                        disabled={isSubmitting || isReadingPaymentProof}
                        className="h-11 border-2 focus:border-amber-400"
                      />

                      {paymentProofPreviewUrl && paymentProof && paymentProof.mimeType.startsWith("image/") && (
                        <img
                          src={paymentProofPreviewUrl}
                          alt="Payment proof preview"
                          className="max-h-40 w-auto rounded-md border border-slate-200"
                        />
                      )}

                      {paymentProof && !paymentProof.mimeType.startsWith("image/") && (
                        <div className="text-sm text-slate-600">
                          Selected:{" "}
                          <span className="font-medium break-all">{paymentProof.fileName}</span>
                          {paymentProof.mimeType.includes("pdf") && (
                            <a
                              href={paymentProofPreviewUrl || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-2 text-amber-600 hover:underline"
                            >
                              View
                            </a>
                          )}
                        </div>
                      )}

                      {isReadingPaymentProof && (
                        <p className="text-xs text-muted-foreground">Reading file...</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="p-6 border-t-2 bg-slate-50/50 mt-auto">
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 h-11 border-2 hover:bg-slate-100"
                disabled={isSubmitting}
              >
                {lastCreatedOrder ? 'Close' : 'Cancel'}
              </Button>
              {!lastCreatedOrder && (
                <Button
                  onClick={handleSave}
                  className="flex-1 h-11 bg-gradient-to-r from-amber-600 to-zinc-800 hover:from-amber-700 hover:to-zinc-900 text-white shadow-lg font-semibold"
                  disabled={isSubmitting || isReadingPaymentProof || selectedItems.length === 0}
                >
                  {isSubmitting ? "Creating..." : "Create Order"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SelectProductDialog
        isOpen={isProductSelectOpen}
        onClose={() => setProductSelectOpen(false)}
        onProductSelect={handleProductSelect}
        products={products}
      />

      {/* Hidden Receipt Content for PDF Generation */}
      {lastCreatedOrder && (
        <div className="opacity-0 pointer-events-none absolute -z-10">
          <div id="receipt-content" className="bg-white p-[40px] w-[210mm] min-h-[297mm] text-slate-800 font-sans mx-auto flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-4xl font-bold text-slate-700 tracking-tight">Official Receipt</h1>
                <p className="text-slate-500 mt-1 font-medium italic">FlowCart Sync Analytics Engine</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end mb-1">
                  <div className="h-8 w-8 bg-slate-800 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-sm">TF</span>
                  </div>
                  <span className="text-xl font-bold text-slate-700">FlowCart Sync</span>
                </div>
                <p className="text-xs text-slate-400">Generated: {format(new Date(), "MMM dd, yyyy h:mm:ss a")}</p>
              </div>
            </div>

            {/* Customer Details */}
            <div className="bg-slate-50 p-6 mb-8 rounded-lg border border-slate-100 grid grid-cols-2 gap-8 text-sm">
              <div>
                <h3 className="text-slate-400 font-bold uppercase tracking-wider mb-2 text-[10px]">Billed To</h3>
                <p className="font-bold text-slate-700 text-base">{lastCreatedOrder.customerName}</p>
                <p className="text-slate-500 mt-1 flex items-center gap-1">
                  Contact: <span className="font-semibold text-slate-600">{lastCreatedOrder.contactNumber || 'N/A'}</span>
                </p>
                <p className="text-slate-500 mt-1 flex items-center gap-1">
                  Address: <span className="font-semibold text-slate-600">{lastCreatedOrder.address || 'N/A'}</span>
                </p>
              </div>
              <div className="text-right">
                <h3 className="text-slate-400 font-bold uppercase tracking-wider mb-2 text-[10px]">Transaction Context</h3>
                <p className="text-slate-700 font-medium">Receipt #{String(lastCreatedOrder.id).substring(0, 8).toUpperCase()}</p>
                <p className="text-slate-400 text-xs mt-1">Status: {lastCreatedOrder.paymentStatus} - {lastCreatedOrder.shippingStatus}</p>
              </div>
            </div>

            {/* Order Items Table */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-l-4 border-slate-800 pl-3">Order Items</h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="py-3 px-4 text-left font-semibold rounded-tl-lg">Description</th>
                    <th className="py-3 px-4 text-center font-semibold">Qty</th>
                    <th className="py-3 px-4 text-right font-semibold">Unit Price</th>
                    <th className="py-3 px-4 text-right font-semibold rounded-tr-lg">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lastCreatedOrder.items?.map((item: any, idx: number) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="py-3 px-4 font-bold text-slate-700 align-top">{item.product?.name || item.productName || 'Unknown Product'}</td>
                      <td className="py-3 px-4 text-slate-600 align-top text-center">{item.quantity}</td>
                      <td className="py-3 px-4 text-slate-600 align-top text-right">₱{(item.product?.retailPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800 align-top">₱{((item.product?.retailPrice || 0) * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Section */}
            <div className="flex justify-end mb-8">
              <div className="w-64">
                <div className="flex justify-between py-2 text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>₱{(lastCreatedOrder.totalAmount - lastCreatedOrder.shippingFee).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between py-2 text-sm text-slate-600">
                  <span>Shipping Fee</span>
                  <span>₱{lastCreatedOrder.shippingFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between py-3 border-t-2 border-slate-800 mt-2 font-bold text-lg text-slate-800">
                  <span>Total Amount</span>
                  <span>₱{lastCreatedOrder.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-10 border-t border-slate-100 text-[10px] text-slate-300 flex justify-between items-center break-inside-avoid">
              <p>© {new Date().getFullYear()} FlowCart Sync Official Receipt</p>
              <p className="flex items-center gap-2">
                <span className="h-1 w-1 bg-slate-200 rounded-full"></span>
                Thank you for your purchase!
                <span className="h-1 w-1 bg-slate-200 rounded-full"></span>
                Customer Copy
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}