# Proposal: Modernize and Extend Afterlight In-Game Chat Experience

## Why

Afterlight is a shared virtual social world with rich architectural environments, shared media viewing in The Orpheum, and multiplayer games. However, the current in-game town chat (`#afterlight`) is a basic single-line input box and unadorned text log with no emoji picker, no autocomplete, no message grouping, jarring scroll-jumps on new incoming messages, and no visual personalization. 

Transforming chat into an expressive, polished, modern social space while preserving Afterlight's quiet aesthetic and zero-interruption gameplay requires an integrated vertical redesign: full native emoji capabilities, contextual autocomplete, intelligent scroll anchoring with unread notices, threaded-lite replies, and structured appearance personalization with world theme adaptation.

## What Changes

- **Full Native Unicode Emoji Picker**: Accessible, lightweight, categorized emoji picker with instant search, recently used emoji caching, keyboard navigation (arrow keys, Enter, Escape), skin tone support, and zero external network asset dependencies.
- **Contextual Autocomplete**:
  - Emoji autocomplete triggered by `:shortcode` (e.g. `:wave`, `:heart`, `:fire`) with keyboard selection.
  - Mention autocomplete triggered by `@name` querying active and online players.
- **Message Grouping & Layouts**:
  - Consecutive message clustering by the same sender within a temporal window (3 minutes) to eliminate repetitive avatar/name clutter.
  - Three distinct layout options: **Comfortable** (avatar/initials badge, sender, timestamp, spacious message), **Compact** (classic IRC single-line format), and **Bubble** (messenger-style conversation bubbles).
- **Intelligent Scroll Anchoring & Unread Indicator**:
  - Preserves user scroll position when reading older history; incoming messages do not yank the viewport.
  - Floating pill indicator (`↓ N new messages`) appears when scrolled up, clicking jumps smoothly to the bottom.
  - Message drafts are retained across collapse/expand and room transitions.
- **Threaded-Lite Replies & Mentions**:
  - Hover/focus message action to reply, creating an inline quotation reference (`↳ @user: snippet...`) that scrolls to and highlights the referenced message when clicked.
  - Mentions of the local player (`@Nickname`) are highlighted with subtle personal accent styling.
  - Clicking usernames in the log opens a lightweight profile card or prefills a mention in the composer.
- **Personalization & Theme Integration**:
  - Coherent appearance presets: **Afterlight** (default warm industrial copper & patina), **Minimal**, **Glass**, **Terminal**, **Cozy**, and **Cinematic**.
  - Customization across density (Compact, Default, Spacious), font size (Small, Normal, Large), background opacity/treatment (Solid, Translucent, Glass, Transparent, Match World), timestamp visibility (Always, Hover, Hidden), and avatar visibility.
  - **Match World** environment integration: Subtly binds chat surface, accent, and borders to the active World (`worldState.selection.worldId` — coastal, rainforest, alpine, desert, redwood, cloud).
  - Dedicated **Appearance Settings** modal with an interactive **Live Preview** and "Reset to defaults" action.
- **Robust Accessibility & Game Input Harmony**:
  - Strict keyboard navigation, visible focus rings, ARIA roles (`role="log"`, `aria-live="polite"`, `role="listbox"`), reduced-motion compatibility, and hierarchical Escape handling that safely returns focus to the game canvas without leaking movement keys.
- **Abuse Hardening & URL Sanitization**:
  - Safe linkification of HTTP/HTTPS URLs with `rel="noopener noreferrer"`, strict control character filtering, and defense against oversized inputs and XSS.

## Capabilities

### New Capabilities
- `chat-personalization`: User-configurable chat appearance system managing presets, layouts, density, font sizes, background treatments, world theme token bindings, live preview dialog, and durable localStorage persistence.

### Modified Capabilities
- `in-game-chat`: Extends the in-game chat HUD panel requirements with full native emoji picker, `:shortcode` emoji autocomplete, `@mention` autocomplete, message grouping, scroll anchoring with unread jump pill, threaded-lite inline replies, draft preservation, and enhanced input/focus safety.

## Impact

- **UI & Components**:
  - `src/ui/chat/emojiData.js`: Curated Unicode emoji database with keywords and categories.
  - `src/ui/chat/emojiPicker.js`: Accessible keyboard-navigable emoji picker.
  - `src/ui/chat/autocomplete.js`: Contextual `:emoji` and `@mention` autocomplete popup.
  - `src/ui/chat/chatPreferences.js`: Preference normalization, presets, storage, and semantic CSS variable engine.
  - `src/ui/chat/appearanceModal.js`: Chat appearance settings modal with live preview.
  - `src/ui/chatPanel.js`: Overhauled to orchestrate new subcomponents, message grouping, scroll anchoring, and composer interactions.
  - `src/style.css`: Semantic `--chat-*` tokens, layout classes, picker and autocomplete styles, world theme adaptations.
  - `index.html`: Updated chat panel template and appearance modal mount.
- **Networking & Backend**:
  - Fully backward compatible with Phoenix `Afterlight.Social.Relay`, Node `server/chat.js`, and IRC bridge.
  - Reply quotation uses text-level representation (`> @user: snippet`) so external IRC users and legacy clients receive clean readable text.
- **Performance & Assets**:
  - Zero external network requests or CDN dependencies for emoji.
  - Bounded DOM retention (MAX_LINES = 200).
- **Tests**:
  - `tests/chat-panel.test.js` updated and expanded.
  - New test suites: `tests/chat-personalization.test.js`, `tests/chat-emoji-picker.test.js`, `tests/chat-autocomplete.test.js`.
