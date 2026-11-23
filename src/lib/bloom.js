import { HalfFloatType } from 'three';
import { BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from 'postprocessing';

// Hậu kỳ dùng chung cho các cảnh Three.js: bloom (chỉ phần sáng vượt ngưỡng mới phát sáng) + tone mapping.
// Khi vẽ qua composer, renderer không tự tone map nữa nên tone mapping chuyển thành một effect.
// Dùng PBR Neutral: giữ gần như nguyên màu in (mặt bảng trắng, hồng), chỉ nén phần quá sáng.
export function createBloom(renderer, scene, camera, { intensity = 1, threshold = 1, smoothing = 0.2, radius = 0.7, exposure = 1 } = {}) {
  const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType, multisampling: Math.min(4, renderer.capabilities.maxSamples) });
  const bloom = new BloomEffect({ intensity, luminanceThreshold: threshold, luminanceSmoothing: smoothing, mipmapBlur: true, radius });
  const tone = new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL });
  renderer.toneMappingExposure = exposure;
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new EffectPass(camera, bloom, tone));
  return {
    composer,
    bloom,
    setSize: (w, h) => composer.setSize(w, h, false),
    render: dt => composer.render(dt),
    dispose: () => composer.dispose()
  };
}
