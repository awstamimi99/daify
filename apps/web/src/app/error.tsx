"use client";

import { Button } from "@daify/ui";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="empty-state"><div><span className="eyebrow">Something went quiet</span><h1>We couldn’t open this view.</h1><p>Your work is untouched. Try loading the page again.</p><Button onClick={reset}>Try again</Button></div></main>;
}
