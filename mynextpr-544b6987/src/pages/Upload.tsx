import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import LoadingScreen from "@/components/LoadingScreen";

const Upload = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("Identifying key joints...");

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        if (file.size > 1024 * 1024) {
            toast.error("File size must be less than 1MB");
            return;
        }

        setIsLoading(true);

        // Dynamic loading text simulation
        const texts = [
            "Identifying key joints...",
            "Calculating angles...",
            "Generating blueprint...",
            "Applying vintage aesthetic...",
            "Finalizing output..."
        ];

        let textIndex = 0;
        const textInterval = setInterval(() => {
            textIndex = (textIndex + 1) % texts.length;
            setLoadingText(texts[textIndex]);
        }, 4000);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
            const token = localStorage.getItem('google_token');
            if (!token) {
                toast.error("Please login first");
                navigate("/login");
                return;
            }

            const response = await fetch(`${apiUrl}/api/generate`, {
                method: "POST",
                body: formData,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error("Session expired. Please login again.");
                    navigate("/login");
                    return;
                }
                if (response.status === 402) {
                    navigate("/payment");
                    return;
                }

                const errorData = await response.json();
                if (response.status === 400 && errorData.detail === "NO_RUNNER_DETECTED") {
                    throw new Error("NO_RUNNER_DETECTED");
                }
                throw new Error("Generation failed");
            }

            const data = await response.json();
            // Construct full URL if it's relative
            const fullImageUrl = data.image_url.startsWith('http')
                ? data.image_url
                : `${apiUrl}${data.image_url}`;

            clearInterval(textInterval);
            navigate("/result", { state: { imageUrl: fullImageUrl, id: data.id } });

        } catch (error: any) {
            console.error(error);
            setIsLoading(false);
            clearInterval(textInterval);

            if (error.message === "NO_RUNNER_DETECTED") {
                toast.error("No runner detected! Please upload a clear photo of a runner.");
            } else {
                toast.error("Failed to generate image. Please try again.");
            }
        }
    }, [navigate]);

    const { getRootProps, getInputProps, open } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png']
        },
        maxFiles: 1,
        noClick: true // We'll handle click on the button manually
    });

    if (isLoading) {
        return <LoadingScreen message={loadingText} />;
    }

    return (
        <div className="antialiased font-sans text-brand-dark flex flex-col items-center justify-start h-[100dvh] overflow-y-auto relative bg-[#e0f2fe]">
            {/* Background Overlay */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `
            radial-gradient(circle at 15% 15%, rgba(255, 255, 255, 0.8) 0%, transparent 45%),
            radial-gradient(circle at 85% 30%, rgba(219, 234, 254, 0.8) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 90%, #bfdbfe 0%, transparent 60%)
          `,
                    backgroundRepeat: 'no-repeat',
                    backgroundAttachment: 'fixed',
                    backgroundSize: 'cover'
                }}
            />

            {/* Header */}
            <header className="w-full max-w-md px-6 pt-12 pb-4 flex items-center justify-between relative z-10">
                {/* Back Button */}
                <button
                    onClick={() => navigate("/")}
                    aria-label="Go back"
                    className="p-2 -ml-2 rounded-full hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                >
                    <svg className="w-6 h-6 text-brand-dark" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15.75 19.5L8.25 12l7.5-7.5" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                </button>
                {/* Title */}
                <h1 className="text-xl font-bold text-brand-dark tracking-tight absolute left-1/2 transform -translate-x-1/2">
                    MyNextPR
                </h1>
                {/* Empty div to balance flex layout */}
                <div className="w-6"></div>
            </header>

            {/* Main Content */}
            <main className="flex-grow flex items-center justify-center w-full max-w-md px-6 pb-12 relative z-10">
                {/* Upload Card */}
                <section
                    {...getRootProps()}
                    className="bg-white w-full rounded-[32px] shadow-card-3d p-8 flex flex-col items-center text-center relative overflow-hidden focus:outline-none"
                >
                    <input {...getInputProps()} />

                    {/* Decorative pseudo-element for 3D bottom edge/shadow effect */}
                    <div className="absolute bottom-0 left-0 right-0 h-2 bg-blue-100/50 pointer-events-none"></div>

                    {/* Runner Illustration */}
                    <div className="mb-6 w-full flex justify-center">
                        <img
                            alt="Illustration of a female runner"
                            className="h-48 w-auto object-contain mix-blend-multiply opacity-90"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCB6zmZpE668sKwOc5G4KYV1xQlUp_4uYAaVVtmWbF6BFZr3VyWqcpq8y6JS3Ojotbvk-0NF8nBCS4XT1x7nf7zQSDK_wMcciYKvgBcUSpHcG2_boFN9MBKIdNNsX8scFPVRoxxccG2lsB88m5BIJwGiZuWzo5-qTXt_luP_kdPL0u2CqOfzqcNo5h9pHMYmvmsdyPy2BVqIcEPsKVEkBqLLTsSwipPtsNzS7YSI2traqZKdg3cdsbiUBxwYBLjf4AdL_x3ylKRnxMH"
                        />
                    </div>

                    {/* Text Content */}
                    <div className="space-y-2 mb-8">
                        <h2 className="text-xl font-semibold text-brand-dark">
                            Upload your running photo
                        </h2>
                        <div className="text-sm text-slate-500 font-medium leading-relaxed">
                            <p>Drag & drop or click to browse</p>
                            <p className="text-slate-400 mt-0.5 text-xs">Supported: JPG, PNG • Max: 1MB</p>
                            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-left w-full max-w-sm mx-auto mt-4">
                                <div className="flex items-center gap-2 mb-2 text-brand-dark font-semibold">
                                    <span className="text-xl">💡</span>
                                    <span>For best results:</span>
                                </div>
                                <ul className="space-y-1.5 text-sm text-gray-600 ml-1">
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1 w-1 h-1 rounded-full bg-brand-primary shrink-0" />
                                        Ensure runner is clearly in focus
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1 w-1 h-1 rounded-full bg-brand-primary shrink-0" />
                                        Avoid crowded shots with multiple runners
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1 w-1 h-1 rounded-full bg-brand-primary shrink-0" />
                                        Full body visibility is preferred
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        type="button"
                        onClick={open}
                        className="bg-brand-primary hover:bg-brand-primary-hover text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto min-w-[200px]"
                    >
                        Upload Image
                    </button>
                </section>
            </main>
        </div>
    );
};

export default Upload;
