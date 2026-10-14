"use client";

import { Button } from "@daify/ui";
import { useEffect } from "react";

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main id="main-content" className="empty-state"><div><span className="eyebrow">Please try again</span><h1>We couldn’t open this view.</h1><p>The service may be starting up. Wait a moment, then try loading this view again.</p><Button onClick={retry}>Try again</Button><p lang="ar" dir="rtl">قد تكون الخدمة قيد التشغيل. انتظر قليلاً ثم حاول تحميل الصفحة مجدداً.</p></div></main>;
}
