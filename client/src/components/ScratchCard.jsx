import { useRef, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { setReward } from "../redux/slices/rewardSlice";
import { generateReward, getRewardCoins, checkOrderScratched } from "../services/rewardService";

export default function ScratchCard({ reward, orderId }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [scratched, setScratched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [revealedCoins, setRevealedCoins] = useState(reward ?? null);
  const [alreadyScratched, setAlreadyScratched] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#C0C0C0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Check if this order was already scratched on mount
  useEffect(() => {
    const checkScratchStatus = async () => {
      if (!orderId) {
        setIsLoading(false);
        return;
      }

      try {
        const token = user?.token || null;
        const isJwt = typeof token === "string" && token.split(".").length === 3;
        
        if (!isJwt) {
          // Not logged in, show scratch card normally
          setIsLoading(false);
          return;
        }

        const data = await checkOrderScratched(orderId, token);
        
        if (data?.alreadyScratched) {
          setAlreadyScratched(true);
          setRevealedCoins(data?.coins ?? 0);
          setScratched(true);
        }
      } catch (err) {
        console.error("Error checking scratch status:", err);
        // If there's an error, allow scratching normally
      } finally {
        setIsLoading(false);
      }
    };

    checkScratchStatus();
  }, [orderId, user?.token]);

  const startScratch = (e) => {
    if (scratched) return;
    setIsDrawing(true);
    scratch(e);
  };

  const stopScratch = () => {
    setIsDrawing(false);
    if (!scratched) checkCompletion();
  };

  const scratch = (e) => {
    if (!isDrawing || scratched) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();

    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();

    // Check completion after each scratch stroke
    checkCompletion();
  };

  const checkCompletion = async () => {
    if (isSaving || scratched) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    let transparentPixels = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparentPixels++;
    }

    const percent = (transparentPixels / (canvas.width * canvas.height)) * 100;

    if (percent > 50 && !scratched) {
      setScratched(true);
      setIsSaving(true);
      try {
        const token = user?.token || null;
        const isJwt =
          typeof token === "string" && token.split(".").length === 3;
        if (!isJwt) {
          toast.error("Please log in with a user account to save rewards.");
          return;
        }

        const data = await generateReward(token, orderId);
        
        // Handle already scratched case
        if (data?.alreadyScratched) {
          setAlreadyScratched(true);
          setRevealedCoins(data?.coins ?? 0);
          toast.info("You have already scratched this order");
          return;
        }

        const rawCoins =
          data?.coins ??
          data?.coinsWon ??
          data?.reward?.coins ??
          data?.data?.coins ??
          0;
        const coins = Number(rawCoins) || 0;

        setRevealedCoins(coins);

        if (typeof data?.totalCoins === "number") {
          dispatch(setReward(data.totalCoins));
        } else {
          const latest = await getRewardCoins(token);
          dispatch(setReward(latest.coins ?? 0));
        }

        if (coins > 0) {
          toast.success(`${coins} Coins added to your account!`);
        } else {
          toast.error("Reward not available");
        }
      } catch (err) {
        console.error("Scratch card error:", err);
        const status = err?.response?.status;
        const message = err?.response?.data?.message;
        
        if (status === 401) {
          toast.error("Session expired. Please log in again.");
        } else if (status === 400 && message) {
          toast.error(message);
        } else if (!err?.response) {
          toast.error("Cannot connect to server. Please check if the server is running.");
        } else if (message) {
          toast.error(message);
        } else {
          toast.error("Failed to save reward. Please try again.");
        }
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="relative w-full max-w-[18.75rem] h-50 mx-auto mt-8 overflow-hidden rounded-2xl shadow-lg">
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100 rounded-2xl border border-amber-200">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg mb-3">
          <span className="text-white text-xl font-bold">✦</span>
        </div>
        <h2 className="text-lg font-extrabold text-amber-800">
          {alreadyScratched ? `${revealedCoins} Coins Earned` : 
           revealedCoins === null ? "Scratch & Win!" : `${revealedCoins} Coins Earned!`}
        </h2>
        <p className="text-sm text-amber-700 mt-1 font-medium">
          {alreadyScratched ? "Reward claimed" : 
           revealedCoins === null ? "Slide to reveal your reward" : "🎉 Congratulations!"}
        </p>
        {revealedCoins !== null && revealedCoins > 0 && (
          <div className="mt-3 flex items-center gap-1.5 bg-amber-200/60 px-4 py-1.5 rounded-full">
            <span className="text-amber-900 font-black text-xl">{revealedCoins}</span>
            <span className="text-amber-800 text-xs font-bold uppercase tracking-wide">Coins</span>
          </div>
        )}
      </div>

      <canvas
        ref={canvasRef}
        width={300}
        height={200}
        className={`absolute inset-0 cursor-pointer transition-opacity duration-500 ${
          scratched || alreadyScratched ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        onMouseDown={startScratch}
        onMouseUp={stopScratch}
        onMouseMove={scratch}
        onMouseLeave={stopScratch}
        onTouchStart={(e) => {
          if (scratched) return;
          setIsDrawing(true);
          scratch(e);
        }}
        onTouchMove={scratch}
        onTouchEnd={stopScratch}
      />
    </div>
  );
}
