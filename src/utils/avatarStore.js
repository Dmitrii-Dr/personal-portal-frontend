/**
 * Avatar store – keeps the selected avatar in module-level memory.
 * avatarId = 0  → no avatar (default, shows AccountCircleIcon)
 * avatarId = 1–N → pre-generated avatars from /avatars/
 */

/** Avatar id=0 means "no avatar / use default icon" */
export const DEFAULT_AVATAR_ID = 0;

// Auto-built from /public/avatars/avatar1.png … avatar15.png
const AVATAR_COUNT = 15;

export const AVATAR_OPTIONS = [
    // id=0: default (no avatar)
    { id: 0, src: null, label: 'Default' },
    // ids 1–15
    ...Array.from({ length: AVATAR_COUNT }, (_, i) => ({
        id: i + 1,
        src: `/avatars/avatar${i + 1}.png`,
        label: `Avatar ${i + 1}`,
    })),
];

/** Selectable avatars (ids 1–N), excludes the "no avatar" entry */
export const SELECTABLE_AVATARS = AVATAR_OPTIONS.filter((a) => a.id !== 0);

let selectedAvatarId = DEFAULT_AVATAR_ID;

/**
 * Returns the currently selected avatar object.
 * Returns null when id=0 (default / no avatar).
 */
export const getSelectedAvatar = () => {
    if (selectedAvatarId === DEFAULT_AVATAR_ID) return null;
    return AVATAR_OPTIONS.find((a) => a.id === selectedAvatarId) ?? null;
};

/**
 * Sets the selected avatar by id.
 * Pass 0 (or DEFAULT_AVATAR_ID) to reset to the default icon.
 * Fires an 'avatar-changed' window event so any listening component can re-render.
 */
export const setSelectedAvatar = (id) => {
    selectedAvatarId = id;
    window.dispatchEvent(new Event('avatar-changed'));
};
