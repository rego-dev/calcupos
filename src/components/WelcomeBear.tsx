"use client";

import Image from "next/image";

export default function WelcomeBear() {
  return (
    <div className="bear-container pointer-events-none">
      <style jsx global>{`
        @keyframes pandaFade {
          0% { right: -150px; opacity: 0; }
          15% { right: 40px; opacity: 1; }
          80% { right: 40px; opacity: 1; }
          100% { right: 40px; opacity: 0; }
        }
        @keyframes bubblePop {
          0%, 15% { opacity: 0; transform: scale(0); }
          20% { opacity: 1; transform: scale(1); }
          75% { opacity: 1; transform: scale(1); }
          80% { opacity: 0; transform: scale(0); }
          100% { opacity: 0; transform: scale(0); }
        }
        .bear-container {
          position: fixed;
          bottom: 20px;
          right: 40px;
          z-index: 50;
          animation: pandaFade 7s ease-in-out forwards;
          width: 200px;
          height: 200px;
        }
        .panda-sprite {
          width: 100%;
          height: 100%;
        }
        .speech-bubble {
          position: absolute;
          top: -40px;
          right: 20px;
          background: white;
          padding: 10px 20px;
          border-radius: 20px;
          font-weight: bold;
          color: #333;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          animation: bubblePop 7s ease-in-out forwards;
          white-space: nowrap;
        }
        .speech-bubble::after {
          content: '');
          position: absolute;
          bottom: -10px;
          right: 20px;
          border-width: 10px 10px 0;
          border-color: white transparent transparent;
        }
      `}</style>
      <div className="speech-bubble text-lg font-vintage">Hello CalcuPOS!</div>
      <div className="panda-sprite">
        <img
          src="/images/panda.png"
          alt="Welcome Panda"
          className="w-full h-full object-contain drop-shadow-2xl"
        />
      </div>
    </div>
  );
}
