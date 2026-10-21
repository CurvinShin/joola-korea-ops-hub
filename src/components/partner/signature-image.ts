// 올린 서명·직인 이미지(PNG/JPG)를 흰 배경의 작은 PNG data URL로 바꾼다(사진 원본은 너무 커서 저장하지 않는다).
export const SIGNATURE_MAX_CHARS = 280_000; // 서버 한도(300,000자)보다 조금 작게

export async function imageFileToPng(file: File, maxWidth = 480, maxHeight = 200): Promise<string> {
  if (!/^image\/(png|jpe?g)$/.test(file.type)) throw new Error("PNG 또는 JPG 이미지만 올릴 수 있습니다.");
  if (file.size > 10 * 1024 * 1024) throw new Error("파일이 너무 큽니다. 10MB 이하 이미지를 올려 주세요.");

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("이미지를 읽지 못했습니다. 다른 파일을 올려 주세요."));
      el.src = url;
    });
    let scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
    for (let i = 0; i < 5; i++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const png = canvas.toDataURL("image/png");
      if (png.length <= SIGNATURE_MAX_CHARS) return png;
      scale *= 0.7;
    }
    throw new Error("이미지를 처리하지 못했습니다. 더 단순한 이미지를 올려 주세요.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
