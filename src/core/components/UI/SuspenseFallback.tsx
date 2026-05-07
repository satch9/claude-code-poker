import React from "react";

export const SuspenseFallback: React.FC = () => (
  <div className="min-h-screen bg-bg-base flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-text-muted border-t-transparent" />
  </div>
);
