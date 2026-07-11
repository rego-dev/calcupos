"use client";

import { useEffect, useState } from "react";
import {
    Hash,
    CalendarClock,
    CreditCard,
    Ruler,
    Tag,
    Plus,
    Pencil,
    Trash2,
    Check,
    X,
    Loader2,
    ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
    getPosSetupItems,
    createPosSetupItem,
    updatePosSetupItem,
    deletePosSetupItem,
    getTransactionReferences,
    saveTransactionReferences,
    type PosSetupItem,
    type PosSetupType,
    type TransactionReference,
} from "../pos-setup-actions";

type CardConfig = {
    type: PosSetupType;
    title: string;
    description: string;
    icon: React.ReactNode;
    namePlaceholder: string;
    codeLabel: string;
    codePlaceholder: string;
};

const CARDS: CardConfig[] = [
    {
        type: "transaction_reference",
        title: "Transaction Reference",
        description: "Reference series shown on receipts & invoices.",
        icon: <Hash className="h-5 w-5" />,
        namePlaceholder: "e.g. Official Receipt",
        codeLabel: "Prefix",
        codePlaceholder: "e.g. OR",
    },
    {
        type: "payment_terms",
        title: "Payment Terms",
        description: "Terms offered to customers on checkout.",
        icon: <CalendarClock className="h-5 w-5" />,
        namePlaceholder: "e.g. Net 30",
        codeLabel: "Code",
        codePlaceholder: "e.g. NET30",
    },
    {
        type: "pos_payment_type",
        title: "POS Payment Method",
        description: "Accepted payment methods at the POS.",
        icon: <CreditCard className="h-5 w-5" />,
        namePlaceholder: "e.g. Gcash",
        codeLabel: "Code",
        codePlaceholder: "e.g. GCASH",
    },
    {
        type: "unit_of_measure",
        title: "Unit of Measure",
        description: "Units used to sell and stock products.",
        icon: <Ruler className="h-5 w-5" />,
        namePlaceholder: "e.g. Kilogram",
        codeLabel: "Abbrev",
        codePlaceholder: "e.g. kg",
    },
    {
        type: "product_brand",
        title: "Product Brand",
        description: "Brands you carry in your catalog.",
        icon: <Tag className="h-5 w-5" />,
        namePlaceholder: "e.g. Nestlé",
        codeLabel: "Code",
        codePlaceholder: "optional",
    },
];

export function PosSetupTab() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {CARDS.map((config) => (
                <PosSetupCard key={config.type} config={config} />
            ))}
        </div>
    );
}

