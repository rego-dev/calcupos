"use client";

import * as React from "react";
import { Upload, Download, Database, FileText, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getDatabaseOperations, exportDatabase, importDatabase } from "../actions";

const availableTables = [
    { id: "orders", name: "Orders" },
    { id: "customers", name: "Customers" },
    { id: "products", name: "Products" },
    { id: "users", name: "Users" },
    { id: "stations", name: "Stations" },
    { id: "notifications", name: "Notifications" },
    { id: "messages", name: "Messages" },
    { id: "branches", name: "Branches" },
    { id: "roles", name: "Roles" },
    { id: "archive_data", name: "Archive Data" },
    { id: "warehouse_products", name: "Warehouse Products" },
    { id: "database_operations", name: "Database Operations" },
    { id: "sales_logs", name: "Sales Logs" },
    { id: "admin_logs", name: "Admin Logs" },
    { id: "pre_orders", name: "Pre-Orders" },
    { id: "pre_order_items", name: "Pre-Order Items" },
    { id: "inventory_logs", name: "Inventory Logs" },
];

function DownloadSection() {
    const [exportFormat, setExportFormat] = React.useState("sql");
    const [selectedTables, setSelectedTables] = React.useState<string[]>([
        "orders",
        "customers",
        "products",
    ]);
    const [includeSchema, setIncludeSchema] = React.useState(true);
    const [compressFile, setCompressFile] = React.useState(false);
    const [isExporting, setIsExporting] = React.useState(false);
    const [recentExports, setRecentExports] = React.useState<any[]>([]);

    React.useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        const result = await getDatabaseOperations();
        if (result.success && result.data) {
            const exports = result.data.filter((op: any) => op.type === 'EXPORT');
            setRecentExports(exports);
        }
    };

    const handleTableToggle = (tableId: string) => {
        setSelectedTables((prev) =>
            prev.includes(tableId)
                ? prev.filter((id) => id !== tableId)
                : [...prev, tableId]
        );
    };

    const handleSelectAll = () => {
        if (selectedTables.length === availableTables.length) {
            setSelectedTables([]);
        } else {
            setSelectedTables(availableTables.map((t) => t.id));
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const result = await exportDatabase({
                format: exportFormat,
                tables: selectedTables,
                includeSchema,
                compress: compressFile
            });

            if (result.success && result.data) {
                const mimeType = exportFormat === 'json' ? 'application/json' : 'application/sql';
                const blob = new Blob([result.data], { type: mimeType });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = result.filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);

                loadHistory();
            } else {
                alert("Export failed: " + (result.error || "Unknown error"));
            }
        } catch (err) {
            console.error(err);
            alert("An error occurred during export");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                {/* Export Format & Options */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Export Settings
                        </CardTitle>
                        <CardDescription>
                            Configure your database export preferences
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="format" className="text-base font-semibold">
                                Export Format
                            </Label>
                            <Select value={exportFormat} onValueChange={setExportFormat}>
                                <SelectTrigger id="format">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sql">
                                        <div className="flex items-center gap-2">
                                            <Database className="h-4 w-4" />
                                            <span>SQL Database (.sql)</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Export your database in SQL format
                            </p>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-base font-semibold">Export Options</Label>

                            <div className="flex items-center justify-between space-x-2">
                                <div className="space-y-0.5">
                                    <Label htmlFor="schema" className="font-medium cursor-pointer">
                                        Include Database Schema
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Export table structures along with data
                                    </p>
                                </div>
                                <Switch
                                    id="schema"
                                    checked={includeSchema}
                                    onCheckedChange={setIncludeSchema}
                                />
                            </div>

                            <div className="flex items-center justify-between space-x-2">
                                <div className="space-y-0.5">
                                    <Label htmlFor="compress" className="font-medium cursor-pointer">
                                        Compress File (ZIP)
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Reduce file size with compression
                                    </p>
                                </div>
                                <Switch
                                    id="compress"
                                    checked={compressFile}
                                    onCheckedChange={setCompressFile}
                                />
                            </div>
                        </div>

                        <Button
                            onClick={handleExport}
                            disabled={selectedTables.length === 0 || isExporting}
                            className="w-full"
                            size="lg"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            {isExporting ? "Preparing Export..." : "Export & Download"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Table Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Select Tables
                        </CardTitle>
                        <CardDescription>
                            Choose which tables to include in the export
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b">
                            <Label className="text-base font-semibold">Available Tables</Label>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSelectAll}
                            >
                                {selectedTables.length === availableTables.length ? "Deselect All" : "Select All"}
                            </Button>
                        </div>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {availableTables.map((table) => (
                                <div
                                    key={table.id}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center space-x-3">
                                        <Checkbox
                                            id={table.id}
                                            checked={selectedTables.includes(table.id)}
                                            onCheckedChange={() => handleTableToggle(table.id)}
                                        />
                                        <div>
                                            <Label
                                                htmlFor={table.id}
                                                className="font-medium cursor-pointer"
                                            >
                                                {table.name}
                                            </Label>
                                        </div>
                                    </div>
                                    {selectedTables.includes(table.id) && (
                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Exports History */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Recent Exports
                    </CardTitle>
                    <CardDescription>
                        Download your previously exported database files
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>File Name</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead>Export Date</TableHead>
                                <TableHead>Format</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentExports.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                        No recent exports found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                recentExports.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                {item.fileName}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{item.fileSize}</TableCell>
                                        <TableCell className="text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{(item.details as any)?.format || 'JSON'}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {item.status === "SUCCESS" ? (
                                                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Success
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive">
                                                    <AlertCircle className="h-3 w-3 mr-1" />
                                                    Failed
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function ImportSection() {
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [importMode, setImportMode] = React.useState("merge");
    const [isDragging, setIsDragging] = React.useState(false);
    const [isUploading, setIsUploading] = React.useState(false);
    const [uploadProgress, setUploadProgress] = React.useState(0);
    const [recentImports, setRecentImports] = React.useState<any[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        const result = await getDatabaseOperations();
        if (result.success && result.data) {
            const imports = result.data.filter((op: any) => op.type === 'IMPORT');
            setRecentImports(imports);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            setSelectedFile(files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setSelectedFile(files[0]);
        }
    };

    const handleImport = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        setUploadProgress(0);

        const progressInterval = setInterval(() => {
            setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 200);

        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("mode", importMode);

            const result = await importDatabase(formData);

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (result.success) {
                setTimeout(() => {
                    alert("Database imported successfully!");
                    setIsUploading(false);
                    setSelectedFile(null);
                    setUploadProgress(0);
                    loadHistory();
                }, 500);
            } else {
                alert("Import failed: " + (result.error || "Unknown error"));
                setIsUploading(false);
            }
        } catch (err) {
            clearInterval(progressInterval);
            console.error(err);
            alert("An error occurred during import");
            setIsUploading(false);
        }
    };

    const formatFileSize = (bytes: any) => {
        if (typeof bytes === 'number') {
            if (bytes === 0) return "0 Bytes";
            const k = 1024;
            const sizes = ["Bytes", "KB", "MB", "GB"];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
        }
        return bytes;
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                {/* Upload Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            Upload File
                        </CardTitle>
                        <CardDescription>
                            Select a database file to import (SQL, JSON, or CSV)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
                ${isDragging
                                    ? "border-primary bg-primary/5"
                                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                                }
              `}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".sql,.json,.csv"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-sm font-medium mb-1">
                                {isDragging ? "Drop file here" : "Click to upload or drag and drop"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                SQL, JSON, or CSV files (Max 50MB)
                            </p>
                        </div>

                        {selectedFile && (
                            <Alert>
                                <FileText className="h-4 w-4" />
                                <AlertDescription className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">{selectedFile.name}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formatFileSize(selectedFile.size)}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedFile(null);
                                        }}
                                    >
                                        Remove
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        )}

                        {isUploading && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Uploading...</span>
                                    <span className="font-medium">{uploadProgress}%</span>
                                </div>
                                <Progress value={uploadProgress} />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Import Options Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            Import Options
                        </CardTitle>
                        <CardDescription>
                            Configure how the data should be imported
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">Import Mode</Label>
                            <RadioGroup value={importMode} onValueChange={setImportMode}>
                                <div className="flex items-start space-x-3 space-y-0">
                                    <RadioGroupItem value="replace" id="replace" />
                                    <div className="space-y-1 leading-none">
                                        <Label htmlFor="replace" className="font-medium cursor-pointer">
                                            Replace Existing Data
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Delete all existing data and replace with imported data
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3 space-y-0">
                                    <RadioGroupItem value="append" id="append" />
                                    <div className="space-y-1 leading-none">
                                        <Label htmlFor="append" className="font-medium cursor-pointer">
                                            Append to Existing Data
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Add imported data to existing records (duplicates may occur)
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3 space-y-0">
                                    <RadioGroupItem value="merge" id="merge" />
                                    <div className="space-y-1 leading-none">
                                        <Label htmlFor="merge" className="font-medium cursor-pointer">
                                            Merge with Existing Data
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Update existing records and add new ones (recommended)
                                        </p>
                                    </div>
                                </div>
                            </RadioGroup>
                        </div>

                        <Alert className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
                            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            <AlertDescription className="text-orange-800 dark:text-orange-300">
                                <strong>Warning:</strong> Importing data will modify your database.
                                Make sure to backup your current data before proceeding.
                            </AlertDescription>
                        </Alert>

                        <Button
                            onClick={handleImport}
                            disabled={!selectedFile || isUploading}
                            className="w-full"
                            size="lg"
                        >
                            {isUploading ? "Importing..." : "Import Database"}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Imports History */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Recent Imports
                    </CardTitle>
                    <CardDescription>
                        View your recent database import history
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>File Name</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead>Import Date</TableHead>
                                <TableHead>Records</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentImports.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                        No recent imports found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                recentImports.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                {item.fileName}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{item.fileSize}</TableCell>
                                        <TableCell className="text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</TableCell>
                                        <TableCell>{(item.details as any)?.recordsImported || '-'}</TableCell>
                                        <TableCell>
                                            {item.status === "SUCCESS" ? (
                                                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Success
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive">
                                                    <AlertCircle className="h-3 w-3 mr-1" />
                                                    Failed
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

export function DatabaseManagementTab() {
    return (
        <Tabs defaultValue="download" className="w-full">
            <TabsList>
                <TabsTrigger value="download">
                    <Download className="h-4 w-4 mr-2" />
                    Download Database
                </TabsTrigger>
                <TabsTrigger value="import">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Database
                </TabsTrigger>
            </TabsList>
            <TabsContent value="download">
                <DownloadSection />
            </TabsContent>
            <TabsContent value="import">
                <ImportSection />
            </TabsContent>
        </Tabs>
    );
}
