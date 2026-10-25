import { ImageResponse } from 'next/og';

export const alt = 'Karna Bhosle, aspiring Software Development Engineer. MCA candidate at SIESCOMS, 2025–2027.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#000', color: '#E8F0F7', padding: '72px 80px', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: 720 }}>
        <div style={{ display: 'flex', fontSize: 22, color: '#61E8FF', letterSpacing: 6 }}>KARNA / CORE</div>
        <div style={{ display: 'flex', fontSize: 104, marginTop: 36, lineHeight: 1, letterSpacing: -3, fontWeight: 600 }}>Karna Bhosle</div>
        <div style={{ display: 'flex', fontSize: 34, color: '#A3B3C2', marginTop: 28 }}>Aspiring Software Development Engineer</div>
        <div style={{ display: 'flex', fontSize: 24, color: '#C98A45', marginTop: 36 }}>MCA candidate · SIESCOMS · 2025–2027</div>
        <div style={{ display: 'flex', fontSize: 22, color: '#71859A', marginTop: 14 }}>Full-stack development · Applied machine learning · API design</div>
      </div>
      <div style={{ display: 'flex', width: 300, height: 300, borderRadius: '50%', border: '4px dashed #61E8FF', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', width: 214, height: 214, borderRadius: '50%', border: '16px dashed #C98A45', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#E8F0F7', border: '14px solid #61E8FF' }} />
        </div>
      </div>
    </div>,
    size,
  );
}
