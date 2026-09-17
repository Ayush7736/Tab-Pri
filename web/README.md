# Tab-Pri Web

The web/PWA is the primary mobile-first vault interface.

It is intentionally separate from the existing backend skeleton so the Render + D1 service stays stable.

## Responsibilities

- Client-side vault encryption/decryption.
- Mobile-first vault UI.
- Browser capture handoff receiver.
- Group/tab management.
- Search and favorites.
- Password-change workflow.
- Destructive vault deletion workflow.

The browser capture layer must hand plaintext tabs to this app only inside the local client boundary. The master password and backend API credentials are never placed in the Android companion.
