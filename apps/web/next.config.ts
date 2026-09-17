import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cấu hình bắt buộc để @huggingface/transformers (chạy model ASR PhoWhisper
  // ngay trong trình duyệt, cho tính năng trả lời phỏng vấn bằng giọng nói)
  // build được ở phía client — 2 package này chỉ dùng cho môi trường Node.js,
  // không cần và không tồn tại ở trình duyệt nên phải tắt để webpack không cố bundle.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
};

export default nextConfig;
