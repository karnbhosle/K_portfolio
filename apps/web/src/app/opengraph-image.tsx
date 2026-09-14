import { ImageResponse } from 'next/og';
export const alt = 'Karna Bhosle — aspiring Software Development Engineer. KARNA / CORE.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', background: '#060B12', color: '#EFF8FF', padding: 80, alignItems: 'center', justifyContent: 'space-between' }}>
    <div style={{ display: 'flex', flexDirection: 'column', width: 700 }}><div style={{ fontSize: 23, color: '#61E8FF', letterSpacing: 5 }}>KB / KARNA CORE</div><div style={{ fontSize: 94, marginTop: 35, lineHeight: 1.1 }}>Karna Bhosle</div><div style={{ fontSize: 30, color: '#A7BACB', marginTop: 25 }}>Aspiring Software Development Engineer</div><div style={{ fontSize: 23, color: '#C98A45', marginTop: 32 }}>MCA Candidate · SIESCOMS · 2025–2027</div></div>
    <div style={{ display: 'flex', width: 280, height: 280, borderRadius: '50%', border: '3px solid #61E8FF', alignItems: 'center', justifyContent: 'center' }}><div style={{ display: 'flex', width: 220, height: 220, borderRadius: '50%', border: '18px dashed #C98A45', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 110, height: 110, borderRadius: '50%', background: '#EFF8FF', border: '22px solid #61E8FF' }} /></div></div>
  </div>, size);
}
