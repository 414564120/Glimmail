"use client";

import { useState } from "react";

export function SubmitOnceButton({
  action,
  mailboxId,
  label,
  submittingLabel,
  className,
}: {
  action: (formData: FormData) => void;
  mailboxId: string;
  label: string;
  submittingLabel: string;
  className: string;
}) {
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit() {
    setSubmitting(true);
  }

  return (
    <form action={action} onSubmit={handleSubmit}>
      <input name="mailboxId" type="hidden" value={mailboxId} />
      <button
        className={className}
        disabled={submitting}
        type="submit"
      >
        {submitting ? submittingLabel : label}
      </button>
    </form>
  );
}
