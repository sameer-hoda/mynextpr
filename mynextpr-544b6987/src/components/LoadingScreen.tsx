import React from 'react';

interface LoadingScreenProps {
    message?: string;
    subMessage?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
    message = "Identifying key joints...",
    subMessage = "This usually takes 50-60 seconds"
}) => {
    return (
        <main className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-[#EBF5FF] to-[#FFFFFF] p-6">
            {/* Visual Content */}
            <div className="relative flex justify-center items-center">
                <img
                    alt="3D blue running shoes icon"
                    className="w-[280px] h-auto object-contain mix-blend-multiply animate-pulse-slow"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-qX7JmzaFDZzuJfpBfcYrXK_0AGr88_81jbkTEEH5mlbEX7JECU6jJ5krOL5uFT1xaC4P1u5MZIINsYYiL57vD2uVqt3ixzh06uPTk8b6TgVvY4YHnvz1g2CS9wqm7VVfd93SOQjQJDpiTrw-YVeDe0P7F_7eqv5NzDwfghwebgODLYpGUecEzhOU8jNBZRzbsnaJoqQPr5OEPDtVywqpvgoZ7EsLfToG_gvzB4smrXJ3oxoXLVwy6zM-1yOLYZgOjHUzLVNHFImL"
                />
            </div>

            {/* Text Content */}
            <div className="text-center">
                <h1 className="mt-6 text-2xl font-bold text-[#0F172A] tracking-tight">
                    {message}
                </h1>
                <p className="mt-2 text-base text-[#64748B]">
                    {subMessage}
                </p>
            </div>
        </main>
    );
};

export default LoadingScreen;
