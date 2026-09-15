"use client";
import Link, { useLinkStatus } from "next/link";
import { useEffect, type ComponentProps } from "react";
import { beginLoading } from "@/lib/loading-state";
function LinkActivity() {
  const { pending } = useLinkStatus();
  useEffect(() => (pending ? beginLoading() : undefined), [pending]);
  return null;
}
export default function AppLink({
  children,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link {...props}>
      {children}
      <LinkActivity />
    </Link>
  );
}
