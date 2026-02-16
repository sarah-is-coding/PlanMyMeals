import AdSlot from "../ads/AdSlot";

type LoadingModalProps = {
  open: boolean;
  title?: string;
  message?: string;
};

export default function LoadingModal({
  open,
  title = "Working on your request...",
  message = "Please wait a moment.",
}: LoadingModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="loading-modal" role="alertdialog" aria-modal="true" aria-live="assertive">
      <div className="loading-modal__backdrop" />
      <div className="loading-modal__panel">
        <div className="loading-modal__spinner" aria-hidden="true" />
        <h2>{title}</h2>
        <p>{message}</p>
        <AdSlot
          size="rectangle"
          label="Sponsored"
          interactive={false}
          className="loading-modal__ad loading-modal__ad--desktop"
        />
        <AdSlot
          size="banner"
          label="Sponsored"
          interactive={false}
          className="loading-modal__ad loading-modal__ad--mobile"
        />
        <p className="loading-modal__note">
          Ad interactions are disabled while loading to prevent accidental clicks.
        </p>
      </div>
    </div>
  );
}
