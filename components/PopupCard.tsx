import SavePopupButton from "@/components/SavePopupButton";
import PopupArtwork from "@/components/PopupArtwork";
import {
    formatPopupDate,
    getFreshnessLabel,
    getPopupDisplayName,
    getPopupTiming,
    type Popup,
} from "@/lib/popups";

type PopupCardProps = {
    popup: Popup;
    index: number;
    today: string;
    isSaved: boolean;
    isAuthenticated: boolean;
};

export default function PopupCard({ popup, index, today, isSaved, isAuthenticated }: PopupCardProps) {
    const displayName = getPopupDisplayName(popup);
    const dateLabel = `${formatPopupDate(popup.start_date)} — ${formatPopupDate(popup.end_date)}`;

    return (
        <article className="group popup-card">
            <div className="popup-image-wrap">
                <PopupArtwork
                    imageUrl={popup.image_url}
                    displayName={displayName}
                    neighborhood={popup.neighborhood}
                    dateLabel={dateLabel}
                />
                <span className="popup-category-tag">{popup.category}</span>
                <SavePopupButton popupId={popup.id} initialSaved={isSaved} isAuthenticated={isAuthenticated} />
            </div>

            <div className="popup-card-kicker">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span className="popup-timing">{getPopupTiming(popup, today)}</span>
            </div>

            <h2 className="popup-card-title">{displayName}</h2>

            <div className="popup-card-details">
                <div><p>Location</p><span>{popup.neighborhood}</span></div>
                <div><p>Dates</p><span>{dateLabel}</span></div>
            </div>

            <div className="popup-card-footer">
                <span>{getFreshnessLabel(popup.last_verified_at)}</span>
                {popup.source_url && (
                    <a href={popup.source_url} target="_blank" rel="noopener noreferrer">
                        Event source <span aria-hidden="true">↗</span>
                    </a>
                )}
            </div>
        </article>
    );
}
