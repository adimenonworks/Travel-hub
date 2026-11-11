import logo from '../../assets/logo.svg';

/**
 * Figma "Logo": the walker R, as on the app icon (emerald tile, deep walker; fixed brand colours in both modes, like an
 * app icon). The brand mark on the sign-in and Get Rove pages. 88px by default.
 */
export function Logo({ size = 88, label = 'Rove' }: { size?: number; label?: string }) {
  return <img src={logo} width={size} height={size} alt={label} style={{ display: 'block', width: size, height: size }} />;
}
