"use client";

import { Button } from "@daify/ui";
import { useState } from "react";

export function NewsletterForm() {
  const [sent, setSent] = useState(false);
  return sent ? <p role="status">You’re on the list. We’ll keep it useful.</p> : (
    <form onSubmit={event => { event.preventDefault(); setSent(true); }}>
      <label className="sr-only" htmlFor="newsletter-email">Email address</label>
      <input id="newsletter-email" name="email" type="email" required placeholder="you@restaurant.com" />
      <Button variant="light" type="submit">Join</Button>
    </form>
  );
}
