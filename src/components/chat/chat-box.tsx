"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useChatEvents, ChatEventData } from "@/hooks/use-chat-events";
import { createPortal } from "react-dom";
import { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    X,
    Send,
    Phone,
    Video,
    Minus,
    Image as ImageIcon,
    Smile,
    ThumbsUp,
    Package2,
    Search,
    CheckCheck,
} from "lucide-react";
import { sendMessage, getMessages, markMessagesAsRead, getChatProducts } from "./chat-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ChatBoxProps {
    user: User;
    currentUser: User | null;
    onClose: () => void;
    index?: number;
}

interface Message {
    id: string;
    content: string;
    senderId: string;
    receiverId: string;
    createdAt: Date;
    sender?: {
        name: string;
        image?: string | null;
    };
}

export function ChatBox({ user, currentUser, onClose, index = 0 }: ChatBoxProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [sending, setSending] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [attachedProduct, setAttachedProduct] = useState<any | null>(null);
    const { toast } = useToast();
    const hasLoadedRef = useRef(false);
    const isMinimizedRef = useRef(isMinimized);
    const fetchMessagesRef = useRef<() => void>(() => { });

    // Keep the ref in sync with state
    useEffect(() => {
        isMinimizedRef.current = isMinimized;
    }, [isMinimized]);

    useEffect(() => {
        let isMounted = true;

        async function fetchMessages() {
            if (!currentUser) return;
            // Only show loading spinner on the very first load
            if (!hasLoadedRef.current) setLoading(true);
            try {
                // Using statically imported getMessages and markMessagesAsRead

                const result = await getMessages(String(user.id));
                if (isMounted) {
                    if (result.success && Array.isArray(result.data)) {
                        const newMsgs = result.data as unknown as Message[];

                        // Check if there are any unread messages from the other user
                        const hasUnread = newMsgs.some(m => m.senderId === user.id && !(m as any).read);

                        if (!isMinimizedRef.current && hasUnread) {
                            markMessagesAsRead(String(user.id)).catch(err => console.error("Failed to mark read", err));
                        }

                        setMessages((prev) => {
                            const hasChanges = newMsgs.length !== prev.length ||
                                (newMsgs.length > 0 && prev.length > 0 && newMsgs[newMsgs.length - 1].id !== prev[prev.length - 1].id);

                            return hasChanges ? newMsgs : prev;
                        });
                    }
                }
            } catch (error) {
                // Ignore "unexpected response" errors as they are likely from expired sessions
                if (error instanceof Error && !error.message.includes("unexpected response")) {
                    console.error("Failed to load messages", error);
                }
            } finally {
                if (isMounted && !hasLoadedRef.current) {
                    setLoading(false);
                    hasLoadedRef.current = true;
                }
            }
        }

        // Store fetchMessages in ref so SSE handler can call it
        fetchMessagesRef.current = fetchMessages;

        if (currentUser) {
            fetchMessages();
        }
        // Reduced polling interval — SSE handles real-time, this is a fallback
        const interval = setInterval(fetchMessages, 10000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [user.id, currentUser]);

    // SSE: immediately refresh messages when a new-message event involves this chat
    const handleChatEvent = useCallback((event: ChatEventData) => {
        // Use String() coercion to handle number/string type mismatch from Prisma Int IDs
        if (String(event.senderId) === String(user.id) || (currentUser && String(event.senderId) === String(currentUser.id))) {
            fetchMessagesRef.current();
        }
    }, [user.id, currentUser]);

    useChatEvents(handleChatEvent, !!currentUser);

    const prevMessageCountRef = useRef(0);

    useEffect(() => {
        if (!isMinimized && !loading) {
            // Only scroll smoothly if we're adding a new message to an existing list
            const isNewMessage = prevMessageCountRef.current > 0 && messages.length > prevMessageCountRef.current;
            messagesEndRef.current?.scrollIntoView({
                behavior: isNewMessage ? "smooth" : "auto"
            });
            prevMessageCountRef.current = messages.length;
        }
    }, [messages, isMinimized, loading]);

    const productImageUrl = (product: any): string => {
        if (!product) return "";
        if (product.image) return product.image;
        if (product.images) {
            if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
            if (typeof product.images === "string") return product.images;
        }
        return "";
    };

    const buildMessageContent = (): string => {
        const text = newMessage.trim();
        if (!attachedProduct) return text;
        const img = productImageUrl(attachedProduct);
        const imageTag = img ? `\n[[IMAGE:${img}]]` : "";
        const price = attachedProduct.price != null ? `\nPrice: ₱${attachedProduct.price}` : "";
        const productBlock = `📦 Product Inquiry:\nName: ${attachedProduct.productName}\nSKU: ${attachedProduct.sku}${price}${imageTag}`;
        return text ? `${productBlock}\n\n${text}` : productBlock;
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() && !attachedProduct) return;
        if (user.isActive === false) return;

        const content = buildMessageContent();

        setSending(true);
        try {
            const result = await sendMessage(String(user.id), content);
            if (result.success && result.message) {
                const newMsg = result.message as unknown as Message;
                setMessages((prev) => [...prev, newMsg]);
                setNewMessage("");
                setAttachedProduct(null);
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.error || "Failed to send message",
                });
            }
        } catch (error) {
            console.error("Failed to send message", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "An unexpected error occurred",
            });
        } finally {
            setSending(false);
        }
    };

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    // Attach the selected product to the compose box so the user can type a
    // question (e.g. "how much?") and send it together as a product inquiry.
    const handleProductSelect = (product: any) => {
        if (user.isActive === false) {
            toast({
                variant: "destructive",
                title: "Action Disabled",
                description: "Cannot share products with inactive users.",
            });
            return;
        }
        setAttachedProduct(product);
        setIsProductModalOpen(false);
        setIsMinimized(false);
    };

    const unreadCount = messages.filter(m => m.senderId === user.id && !(m as any).read).length;

    const content = (
        <>
            {isMinimized ? (
                <div
                    className="fixed bottom-6 z-[100] group animate-in slide-in-from-bottom-5 fade-in duration-300 flex flex-col items-center"
                    style={{ right: `${24 + index * 70}px` }}
                >
                    <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-zinc-800 text-white text-sm font-medium rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-lg whitespace-nowrap">
                        {user.name}
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-zinc-100 hover:bg-white text-zinc-600 hover:text-red-500 border border-zinc-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md z-10"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>

                    <button
                        onClick={() => {
                            setIsMinimized(false);
                            // Mark messages as read when expanding
                            if (unreadCount > 0) {
                                markMessagesAsRead(String(user.id)).catch(err => console.error("Failed to mark read", err));
                                // Optimistically update local messages read state so badge goes away
                                setMessages(prev => prev.map(m => m.senderId === user.id ? { ...m, read: true } : m));
                            }
                        }}
                        className="relative w-12 h-12 rounded-full shadow-2xl hover:scale-105 transition-transform duration-200 focus:outline-none ring-2 ring-white/50 dark:ring-zinc-800/50"
                    >
                        <Avatar className="h-full w-full bg-white">
                            <AvatarImage src={`https://ui-avatars.com/api/?name=${user.name}&background=random`} alt={user.name} />
                            <AvatarFallback className="text-base">{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {user.isOnline === true ? (
                            <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-white dark:ring-zinc-900 shadow-sm" />
                        ) : (
                            <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-zinc-400 ring-2 ring-white dark:ring-zinc-900 shadow-sm" />
                        )}

                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md border-[1.5px] border-white dark:border-zinc-900 animate-in zoom-in">
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        )}
                    </button>
                </div>
            ) : (
                <div
                    className="fixed bottom-0 w-80 h-[450px] bg-white dark:bg-zinc-900 rounded-t-2xl shadow-2xl flex flex-col z-[100] overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 animate-in slide-in-from-bottom-10 fade-in duration-300"
                    style={{ right: `${40 + index * 340}px` }}
                >
                    {/* Enhanced Header */}
                    <div className="relative overflow-hidden shrink-0 z-10">
                        <div className="absolute inset-0" />
                        <div className="relative p-3 flex items-center justify-between">
                            <div
                                className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity flex-1"
                                onClick={() => setIsMinimized(true)}
                            >
                                <div className="relative">
                                    <Avatar className="h-10 w-10 ring-2 ring-white shadow-lg">
                                        <AvatarImage src={`https://ui-avatars.com/api/?name=${user.name}&background=random`} alt={user.name} />
                                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    {user.isOnline === true ? (
                                        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white" />
                                    ) : (
                                        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-zinc-400 ring-2 ring-white" />
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-semibold text-white text-sm leading-none">{user.name}</span>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        {user.isOnline === true ? (
                                            <>
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                                <span className="text-[10px] text-amber-100">Active now</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                                                <span className="text-[10px] text-amber-100">Offline</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-0.5">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20">
                                    <Phone className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20">
                                    <Video className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setIsMinimized(true)}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={onClose}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="p-4 space-y-4">
                            {/* Profile Hero Section */}
                            <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-amber-500 rounded-full blur-2xl opacity-20" />
                                    <Avatar className="relative h-20 w-20 ring-4 ring-white shadow-xl">
                                        <AvatarImage src={`https://ui-avatars.com/api/?name=${user.name}&background=random`} alt={user.name} />
                                        <AvatarFallback className="text-2xl">{user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{user.name}</h3>
                                    <p className="text-xs text-muted-foreground mt-1">Connected on FlowCart Sync</p>
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center p-8">
                                    <div className="text-center">
                                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3 animate-pulse">
                                            <Package2 className="w-6 h-6 text-amber-600" />
                                        </div>
                                        <p className="text-sm text-muted-foreground">Loading messages...</p>
                                    </div>
                                </div>
                            ) : (
                                messages.map((msg, index) => {
                                    const isMe = msg.receiverId === user.id;
                                    const showAvatar = !isMe && (index === messages.length - 1 || messages[index + 1]?.receiverId === user.id);

                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"} items-end group`}
                                        >
                                            {!isMe && (
                                                <Avatar className={cn("h-7 w-7 transition-opacity", showAvatar ? 'opacity-100' : 'opacity-0')}>
                                                    <AvatarImage src={`https://ui-avatars.com/api/?name=${user.name}&background=random`} alt={user.name} />
                                                    <AvatarFallback className="text-xs">{user.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[70%]`}>
                                                <div
                                                    className={cn(
                                                        "px-4 py-2.5 text-[15px] shadow-md whitespace-pre-wrap relative",
                                                        isMe
                                                            ? "   text-white rounded-2xl rounded-br-md"
                                                            : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-bl-md border border-zinc-200 dark:border-zinc-700"
                                                    )}
                                                >
                                                    {(() => {
                                                        const imageMatch = msg.content.match(/\[\[IMAGE:(.*?)\]\]/);
                                                        const imageUrl = imageMatch ? imageMatch[1] : null;
                                                        const textContent = msg.content.replace(/\[\[IMAGE:.*?\]\]/, '').trim();

                                                        return (
                                                            <>
                                                                {imageUrl && (
                                                                    <div className="mb-2 -mx-1 -mt-1">
                                                                        <img
                                                                            src={imageUrl}
                                                                            alt="Shared Image"
                                                                            className="rounded-xl max-h-48 w-full object-cover border-2 border-white/20 shadow-sm"
                                                                            onError={(e) => {
                                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                                            }}
                                                                        />
                                                                    </div>
                                                                )}
                                                                {textContent}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' }).format(new Date(msg.createdAt))}
                                                    </span>
                                                    {isMe && <CheckCheck className="w-3 h-3 text-amber-600" />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} className="h-4 w-full shrink-0" />
                        </div>
                    </ScrollArea>

                    {/* Enhanced Input Area */}
                    <div className="p-2 border-t-2 bg-white dark:bg-zinc-900 dark:border-zinc-800 shrink-0">
                        {attachedProduct && (
                            <div className="mb-2 flex items-center gap-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-2">
                                {productImageUrl(attachedProduct) ? (
                                    <img src={productImageUrl(attachedProduct)} alt={attachedProduct.productName} className="h-9 w-9 rounded-md object-cover border bg-white" />
                                ) : (
                                    <div className="h-9 w-9 rounded-md border bg-white flex items-center justify-center">
                                        <Package2 className="h-4 w-4 text-amber-600" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate text-zinc-800 dark:text-zinc-100">{attachedProduct.productName}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                        {attachedProduct.sku}{attachedProduct.price != null ? ` · ₱${attachedProduct.price}` : ""}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0 text-zinc-500 hover:text-red-500"
                                    onClick={() => setAttachedProduct(null)}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-amber-600 hover:bg-amber-50 rounded-full"
                                    disabled={user.isActive === false}
                                >
                                    <ImageIcon className="h-5 w-5" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    title="Attach product"
                                    className="h-9 w-9 text-zinc-600 hover:bg-zinc-100 rounded-full"
                                    onClick={() => setIsProductModalOpen(true)}
                                    disabled={user.isActive === false}
                                >
                                    <Package2 className="h-5 w-5" />
                                </Button>
                            </div>
                            <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder={user.isActive === false ? "Cannot chat with inactive user..." : "Type a message..."}
                                        className="w-full rounded-full bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 border-2 border-transparent focus:border-amber-400 focus:bg-white dark:focus:bg-zinc-800 px-4 py-2 h-9 pr-10"
                                        disabled={sending || user.isActive === false}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-zinc-400 hover:text-zinc-600 hover:bg-transparent"
                                    >
                                        <Smile className="h-4 w-4" />
                                    </Button>
                                </div>
                            </form>
                            <Button
                                onClick={() => handleSendMessage()}
                                size="icon"
                                className={cn(
                                    "h-9 w-9 rounded-full shadow-lg transition-all",
                                    (newMessage.trim() || attachedProduct)
                                        ? "     shadow-amber-500/30"
                                        : "bg-zinc-200 hover:bg-zinc-300 text-zinc-600"
                                )}
                                disabled={sending || user.isActive === false}
                            >
                                {(newMessage.trim() || attachedProduct) ? <Send className="h-4 w-4 text-white" /> : <ThumbsUp className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            <ProductSelectorModal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                onSelect={handleProductSelect}
            />
        </>
    );

    return createPortal(content, document.body);
}

function ProductSelectorModal({
    isOpen,
    onClose,
    onSelect,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (product: any) => void;
}) {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (isOpen) {
            loadProducts();
        }
    }, [isOpen]);

    async function loadProducts() {
        setLoading(true);
        try {
            const data = await getChatProducts();
            setProducts(data);
        } catch (error) {
            console.error("Failed to load products", error);
        } finally {
            setLoading(false);
        }
    }

    const filteredProducts = products.filter(p =>
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-6xl h-[85vh] flex flex-col p-0 z-[150] overflow-hidden bg-white dark:bg-zinc-950">
                {/* Enhanced Header */}
                <div className="relative overflow-hidden">
                    <div className="absolute inset-0" />
                    <div className="relative p-6">
                        <DialogHeader>
                            <div className="flex items-center gap-3 pr-8">
                                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <Package2 className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-bold text-white">Products</DialogTitle>
                                    <p className="text-zinc-300 text-sm mt-1">Select a product to attach to your message</p>
                                </div>
                            </div>
                        </DialogHeader>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-4 flex-1 flex flex-col min-h-0 px-6 pb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-12 border-2 focus:border-amber-400 bg-white dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800"
                        />
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-4">
                            {loading ? (
                                <div className="col-span-full flex items-center justify-center p-16">
                                    <div className="text-center">
                                        <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
                                            <Package2 className="w-8 h-8 text-zinc-600" />
                                        </div>
                                        <p className="text-sm text-muted-foreground">Loading products...</p>
                                    </div>
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="col-span-full flex flex-col items-center justify-center p-16">
                                    <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                                        <Search className="w-10 h-10 text-zinc-400" />
                                    </div>
                                    <p className="text-base font-medium text-zinc-700 mb-1">No products found</p>
                                    <p className="text-sm text-muted-foreground">Try adjusting your search terms</p>
                                </div>
                            ) : (
                                filteredProducts.map(product => {
                                    let imageUrl = "";
                                    if (product.image) {
                                        imageUrl = product.image;
                                    } else if (product.images) {
                                        if (Array.isArray(product.images) && product.images.length > 0) {
                                            imageUrl = product.images[0];
                                        } else if (typeof product.images === 'string') {
                                            imageUrl = product.images;
                                        }
                                    }

                                    return (
                                        <button
                                            type="button"
                                            key={product.id}
                                            onClick={() => onSelect(product)}
                                            className="group relative flex flex-col text-left bg-white dark:bg-zinc-900 rounded-xl overflow-hidden transition-all duration-200 border-2 shadow-sm hover:shadow-lg border-zinc-200 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                                        >
                                            <div className="h-44 w-full relative overflow-hidden">
                                                {imageUrl ? (
                                                    <img
                                                        src={imageUrl}
                                                        alt={product.productName}
                                                        className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center w-full h-full">
                                                        <ImageIcon className="h-12 w-12 text-zinc-300" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold bg-amber-600 px-3 py-1.5 rounded-full shadow">Attach</span>
                                                </div>
                                            </div>

                                            <div className="p-3 flex flex-col gap-1.5">
                                                <h4 className="font-semibold text-sm truncate text-zinc-900 dark:text-zinc-100" title={product.productName}>
                                                    {product.productName}
                                                </h4>
                                                <div className="flex items-center justify-between gap-2">
                                                    <Badge variant="outline" className="w-fit text-[10px] font-mono">
                                                        {product.sku}
                                                    </Badge>
                                                    {product.price != null && (
                                                        <span className="text-sm font-bold text-amber-600">₱{product.price}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </ScrollArea>
                </div>

            </DialogContent>
        </Dialog>
    );
}
