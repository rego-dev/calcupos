"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Order, Customer, ShippingStatus, CompanyProfile } from "@/lib/types";
import { getAllOrders } from "@/app/(app)/orders/actions";
import { getCustomers } from "@/app/(app)/customers/actions";
import { getCompanyProfile } from "@/app/(app)/settings/actions";
import { startOfWeek, startOfMonth, startOfYear, endOfToday, isWithinInterval, format } from "date-fns";
import { Loader2, CheckCircle2 } from "lucide-react";

function DashboardPrintContent() {
    const searchParams = useSearchParams();
    const timeframe = (searchParams.get("timeframe") as "week" | "month" | "year") || "month";

    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [status, setStatus] = useState<'loading' | 'generating' | 'done'>('loading');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [ordersData, customersData, profile] = await Promise.all([
                    getAllOrders(),
                    getCustomers(),
                    getCompanyProfile()
                ]);

                // Extract bundles from result object
                const orders = (ordersData as any).orders || [];

                setAllOrders(orders);
                setAllCustomers(customersData);
                setCompanyProfile(profile);
                setIsLoaded(true);
            } catch (error) {
                console.error("Failed to fetch dashboard print data", error);
            }
        };
        fetchData();
    }, []);

    const filteredData = useMemo(() => {
        const now = new Date();
        let startDate: Date;

        if (timeframe === 'week') startDate = startOfWeek(now);
        else if (timeframe === 'month') startDate = startOfMonth(now);
        else startDate = startOfYear(now);

        const endDate = endOfToday();

        const filteredOrders = allOrders.filter(order => {
            const orderDate = new Date(order.orderDate);
            return isWithinInterval(orderDate, { start: startDate, end: endDate }) && order.shippingStatus === 'Delivered';
        });

        const filteredCustomers = allCustomers.filter(customer => {
            const firstOrder = (customer.orderHistory || []).reduce((earliest, current) => {
                if (!earliest) return current;
                return new Date(current.date) < new Date(earliest.date) ? current : earliest;
            }, null as { date: string } | null);

            if (!firstOrder) return false;

            const creationDate = new Date(firstOrder.date);
            return isWithinInterval(creationDate, { start: startDate, end: endDate });
        });

        return { orders: filteredOrders, customers: filteredCustomers };
    }, [timeframe, allOrders, allCustomers]);

    const { orders: filteredOrders, customers: filteredCustomers } = filteredData;

    const summaryData = useMemo(() => {
        const dataMap: Record<string, {
            period: string,
            dateObj: Date,
            orders: number,
            revenue: number,
            productIncomes: Record<string, number>,
        }> = {};

        filteredOrders.forEach(order => {
            const date = new Date(order.orderDate);
            let periodKey: string;
            let periodLabel: string;

            if (timeframe === 'year') {
                periodKey = format(date, "yyyy-MM");
                periodLabel = format(date, "MMMM yyyy");
            } else {
                periodKey = format(date, "yyyy-MM-dd");
                periodLabel = format(date, "MMM dd, yyyy");
            }

            if (!dataMap[periodKey]) {
                dataMap[periodKey] = {
                    period: periodLabel,
                    dateObj: date,
                    orders: 0,
                    revenue: 0,
                    productIncomes: {},
                };
            }

            const entry = dataMap[periodKey];
            entry.orders += 1;
            entry.revenue += order.totalAmount;

            if (order.items && order.items.length > 0) {
                order.items.forEach((item: any) => {
                    const name = item.product?.name || item.productName || "Unknown Item";
                    const val = item.quantity * (item.product?.retailPrice || item.product?.cost || 0);
                    entry.productIncomes[name] = (entry.productIncomes[name] || 0) + val;
                });
            } else {
                const name = order.itemName;
                entry.productIncomes[name] = (entry.productIncomes[name] || 0) + order.totalAmount;
            }
        });

        return Object.values(dataMap)
            .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime())
            .map(item => {
                // Find Top Product
                let topProduct = "N/A";
                let maxRev = -1;
                Object.entries(item.productIncomes).forEach(([name, rev]) => {
                    if (rev > maxRev) {
                        maxRev = rev;
                        topProduct = name;
                    }
                });

                return {
                    period: item.period,
                    orders: item.orders,
                    revenue: item.revenue,
                    topProduct,
                };
            });
    }, [filteredOrders, timeframe]);

    useEffect(() => {
        if (isLoaded && status === 'loading') {
            const timer = setTimeout(() => {
                setStatus('generating');
                generateAndOpenPdf();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isLoaded, status]);

    const generateAndOpenPdf = async () => {
        const element = document.getElementById('dashboard-report-content');
        if (!element) return;

        const opt = {
            margin: 0,
            filename: `dashboard-report-${timeframe}-${format(new Date(), "yyyy-MM-dd")}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
        };

        try {
            // @ts-ignore
            const html2pdf = (await import('html2pdf.js')).default;
            await html2pdf().set(opt).from(element).save();
            setStatus('done');

            // Try to close the window after a short delay
            setTimeout(() => {
                window.close();
            }, 1500);
        } catch (error) {
            console.error("PDF generation failed", error);
            setStatus('done');
        }
    };

    if (!isLoaded) return null;

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center">
            {/* Status Overlay */}
            {(status === 'loading' || status === 'generating') && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                    <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
                    <h2 className="text-2xl font-bold text-slate-800">
                        {status === 'loading' ? 'Loading Data...' : 'Generating PDF...'}
                    </h2>
                    <p className="text-slate-500 mt-2">Please wait while we prepare your report.</p>
                </div>
            )}

            {status === 'done' && (
                <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center text-center p-4">
                    <CheckCircle2 className="h-20 w-20 text-green-500 mb-6" />
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">Download Complete!</h2>
                    <p className="text-slate-600 mb-8 max-w-md">
                        Your dashboard report has been downloaded. You can safely close this tab or we will close it for you shortly.
                    </p>
                    <button
                        onClick={() => window.close()}
                        className="px-6 py-3 bg-slate-900 text-white rounded-md font-medium hover:bg-slate-800 transition-colors"
                    >
                        Close Tab
                    </button>
                </div>
            )}

            <div className="opacity-0 pointer-events-none absolute -z-10">
                <div id="dashboard-report-content" className="bg-white p-[40px] w-[210mm] min-h-[297mm] text-slate-800 font-sans mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h1 className="text-4xl font-bold text-slate-700 tracking-tight">Dashboard Summary</h1>
                            <p className="text-slate-500 mt-1 font-medium italic">{companyProfile?.companyName || 'FlowCart Sync'} Analytics Engine</p>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-2 justify-end mb-1">
                                {companyProfile?.logoUrl ? (
                                    <img src={companyProfile.logoUrl} alt={companyProfile.companyName} className="h-8 w-8 rounded object-cover" />
                                ) : (
                                    <div className="h-8 w-8 bg-slate-800 rounded flex items-center justify-center">
                                        <span className="text-white font-bold text-sm">TF</span>
                                    </div>
                                )}
                                <span className="text-xl font-bold text-slate-700">{companyProfile?.companyName || 'FlowCart Sync'}</span>
                            </div>
                            <p className="text-xs text-slate-400">Generated: {format(new Date(), "PP pp")}</p>
                        </div>
                    </div>

                    {/* Period & Scope */}
                    <div className="bg-slate-50 p-6 mb-8 rounded-lg border border-slate-100 grid grid-cols-2 gap-8 text-sm">
                        <div>
                            <h3 className="text-slate-400 font-bold uppercase tracking-wider mb-2 text-[10px]">Report Parameters</h3>
                            <p className="font-bold text-slate-700 text-base">{timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}ly Performance Review</p>
                            <p className="text-slate-500 mt-1 flex items-center gap-1">
                                Period: <span className="font-semibold text-slate-600">
                                    {timeframe === 'week' ? 'Past 7 Days' : timeframe === 'month' ? 'Past 30 Days' : 'Past 365 Days'}
                                </span>
                            </p>
                        </div>
                        <div className="text-right">
                            <h3 className="text-slate-400 font-bold uppercase tracking-wider mb-2 text-[10px]">Store Context</h3>
                            <p className="text-slate-700 font-medium">Main Hub / System Dashboard</p>
                            <p className="text-slate-400 text-xs mt-1">Status: Operational - Verified</p>
                        </div>
                    </div>

                    {/* Consolidated Summary Table */}
                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-l-4 border-slate-800 pl-3">Comprehensive Performance Summary</h3>
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-800 text-white">
                                    <th className="py-3 px-4 text-left font-semibold rounded-tl-lg">Period</th>
                                    <th className="py-3 px-4 text-left font-semibold">Top Product</th>
                                    <th className="py-3 px-4 text-right font-semibold">Orders</th>
                                    <th className="py-3 px-4 text-right font-semibold rounded-tr-lg">Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summaryData.map((row, index) => (
                                    <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                                        <td className="py-3 px-4 font-bold text-slate-700 align-top">{row.period}</td>
                                        <td className="py-3 px-4 text-slate-600 align-top">{row.topProduct}</td>
                                        <td className="py-3 px-4 text-right align-top">{row.orders}</td>
                                        <td className="py-3 px-4 text-right font-bold text-slate-800 align-top">₱{row.revenue.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {summaryData.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-6 text-center text-slate-400 italic">No consolidated data available for this timeframe</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-10 border-t border-slate-100 text-[10px] text-slate-300 flex justify-between items-center break-inside-avoid">
                        <p>© {new Date().getFullYear()} {companyProfile?.companyName || 'FlowCart Sync'} Professional Series Report</p>
                        <p className="flex items-center gap-2">
                            <span className="h-1 w-1 bg-slate-200 rounded-full"></span>
                            Confidential Business Intelligence
                            <span className="h-1 w-1 bg-slate-200 rounded-full"></span>
                            Internal Use Only
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function DashboardPrintPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center bg-white h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 text-blue-600 animate-spin" /></div>}>
            <DashboardPrintContent />
        </Suspense>
    );
}
