import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  level?: "L" | "M" | "Q" | "H";
  includeMargin?: boolean;
  className?: string;
}

export default function QRCodeGenerator({
  value,
  size = 256,
  level = "M",
  includeMargin = true,
  className = "",
}: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(
        canvasRef.current,
        value,
        {
          width: size,
          margin: includeMargin ? 2 : 0,
          errorCorrectionLevel: level,
        },
        (error: any) => {
          if (error) {
            console.error("خطأ في توليد QR Code:", error);
          }
        }
      );
    }
  }, [value, size, level, includeMargin]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
    />
  );
}
