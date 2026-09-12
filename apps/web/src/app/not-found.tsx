import { ButtonLink } from "@daify/ui";

export default function NotFound() {
  return <main className="empty-state"><div><span className="eyebrow">404</span><h1>This table is empty.</h1><p>The page you were looking for may have moved, but DAIFY is right here.</p><ButtonLink href="/">Return home</ButtonLink></div></main>;
}
