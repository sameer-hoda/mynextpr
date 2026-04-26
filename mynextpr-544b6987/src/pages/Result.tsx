import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, Share2, LogOut, Video, Lock, Plus } from "lucide-react";
import { toast } from "sonner";
import { googleLogout } from '@react-oauth/google';
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface HistoryItem {
    id: string;
    timestamp: string;
    image_url: string;
}

interface Quota {
    usage_count: number;
    is_unlimited: boolean;
    limit: number;
}

const Result = () => {
    const location = useLocation();
    const navigate = useNavigate();
    // Initial state from navigation or null
    const [currentImage, setCurrentImage] = useState<string | null>(location.state?.imageUrl || null);
    const [currentId, setCurrentId] = useState<string | null>(location.state?.id || null);

    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [quota, setQuota] = useState<Quota | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    const token = localStorage.getItem('google_token');

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }

        const fetchData = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

                // Fetch History
                const historyRes = await fetch(`${apiUrl}/api/history`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (historyRes.ok) {
                    const historyData = await historyRes.json();
                    // Fix image URLs if they are relative
                    const processedHistory = historyData.map((item: HistoryItem) => ({
                        ...item,
                        image_url: item.image_url.startsWith('http') ? item.image_url : `${apiUrl}${item.image_url}`
                    }));
                    setHistory(processedHistory);

                    // If no current image but we have history, show the latest
                    if (!currentImage && processedHistory.length > 0) {
                        setCurrentImage(processedHistory[0].image_url);
                        setCurrentId(processedHistory[0].id);
                    }
                }

                // Fetch Quota
                const quotaRes = await fetch(`${apiUrl}/api/quota`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (quotaRes.ok) {
                    const quotaData = await quotaRes.json();
                    setQuota(quotaData);
                }
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setIsLoadingHistory(false);
            }
        };

        fetchData();
    }, [token, navigate, currentImage]);

    const handleShare = () => {
        const shareUrl = currentId ? `https://mynextpr.com/share/${currentId}` : "https://mynextpr.com";
        navigator.clipboard.writeText(`Check out my running form analysis! ${shareUrl}`);
        window.open(`https://wa.me/?text=${encodeURIComponent(`Check out my running form analysis! ${shareUrl}`)}`, "_blank");
        toast.success("Link copied & WhatsApp opened!");
    };

    const handleLogout = () => {
        googleLogout();
        localStorage.removeItem('google_token');
        navigate("/login");
    };

    const logClientStatus = async (status: string, errorMessage?: string) => {
        if (!currentId) return;
        try {
            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
            await fetch(`${apiUrl}/api/log_client_status`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    request_id: currentId,
                    status: status,
                    error_message: errorMessage
                })
            });
        } catch (e) {
            console.error("Failed to log client status", e);
        }
    };

    const isQuotaExceeded = quota ? (quota.usage_count >= quota.limit && !quota.is_unlimited) : false;

    return (
        <div className="h-[100dvh] w-screen bg-white text-gray-900 font-sans flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
            {/* Main Content (Image & Header) */}
            <main className="flex-none md:flex-1 flex flex-col min-h-[50vh] md:h-full overflow-visible md:overflow-hidden bg-gray-50/50 relative order-1 md:order-2">
                {/* Header Overlay - Relative on mobile to prevent overlap, Absolute on desktop */}
                <header className="relative md:absolute top-0 left-0 right-0 h-auto md:h-16 flex items-center justify-end px-4 py-4 md:px-6 z-10 bg-white md:bg-transparent border-b md:border-none border-gray-100">
                    <div className="flex items-center gap-2 md:gap-3 pointer-events-auto bg-white/80 backdrop-blur-sm p-1 md:p-2 rounded-full shadow-sm border border-gray-100 md:border-gray-100">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleShare}
                            className="rounded-full hover:bg-blue-50 text-brand-primary text-xs md:text-sm h-8 md:h-9"
                        >
                            <Share2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                            Share
                        </Button>
                        {currentImage && (
                            <a href={currentImage} download="mynextpr-blueprint.png">
                                <Button size="sm" variant="default" className="bg-black hover:bg-gray-800 text-white rounded-full text-xs md:text-sm h-8 md:h-9">
                                    <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                                    Download
                                </Button>
                            </a>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleLogout}
                            className="rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50 h-8 w-8 md:h-9 md:w-9"
                            title="Logout"
                        >
                            <LogOut className="w-3 h-3 md:w-4 md:h-4" />
                        </Button>
                    </div>
                </header>

                {/* Image Viewer */}
                <div className="flex-1 flex items-center justify-center p-4 md:p-10 overflow-hidden min-h-[300px]">
                    {currentImage ? (
                        <img
                            key={currentImage}
                            src={currentImage}
                            alt="Gait Analysis Blueprint"
                            className="w-full h-auto md:max-w-full md:max-h-full object-contain shadow-2xl rounded-lg"
                            onLoad={() => logClientStatus("RENDERED")}
                            onError={(e) => logClientStatus("RENDER_FAILED", "Image failed to load")}
                        />
                    ) : (
                        <div className="text-center text-gray-400">
                            <p>Select an analysis from the sidebar</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Sidebar (History & Actions) */}
            <aside className="w-full md:w-80 border-r-0 md:border-r border-t md:border-t-0 border-gray-200 bg-gray-50 flex flex-col shrink-0 order-2 md:order-1 h-auto md:h-full pb-8 md:pb-0">

                {/* Mobile: Action Buttons appear FIRST (below image) */}
                {/* Desktop: Action Buttons appear LAST (at bottom) */}
                <div className="p-4 border-t md:border-t-0 border-b-0 md:border-t border-gray-200 bg-white space-y-3 order-1 md:order-3">
                    {/* Quota Action - Primary Call to Action */}
                    {isQuotaExceeded ? (
                        <Button
                            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 py-6 text-lg shadow-lg"
                            onClick={() => navigate("/payment")}
                        >
                            <Lock className="w-5 h-5 mr-2" />
                            Unlock Unlimited Analysis
                        </Button>
                    ) : (
                        <Button
                            className="w-full py-6 text-lg shadow-md bg-brand-primary hover:bg-brand-primary-hover"
                            onClick={() => navigate("/upload")}
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Upload New Image
                        </Button>
                    )}

                    {/* Video Analysis Popup */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full justify-center text-gray-700 border-dashed border-gray-300">
                                <Video className="w-4 h-4 mr-2" />
                                Detailed Video Analysis
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Get Detailed Video Analysis</DialogTitle>
                                <DialogDescription>
                                    Want a deeper dive into your running form?
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <p className="text-sm text-gray-600 mb-4">
                                    For a comprehensive video breakdown and personalized coaching plan, write to me directly.
                                </p>
                                <Button className="w-full" onClick={() => window.location.href = "mailto:sameer.hoda@gmail.com?subject=Video Analysis Request"}>
                                    Email sameer.hoda@gmail.com
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Header */}
                <div className="p-6 border-b border-gray-200 order-2 md:order-1">
                    <h2 className="font-bold text-xl tracking-tight">Your Analyses</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {quota ? `${quota.usage_count} / ${quota.is_unlimited ? '∞' : quota.limit} analyses used` : 'Loading...'}
                    </p>
                </div>

                {/* History List */}
                <ScrollArea className="flex-1 h-auto md:h-auto order-3 md:order-2">
                    <div className="p-4 space-y-3">
                        {isLoadingHistory ? (
                            <div className="text-center py-10 text-gray-400">Loading history...</div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">No analyses yet.</div>
                        ) : (
                            history.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        setCurrentImage(item.image_url);
                                        setCurrentId(item.id);
                                        // On mobile, scroll to top to see image
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className={`
                                        cursor-pointer rounded-lg border p-2 transition-all hover:shadow-md flex gap-3 items-center
                                        ${currentId === item.id ? 'border-brand-primary bg-blue-50/50 ring-1 ring-brand-primary' : 'border-gray-200 bg-white'}
                                    `}
                                >
                                    <div className="w-16 h-16 rounded bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                                        <img src={item.image_url} alt="Analysis" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">Analysis</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(item.timestamp).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </aside>
        </div>
    );
};

export default Result;
