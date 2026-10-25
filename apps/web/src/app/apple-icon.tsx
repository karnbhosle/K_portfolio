import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Home-screen icon: the reactor mark from icon.svg, rendered as a PNG for iOS. */
export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#000', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', width: 136, height: 136, borderRadius: '50%', border: '6px dashed #61E8FF', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', width: 92, height: 92, borderRadius: '50%', border: '9px dashed #C98A45', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#E8F0F7', border: '6px solid #61E8FF' }} />
        </div>
      </div>
    </div>,
    size,
  );
}
