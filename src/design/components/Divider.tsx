import s from './Divider.module.css';

/** Figma "Divider": a 1px line in divider/default that separates sections of a page. */
export function Divider() {
  return <hr className={s.divider} />;
}
