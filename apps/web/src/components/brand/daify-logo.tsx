import Image from "next/image";
import { daifyLogoDark, daifyLogoLight } from "@/lib/assets";
import styles from "./daify-logo.module.css";

export function DaifyLogo({ dark = false, compact = false }: { readonly dark?: boolean; readonly compact?: boolean }) {
  return <Image src={dark ? daifyLogoDark : daifyLogoLight} alt="DAIFY" width={compact ? 72 : 96} priority className={styles.logo} />;
}
