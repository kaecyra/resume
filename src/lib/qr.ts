import QRCode from "qrcode";

export async function generate_qr_svg(url: string, color: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    color: {
      dark: color,
      light: "#00000000",
    },
    margin: 0,
  });
}
