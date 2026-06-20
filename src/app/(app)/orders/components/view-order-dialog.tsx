"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Order, PaymentStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Package, User, CreditCard, Truck, Calendar, MapPin, Phone, Mail } from "lucide-react";
import { updateOrderPaymentStatus } from "../actions";
import { useToast } from "@/hooks/use-toast";

interface ViewOrderDialogProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    onPaymentStatusUpdated?: (orderId: string | number, paymentStatus: PaymentStatus) => void | Promise<void>;
}

export function ViewOrderDialog({ isOpen, onClose, order, onPaymentStatusUpdated }: ViewOrderDialogProps) {
    const { toast } = useToast();
    const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);
    const [currentPaymentStatus, setCurrentPaymentStatus] = React.useState<PaymentStatus | null>(null);
    const [currentPaymentProof, setCurrentPaymentProof] = React.useState<{
        fileName: string;
        mimeType: string;
        dataUrl: string;
    } | null>(null);
    const [paymentStatusDraft, setPaymentStatusDraft] = React.useState<PaymentStatus | null>(null);
    const [hasLocalChange, setHasLocalChange] = React.useState(false);
    const hasLocalChangeRef = React.useRef(false);
    const [isUpdating, setIsUpdating] = React.useState(false);

    const handleConfirmPayment = async () => {
        if (!order) return;
        setIsUpdating(true);
        try {
            await updateOrderPaymentStatus(order.id, "Paid");
            setCurrentPaymentStatus("Paid");
            if (onPaymentStatusUpdated) {
                await onPaymentStatusUpdated(order.id, "Paid");
            }
            toast({
                title: "Payment Confirmed",
                description: "Order status updated to Paid.",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: error.message,
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCancelPaymentProof = async () => {
        if (!order) return;
        setIsUpdating(true);
        try {
            await updateOrderPaymentStatus(order.id, "PAID PENDING");
            setCurrentPaymentStatus("PAID PENDING");
            if (onPaymentStatusUpdated) {
                await onPaymentStatusUpdated(order.id, "PAID PENDING");
            }
            toast({
                title: "Payment Cancelled",
                description: "Order status returned to PAID PENDING.",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: error.message,
            });
        } finally {
            setIsUpdating(false);
        }
    };

    React.useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;

        fetch("/api/auth/me")
            .then(async (res) => {
                if (!res.ok) throw new Error("Failed to fetch current user");
                return res.json();
            })
            .then(({ user }) => {
                if (cancelled) return;
                const roleName = (user?.role?.name?.toLowerCase?.() || "") as string;
                setIsSuperAdmin(roleName === "super admin" || roleName === "superadmin");
            })
            .catch(() => {
                if (cancelled) return;
                setIsSuperAdmin(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    React.useEffect(() => {
        if (!isOpen || !order?.id) {
            setCurrentPaymentStatus(null);
            setCurrentPaymentProof(null);
            setPaymentStatusDraft(null);
            setHasLocalChange(false);
            return;
        }

        // Seed from the passed order (fast), then fetch latest from the server (authoritative)
        setCurrentPaymentStatus(order.paymentStatus);
        setPaymentStatusDraft(order.paymentStatus);
        setHasLocalChange(false);
        hasLocalChangeRef.current = false;
        setCurrentPaymentProof(
            order.paymentProofDataUrl
                ? {
                    fileName: order.paymentProofFileName || "payment-proof",
                    mimeType: order.paymentProofMimeType || "application/octet-stream",
                    dataUrl: order.paymentProofDataUrl,
                }
                : (() => {
                    const items = (order.items as any[] | undefined) || [];
                    for (const item of items) {
                        if (item?.paymentProof?.dataUrl) {
                            return item.paymentProof as { fileName: string; mimeType: string; dataUrl: string };
                        }
                    }
                    return null;
                })()
        );

        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/orders/${order.id}`);
                if (!res.ok) throw new Error("Failed to fetch order");
                const json = await res.json();
                if (cancelled) return;

                const latestPaymentStatus = json?.data?.paymentStatus as PaymentStatus | undefined;
                if (latestPaymentStatus && !hasLocalChangeRef.current) {
                    setCurrentPaymentStatus(latestPaymentStatus);
                    setPaymentStatusDraft(latestPaymentStatus);
                    setHasLocalChange(false);
                }

                const proofFileName = json?.data?.paymentProofFileName as string | undefined;
                const proofMimeType = json?.data?.paymentProofMimeType as string | undefined;
                const proofDataUrl = json?.data?.paymentProofDataUrl as string | undefined;
                if (proofDataUrl) {
                    setCurrentPaymentProof({
                        fileName: proofFileName || "payment-proof",
                        mimeType: proofMimeType || "application/octet-stream",
                        dataUrl: proofDataUrl,
                    });
                }
            } catch {
                // Keep seeded values if the fetch fails
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isOpen, order?.id]);

    if (!order) return null;

    const hasPaymentStatusChanged =
        isSuperAdmin && hasLocalChange && paymentStatusDraft !== null && currentPaymentStatus !== null && paymentStatusDraft !== currentPaymentStatus;
    const footerButtonText = hasPaymentStatusChanged ? "UPDATE" : "CLOSE";

    const handleFooterAction = async () => {
        if (!hasPaymentStatusChanged || !paymentStatusDraft) {
            onClose();
            return;
        }

        setIsUpdating(true);
        try {
            await updateOrderPaymentStatus(String(order.id), paymentStatusDraft);
            if (onPaymentStatusUpdated && paymentStatusDraft) {
                await onPaymentStatusUpdated(order.id, paymentStatusDraft);
            }
            onClose();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: error?.message || "Failed to update payment status.",
            });
        } finally {
            setIsUpdating(false);
            setHasLocalChange(false);
            hasLocalChangeRef.current = false;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-2xl font-bold">Order Details</DialogTitle>
                        <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                            #{String(order.id).substring(0, 8)}
                        </Badge>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 max-h-[calc(85vh-140px)]">
                    <div className="px-6 py-4 space-y-5">
                        {/* Status Section */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <CreditCard className="h-4 w-4" />
                                            <span className="font-semibold">Payment Status</span>
                                        </div>
                                        {isSuperAdmin ? (
                                            <Select
                                                value={paymentStatusDraft ?? order.paymentStatus}
                                                onValueChange={(value: string) => {
                                                    setPaymentStatusDraft(value as PaymentStatus);
                                                    setHasLocalChange(true);
                                                    hasLocalChangeRef.current = true;
                                                }
                                                }
                                            >
                                                <SelectTrigger className="h-11 border-2">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Unpaid">Cancel</SelectItem>
                                                    <SelectItem value="Paid">Paid</SelectItem>
                                                    <SelectItem value="PAID PENDING">Completed</SelectItem>
                                                    <SelectItem value="Hold">Hold</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Badge variant="secondary" className="text-sm">
                                                {currentPaymentStatus ?? order.paymentStatus}
                                            </Badge>
                                        )}
                                        {currentPaymentProof && (
                                            <div className="mt-2 space-y-1">
                                                <div className="text-xs text-muted-foreground">
                                                    Proof of Payment
                                                </div>
                                                {currentPaymentProof.mimeType?.startsWith("image/") ? (
                                                    <div className="space-y-2">
                                                        <img
                                                            src={currentPaymentProof.dataUrl}
                                                            alt="Proof of Payment"
                                                            className="max-h-28 w-auto rounded-md border border-zinc-200"
                                                        />
                                                        <a
                                                            href={currentPaymentProof.dataUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-amber-600 hover:underline text-sm block font-medium"
                                                        >
                                                            View Payment Proof
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <a
                                                        href={currentPaymentProof.dataUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-amber-600 hover:underline text-sm font-medium"
                                                    >
                                                        View Payment Proof
                                                    </a>
                                                )}
                                                <div className="text-[11px] text-muted-foreground break-all">
                                                    {currentPaymentProof.fileName}
                                                </div>
                                                <div className="flex items-center gap-2 pt-2">
                                                    <Button
                                                        size="sm"
                                                        className="h-8 bg-green-600 hover:bg-green-700 text-white flex-1"
                                                        onClick={handleConfirmPayment}
                                                        disabled={isUpdating}
                                                    >
                                                        Confirmed
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="h-8 flex-1"
                                                        onClick={handleCancelPaymentProof}
                                                        disabled={isUpdating}
                                                    >
                                                        Cancelled
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Truck className="h-4 w-4" />
                                            <span className="font-semibold">Shipping Status</span>
                                        </div>
                                        <Badge variant="secondary" className="text-sm">{order.shippingStatus}</Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Customer Information */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                        <User className="h-4 w-4" />
                                        <span>Customer Information</span>
                                    </div>
                                    <div className="grid gap-3 text-sm">
                                        <div className="flex items-start gap-3">
                                            <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                            <div className="flex-1">
                                                <p className="text-xs text-muted-foreground">Name</p>
                                                <p className="font-medium">{order.customerName}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                            <div className="flex-1">
                                                <p className="text-xs text-muted-foreground">Contact Number</p>
                                                <p className="font-medium">{order.contactNumber || <span className="text-muted-foreground italic">Not provided</span>}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                            <div className="flex-1">
                                                <p className="text-xs text-muted-foreground">Email</p>
                                                <p className="font-medium break-all">{order.customerEmail || <span className="text-muted-foreground italic">Not provided</span>}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                            <div className="flex-1">
                                                <p className="text-xs text-muted-foreground">Delivery Address</p>
                                                <p className="font-medium">{order.address || <span className="text-muted-foreground italic">Not provided</span>}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Items Section */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                        <Package className="h-4 w-4" />
                                        <span>Order Items</span>
                                    </div>
                                    {/* Aggregated Order Items Logic */
                                        (() => {
                                            // 1. Try to parse/use order.items
                                            let items: any[] = [];
                                            try {
                                                if (Array.isArray(order.items)) {
                                                    items = order.items;
                                                } else if (typeof order.items === 'string') {
                                                    items = JSON.parse(order.items);
                                                }
                                            } catch (e) {
                                                console.error("Failed to parse order items", e);
                                                items = [];
                                            }

                                            // 2. If we have valid items, aggregate them
                                            if (items && items.length > 0) {
                                                const aggregatedItems: Record<string, { name: string; quantity: number; price: number; subtotal: number }> = {};

                                                items.forEach((item: any) => {
                                                    const product = item.product || {};
                                                    const productId = product.id || product.name || item.name || "unknown";
                                                    const productName = product.name || item.name || "Unknown Product";
                                                    const price = product.retailPrice || item.price || 0;
                                                    const quantity = item.quantity || 0;

                                                    if (!aggregatedItems[productId]) {
                                                        aggregatedItems[productId] = {
                                                            name: productName,
                                                            quantity: 0,
                                                            price: price,
                                                            subtotal: 0
                                                        };
                                                    }
                                                    aggregatedItems[productId].quantity += quantity;
                                                    aggregatedItems[productId].subtotal += (quantity * price);
                                                });

                                                return (
                                                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                                        {Object.values(aggregatedItems).map((item, idx) => (
                                                            <div key={idx} className="flex justify-between items-start pb-3 border-b last:border-0 last:pb-0">
                                                                <div className="flex-1">
                                                                    <p className="font-semibold text-base">{item.name}</p>
                                                                    <p className="text-sm text-muted-foreground mt-1">
                                                                        Quantity: <span className="font-medium">{item.quantity}</span> × ₱{item.price.toFixed(2)}
                                                                    </p>
                                                                </div>
                                                                <p className="font-semibold text-base">₱{item.subtotal.toFixed(2)}</p>
                                                            </div>
                                                        ))}
                                                        <Separator className="my-2" />
                                                        <div className="space-y-2 pt-2">
                                                            <div className="flex justify-between text-sm">
                                                                <p className="text-muted-foreground">Subtotal (All Items)</p>
                                                                <p className="font-medium">₱{(order.price * order.quantity).toFixed(2)}</p>
                                                            </div>
                                                            <div className="flex justify-between text-sm">
                                                                <p className="text-muted-foreground">Shipping Fee</p>
                                                                <p className="font-medium">₱{order.shippingFee.toFixed(2)}</p>
                                                            </div>
                                                            <Separator className="my-2" />
                                                            <div className="flex justify-between font-bold text-lg">
                                                                <p>Total Amount</p>
                                                                <p className="text-primary">₱{order.totalAmount.toFixed(2)}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // Fallback for legacy orders without items array
                                            return (
                                                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                                    <div className="flex justify-between items-start pb-3 border-b">
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-base">{order.itemName}</p>
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                Quantity: <span className="font-medium">{order.quantity}</span> × ₱{order.price.toFixed(2)}
                                                            </p>
                                                        </div>
                                                        <p className="font-semibold text-base">₱{(order.price * order.quantity).toFixed(2)}</p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-sm">
                                                            <p className="text-muted-foreground">Subtotal</p>
                                                            <p className="font-medium">₱{(order.price * order.quantity).toFixed(2)}</p>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <p className="text-muted-foreground">Shipping Fee</p>
                                                            <p className="font-medium">₱{order.shippingFee.toFixed(2)}</p>
                                                        </div>
                                                        <Separator className="my-2" />
                                                        <div className="flex justify-between font-bold text-lg">
                                                            <p>Total Amount</p>
                                                            <p className="text-primary">₱{order.totalAmount.toFixed(2)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Shipping Details */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                        <Truck className="h-4 w-4" />
                                        <span>Shipping Information</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Payment Method</p>
                                            <p className="font-medium">{order.paymentMethod}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Courier</p>
                                            <p className="font-medium">{order.courierName || <span className="text-muted-foreground italic">Not assigned</span>}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Tracking Number</p>
                                            <p className="font-medium font-mono text-xs">{order.trackingNumber || <span className="text-muted-foreground italic">Not available</span>}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Order Date</p>
                                            <p className="font-medium">{order.orderDate}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-xs text-muted-foreground mb-1">Remarks</p>
                                            <p className="font-medium text-sm italic">{order.remarks || <span className="text-muted-foreground">None</span>}</p>
                                        </div>
                                    </div>
                                    {order.rushShip && (
                                        <div className="mt-3 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-4 py-2 rounded-lg text-sm font-bold text-center">
                                            🚀 RUSH SHIPMENT
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </ScrollArea>

                <DialogFooter className="px-6 py-4 border-t">
                    <Button
                        onClick={handleFooterAction}
                        className="w-full"
                        disabled={isUpdating}
                    >
                        {isUpdating ? "UPDATING..." : footerButtonText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
