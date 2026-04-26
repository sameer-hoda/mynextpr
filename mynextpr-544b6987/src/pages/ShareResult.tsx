import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LoadingScreen from "@/components/LoadingScreen";
import { toast } from "sonner";

const ShareResult = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchResult = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
                const response = await fetch(`${apiUrl}/api/share/${id}`);

                if (!response.ok) throw new Error("Result not found");

                const data = await response.json();
                const fullImageUrl = data.image_url.startsWith('http')
                    ? data.image_url
                    : `${apiUrl}${data.image_url}`;

                setImageUrl(fullImageUrl);
            } catch (err) {
                console.error(err);
                setError(true);
                toast.error("Could not load analysis result.");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchResult();
        }
    }, [id]);

    if (loading) return <LoadingScreen message="Loading analysis..." />;

    if (error || !imageUrl) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Analysis Not Found</h1>
                <p className="text-gray-600 mb-8">This analysis link may be invalid or expired.</p>
                <Button onClick={() => navigate("/")}>Go Home</Button>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-white text-gray-900 font-sans overflow-hidden flex flex-col">
            {/* Header */}
            <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50 flex items-center justify-between px-6 shrink-0">
                <span className="font-semibold text-lg tracking-tight text-brand-primary">MyNextPR Analysis</span>
                <Button onClick={() => navigate("/")} className="bg-brand-primary hover:bg-brand-primary-hover text-white rounded-full px-6">
                    Start Your Analysis
                </Button>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-4 md:p-6 overflow-hidden bg-gray-50/50">
                <div className="relative w-full h-full flex flex-col items-center justify-center gap-6">
                    <img
                        src={imageUrl}
                        alt="Shared Gait Analysis Blueprint"
                        className="max-w-full max-h-[80vh] object-contain shadow-2xl"
                    />
                </div>
            </main>
        </div>
    );
};

export default ShareResult;