function PosSetupCard({ config }: { config: CardConfig }) {
    const [count, setCount] = useState<number | null>(null);
    const [open, setOpen] = useState(false);

    const loadCount = async () => {
        // Transaction Reference is a fixed set of document types.
        if (config.type === "transaction_reference") {
            setCount(9);
            return;
        }
        const data = await getPosSetupItems(config.type);
        setCount(data.length);
    };

    useEffect(() => {
        loadCount();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.type]);

    return (
        <>
            <Card
                role="button"
                tabIndex={0}
                onClick={() => setOpen(true)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(true)}
                className="p-5 cursor-pointer transition-all hover:shadow-md hover:border-amber-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 group"
            >
                <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                        {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{config.title}</h3>
                            {count !== null && (
                                <Badge variant="secondary" className="rounded-full shrink-0">{count}</Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{config.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                </div>
            </Card>

            {config.type === "transaction_reference" ? (
                <TransactionReferenceDialog config={config} open={open} onOpenChange={setOpen} />
            ) : (
                <PosSetupManagerDialog
                    config={config}
                    open={open}
                    onOpenChange={setOpen}
                    onCountChange={setCount}
                />
            )}
        </>
    );
}

function TransactionReferenceDialog({
    config,
    open,
    onOpenChange,
}: {
    config: CardConfig;
    open: boolean;
    onOpenChange: (o: boolean) => void;
}) {
    const { toast } = useToast();
    const [refs, setRefs] = useState<TransactionReference[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setLoading(true);
            getTransactionReferences()
                .then(setRefs)
                .finally(() => setLoading(false));
        }
    }, [open]);

    const setNext = (id: number, value: string) => {
        const n = value === "" ? 0 : Math.max(0, Math.floor(Number(value)) || 0);
        setRefs((prev) => prev.map((r) => (r.id === id ? { ...r, next: n } : r)));
    };

    const handleSave = async () => {
        setSaving(true);
        const res = await saveTransactionReferences(refs.map((r) => ({ id: r.id, next: r.next })));
        setSaving(false);
        if (!res.success) {
            toast({ title: "Save failed", description: res.error, variant: "destructive" });
            return;
        }
        toast({ title: "Next references saved" });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                            {config.icon}
                        </span>
                        Next Reference
                    </DialogTitle>
                    <DialogDescription>
                        The next number assigned to each document type.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        {refs.map((r) => (
                            <div key={r.name} className="space-y-1.5">
                                <Label className="text-sm font-semibold">{r.name}</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={String(r.next)}
                                    onChange={(e) => setNext(r.id, e.target.value)}
                                    className="h-10"
                                />
                            </div>
                        ))}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving || loading}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PosSetupManagerDialog({
    config,
    open,
    onOpenChange,
    onCountChange,
}: {
    config: CardConfig;
    open: boolean;
    onOpenChange: (o: boolean) => void;
    onCountChange: (n: number) => void;
}) {
    const { toast } = useToast();
    const [items, setItems] = useState<PosSetupItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [adding, setAdding] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState<PosSetupItem | null>(null);

    // Inline edit state
    const [editId, setEditId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editCode, setEditCode] = useState("");

    const refresh = async () => {
        const data = await getPosSetupItems(config.type);
        setItems(data);
        onCountChange(data.length);
    };

    useEffect(() => {
        if (open) {
            setLoading(true);
            setName("");
            setCode("");
            setEditId(null);
            getPosSetupItems(config.type)
                .then((data) => {
                    setItems(data);
                    onCountChange(data.length);
                })
                .finally(() => setLoading(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, config.type]);

    const handleAdd = async () => {
        if (!name.trim()) {
            toast({ title: "Name is required", variant: "destructive" });
            return;
        }
        setAdding(true);
        const res = await createPosSetupItem({ type: config.type, name, code });
        setAdding(false);
        if (!res.success) {
            toast({ title: "Could not add", description: res.error, variant: "destructive" });
            return;
        }
        setName("");
        setCode("");
        await refresh();
        toast({ title: `${config.title} added` });
    };

    const startEdit = (item: PosSetupItem) => {
        setEditId(item.id);
        setEditName(item.name);
        setEditCode(item.code ?? "");
    };

    const saveEdit = async () => {
        if (editId == null) return;
        if (!editName.trim()) {
            toast({ title: "Name is required", variant: "destructive" });
            return;
        }
        setBusyId(editId);
        const res = await updatePosSetupItem(editId, { name: editName, code: editCode });
        setBusyId(null);
        if (!res.success) {
            toast({ title: "Update failed", description: res.error, variant: "destructive" });
            return;
        }
        setEditId(null);
        await refresh();
    };

    const handleToggle = async (item: PosSetupItem, isActive: boolean) => {
        setBusyId(item.id);
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isActive } : i)));
        const res = await updatePosSetupItem(item.id, { isActive });
        setBusyId(null);
        if (!res.success) {
            setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isActive: !isActive } : i)));
            toast({ title: "Update failed", description: res.error, variant: "destructive" });
        }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        const id = deleting.id;
        setBusyId(id);
        const res = await deletePosSetupItem(id);
        setBusyId(null);
        setDeleting(null);
        if (!res.success) {
            toast({ title: "Delete failed", description: res.error, variant: "destructive" });
            return;
        }
        await refresh();
        toast({ title: "Deleted" });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                            {config.icon}
                        </span>
                        {config.title}
                    </DialogTitle>
                    <DialogDescription>{config.description}</DialogDescription>
                </DialogHeader>

                {/* Add row */}
                <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                            placeholder={config.namePlaceholder}
                            className="h-9"
                        />
                    </div>
                    <div className="w-28 space-y-1">
                        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{config.codeLabel}</Label>
                        <Input
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                            placeholder={config.codePlaceholder}
                            className="h-9"
                        />
                    </div>
                    <Button className="h-9 shrink-0" onClick={handleAdd} disabled={adding}>
                        {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                        Add
                    </Button>
                </div>

                {/* Table */}
                <div className="rounded-lg border">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                            No entries yet — add your first one above.
                        </div>
                    ) : (
                        <ScrollArea className="max-h-[45vh]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="w-32">{config.codeLabel}</TableHead>
                                        <TableHead className="w-20 text-center">Active</TableHead>
                                        <TableHead className="w-24 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item) => {
                                        const isEditing = editId === item.id;
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    {isEditing ? (
                                                        <Input
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                                                            className="h-8"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <span className={`font-medium ${!item.isActive ? "text-muted-foreground line-through" : ""}`}>
                                                            {item.name}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {isEditing ? (
                                                        <Input
                                                            value={editCode}
                                                            onChange={(e) => setEditCode(e.target.value)}
                                                            onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                                                            className="h-8"
                                                            placeholder={config.codePlaceholder}
                                                        />
                                                    ) : item.code ? (
                                                        <Badge variant="outline">{item.code}</Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Switch
                                                        checked={item.isActive}
                                                        disabled={busyId === item.id || isEditing}
                                                        onCheckedChange={(v) => handleToggle(item, v)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {isEditing ? (
                                                        <div className="flex justify-end gap-1">
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={saveEdit} disabled={busyId === item.id}>
                                                                {busyId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditId(null)}>
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-end gap-1">
                                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(item)}>
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleting(item)}>
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    )}
                </div>

                {/* Delete confirmation */}
                <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This removes it from {config.title}. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => { e.preventDefault(); handleDelete(); }}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogContent>
        </Dialog>
    );
}
