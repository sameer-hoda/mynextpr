import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Smartphone, Monitor } from "lucide-react";

const Payment = () => {
    const navigate = useNavigate();

    // UPI Configuration
    const vpa = "9967151186@upi";
    const amount = "199";
    const name = "MyNextPR";
    const note = "Unlimited Gait Analysis";

    // Construct Deep Link
    const upiDeepLink = `upi://pay?pa=${vpa}&pn=${name}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

    // Construct QR Code URL (Google Charts API)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiDeepLink)}`;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 font-sans">
            <div className="max-w-md w-full bg-white p-6 md:p-8 rounded-3xl shadow-2xl border border-gray-100">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-primary/10 text-brand-primary mb-4">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Unlock Unlimited Access</h1>
                    <p className="text-gray-500 mt-2">Get lifetime access to AI Gait Analysis</p>
                </div>

                {/* Price Tag */}
                <div className="text-center mb-8">
                    <span className="text-4xl font-bold text-gray-900">₹{amount}</span>
                    <span className="text-gray-400 ml-2 text-lg line-through">₹999</span>
                    <div className="mt-2 inline-block bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                        Limited Time Offer
                    </div>
                </div>

                {/* Mobile CTA - Primary */}
                <div className="mb-8 md:hidden">
                    <a
                        href={upiDeepLink}
                        className="flex items-center justify-center w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-4 px-6 rounded-xl shadow-lg transform transition-transform active:scale-95"
                    >
                        <Smartphone className="w-5 h-5 mr-2" />
                        Pay ₹{amount} via UPI App
                    </a>
                    <p className="text-xs text-center text-gray-400 mt-3">
                        Tap to open GPay, PhonePe, Paytm, etc.
                    </p>
                </div>

                {/* Desktop/QR Section */}
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 text-center mb-8">
                    <div className="hidden md:block mb-4 text-sm font-medium text-gray-600">
                        Scan with any UPI App
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow-sm inline-block border border-gray-100">
                        <img
                            src={qrCodeUrl}
                            alt="Scan to Pay"
                            className="w-48 h-48 object-contain"
                        />
                    </div>
                    <div className="mt-4 font-mono text-sm bg-white border border-gray-200 py-2 px-3 rounded-lg inline-block text-gray-600 select-all">
                        {vpa}
                    </div>
                </div>

                {/* Instructions */}
                <div className="space-y-4 mb-8">
                    <div className="flex gap-3 items-start p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="shrink-0 w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                        <div>
                            <p className="font-semibold text-gray-900 text-sm">Complete Payment</p>
                            <p className="text-xs text-gray-600 mt-0.5">Use the button above or scan the QR code.</p>
                        </div>
                    </div>

                    <div className="flex gap-3 items-start p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="shrink-0 w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                        <div>
                            <p className="font-semibold text-gray-900 text-sm">Verify via WhatsApp</p>
                            <p className="text-xs text-gray-600 mt-0.5">
                                Send screenshot + your email to <strong>9967151186</strong>
                            </p>
                            <a
                                href="https://wa.me/919967151186?text=Hi%2C%20I%20have%20paid%20Rs%20199%20for%20MyNextPR%20Unlimited.%20Here%20is%20my%20screenshot%20and%20email%3A%20"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-brand-primary hover:underline mt-1 inline-block"
                            >
                                Open WhatsApp →
                            </a>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center">
                    <p className="text-xs text-gray-400 mb-4">
                        Access unlocked within 24 hours of verification.
                    </p>
                    <Button
                        variant="ghost"
                        className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                        onClick={() => navigate("/")}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Payment;
